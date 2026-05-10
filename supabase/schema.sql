-- Tidebønn – Supabase-skjema
-- Kjøres én gang i Supabase SQL Editor på nytt prosjekt.
-- Idempotent der det er trygt (IF NOT EXISTS), men forutsetter tomme tabeller.

-- =============================================================
-- ENUM-typer
-- =============================================================
do $$ begin
  create type time_of_day as enum
    ('matutin','laudes','prim','ters','sekst','non','vesper','kompletorium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

-- =============================================================
-- profiles: auto-opprettes ved ny auth-bruker (via trigger under)
-- =============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role app_role not null default 'user',
  created_at timestamptz not null default now()
);

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
  total_prayers_completed int not null default 0,
  total_minutes int not null default 0,
  gender text,
  birth_date date,
  updated_at timestamptz not null default now()
);

-- =============================================================
-- prayer_logs
-- =============================================================
create table if not exists prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_id uuid references prayers(id) on delete set null,
  series_id uuid references prayer_series(id) on delete set null,
  day int,
  time_of_day time_of_day,
  duration_minutes int,
  reading_mode text,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists prayer_logs_user_created_idx
  on prayer_logs (user_id, created_at desc);

-- =============================================================
-- content_pages ("Om appen", "Om tidebønn" osv.)
-- =============================================================
create table if not exists content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  content text,
  last_edited_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- =============================================================
-- Triggere: updated_at + auto-opprett profil
-- =============================================================
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prayer_series_touch on prayer_series;
create trigger prayer_series_touch
  before update on prayer_series
  for each row execute function touch_updated_at();

drop trigger if exists prayers_touch on prayers;
create trigger prayers_touch
  before update on prayers
  for each row execute function touch_updated_at();

drop trigger if exists user_progress_touch on user_progress;
create trigger user_progress_touch
  before update on user_progress
  for each row execute function touch_updated_at();

drop trigger if exists content_pages_touch on content_pages;
create trigger content_pages_touch
  before update on content_pages
  for each row execute function touch_updated_at();

-- search_path = public må settes eksplisitt; uten det vil funksjonen
-- ikke finne public-tabellene når auth.signUp trigger den.
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

-- Hjelpefunksjon: er innlogget bruker admin?
-- search_path = public må settes eksplisitt; ellers feiler den når
-- den kalles fra RLS-context (auth.signUp m.fl.).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;
grant execute on function public.is_admin() to authenticated, anon;

-- profiles: du ser egen rad; admin ser alle. Du kan ikke endre din egen rolle.
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select using (auth.uid() = id or is_admin());

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- prayer_series, prayers, content_pages: offentlig lesing (is_active + ikke slettet)
drop policy if exists prayer_series_read on prayer_series;
create policy prayer_series_read on prayer_series
  for select using (deleted_at is null);

drop policy if exists prayer_series_admin_write on prayer_series;
create policy prayer_series_admin_write on prayer_series
  for all using (is_admin()) with check (is_admin());

drop policy if exists prayers_read on prayers;
create policy prayers_read on prayers
  for select using (deleted_at is null);

drop policy if exists prayers_admin_write on prayers;
create policy prayers_admin_write on prayers
  for all using (is_admin()) with check (is_admin());

drop policy if exists content_pages_read on content_pages;
create policy content_pages_read on content_pages
  for select using (true);

drop policy if exists content_pages_admin_write on content_pages;
create policy content_pages_admin_write on content_pages
  for all using (is_admin()) with check (is_admin());

-- user_progress, prayer_logs: kun egne rader
drop policy if exists user_progress_own on user_progress;
create policy user_progress_own on user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists prayer_logs_own_read on prayer_logs;
create policy prayer_logs_own_read on prayer_logs
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists prayer_logs_own_write on prayer_logs;
create policy prayer_logs_own_write on prayer_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists prayer_logs_own_update on prayer_logs;
create policy prayer_logs_own_update on prayer_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists prayer_logs_own_delete on prayer_logs;
create policy prayer_logs_own_delete on prayer_logs
  for delete using (auth.uid() = user_id);
