-- Security hardening: self-service profile fields and explicit client ownership.

alter table public.clients
  add column if not exists responsible_profile_id uuid
    references public.profiles (id) on delete set null;

create index if not exists clients_responsible_profile_idx
  on public.clients (responsible_profile_id);

-- New account clients are assigned only when exactly one approved Pai exists.
-- Existing unassigned records are never backfilled by this function.
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
  owner_ids uuid[];
  owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select email, full_name, role, client_id
    into p_email, p_name, p_role, cid
  from public.profiles
  where id = auth.uid()
    and approval_status = 'approved';

  if not found then
    raise exception 'approved profile not found';
  end if;
  if p_role is distinct from 'cliente' then
    return cid;
  end if;

  select array_agg(id order by created_at)
    into owner_ids
  from public.profiles
  where role = 'pai_de_santo'
    and approval_status = 'approved';

  if coalesce(array_length(owner_ids, 1), 0) = 1 then
    owner_id := owner_ids[1];
  end if;

  if cid is null then
    insert into public.clients (
      full_name, phone, email, responsible_profile_id
    ) values (
      coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)),
      'a definir',
      p_email,
      owner_id
    ) returning id into cid;

    update public.profiles
    set client_id = cid, updated_at = now()
    where id = auth.uid();
  end if;

  return cid;
end;
$$;

revoke all on function public.ensure_own_client() from public;
grant execute on function public.ensure_own_client() to authenticated;

-- Pending/rejected accounts must not gain database permissions from their role.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and approval_status = 'approved'
  limit 1;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to anon, authenticated;

-- Signup metadata may request access but cannot approve a child or admin account.
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
  end if;

  if req_role in ('administrador', 'tesouraria', 'estoque', 'biblioteca', 'pai_de_santo') then
    final_role := req_role::public.user_role;
    final_area := final_role;
    final_status := 'pending';
  else
    final_role := 'cliente';
    final_area := 'cliente';
    final_status := case
      when final_kind in ('filho_de_santo', 'administrador') then 'pending'::public.approval_status
      else 'approved'::public.approval_status
    end;
    if final_kind is null then final_kind := 'cliente'; end if;
    req_role := 'cliente';
  end if;

  insert into public.profiles (
    id, full_name, email, role, requested_role, approval_status, person_kind, signup_area
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    final_role,
    req_role::public.user_role,
    final_status,
    final_kind,
    final_area
  ) on conflict (id) do nothing;

  return new;
end;
$$;

-- Users can read their own profile. The Pai can read staff profiles, pending
-- approvals, and client profiles only when the linked client is theirs.
drop policy if exists profiles_select_own_or_pai on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_pai on public.profiles
for select using (
  id = auth.uid()
  or (
    public.current_role() = 'pai_de_santo'
    and (
      approval_status = 'pending'
      or role <> 'cliente'
      or exists (
        select 1
        from public.clients c
        where c.id = profiles.client_id
          and c.responsible_profile_id = auth.uid()
      )
    )
  )
);

-- Remove row-wide self-update rights and grant only personal fields.
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_personal on public.profiles;
revoke update on table public.profiles from public, anon, authenticated;
revoke update (
  role, requested_role, approval_status, person_kind, signup_area, client_id
) on table public.profiles from public, anon, authenticated;
grant update (full_name, email, phone, avatar_url, updated_at)
  on table public.profiles to authenticated;

create policy profiles_update_personal on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

-- Only the Pai who owns a client can see or manage that client's record.
drop policy if exists clients_staff on public.clients;
drop policy if exists clients_owner_access on public.clients;
drop policy if exists clients_self on public.clients;
drop policy if exists clients_self_update on public.clients;
create policy clients_owner_access on public.clients
for all using (
  public.current_role() = 'pai_de_santo'
  and responsible_profile_id = auth.uid()
)
with check (
  public.current_role() = 'pai_de_santo'
  and responsible_profile_id = auth.uid()
);

