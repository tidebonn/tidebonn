-- Migrasjon 002: Fiks handle_new_user-trigger
--
-- Symptom: "Database error saving new user" når man prøver å logge
-- inn første gang.
--
-- Årsak: Funksjonen kjører i auth-konteksten med security definer,
-- men uten eksplisitt search_path. Når auth.signUp trigger den ligger
-- ikke 'public' i sti-en, så insertet mot profiles/user_progress
-- feiler ('relation does not exist'-internt).
--
-- Fiks: explicit `set search_path = public` + fullt kvalifiserte
-- tabellnavn så funksjonen alltid finner riktig tabell.

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

-- Trigger-en peker allerede på public.handle_new_user; vi re-installer
-- den for å være sikker på at den binder mot den oppdaterte funksjonen.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
