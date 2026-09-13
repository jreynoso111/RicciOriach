begin;

-- Event ticketing is managed by the external platform linked from the event.
-- These values are editorial snapshots; stock is not synchronized by a provider API.
alter table public.events
  add column if not exists ticket_provider text not null default ''
    check (char_length(ticket_provider) <= 80),
  add column if not exists ticket_availability text not null default ''
    check (char_length(ticket_availability) <= 160);

alter table public.events
  drop constraint if exists events_ticket_status_check;
alter table public.events
  add constraint events_ticket_status_check
    check (ticket_status in ('available', 'coming_soon', 'soldout', 'free', 'postponed', 'cancelled'));

-- Keep old ticket types and orders for history, but no client can read or create
-- internal ticket inventory after this migration.
drop policy if exists "Public tickets for published events" on public.ticket_types;
drop policy if exists "Admins manage tickets" on public.ticket_types;
revoke all on public.ticket_types from public, anon, authenticated, service_role;

create function private.reject_internal_ticket_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'ticket' then
    raise exception 'Las taquillas se compran en la plataforma externa del evento.';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_internal_ticket_order() from public, anon, authenticated, service_role;
drop trigger if exists orders_reject_internal_ticket_sales on public.orders;
create trigger orders_reject_internal_ticket_sales
  before insert on public.orders
  for each row execute function private.reject_internal_ticket_order();

commit;