create policy clients_self on public.clients
for select using (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
);

create policy clients_self_update on public.clients
for update using (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
)
with check (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
);

-- Clients may update their own registration fields, never the responsible Pai.
revoke update on table public.clients from public, anon, authenticated;
revoke update (responsible_profile_id)
  on table public.clients from public, anon, authenticated;
grant update (full_name, phone, email, birth_date, registration_complete, updated_at)
  on table public.clients to authenticated;

-- Appointment access follows the owning client or the authenticated client.
drop policy if exists appointments_staff on public.appointments;
drop policy if exists appointments_owner_access on public.appointments;
drop policy if exists appointments_self on public.appointments;
drop policy if exists appointments_self_insert on public.appointments;
create policy appointments_owner_access on public.appointments
for all using (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = appointments.client_id
      and c.responsible_profile_id = auth.uid()
  )
)
with check (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = appointments.client_id
      and c.responsible_profile_id = auth.uid()
  )
);

create policy appointments_self on public.appointments
for select using (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = appointments.client_id
  )
);

create policy appointments_self_insert on public.appointments
for insert with check (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = appointments.client_id
  )
);

-- Private messages follow the same ownership rule; finance has no access here.
drop policy if exists messages_staff on public.messages;
drop policy if exists messages_owner_access on public.messages;
drop policy if exists messages_self on public.messages;
drop policy if exists messages_self_insert on public.messages;
create policy messages_owner_access on public.messages
for all using (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = messages.client_id
      and c.responsible_profile_id = auth.uid()
  )
)
with check (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = messages.client_id
      and c.responsible_profile_id = auth.uid()
  )
);

create policy messages_self on public.messages
for select using (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

create policy messages_self_insert on public.messages
for insert with check (
  public.current_role() = 'cliente'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

-- Internal notes are available only to the responsible Pai.
drop policy if exists internal_notes_staff on public.internal_notes;
drop policy if exists internal_notes_owner_access on public.internal_notes;
create policy internal_notes_owner_access on public.internal_notes
for all using (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = internal_notes.client_id
      and c.responsible_profile_id = auth.uid()
  )
)
with check (
  public.current_role() = 'pai_de_santo'
  and exists (
    select 1 from public.clients c
    where c.id = internal_notes.client_id
      and c.responsible_profile_id = auth.uid()
  )
);

-- Admin may manage the catalog, but cannot resolve an account purchase to a
-- private client or read its invoice/contact data.
do $$
begin
  if to_regclass('public.shop_purchases') is not null then
    execute 'drop policy if exists shop_purchases_staff on public.shop_purchases';
    execute $policy$
      create policy shop_purchases_staff on public.shop_purchases
      for all using (public.current_role() in ('pai_de_santo', 'tesouraria'))
      with check (public.current_role() in ('pai_de_santo', 'tesouraria'))
    $policy$;
  end if;
end;
$$;

-- Notifications with private appointment/chat context are not an Admin resource.
drop policy if exists notifications_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_select_authorized on public.notifications;
create policy notifications_select_authorized on public.notifications
for select using (
  (
    user_id = auth.uid()
    and (public.current_role() <> 'administrador' or type not in ('chat', 'agenda', 'atendimento', 'financeiro'))
    and (
      type not in ('chat', 'agenda', 'atendimento')
      or (
        type = 'agenda'
        and related_id is null
        and public.current_role() = 'cliente'
      )
      or (
        public.current_role() = 'pai_de_santo'
        and (
          exists (
            select 1 from public.clients c
            where c.id::text = notifications.related_id
              and c.responsible_profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.appointments a
            join public.clients c on c.id = a.client_id
            where a.id::text = notifications.related_id
              and c.responsible_profile_id = auth.uid()
          )
        )
      )
      or (
        public.current_role() = 'cliente'
        and (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.client_id::text = notifications.related_id
          )
          or exists (
            select 1
            from public.appointments a
            join public.profiles p on p.client_id = a.client_id
            where p.id = auth.uid()
              and a.id::text = notifications.related_id
          )
        )
      )
    )
  )
  or (
    user_id is null
    and audience is not null
    and public.current_role() = any(audience)
    and (public.current_role() <> 'administrador' or type not in ('chat', 'agenda', 'atendimento', 'financeiro'))
    and (
      type not in ('chat', 'agenda', 'atendimento')
      or (
        type = 'agenda'
        and related_id is null
        and public.current_role() = 'cliente'
      )
      or (
        public.current_role() = 'pai_de_santo'
        and (
          exists (
            select 1 from public.clients c
            where c.id::text = notifications.related_id
              and c.responsible_profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.appointments a
            join public.clients c on c.id = a.client_id
            where a.id::text = notifications.related_id
              and c.responsible_profile_id = auth.uid()
          )
        )
      )
      or (
        public.current_role() = 'cliente'
        and (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.client_id::text = notifications.related_id
          )
          or exists (
            select 1
            from public.appointments a
            join public.profiles p on p.client_id = a.client_id
            where p.id = auth.uid()
              and a.id::text = notifications.related_id
          )
        )
      )
    )
  )
);

