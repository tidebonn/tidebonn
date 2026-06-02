-- Tidebønn – fullstendig Supabase-skjema (alle 9 migrasjoner samlet)
-- Kjøres én gang i Supabase SQL Editor på et nytt, tomt prosjekt.
-- Idempotent der det er trygt (IF NOT EXISTS).

-- =============================================================
-- ENUM-typer
-- =============================================================
do $$ begin
  create type time_of_day as enum
    ('matutin','laudes','prim','ters','sekst','non','vesper','kompletorium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('user','admin','owner');
exception when duplicate_object then null; end $$;

-- Hvis enum allerede finnes uten 'owner', legg det til (idempotent).
do $$ begin
  alter type app_role add value if not exists 'owner';
exception when others then null; end $$;

-- =============================================================
-- profiles
-- =============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role app_role not null default 'user',
  -- Samtykke til nyhetsbrev fra Areopagos. Areopagos eksporterer
  -- e-postlista der dette er true.
  wants_newsletter boolean not null default false,
  -- Tidspunkt for på-/avmelding (settes av trigger). Brukes til
  -- sortering i CSV-eksport.
  newsletter_opted_in_at timestamptz,
  newsletter_opted_out_at timestamptz,
  -- Inferrert ekstern status: er brukeren lagt til i maillista? true
  -- når eksportert som «legg til», false når eksportert som «meld av».
  newsletter_in_mailing_list boolean not null default false,
  -- Settes første gang vi ser brukeren i standalone (PWA-installert)
  -- modus. Brukes for å telle hvor mange brukere som har lastet ned
  -- appen i admin-statistikken.
  installed_app_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sett på-/avmeldings-tidspunkt automatisk når wants_newsletter endres
create or replace function public.touch_newsletter_optin()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.wants_newsletter = true and (old.wants_newsletter is distinct from true) then
    new.newsletter_opted_in_at := now();
  elsif new.wants_newsletter = false and old.wants_newsletter = true then
    new.newsletter_opted_out_at := now();
  end if;
  return new;
end$$;
drop trigger if exists profiles_newsletter_optin on profiles;
create trigger profiles_newsletter_optin before update on profiles
  for each row execute function public.touch_newsletter_optin();

-- App-innstillinger (key/value), bl.a. sist nyhetsbrev-eksport
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists app_settings_admin_read on app_settings;
create policy app_settings_admin_read on app_settings for select using ((select public.is_admin()));
drop policy if exists app_settings_admin_write on app_settings;
create policy app_settings_admin_write on app_settings for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- =============================================================
-- prayer_series
-- =============================================================
create table if not exists prayer_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  author text,
  year int,
  is_active boolean not null default true,
  sort_by text not null default 'weeks' check (sort_by in ('days','weeks')),
  total_days int,
  total_weeks int default 4,
  series_start_date date,
  available_prayer_times time_of_day[] not null default '{}',
  start_day text,
  start_time time_of_day,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- =============================================================
-- prayers
-- =============================================================
create table if not exists prayers (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references prayer_series(id) on delete cascade,
  day int not null,
  time_of_day time_of_day not null,
  title text,
  content_type text not null default 'freetext' check (content_type in ('structured','freetext')),
  free_text_content text,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists prayers_series_day_time_idx
  on prayers (series_id, day, time_of_day)
  where deleted_at is null;

-- =============================================================
-- user_progress (én rad per bruker)
-- =============================================================
create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_series_id uuid references prayer_series(id) on delete set null,
  current_day int not null default 1,
  current_prayer_time time_of_day not null default 'laudes',
  follow_date boolean not null default true,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  reading_mode text not null default 'alone' check (reading_mode in ('alone','group1','group2','leader')),
  show_group_markers boolean not null default false,
  -- Større tekst i bønnevisning (på store skjermer). Synkes på tvers
  -- av enheter; localStorage brukes som fallback for uinnloggede.
  large_text boolean not null default false,
  total_prayers_completed int not null default 0,
  total_minutes int not null default 0,
  gender text,
  birth_date date,
  updated_at timestamptz not null default now()
);
create index if not exists user_progress_current_series_id_idx
  on user_progress (current_series_id);

-- =============================================================
-- prayer_logs (inkl. geo + I/II-markørbruk fra senere migrasjoner)
-- =============================================================
create table if not exists prayer_logs (
  id uuid primary key default gen_random_uuid(),
  -- user_id er nullable: anonyme/uinnloggede lesninger registreres med
  -- user_id=null og telles som "Ukjent" i statistikken.
  user_id uuid references auth.users(id) on delete cascade,
  prayer_id uuid references prayers(id) on delete set null,
  series_id uuid references prayer_series(id) on delete set null,
  day int,
  time_of_day time_of_day,
  duration_minutes int,
  reading_mode text,
  used_group_markers boolean,
  completed boolean not null default true,
  location_country text,
  location_country_code text,
  location_city text,
  created_at timestamptz not null default now()
);
create index if not exists prayer_logs_user_created_idx
  on prayer_logs (user_id, created_at desc);
create index if not exists prayer_logs_country_idx
  on prayer_logs (location_country) where location_country is not null;
create index if not exists prayer_logs_prayer_id_idx on prayer_logs (prayer_id);
create index if not exists prayer_logs_series_id_idx on prayer_logs (series_id);

-- =============================================================
-- content_pages
-- =============================================================
create table if not exists content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  subtitle text,
  menu_label text,
  -- 'menu' = vises i mobil-meny + Info-landing, 'info-only' = kun Info-landing
  nav_visibility text not null default 'menu',
  order_index int not null default 100,
  content text,
  last_edited_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists content_pages_last_edited_by_idx
  on content_pages (last_edited_by);

-- =============================================================
-- Triggere: updated_at + auto-opprett profil
-- =============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prayer_series_touch on prayer_series;
create trigger prayer_series_touch
  before update on prayer_series
  for each row execute function public.touch_updated_at();

drop trigger if exists prayers_touch on prayers;
create trigger prayers_touch
  before update on prayers
  for each row execute function public.touch_updated_at();

drop trigger if exists user_progress_touch on user_progress;
create trigger user_progress_touch
  before update on user_progress
  for each row execute function public.touch_updated_at();

drop trigger if exists content_pages_touch on content_pages;
create trigger content_pages_touch
  before update on content_pages
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table profiles       enable row level security;
alter table prayer_series  enable row level security;
alter table prayers        enable row level security;
alter table user_progress  enable row level security;
alter table prayer_logs    enable row level security;
alter table content_pages  enable row level security;

-- =============================================================
-- Hjelpefunksjoner: is_admin (admin+owner), is_owner
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','owner') from public.profiles where id = auth.uid()),
    false
  );
