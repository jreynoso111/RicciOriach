begin;
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.touch_content() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end; $$;
revoke all on function private.touch_content() from public;

alter table public.events add column if not exists image_url text not null default '' check (image_url = '' or image_url ~ '^https://');

create table public.page_images (
  id text primary key check (id in ('home-hero','home-universe','intro-one','intro-two','intro-three','music-feature','events-hero','contact-photo','journal-pa-que-bailemos','journal-maquine','journal-mi-derriengue','store-hero')),
  image_url text not null default '' check (image_url = '' or image_url ~ '^https://'),
  alt text not null default '' check (char_length(alt) <= 300),
  focal_x integer not null default 50 check (focal_x between 0 and 100),
  focal_y integer not null default 50 check (focal_y between 0 and 100),
  updated_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  status text not null default 'Borrador' check (status in ('Borrador','Publicado','Archivado')),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default 'Merch' check (char_length(category) <= 120),
  variant text not null default '' check (char_length(variant) <= 120),
  sku text not null default '' check (char_length(sku) <= 80),
  image_url text not null default '' check (image_url = '' or image_url ~ '^https://'),
  price numeric(12,2) not null default 0 check (price >= 0 and price <= 1000000),
  currency text not null default 'DOP' check (currency in ('DOP','USD','EUR')),
  capacity integer not null default 0 check (capacity between 0 and 1000000),
  allocated integer not null default 0 check (allocated >= 0 and allocated <= capacity),
  sale_mode text not null default 'manual' check (sale_mode in ('manual','online','both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_sku_unique on public.products(sku) where sku <> '';
create index products_status_category_idx on public.products(status, category);
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 3000),
  status text not null default 'Borrador' check (status in ('Borrador','Publicado','Archivado')),
  price numeric(12,2) not null default 0 check (price >= 0 and price <= 1000000),
  currency text not null default 'DOP' check (currency in ('DOP','USD','EUR')),
  capacity integer not null default 0 check (capacity between 0 and 1000000),
  allocated integer not null default 0 check (allocated >= 0 and allocated <= capacity),
  sale_mode text not null default 'manual' check (sale_mode in ('manual','online','both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_types_event_idx on public.ticket_types(event_id, status);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  reference text not null unique default ('RO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  kind text not null check (kind in ('product','ticket')),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) <= 254),
  customer_phone text not null default '' check (char_length(customer_phone) <= 40),
  customer_note text not null default '' check (char_length(customer_note) <= 1000),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(14,2) not null check (total >= 0),
  currency text not null check (currency in ('DOP','USD','EUR')),
  status text not null default 'Pendiente' check (status in ('Pendiente','Confirmado','Entregado','Cancelado')),
  payment_mode text not null default 'manual' check (payment_mode in ('manual','online')),
  payment_status text not null default 'pending' check (payment_status in ('pending','processing','paid','failed','refunded')),
  payment_provider text not null default '',
  payment_reference text not null default '',
  inventory_held boolean not null default false,
  hold_expires_at timestamptz,
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_email_created_idx on public.orders(customer_email, created_at desc);
create index orders_expiring_idx on public.orders(hold_expires_at) where inventory_held and status = 'Pendiente';

alter table public.page_images enable row level security;
alter table public.products enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
revoke all on public.page_images, public.products, public.ticket_types, public.orders from public, anon, authenticated;
grant select on public.page_images, public.products, public.ticket_types to anon, authenticated;
grant select on public.orders to authenticated;
grant insert, update on public.page_images to authenticated;
grant insert (id,title,status,description,category,variant,sku,image_url,price,currency,capacity,sale_mode), update (title,status,description,category,variant,sku,image_url,price,currency,capacity,sale_mode) on public.products to authenticated;
grant insert (id,event_id,title,description,status,price,currency,capacity,sale_mode), update (event_id,title,description,status,price,currency,capacity,sale_mode) on public.ticket_types to authenticated;

create policy "Public page photos" on public.page_images for select to anon, authenticated using (true);
create policy "Public products" on public.products for select to anon, authenticated using (status = 'Publicado');
create policy "Public tickets for published events" on public.ticket_types for select to anon, authenticated using (status = 'Publicado' and exists (select 1 from public.events e where e.id = event_id and e.status = 'Publicado'));
create policy "Admins manage page photos" on public.page_images for all to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));
create policy "Admins manage products" on public.products for all to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));
create policy "Admins manage tickets" on public.ticket_types for all to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));
create policy "Admins read orders" on public.orders for select to authenticated using (exists (select 1 from public.site_admins where user_id = (select auth.uid())));

create trigger page_images_touch before update on public.page_images for each row execute function private.touch_content();
create trigger products_touch before update on public.products for each row execute function private.touch_content();
create trigger ticket_types_touch before update on public.ticket_types for each row execute function private.touch_content();
create trigger orders_touch before update on public.orders for each row execute function private.touch_content();
create trigger events_touch before update on public.events for each row execute function private.touch_content();
create trigger posts_touch before update on public.posts for each row execute function private.touch_content();