create policy notifications_update_own on public.notifications
for update using (
  user_id = auth.uid()
  and (public.current_role() <> 'administrador' or type not in ('chat', 'agenda', 'atendimento', 'financeiro'))
)
with check (
  user_id = auth.uid()
  and (public.current_role() <> 'administrador' or type not in ('chat', 'agenda', 'atendimento', 'financeiro'))
);

-- Calendar credentials and event synchronization are Pai-only and own-row scoped.
do $$
begin
  if to_regclass('public.google_calendar_connections') is not null then
    execute 'drop policy if exists gcal_select_own on public.google_calendar_connections';
    execute 'drop policy if exists gcal_upsert_own on public.google_calendar_connections';
    execute $policy$
      create policy gcal_select_own on public.google_calendar_connections
      for select using (
        public.current_role() = 'pai_de_santo'
        and user_id = auth.uid()
      )
    $policy$;
    execute $policy$
      create policy gcal_upsert_own on public.google_calendar_connections
      for all using (
        public.current_role() = 'pai_de_santo'
        and user_id = auth.uid()
      )
      with check (
        public.current_role() = 'pai_de_santo'
        and user_id = auth.uid()
      )
    $policy$;
  end if;
end;
$$;

-- Chat attachments use client-scoped paths in a private bucket.
update storage.buckets set public = false where id = 'chat';
alter table public.messages add column if not exists audio_path text;
alter table public.messages add column if not exists video_path text;
update public.messages
set audio_path = regexp_replace(audio_url, '^.*/storage/v1/object/public/chat/', '')
where audio_path is null and audio_url like '%/storage/v1/object/public/chat/%';
update public.messages
set video_path = regexp_replace(video_url, '^.*/storage/v1/object/public/chat/', '')
where video_path is null and video_url like '%/storage/v1/object/public/chat/%';
update public.messages
set audio_url = null
where audio_path is not null;
update public.messages
set video_url = null
where video_path is not null;
drop policy if exists chat_storage_select on storage.objects;
drop policy if exists chat_storage_write on storage.objects;
drop policy if exists chat_storage_select_owned on storage.objects;
drop policy if exists chat_storage_insert_owned on storage.objects;

create policy chat_storage_select_owned on storage.objects
for select using (
  bucket_id = 'chat'
  and exists (
    select 1 from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and (
        (public.current_role() = 'pai_de_santo' and c.responsible_profile_id = auth.uid())
        or (
          public.current_role() = 'cliente'
          and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.client_id = c.id
          )
        )
      )
  )
);

create policy chat_storage_insert_owned on storage.objects
for insert with check (
  bucket_id = 'chat'
  and exists (
    select 1 from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and (
        (public.current_role() = 'pai_de_santo' and c.responsible_profile_id = auth.uid())
        or (
          public.current_role() = 'cliente'
          and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.client_id = c.id
          )
        )
      )
  )
);

