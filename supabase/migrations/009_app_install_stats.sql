-- 009_app_install_stats.sql
--
-- Forberedelse for PWA/push-statistikk i Admin:
--   1. Ny kolonne installed_app_at på profiles. Settes første gang
--      vi ser en innlogget bruker i standalone-modus (= PWA er
--      installert). Brukes til å telle hvor mange registrerte
--      brukere som har lastet ned appen.
--   2. Admins får SELECT-tilgang på push_subscriptions og
--      push_preferences, slik at vi kan aggregere over alle.

alter table profiles
  add column if not exists installed_app_at timestamptz;

-- Admin-lesepolicy for push-tabellene (eksisterer trolig som
-- bruker-eier, men admin trenger å se på tvers for aggregat).
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'push_subscriptions') then
    drop policy if exists push_subscriptions_admin_select on push_subscriptions;
    create policy push_subscriptions_admin_select on push_subscriptions
      for select using ((select public.is_admin()));
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'push_preferences') then
    drop policy if exists push_preferences_admin_select on push_preferences;
    create policy push_preferences_admin_select on push_preferences
      for select using ((select public.is_admin()));
  end if;
end $$;
