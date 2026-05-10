-- Migrasjon 003: Fiks is_admin() — samme search_path-fallgruve som
-- handle_new_user (migrasjon 002).
--
-- Symptom: Admin-panelet henger på spinner. is_admin() kalles av
-- RLS-policies for å sjekke om brukeren er admin, men feiler stille
-- når funksjonen kjører uten 'public' i søkestien — RLS evaluerer
-- da som false og noen queries returnerer null/error på subtile måter.

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

-- Sikre at authenticated-rollen (alle innloggede brukere) kan kalle
-- funksjonen.
grant execute on function public.is_admin() to authenticated, anon;