-- Approval is a privileged operation, not a direct profile update.
create or replace function public.decide_profile_approval(
  p_profile_id uuid,
  p_decision public.approval_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  granted_role public.user_role;
begin
  if public.current_role() is distinct from 'pai_de_santo' then
    raise exception 'not authorized';
  end if;

  if p_decision is distinct from 'approved'
    and p_decision is distinct from 'rejected' then
    raise exception 'invalid approval decision';
  end if;

  select * into target
  from public.profiles
  where id = p_profile_id
    and approval_status = 'pending'
    and id <> auth.uid()
  for update;

  if not found then
    raise exception 'pending profile not found';
  end if;

  if p_decision = 'approved' then
    granted_role := coalesce(target.signup_area, target.requested_role);
    if granted_role is null or granted_role = 'cliente' then
      granted_role := 'cliente';
    end if;

    update public.profiles
    set role = granted_role,
        approval_status = 'approved',
        updated_at = now()
    where id = p_profile_id;
  else
    update public.profiles
    set role = 'cliente',
        approval_status = 'rejected',
        updated_at = now()
    where id = p_profile_id;
  end if;
end;
$$;

revoke all on function public.decide_profile_approval(uuid, public.approval_status) from public;
grant execute on function public.decide_profile_approval(uuid, public.approval_status)
  to authenticated;

-- Pai-only queue for legacy/unassigned clients; no automatic ownership backfill.
create or replace function public.list_unassigned_clients()
returns setof public.clients
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner_ids uuid[];
begin
  if public.current_role() is distinct from 'pai_de_santo' then
    raise exception 'not authorized';
  end if;

  select array_agg(id order by created_at)
    into owner_ids
  from public.profiles
  where role = 'pai_de_santo'
    and approval_status = 'approved';

  if coalesce(array_length(owner_ids, 1), 0) <> 1 or owner_ids[1] <> auth.uid() then
    raise exception 'manual ownership review required';
  end if;

  return query
  select c.* from public.clients c
  where c.responsible_profile_id is null
  order by c.created_at;
end;
$$;

revoke all on function public.list_unassigned_clients() from public;
grant execute on function public.list_unassigned_clients() to authenticated;

create or replace function public.claim_unassigned_client(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_ids uuid[];
begin
  if public.current_role() is distinct from 'pai_de_santo' then
    raise exception 'not authorized';
  end if;

  select array_agg(id order by created_at)
    into owner_ids
  from public.profiles
  where role = 'pai_de_santo'
    and approval_status = 'approved';

  if coalesce(array_length(owner_ids, 1), 0) <> 1 or owner_ids[1] <> auth.uid() then
    raise exception 'manual ownership review required';
  end if;

  update public.clients
  set responsible_profile_id = auth.uid(),
      updated_at = now()
  where id = p_client_id
    and responsible_profile_id is null;

  if not found then
    raise exception 'unassigned client not found';
  end if;
end;
$$;

revoke all on function public.claim_unassigned_client(uuid) from public;
grant execute on function public.claim_unassigned_client(uuid) to authenticated;

create or replace function public.update_owned_client(
  p_client_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text
)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_client public.clients%rowtype;
begin
  if public.current_role() is distinct from 'pai_de_santo' then
    raise exception 'not authorized';
  end if;

  update public.clients
  set full_name = p_full_name,
      phone = p_phone,
      email = p_email,
      notes = p_notes,
      updated_at = now()
  where id = p_client_id
    and responsible_profile_id = auth.uid()
  returning * into updated_client;

  if not found then
    raise exception 'owned client not found';
  end if;
  return updated_client;
end;
$$;

revoke all on function public.update_owned_client(uuid, text, text, text, text) from public;
grant execute on function public.update_owned_client(uuid, text, text, text, text)
  to authenticated;