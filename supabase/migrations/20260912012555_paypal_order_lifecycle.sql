begin;
alter table public.orders add column paypal_order_id text not null default '';
alter table public.orders add column payment_note text not null default '';
create unique index orders_paypal_unique on public.orders(paypal_order_id) where paypal_order_id<>'';
create unique index orders_capture_unique on public.orders(payment_reference) where payment_reference<>'' and payment_provider='paypal';
grant all on public.orders, public.products, public.ticket_types to service_role;
grant usage on schema private to service_role;
grant execute on function private.submit_order(jsonb,jsonb,uuid,text) to service_role;

create function private.release_order_stock(p_order public.orders) returns void
language plpgsql set search_path = '' as $$
declare line jsonb;
begin
  if not p_order.inventory_held then return; end if;
  for line in select value from jsonb_array_elements(p_order.items) order by value->>'id' loop
    if line->>'kind'='product' then update public.products set allocated=allocated-(line->>'quantity')::integer where id=(line->>'id')::uuid;
    else update public.ticket_types set allocated=allocated-(line->>'quantity')::integer where id=(line->>'id')::uuid; end if;
  end loop;
end; $$;
revoke all on function private.release_order_stock(public.orders) from public;

-- Cleanup is safe to request publicly: only unpaid holds whose server-generated
-- expiration has passed can be released. Processing/paid orders stay allocated.
create function private.expire_checkouts() returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if coalesce(auth.role(),'') not in ('anon','authenticated','service_role') and auth.uid() is null then raise exception 'Acceso no permitido.'; end if;
  for o in select * from public.orders where payment_mode='online' and payment_status='pending' and status='Pendiente' and inventory_held and hold_expires_at<now() order by id for update skip locked limit 100 loop
    perform private.release_order_stock(o);
    update public.orders set status='Cancelado',payment_status='failed',inventory_held=false,payment_note='El proceso de pago venció sin completarse.' where id=o.id;
  end loop;
end; $$;
revoke all on function private.expire_checkouts() from public;
grant execute on function private.expire_checkouts() to anon, authenticated, service_role;
create function public.expire_checkouts() returns void language sql security invoker set search_path = '' as $$select private.expire_checkouts();$$;
revoke all on function public.expire_checkouts() from public;
grant execute on function public.expire_checkouts() to anon, authenticated, service_role;

create function public.prepare_checkout(p_customer jsonb,p_items jsonb,p_request_key uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin perform private.expire_checkouts(); return private.submit_order(p_customer,p_items,p_request_key,'online'); end; $$;
revoke all on function public.prepare_checkout(jsonb,jsonb,uuid) from public;
grant execute on function public.prepare_checkout(jsonb,jsonb,uuid) to service_role;

create function public.begin_capture(p_id uuid) returns public.orders
language plpgsql security invoker set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id=p_id and payment_mode='online' for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if o.payment_status='paid' then return o; end if;
  if not o.inventory_held or o.status<>'Pendiente' or (o.payment_status='pending' and o.hold_expires_at<now()) then raise exception 'La reserva para pagar expiró. Crea un pedido nuevo.'; end if;
  update public.orders set payment_status='processing' where id=p_id returning * into o;
  return o;
end; $$;
revoke all on function public.begin_capture(uuid) from public;
grant execute on function public.begin_capture(uuid) to service_role;

create function public.finish_payment(p_id uuid,p_capture text,p_amount numeric,p_currency text,p_result text,p_note text default '') returns public.orders
language plpgsql security invoker set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id=p_id and payment_mode='online' for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if p_result not in ('paid','failed','refunded','partial_refund') or p_result is null then raise exception 'Resultado inválido.'; end if;
  if p_result='paid' then
    if p_amount is distinct from o.total or p_currency is distinct from o.currency or coalesce(p_capture,'')='' then raise exception 'El pago no coincide con el pedido.'; end if;
    if o.payment_status in ('paid','refunded') then
      if o.payment_reference<>p_capture then raise exception 'El pedido ya tiene otro pago.'; end if;
      return o;
    end if;
    if not o.inventory_held then raise exception 'El inventario no está reservado. Revisar el pago.'; end if;
    update public.orders set payment_status='paid',status='Confirmado',payment_reference=p_capture,payment_note='',hold_expires_at=null where id=p_id returning * into o;
  elsif p_result='failed' then
    if o.payment_status in ('paid','refunded') then return o; end if;
    perform private.release_order_stock(o);
    update public.orders set payment_status='failed',status='Cancelado',inventory_held=false,payment_note=left(p_note,1000) where id=p_id returning * into o;
  else
    if o.payment_reference is distinct from p_capture or o.payment_status not in ('paid','refunded') then raise exception 'El reembolso no coincide con el cobro.'; end if;
    update public.orders set payment_status=case when p_result='refunded' then 'refunded' else payment_status end,payment_note=case when p_result='refunded' then 'Pago reembolsado. Revisar entrega y devolución de inventario.' else 'Reembolso parcial. Revisar el importe en PayPal.' end where id=p_id returning * into o;
  end if;
  return o;
end; $$;
revoke all on function public.finish_payment(uuid,text,numeric,text,text,text) from public;
grant execute on function public.finish_payment(uuid,text,numeric,text,text,text) to service_role;
grant execute on function private.release_order_stock(public.orders) to service_role;

-- Administrators may update notes or complete delivery for online orders, but
-- only the verified server payment endpoint can mark them paid.
alter function private.manage_order(uuid,text,text,text,timestamptz) rename to manage_manual_order;
create function private.manage_order(p_id uuid,p_status text,p_note text,p_payment_status text,p_expected_updated_at timestamptz)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if auth.uid() is null or not exists(select 1 from public.site_admins where user_id=auth.uid()) then raise exception 'Acceso de administrador requerido.'; end if;
  select * into o from public.orders where id=p_id for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if o.payment_mode='manual' then return private.manage_manual_order(p_id,p_status,p_note,p_payment_status,p_expected_updated_at); end if;
  if p_expected_updated_at is distinct from o.updated_at then raise exception 'El pedido cambió. Actualiza el listado.'; end if;
  if p_note is null or char_length(p_note)>2000 or p_payment_status is distinct from o.payment_status or p_status is null or (p_status<>o.status and not(o.status='Confirmado' and p_status='Entregado' and o.payment_status='paid')) then raise exception 'El pago se gestiona desde PayPal.'; end if;
  update public.orders set status=p_status,admin_note=p_note where id=p_id returning * into o;
  return o;
end; $$;
revoke all on function private.manage_order(uuid,text,text,text,timestamptz) from public;
grant execute on function private.manage_order(uuid,text,text,text,timestamptz) to authenticated;
-- Rebind the wrapper after renaming the original function.
create or replace function public.manage_order(p_id uuid,p_status text,p_note text,p_payment_status text,p_expected_updated_at timestamptz) returns public.orders
language sql security invoker set search_path = '' as $$select private.manage_order(p_id,p_status,p_note,p_payment_status,p_expected_updated_at);$$;
create function public.cancel_checkout(p_id uuid) returns public.orders
language plpgsql security invoker set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id=p_id and payment_mode='online' for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if o.payment_status<>'pending' or o.status<>'Pendiente' then return o; end if;
  perform private.release_order_stock(o);
  update public.orders set status='Cancelado',payment_status='failed',inventory_held=false,payment_note='El comprador cerró el proceso de pago.' where id=p_id returning * into o;
  return o;
end; $$;
revoke all on function public.cancel_checkout(uuid) from public;
grant execute on function public.cancel_checkout(uuid) to service_role;
commit;
