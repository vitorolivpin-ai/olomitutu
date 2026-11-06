-- Cadastro por área com aprovação do Pai de Santo
-- Cliente: aprovado na hora. Demais áreas: pending até o Pai (ou admin) aceitar.

create type public.approval_status as enum ('pending', 'approved', 'rejected');

alter table public.profiles
  add column if not exists requested_role public.user_role,
  add column if not exists approval_status public.approval_status not null default 'approved';

-- Trigger: lê requested_role do metadata do Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_role text;
  final_role public.user_role;
  final_status public.approval_status;
begin
  req_role := nullif(trim(coalesce(new.raw_user_meta_data->>'requested_role', '')), '');

  if req_role is null or req_role = 'cliente' then
    final_role := 'cliente';
    final_status := 'approved';
  elsif req_role in ('administrador', 'tesouraria', 'pai_de_santo', 'estoque', 'biblioteca') then
    -- Até aprovar, perfil fica como cliente (sem acesso à área pedida)
    final_role := 'cliente';
    final_status := 'pending';
  else
    final_role := 'cliente';
    final_status := 'approved';
    req_role := 'cliente';
  end if;

  insert into public.profiles (id, full_name, email, role, requested_role, approval_status)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    final_role,
    coalesce(req_role, 'cliente')::public.user_role,
    final_status
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Pai de Santo e Admin veem todos os perfis (para aprovar)
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select using (
  id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
);

-- Atualização: próprio usuário OU staff que aprova
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (
  id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
)
with check (
  id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
);
