-- Cliente real do Auth precisa de um registro em clients + profiles.client_id
-- Sem isso o app mostra "Área exclusiva do cliente" e trava chat/horários.

create or replace function public.ensure_own_client()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  p_email text;
  p_name text;
  p_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select email, full_name, role, client_id
    into p_email, p_name, p_role, cid
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'profile not found';
  end if;

  if p_role is distinct from 'cliente' then
    return cid;
  end if;

  if cid is not null then
    return cid;
  end if;

  insert into public.clients (full_name, phone, email)
  values (
    coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)),
    'a definir',
    p_email
  )
  returning id into cid;

  update public.profiles
  set client_id = cid, updated_at = now()
  where id = auth.uid();

  return cid;
end;
$$;

revoke all on function public.ensure_own_client() from public;
grant execute on function public.ensure_own_client() to authenticated;

-- Cliente pode atualizar o próprio cadastro em clients
drop policy if exists clients_self_update on public.clients;
create policy clients_self_update on public.clients
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
);
