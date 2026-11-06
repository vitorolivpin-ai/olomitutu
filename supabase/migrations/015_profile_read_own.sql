-- Garante leitura do próprio perfil (login) mesmo com RLS
-- e função segura para o app buscar o perfil autenticado.

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select using (
  id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
);

create or replace function public.get_own_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_own_profile() from public;
grant execute on function public.get_own_profile() to authenticated, anon;
