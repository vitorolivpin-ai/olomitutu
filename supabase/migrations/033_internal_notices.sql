-- Central de Avisos e Solicitações entre Setores.
-- Forward-only. Do not execute automatically or alter 030-032.

create table if not exists public.internal_notices (
  id uuid primary key default gen_random_uuid(),
  notice_type text not null check (notice_type in ('sector_request', 'filhos_announcement')),
  title text not null check (char_length(trim(title)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 3 and 4000),
  source_sector text not null check (source_sector in ('administracao', 'pai_de_santo', 'financeiro', 'estoque', 'biblioteca')),
  target_sector text check (target_sector is null or target_sector in ('administracao', 'pai_de_santo', 'financeiro', 'estoque', 'biblioteca')),
  target_audience text check (target_audience is null or target_audience = 'filhos_de_santo'),
  priority text not null default 'normal' check (priority in ('normal', 'importante', 'urgente')),
  status text not null check (status in ('novo', 'visualizado', 'em_andamento', 'concluido', 'cancelado', 'arquivado', 'rascunho', 'publicado', 'expirado')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  viewed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_notices_kind_target_chk check (
    (notice_type = 'sector_request' and target_sector is not null and target_audience is null
      and status in ('novo', 'visualizado', 'em_andamento', 'concluido', 'cancelado', 'arquivado'))
    or
    (notice_type = 'filhos_announcement' and source_sector = 'administracao'
      and target_sector is null and target_audience = 'filhos_de_santo'
      and status in ('rascunho', 'publicado', 'expirado', 'arquivado'))
  )
);

create table if not exists public.internal_notice_history (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.internal_notices(id) on delete cascade,
  action text not null check (action in ('created', 'viewed', 'assigned', 'started', 'completed', 'cancelled', 'archived', 'published', 'expired')),
  from_status text,
  to_status text,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists internal_notices_target_status_idx
  on public.internal_notices (target_sector, status, created_at desc);
create index if not exists internal_notices_source_created_idx
  on public.internal_notices (source_sector, created_at desc);
create index if not exists internal_notices_assigned_idx
  on public.internal_notices (assigned_to, status);
create index if not exists internal_notices_children_dates_idx
  on public.internal_notices (target_audience, starts_at, expires_at)
  where notice_type = 'filhos_announcement';
create index if not exists internal_notice_history_notice_idx
  on public.internal_notice_history (notice_id, created_at);

-- Internal notice subscriptions reuse the existing push table. The constraint
-- excludes visitor/Jogo subscriptions governed by migrations 031-032.
do $$
begin
  if to_regclass('public.push_subscriptions') is not null then
    execute 'drop policy if exists push_subscriptions_internal_notice_own on public.push_subscriptions';
    execute $policy$
      create policy push_subscriptions_internal_notice_own
      on public.push_subscriptions for all
      using (
        user_id = auth.uid()
        and jogo_id is null
        and visitor_token_hash is null
        and (
          public.current_role() in ('administrador', 'tesouraria', 'estoque', 'biblioteca', 'pai_de_santo')
          or (
            public.current_role() = 'cliente'
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and p.person_kind = 'filho_de_santo'
                and p.approval_status = 'approved'
            )
          )
        )
      )
      with check (
        user_id = auth.uid()
        and jogo_id is null
        and visitor_token_hash is null
        and (
          public.current_role() in ('administrador', 'tesouraria', 'estoque', 'biblioteca', 'pai_de_santo')
          or (
            public.current_role() = 'cliente'
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and p.person_kind = 'filho_de_santo'
                and p.approval_status = 'approved'
            )
          )
        )
      )
    $policy$;
  end if;
end;
$$;

alter table public.internal_notices enable row level security;
alter table public.internal_notice_history enable row level security;
revoke all on public.internal_notices from anon, authenticated;
revoke all on public.internal_notice_history from anon, authenticated;
grant select on public.internal_notices to authenticated;
grant select on public.internal_notice_history to authenticated;

create or replace function public.current_internal_sector()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case role
    when 'administrador' then 'administracao'
    when 'pai_de_santo' then 'pai_de_santo'
    when 'tesouraria' then 'financeiro'
    when 'estoque' then 'estoque'
    when 'biblioteca' then 'biblioteca'
    else null
  end
  from public.profiles
  where id = auth.uid()
    and approval_status = 'approved'
  limit 1;
$$;

revoke all on function public.current_internal_sector() from public;
grant execute on function public.current_internal_sector() to authenticated;

drop policy if exists internal_notices_select_authorized on public.internal_notices;
create policy internal_notices_select_authorized on public.internal_notices
for select using (
  public.current_role() = 'administrador'
  or created_by = auth.uid()
  or assigned_to = auth.uid()
  or (
    notice_type = 'sector_request'
    and current_internal_sector() is not null
    and (source_sector = current_internal_sector() or target_sector = current_internal_sector())
  )
  or (
    notice_type = 'filhos_announcement'
    and status = 'publicado'
    and target_audience = 'filhos_de_santo'
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at > now())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'cliente'
        and p.person_kind = 'filho_de_santo'
        and p.approval_status = 'approved'
    )
  )
);