$$;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.is_owner()
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'owner' from public.profiles where id = auth.uid()),
    false
  );
$$;
grant execute on function public.is_owner() to authenticated;

-- =============================================================
-- Optimaliserte RLS-policies (én policy per tabell-action,
-- (select auth.uid()) i stedet for auth.uid() — gir caching)
-- =============================================================

-- profiles
drop policy if exists profiles_admin_all on profiles;
drop policy if exists profiles_self_read on profiles;
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
drop policy if exists profiles_delete on profiles;

create policy profiles_select on profiles
  for select using ((select auth.uid()) = id or (select public.is_admin()));
create policy profiles_insert on profiles
  for insert with check ((select public.is_admin()));
create policy profiles_update on profiles
  for update
  using ((select auth.uid()) = id or (select public.is_admin()))
  with check ((select auth.uid()) = id or (select public.is_admin()));
create policy profiles_delete on profiles
  for delete using ((select public.is_admin()));

-- prayers
drop policy if exists prayers_admin_write on prayers;
drop policy if exists prayers_read on prayers;
drop policy if exists prayers_select on prayers;
drop policy if exists prayers_insert on prayers;
drop policy if exists prayers_update on prayers;
drop policy if exists prayers_delete on prayers;

create policy prayers_select on prayers
  for select using (deleted_at is null or (select public.is_admin()));
create policy prayers_insert on prayers
  for insert with check ((select public.is_admin()));
create policy prayers_update on prayers
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy prayers_delete on prayers
  for delete using ((select public.is_admin()));

-- prayer_series
drop policy if exists prayer_series_admin_write on prayer_series;
drop policy if exists prayer_series_read on prayer_series;
drop policy if exists prayer_series_select on prayer_series;
drop policy if exists prayer_series_insert on prayer_series;
drop policy if exists prayer_series_update on prayer_series;
drop policy if exists prayer_series_delete on prayer_series;

create policy prayer_series_select on prayer_series
  for select using (deleted_at is null or (select public.is_admin()));
create policy prayer_series_insert on prayer_series
  for insert with check ((select public.is_admin()));
create policy prayer_series_update on prayer_series
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy prayer_series_delete on prayer_series
  for delete using ((select public.is_admin()));

-- content_pages
drop policy if exists content_pages_admin_write on content_pages;
drop policy if exists content_pages_read on content_pages;
drop policy if exists content_pages_select on content_pages;
drop policy if exists content_pages_insert on content_pages;
drop policy if exists content_pages_update on content_pages;
drop policy if exists content_pages_delete on content_pages;

create policy content_pages_select on content_pages
  for select using (true);
create policy content_pages_insert on content_pages
  for insert with check ((select public.is_admin()));
create policy content_pages_update on content_pages
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy content_pages_delete on content_pages
  for delete using ((select public.is_admin()));

-- prayer_logs
drop policy if exists prayer_logs_own_read on prayer_logs;
drop policy if exists prayer_logs_own_write on prayer_logs;
drop policy if exists prayer_logs_own_update on prayer_logs;
drop policy if exists prayer_logs_own_delete on prayer_logs;
drop policy if exists prayer_logs_select on prayer_logs;
drop policy if exists prayer_logs_insert on prayer_logs;
drop policy if exists prayer_logs_update on prayer_logs;
drop policy if exists prayer_logs_delete on prayer_logs;

create policy prayer_logs_select on prayer_logs
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy prayer_logs_insert on prayer_logs
  for insert with check (
    -- Anonyme: må logge med user_id=null (matcher auth.uid()=null).
    -- Innloggede: må logge med eget user_id.
    (user_id is null and (select auth.uid()) is null)
    or (select auth.uid()) = user_id
  );
create policy prayer_logs_update on prayer_logs
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy prayer_logs_delete on prayer_logs
  for delete using ((select auth.uid()) = user_id);

-- user_progress (én policy FOR ALL siden det bare er én)
drop policy if exists user_progress_own on user_progress;
create policy user_progress_own on user_progress
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
