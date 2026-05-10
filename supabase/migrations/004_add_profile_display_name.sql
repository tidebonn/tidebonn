-- Migrasjon 004: Legg til display_name på profiles
--
-- Tidligere skrev updateMe display_name til auth.users.user_metadata
-- via sb.auth.updateUser({ data: ... }). Det kallet hang i praksis
-- (sannsynligvis pga session refresh eller intern køing) og blokkerte
-- saveSettings.
--
-- Løsning: lagre alle profil-felt i public.profiles. Vi har full
-- kontroll på den tabellen og kan oppdatere den raskt med en vanlig
-- PostgREST-PATCH uten å gå om auth-server.

alter table public.profiles
  add column if not exists display_name text;
