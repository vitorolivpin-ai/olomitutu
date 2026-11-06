-- Cria perfil automaticamente ao cadastrar usuário no Auth
-- Role padrão: cliente (staff ajusta profiles.role no Table Editor)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Usuário autenticado pode ler o próprio perfil (já coberto em 002;
-- garante select mesmo antes de current_role existir no 1º request)
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select using (
  id = auth.uid() or public.current_role() = 'administrador'
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (
  id = auth.uid() or public.current_role() = 'administrador'
)
with check (
  id = auth.uid() or public.current_role() = 'administrador'
);
