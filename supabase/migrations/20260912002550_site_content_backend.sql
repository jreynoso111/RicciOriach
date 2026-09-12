-- Shared content backend for the Riccie Oriach static site.
-- Public visitors can read published content; invited site admins manage all
-- content through Supabase Auth and the site_admins allow-list.

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  date date not null,
  status text not null default 'Borrador'
    check (status in ('Borrador', 'Publicado', 'Archivado')),
  city text not null check (char_length(city) between 1 and 120),
  venue text not null check (char_length(venue) between 1 and 180),
  time text not null default '',
  ticket_status text not null default 'available'
    check (ticket_status in ('available', 'soldout', 'free', 'postponed', 'cancelled')),
  ticket_url text not null default ''
    check (ticket_url = '' or ticket_url ~ '^https://'),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  date date not null,
  status text not null default 'Borrador'
    check (status in ('Borrador', 'Publicado', 'Archivado')),
  slug text not null unique
    check (
      slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and slug not in ('pa-que-bailemos', 'maquine', 'mi-derriengue')
    ),
  category text not null default '',
  author text not null default '',
  image_url text not null default ''
    check (image_url = '' or image_url ~ '^https://'),
  excerpt text not null default '',
  content text not null default '',
  link text not null default ''
    check (link = '' or link ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_status_date_idx on public.events (status, date);
create index if not exists events_city_idx on public.events (city);
create index if not exists posts_status_date_idx on public.posts (status, date desc);

alter table public.site_admins enable row level security;
alter table public.events enable row level security;
alter table public.posts enable row level security;

revoke all on table public.site_admins from public, anon, authenticated;
grant select on table public.site_admins to authenticated;
drop policy if exists "Site admins can view their own membership" on public.site_admins;
create policy "Site admins can view their own membership"
  on public.site_admins for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.events, public.posts from public, anon, authenticated;
grant select on table public.events, public.posts to anon, authenticated;
grant insert, update, delete on table public.events, public.posts to authenticated;

grant usage on schema public to anon, authenticated;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public"
  on public.events for select to anon, authenticated
  using (status = 'Publicado');
drop policy if exists "Site admins manage events" on public.events;
create policy "Site admins manage events"
  on public.events for all to authenticated
  using (
    exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Published posts are public" on public.posts;
create policy "Published posts are public"
  on public.posts for select to anon, authenticated
  using (status = 'Publicado');
drop policy if exists "Site admins manage posts" on public.posts;
create policy "Site admins manage posts"
  on public.posts for all to authenticated
  using (
    exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'site-media',
  'site-media',
  true,
  900000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Site admins upload site media" on storage.objects;
create policy "Site admins upload site media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Site admins delete site media" on storage.objects;
create policy "Site admins delete site media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-media'
    and exists (
      select 1 from public.site_admins
      where user_id = (select auth.uid())
    )
  );