-- The guest endpoint is deliberately narrow: visitors cannot insert orders or
-- supply their own prices, status, payment status or stock values. The definer
-- lives outside the exposed schema; all inputs and table writes are bounded.
create function private.submit_order(p_customer jsonb, p_items jsonb, p_request_key uuid, p_mode text default 'manual')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_customer->>'name',''));
  v_email text := lower(btrim(coalesce(p_customer->>'email','')));
  v_phone text := btrim(coalesce(p_customer->>'phone',''));
  v_note text := btrim(coalesce(p_customer->>'note',''));
  v_items jsonb := '[]'; v_line jsonb; v_item record; v_event public.events;
  v_kind text; v_currency text; v_qty integer; v_total numeric := 0;
  v_order public.orders; v_seen text[] := '{}'; v_id uuid;
begin
  if coalesce(auth.role(),'') not in ('anon','authenticated','service_role') and auth.uid() is null then raise exception 'Acceso no permitido.'; end if;
  if p_mode not in ('manual','online') or p_mode is null or (p_mode='online' and coalesce(auth.role(),'')<>'service_role') then raise exception 'Modalidad no permitida.'; end if;
  if p_request_key is null or char_length(v_name) not between 2 and 120
    or char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(v_phone) > 40 or char_length(v_note) > 1000
    or coalesce(p_customer->>'website','') <> '' then raise exception 'Revisa los datos de contacto.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Selecciona entre 1 y 30 artículos.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
  select * into v_order from public.orders where request_key = p_request_key;
  if found then
    if v_order.customer_email <> v_email or v_order.payment_mode <> p_mode then raise exception 'Solicitud inválida.'; end if;
    return jsonb_build_object('id',v_order.id,'reference',v_order.reference,'status',v_order.status,'total',v_order.total,'currency',v_order.currency);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_email,1));
  if (select count(*) from public.orders where customer_email = v_email and created_at > now() - interval '1 hour') >= 5 then raise exception 'Ya recibimos varias solicitudes. Espera una hora antes de enviar otra.'; end if;
  for v_line in select value from jsonb_array_elements(p_items) order by value->>'id' loop
    if coalesce(v_line->>'kind','') not in ('product','ticket') or coalesce(v_line->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Artículo inválido.'; end if;
    v_qty := (v_line->>'quantity')::integer;
    if v_qty not between 1 and 10 then raise exception 'La cantidad debe estar entre 1 y 10.'; end if;
    v_id := (v_line->>'id')::uuid;
    if v_id is null or v_id::text = any(v_seen) then raise exception 'Artículo inválido o repetido.'; end if;
    v_seen := array_append(v_seen,v_id::text);
    if v_kind is not null and v_kind <> v_line->>'kind' then raise exception 'Envía las entradas y los productos en solicitudes separadas.'; end if;
    v_kind := v_line->>'kind';
    if v_kind = 'product' then
      select id,title,price,currency,capacity,allocated,sale_mode,status,variant into v_item from public.products where id = v_id for update;
    else
      select id,title,price,currency,capacity,allocated,sale_mode,status,''::text as variant into v_item from public.ticket_types where id = v_id for update;
    end if;
    if not found or v_item.status <> 'Publicado' then raise exception 'Este artículo ya no está disponible.'; end if;
    if v_item.sale_mode <> p_mode and v_item.sale_mode <> 'both' then raise exception 'La modalidad elegida no está disponible para este artículo.'; end if;
    if p_mode='online' and (v_item.currency not in ('USD','EUR') or v_item.price<=0) then raise exception 'PayPal requiere un precio mayor a cero en USD o EUR.'; end if;
    if v_item.capacity - v_item.allocated < v_qty then raise exception 'No hay suficientes unidades disponibles.'; end if;
    if v_currency is not null and v_currency <> v_item.currency then raise exception 'Envía cada moneda en un pedido separado.'; end if;
    v_currency := v_item.currency;
    if v_kind = 'ticket' then
      select e.* into v_event from public.events e join public.ticket_types t on t.event_id=e.id where t.id=v_id;
      if v_event.status <> 'Publicado' or v_event.date < (now() at time zone 'America/Santo_Domingo')::date or v_event.ticket_status not in ('available','free') then raise exception 'Esta presentación no acepta reservas.'; end if;
    end if;
    if p_mode='online' then
      if v_kind='product' then update public.products set allocated=allocated+v_qty where id=v_id;
      else update public.ticket_types set allocated=allocated+v_qty where id=v_id; end if;
    end if;
    v_total := v_total + v_qty * v_item.price;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id',v_item.id,'kind',v_kind,'title',v_item.title,'variant',v_item.variant,'quantity',v_qty,'unit_price',v_item.price,'currency',v_item.currency,'event',case when v_kind='ticket' then v_event.title else null end));
  end loop;
  insert into public.orders(request_key,kind,customer_name,customer_email,customer_phone,customer_note,items,total,currency,payment_mode,payment_provider,inventory_held,hold_expires_at)
    values(p_request_key,v_kind,v_name,v_email,v_phone,v_note,v_items,v_total,v_currency,p_mode,case when p_mode='online' then 'paypal' else '' end,p_mode='online',case when p_mode='online' then now()+interval '3 hours' else null end) returning * into v_order;
  return jsonb_build_object('id',v_order.id,'reference',v_order.reference,'status',v_order.status,'total',v_order.total,'currency',v_order.currency);
end; $$;
revoke all on function private.submit_order(jsonb,jsonb,uuid,text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.submit_order(jsonb,jsonb,uuid,text) to anon, authenticated;
create function public.submit_order(p_customer jsonb, p_items jsonb, p_request_key uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select private.submit_order(p_customer,p_items,p_request_key,'manual'); $$;
revoke all on function public.submit_order(jsonb,jsonb,uuid) from public;
grant execute on function public.submit_order(jsonb,jsonb,uuid) to anon, authenticated;

-- Stock is allocated only on confirmation. Locking each resource in stable ID
-- order prevents overselling under concurrent administrator confirmations.
create function private.manage_order(p_id uuid,p_status text,p_note text,p_payment_status text,p_expected_updated_at timestamptz)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_line jsonb; v_delta integer; v_qty integer; v_count integer;
begin
  if auth.uid() is null or not exists (select 1 from public.site_admins where user_id=auth.uid()) then raise exception 'Acceso de administrador requerido.'; end if;
  select * into v_order from public.orders where id=p_id for update;
  if not found then raise exception 'No se encontró el pedido.'; end if;
  if p_expected_updated_at is distinct from v_order.updated_at then raise exception 'El pedido cambió. Actualiza el listado antes de guardar.'; end if;
  if p_status not in ('Pendiente','Confirmado','Entregado','Cancelado') or p_status is null or p_note is null or char_length(p_note) > 2000 or p_payment_status not in ('pending','paid') or p_payment_status is null then raise exception 'Estado inválido.'; end if;
  if p_status <> v_order.status and not ((v_order.status='Pendiente' and p_status in ('Confirmado','Cancelado')) or (v_order.status='Confirmado' and p_status in ('Entregado','Cancelado'))) then raise exception 'No se permite ese cambio de estado.'; end if;
  if v_order.payment_mode <> 'manual' then raise exception 'Los pagos automáticos se actualizan desde la pasarela.'; end if;
  v_delta := case when p_status in ('Confirmado','Entregado') then 1 else 0 end - case when v_order.inventory_held then 1 else 0 end;
  for v_line in select value from jsonb_array_elements(v_order.items) order by value->>'id' loop
    v_qty := (v_line->>'quantity')::integer * v_delta;
    if v_line->>'kind'='product' then
      update public.products set allocated=allocated+v_qty where id=(v_line->>'id')::uuid and allocated+v_qty between 0 and capacity and (v_delta<=0 or status='Publicado');
    else
      update public.ticket_types t set allocated=allocated+v_qty where t.id=(v_line->>'id')::uuid and t.allocated+v_qty between 0 and t.capacity and (v_delta<=0 or (t.status='Publicado' and exists (select 1 from public.events e where e.id=t.event_id and e.status='Publicado' and e.date >= (now() at time zone 'America/Santo_Domingo')::date and e.ticket_status in ('available','free'))));
    end if;
    get diagnostics v_count = row_count;
    if v_count<>1 then raise exception 'No hay disponibilidad para confirmar todo el pedido. Revisa el inventario o la presentación.'; end if;
  end loop;
  update public.orders set status=p_status,admin_note=p_note,payment_status=p_payment_status,inventory_held=(p_status in ('Confirmado','Entregado')) where id=p_id returning * into v_order;
  return v_order;
end; $$;
revoke all on function private.manage_order(uuid,text,text,text,timestamptz) from public;
grant execute on function private.manage_order(uuid,text,text,text,timestamptz) to authenticated;
create function public.manage_order(p_id uuid,p_status text,p_note text,p_payment_status text,p_expected_updated_at timestamptz) returns public.orders
language sql security invoker set search_path = '' as $$ select private.manage_order(p_id,p_status,p_note,p_payment_status,p_expected_updated_at); $$;
revoke all on function public.manage_order(uuid,text,text,text,timestamptz) from public;
grant execute on function public.manage_order(uuid,text,text,text,timestamptz) to authenticated;
create policy "Admins list their site media" on storage.objects for select to authenticated using (bucket_id='site-media' and exists (select 1 from public.site_admins where user_id=(select auth.uid())));
commit;