drop policy if exists internal_notice_history_select_authorized on public.internal_notice_history;
create policy internal_notice_history_select_authorized on public.internal_notice_history
for select using (
  public.current_internal_sector() is not null
  and
  exists (
    select 1 from public.internal_notices n
    where n.id = internal_notice_history.notice_id
  )
);

create or replace function public.create_internal_notice(
  p_notice_type text,
  p_title text,
  p_body text,
  p_target_sector text default null,
  p_priority text default 'normal',
  p_due_at timestamptz default null,
  p_starts_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_publish boolean default false
)
returns public.internal_notices
language plpgsql
security definer
set search_path = public
as $$
declare
  source text;
  role public.user_role;
  created_notice public.internal_notices%rowtype;
begin
  role := public.current_role();
  source := public.current_internal_sector();
  if role is null or source is null then
    raise exception 'not authorized';
  end if;
  if char_length(trim(coalesce(p_title, ''))) not between 3 and 120 then
    raise exception 'invalid title';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 3 and 4000 then
    raise exception 'invalid description';
  end if;
  if coalesce(p_priority, 'normal') not in ('normal', 'importante', 'urgente') then
    raise exception 'invalid priority';
  end if;

  if p_notice_type = 'sector_request' then
    if p_target_sector is null
      or p_target_sector not in ('administracao', 'pai_de_santo', 'financeiro', 'estoque', 'biblioteca')
      or p_target_sector = source
      or p_publish then
      raise exception 'invalid sector target';
    end if;
    if p_due_at is not null and p_due_at < now() then
      raise exception 'invalid due date';
    end if;

    insert into public.internal_notices (
      notice_type, title, body, source_sector, target_sector, target_audience,
      priority, status, created_by, due_at
    ) values (
      'sector_request', trim(p_title), trim(p_body), source, p_target_sector, null,
      coalesce(p_priority, 'normal'), 'novo', auth.uid(), p_due_at
    ) returning * into created_notice;
  elsif p_notice_type = 'filhos_announcement' then
    if role <> 'administrador' or source <> 'administracao'
      or p_target_sector is not null
      or p_starts_at is null
      or (p_expires_at is not null and p_starts_at is not null and p_expires_at <= p_starts_at) then
      raise exception 'not authorized to publish children announcement';
    end if;

    insert into public.internal_notices (
      notice_type, title, body, source_sector, target_sector, target_audience,
      priority, status, created_by, starts_at, expires_at
    ) values (
      'filhos_announcement', trim(p_title), trim(p_body), source, null, 'filhos_de_santo',
      coalesce(p_priority, 'normal'), case when p_publish then 'publicado' else 'rascunho' end,
      auth.uid(), p_starts_at, p_expires_at
    ) returning * into created_notice;
  else
    raise exception 'invalid notice type';
  end if;

  insert into public.internal_notice_history (
    notice_id, action, from_status, to_status, changed_by
  ) values (
    created_notice.id, case when p_notice_type = 'filhos_announcement' and p_publish then 'published' else 'created' end,
    null, created_notice.status, auth.uid()
  );

  return created_notice;
end;
$$;

revoke all on function public.create_internal_notice(text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean) from public;
grant execute on function public.create_internal_notice(text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean) to authenticated;

create or replace function public.transition_internal_notice(
  p_notice_id uuid,
  p_action text,
  p_assigned_to uuid default null,
  p_note text default null
)
returns public.internal_notices
language plpgsql
security definer
set search_path = public
as $$
declare
  role public.user_role;
  sector text;
  item public.internal_notices%rowtype;
  old_status text;
  new_status text;
  history_action text;
