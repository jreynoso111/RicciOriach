-- Public visitors can opt in to one stock alert or to announcements for new
-- events. Email addresses stay behind the site-admin allow-list; public writes
-- go through a narrow, validated RPC. Delivery is queued until a sender exists.
begin;

create table public.notification_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (
      email = lower(btrim(email))
      and char_length(email) between 6 and 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  notification_type text not null
    check (notification_type in ('product_stock', 'new_events')),
  product_id uuid references public.products(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'queued', 'notified', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (notification_type = 'product_stock' and product_id is not null)
    or (notification_type = 'new_events' and product_id is null)
  )
);

create unique index notification_signups_active_product_email_idx
  on public.notification_signups (lower(email), product_id)
  where notification_type = 'product_stock' and status = 'active';
create unique index notification_signups_active_events_email_idx
  on public.notification_signups (lower(email))
  where notification_type = 'new_events' and status = 'active';
create index notification_signups_admin_created_idx
  on public.notification_signups (created_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.notification_signups(id) on delete cascade,
  notification_type text not null
    check (notification_type in ('product_back_in_stock', 'new_event')),
  product_id uuid references public.products(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  attempts smallint not null default 0 check (attempts between 0 and 100),
  last_error text not null default '' check (char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check (
    (notification_type = 'product_back_in_stock' and product_id is not null and event_id is null)
    or (notification_type = 'new_event' and product_id is null and event_id is not null)
  )
);

create unique index notification_outbox_product_once_idx
  on public.notification_outbox (signup_id, product_id)
  where product_id is not null;
create unique index notification_outbox_event_once_idx
  on public.notification_outbox (signup_id, event_id)
  where event_id is not null;
create index notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where status = 'pending';

alter table public.notification_signups enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on public.notification_signups, public.notification_outbox from public, anon, authenticated;
grant select on public.notification_signups, public.notification_outbox to authenticated;
grant update (status) on public.notification_signups to authenticated;
grant select, update on public.notification_signups, public.notification_outbox to service_role;

create policy "Site admins read notification signups"
  on public.notification_signups for select to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())));
create policy "Site admins update notification signup status"
  on public.notification_signups for update to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));
create policy "Site admins read notification outbox"
  on public.notification_outbox for select to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())));

create trigger notification_signups_touch
  before update on public.notification_signups
  for each row execute function private.touch_content();

create function private.register_notification(
  p_email text,
  p_notification_type text,
  p_product_id uuid,
  p_consent boolean,
  p_website text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_product public.products%rowtype;
begin
  -- Silently accept bot submissions so the honeypot does not reveal itself.
  if btrim(coalesce(p_website, '')) <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if p_consent is distinct from true then
    raise exception 'Confirma que deseas recibir esta notificación.';
  end if;
  if char_length(v_email) not between 6 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Escribe un correo electrónico válido.';
  end if;
  if p_notification_type not in ('product_stock', 'new_events') then
    raise exception 'El tipo de aviso no es válido.';
  end if;

  if p_notification_type = 'product_stock' then
    if p_product_id is null then
      raise exception 'Selecciona un producto válido.';
    end if;
    select * into v_product
      from public.products
      where id = p_product_id and status = 'Publicado'
      for update;
    if not found then
      raise exception 'Este producto ya no está disponible.';
    end if;
    if v_product.capacity - v_product.allocated > 0 then
      raise exception 'El producto está disponible. Actualiza la tienda para comprarlo.';
    end if;
  elsif p_product_id is not null then
    raise exception 'El tipo de aviso no es válido.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));

  if exists (
    select 1
      from public.notification_signups
      where email = v_email
        and notification_type = p_notification_type
        and product_id is not distinct from p_product_id
        and status in ('active', 'queued')
  ) then
    return jsonb_build_object('ok', true);
  end if;

  if (select count(*) from public.notification_signups
      where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Ya recibimos varias solicitudes para este correo. Inténtalo más tarde.';
  end if;

  insert into public.notification_signups (email, notification_type, product_id, consent_at)
  values (v_email, p_notification_type, p_product_id, now())
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create function public.subscribe_notification(
  p_email text,
  p_notification_type text,
  p_product_id uuid,
  p_consent boolean,
  p_website text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.register_notification($1, $2, $3, $4, $5);
$$;

revoke all on function private.register_notification(text, text, uuid, boolean, text) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.register_notification(text, text, uuid, boolean, text) to anon, authenticated;
revoke all on function public.subscribe_notification(text, text, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.subscribe_notification(text, text, uuid, boolean, text) to anon, authenticated;

create function private.queue_product_restock_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'Publicado'
    and new.capacity - new.allocated > 0
    and (old.status <> 'Publicado' or old.capacity - old.allocated <= 0) then
    with queued as (
      insert into public.notification_outbox (signup_id, notification_type, product_id)
      select id, 'product_back_in_stock', new.id
        from public.notification_signups
        where notification_type = 'product_stock'
          and product_id = new.id
          and status = 'active'
      on conflict do nothing
      returning signup_id
    )
    update public.notification_signups as signup
      set status = 'queued'
      from queued
      where signup.id = queued.signup_id;
  end if;
  return new;
end;
$$;
revoke all on function private.queue_product_restock_notifications() from public, anon, authenticated;

create trigger products_queue_restock_notifications
  after update of status, capacity, allocated on public.products
  for each row execute function private.queue_product_restock_notifications();

create function private.queue_new_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'Publicado'
      and new.date >= (now() at time zone 'America/Santo_Domingo')::date then
      insert into public.notification_outbox (signup_id, notification_type, event_id)
      select id, 'new_event', new.id
        from public.notification_signups
        where notification_type = 'new_events' and status = 'active'
      on conflict do nothing;
    end if;
    return new;
  end if;

  if new.status = 'Publicado'
    and old.status <> 'Publicado'
    and new.date >= (now() at time zone 'America/Santo_Domingo')::date then
    insert into public.notification_outbox (signup_id, notification_type, event_id)
    select id, 'new_event', new.id
      from public.notification_signups
      where notification_type = 'new_events' and status = 'active'
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.queue_new_event_notifications() from public, anon, authenticated;

create trigger events_queue_new_event_notifications
  after insert or update of status on public.events
  for each row execute function private.queue_new_event_notifications();

create function private.cancel_pending_notifications_on_unsubscribe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'unsubscribed' and new.status = 'unsubscribed' then
    update public.notification_outbox
      set status = 'cancelled'
      where signup_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
revoke all on function private.cancel_pending_notifications_on_unsubscribe() from public, anon, authenticated;

create trigger notification_signups_cancel_pending
  after update of status on public.notification_signups
  for each row execute function private.cancel_pending_notifications_on_unsubscribe();

commit;
