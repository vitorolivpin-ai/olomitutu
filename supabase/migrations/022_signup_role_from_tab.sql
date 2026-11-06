-- Cadastro pela aba: o papel pedido (estoque, biblioteca…) fica no profiles.role
-- mesmo enquanto pending. A aprovação só muda approval_status (e confirma o role).
-- Antes, tudo caía em role=cliente — login nas abas da casa falhava.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_role text;
  p_kind text;
  final_role public.user_role;
  final_status public.approval_status;
  final_kind public.person_kind;
  final_area public.user_role;
begin
  req_role := nullif(trim(coalesce(new.raw_user_meta_data->>'requested_role', '')), '');
  p_kind := nullif(trim(coalesce(new.raw_user_meta_data->>'person_kind', '')), '');

  if p_kind in ('filho_de_santo', 'cliente', 'administrador') then
    final_kind := p_kind::public.person_kind;
  else
    final_kind := null;
  end if;

  if req_role in ('administrador', 'tesouraria', 'estoque', 'biblioteca', 'pai_de_santo') then
    final_area := req_role::public.user_role;
    -- Aba = papel; pending só impede entrar até o Pai aceitar
    final_role := req_role::public.user_role;
    final_status := 'pending';
  elsif req_role is null or req_role = 'cliente' then
    final_area := 'cliente';
    final_role := 'cliente';
    final_status := 'approved';
    if final_kind is null then
      final_kind := 'cliente';
    end if;
  else
    final_area := 'cliente';
    final_role := 'cliente';
    final_status := 'approved';
  end if;

  insert into public.profiles (
    id, full_name, email, role, requested_role, approval_status, person_kind, signup_area
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    final_role,
    coalesce(req_role, 'cliente')::public.user_role,
    final_status,
    final_kind,
    final_area
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Corrige contas já gravadas como cliente por engano (aba era outra)
update public.profiles
set
  role = coalesce(signup_area, requested_role),
  updated_at = now()
where coalesce(signup_area, requested_role) is not null
  and coalesce(signup_area, requested_role)::text <> 'cliente'
  and role = 'cliente';