begin
  role := public.current_role();
  sector := public.current_internal_sector();
  if role is null then raise exception 'not authorized'; end if;
  if role = 'cliente' then raise exception 'read only'; end if;

  select * into item
  from public.internal_notices
  where id = p_notice_id
  for update;
  if not found then raise exception 'notice not found'; end if;
  if role <> 'administrador'
    and item.created_by <> auth.uid()
    and item.assigned_to is distinct from auth.uid()
    and item.source_sector is distinct from sector
    and item.target_sector is distinct from sector
    and not (
      item.notice_type = 'filhos_announcement'
      and role = 'cliente'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.person_kind = 'filho_de_santo'
      )
    ) then
    raise exception 'not authorized';
  end if;

  old_status := item.status;
  new_status := old_status;
  history_action := p_action;

  if p_action = 'viewed' then
    if item.notice_type <> 'sector_request'
      or (item.target_sector is distinct from sector and role <> 'administrador') then
      raise exception 'not authorized';
    end if;
    if item.status = 'novo' then new_status := 'visualizado'; end if;
    update public.internal_notices
    set status = new_status, viewed_at = coalesce(viewed_at, now()), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'assume' then
    if item.notice_type <> 'sector_request'
      or (item.target_sector is distinct from sector and role <> 'administrador')
      or item.status not in ('novo', 'visualizado', 'em_andamento') then
      raise exception 'not authorized';
    end if;
    if p_assigned_to is not null and p_assigned_to <> auth.uid() then
      raise exception 'can only assign to yourself';
    end if;
    history_action := 'assigned';
    if item.status = 'novo' then new_status := 'visualizado'; end if;
    update public.internal_notices
    set assigned_to = auth.uid(), status = new_status,
        viewed_at = coalesce(viewed_at, now()), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'started' then
    if item.notice_type <> 'sector_request'
      or (item.target_sector is distinct from sector and role <> 'administrador')
      or item.status not in ('novo', 'visualizado', 'em_andamento') then
      raise exception 'not authorized';
    end if;
    if item.assigned_to is not null and item.assigned_to <> auth.uid() and role <> 'administrador' then
      raise exception 'assigned to another user';
    end if;
    new_status := 'em_andamento';
    update public.internal_notices
    set status = new_status, assigned_to = coalesce(assigned_to, auth.uid()),
        viewed_at = coalesce(viewed_at, now()), started_at = coalesce(started_at, now()), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'completed' then
    if item.notice_type <> 'sector_request'
      or (item.target_sector is distinct from sector and role <> 'administrador')
      or item.status <> 'em_andamento' then
      raise exception 'not authorized';
    end if;
    if item.assigned_to is not null and item.assigned_to <> auth.uid() and role <> 'administrador' then
      raise exception 'assigned to another user';
    end if;
    new_status := 'concluido';
    update public.internal_notices
    set status = new_status, completed_at = now(), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'cancelled' then
    if role <> 'administrador' and item.created_by <> auth.uid() then
      raise exception 'not authorized';
    end if;
    if item.notice_type <> 'sector_request' or item.status in ('concluido', 'cancelado', 'arquivado') then
      raise exception 'invalid transition';
    end if;
    new_status := 'cancelado';
    update public.internal_notices set status = new_status, cancelled_at = now(), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'archived' then
    if role <> 'administrador'
      and item.created_by <> auth.uid()
      and item.target_sector is distinct from sector then
      raise exception 'not authorized';
    end if;
    if item.status not in ('concluido', 'cancelado', 'expirado', 'rascunho', 'publicado') then
      raise exception 'invalid transition';
    end if;
    new_status := 'arquivado';
    update public.internal_notices set status = new_status, archived_at = now(), updated_at = now()
    where id = p_notice_id returning * into item;
  elsif p_action = 'published' then
    if role <> 'administrador' or item.notice_type <> 'filhos_announcement' or item.status <> 'rascunho' then
      raise exception 'not authorized';
    end if;
    new_status := 'publicado';
    update public.internal_notices set status = new_status, updated_at = now()
    where id = p_notice_id returning * into item;
  else
    raise exception 'invalid action';
  end if;

  insert into public.internal_notice_history (
    notice_id, action, from_status, to_status, changed_by, note
  ) values (
    p_notice_id, history_action, old_status, new_status, auth.uid(), nullif(trim(p_note), '')
  );

  return item;
end;
$$;

revoke all on function public.transition_internal_notice(uuid, text, uuid, text) from public;
grant execute on function public.transition_internal_notice(uuid, text, uuid, text) to authenticated;

create or replace function public.expire_internal_notices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_notice record;
  expired_count integer := 0;
begin
  if auth.uid() is null or public.current_internal_sector() is null then
    raise exception 'not authorized';
  end if;

  for expired_notice in
    update public.internal_notices
    set status = 'expirado', updated_at = now()
    where notice_type = 'filhos_announcement'
      and status = 'publicado'
      and expires_at is not null
      and expires_at <= now()
    returning id, status
  loop
    insert into public.internal_notice_history (
      notice_id, action, from_status, to_status, changed_by
    ) values (
      expired_notice.id, 'expired', 'publicado', 'expirado', auth.uid()
    );
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_internal_notices() from public;
grant execute on function public.expire_internal_notices() to authenticated;