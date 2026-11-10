-- Etapa 3 — persistência segura do fluxo público de Jogo (forward-only).
-- NÃO executar automaticamente nesta etapa (staging manual apenas).
-- Depende de 030_security_privacy.sql (current_role, responsible_profile_id, RLS Pai-only).
-- Preserva Etapa 1: Admin/Financeiro sem acesso a Jogo/comprovante/chat privado.
-- Não faz DROP TABLE. Não backfill de responsável em clientes existentes.

-- ---------------------------------------------------------------------------
-- 1) Colunas em clients (visitante sem conta)
-- ---------------------------------------------------------------------------
alter table if exists public.clients
  add column if not exists is_guest boolean not null default false,
  add column if not exists registration_complete boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) Colunas de Jogo em appointments
-- ---------------------------------------------------------------------------
alter table if exists public.appointments
  add column if not exists modalidade text
    check (modalidade is null or modalidade in ('online', 'presencial')),
  add column if not exists jogo_status text
    check (
      jogo_status is null
      or jogo_status in (
        'aguardando_pagamento',
        'comprovante_enviado',
        'aguardando_aprovacao',
        'confirmado',
        'recusado',
        'cancelado',
        'prazo_analise_atingido'
      )
    ),
  add column if not exists payment_status text
    check (
      payment_status is null
      or payment_status in (
        'pendente',
        'comprovante_enviado',
        'confirmado',
        'recusado',
        'novo_comprovante'
      )
    ),
  add column if not exists ficha_code text,
  add column if not exists guest_ficha jsonb,
  add column if not exists pai_only_ficha boolean not null default false,
  add column if not exists hold_expires_at timestamptz,
  add column if not exists guest_session_token_hash text,
  add column if not exists comprovante_path text,
  add column if not exists comprovante_mime_type text,
  add column if not exists comprovante_file_name text,
  add column if not exists comprovante_size_bytes integer,
  add column if not exists comprovante_uploaded_at timestamptz,
  -- aliases legados mantidos para compatibilidade com rascunho Etapa 2
  add column if not exists payment_proof_path text,
  add column if not exists payment_proof_mime text,
  add column if not exists payment_proof_name text,
  add column if not exists payment_proof_size integer,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists analysis_deadline_at timestamptz,
  add column if not exists analysis_reminder_at timestamptz,
  add column if not exists analysis_deadline_reached boolean not null default false,
  -- token bruto NUNCA persistido; somente hash SHA-256 hex
  add column if not exists public_access_token_hash text,
  add column if not exists public_access_expires_at timestamptz,
  add column if not exists public_access_revoked_at timestamptz,
  add column if not exists chat_enabled_at timestamptz,
  add column if not exists chat_unlocked boolean not null default false,
  add column if not exists enter_jogo_enabled boolean not null default false,
  add column if not exists requested_new_proof boolean not null default false,
  add column if not exists refusal_note text,
  add column if not exists responsible_profile_id uuid
    references public.profiles (id) on delete set null,
  add column if not exists confirmed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists last_email_event text;

-- Índices de acesso / ocupação (sem PII)
create unique index if not exists appointments_ficha_code_uidx
  on public.appointments (ficha_code)
  where ficha_code is not null;

create unique index if not exists appointments_public_access_token_hash_uidx
  on public.appointments (public_access_token_hash)
  where public_access_token_hash is not null
    and public_access_revoked_at is null;

create index if not exists appointments_jogo_status_idx
  on public.appointments (jogo_status)
  where jogo_status is not null;

create index if not exists appointments_hold_expires_idx
  on public.appointments (hold_expires_at)
  where hold_expires_at is not null;

create index if not exists appointments_responsible_profile_idx
  on public.appointments (responsible_profile_id)
  where responsible_profile_id is not null;

-- Impede duas reservas ativas no mesmo horário (hold + fluxo ativo).
-- Cancelado / recusado liberam o slot. Hold expirado é marcado cancelado pela API.
create unique index if not exists appointments_jogo_active_slot_uidx
  on public.appointments (scheduled_at)
  where jogo_status in (
    'aguardando_pagamento',
    'comprovante_enviado',
    'aguardando_aprovacao',
    'confirmado',
    'prazo_analise_atingido'
  );

-- ---------------------------------------------------------------------------
-- 3) Bucket privado de comprovantes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('jogo-comprovantes', 'jogo-comprovantes', false)
on conflict (id) do update set public = false;

-- Path esperado: {appointment_id}/{filename}
drop policy if exists jogo_comprovantes_select_pai on storage.objects;
drop policy if exists jogo_comprovantes_insert_pai on storage.objects;

create policy jogo_comprovantes_select_pai on storage.objects
for select using (
  bucket_id = 'jogo-comprovantes'
  and public.current_role() = 'pai_de_santo'
  and exists (
    select 1
    from public.appointments a
    where a.id::text = (storage.foldername(name))[1]
      and a.responsible_profile_id = auth.uid()
  )
);

-- Upload de comprovante do visitante ocorre via service role (API Route).
-- Pai autenticado também pode inserir se necessário (reenvio assistido).
create policy jogo_comprovantes_insert_pai on storage.objects
for insert with check (
  bucket_id = 'jogo-comprovantes'
  and public.current_role() = 'pai_de_santo'
  and exists (
    select 1
    from public.appointments a
    where a.id::text = (storage.foldername(name))[1]
      and a.responsible_profile_id = auth.uid()
  )
);

-- Admin / tesouraria: sem política de leitura/escrita neste bucket.

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- Hash SHA-256 do token bruto é calculado no servidor Node (API Routes)
-- e persistido apenas como hex; o banco nunca recebe o token em texto puro.
-- ---------------------------------------------------------------------------
create or replace function public.jogo_pick_responsible_pai()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner_ids uuid[];
begin
  select array_agg(id order by created_at)
    into owner_ids
  from public.profiles
  where role = 'pai_de_santo'
    and approval_status = 'approved';

  -- Somente quando existe exatamente um Pai aprovado (mesma regra da 030).
  if coalesce(array_length(owner_ids, 1), 0) = 1 then
    return owner_ids[1];
  end if;
  return null;
end;
$$;

revoke all on function public.jogo_pick_responsible_pai() from public;
grant execute on function public.jogo_pick_responsible_pai() to service_role;

-- ---------------------------------------------------------------------------
-- 5) RPC: ocupação pública de slots (sem PII)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_list_ocupacao()
returns table (
  appointment_id uuid,
  scheduled_at timestamptz,
  expires_at timestamptz,
  jogo_status text,
  modalidade text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.scheduled_at,
    case
      when a.jogo_status = 'aguardando_pagamento' then a.hold_expires_at
      when a.jogo_status in ('aguardando_aprovacao', 'prazo_analise_atingido')
        then coalesce(a.analysis_deadline_at, a.hold_expires_at)
      else coalesce(a.public_access_expires_at, a.hold_expires_at)
    end as expires_at,
    a.jogo_status,
    a.modalidade
  from public.appointments a
  where a.jogo_status in (
      'aguardando_pagamento',
      'comprovante_enviado',
      'aguardando_aprovacao',
      'confirmado',
      'prazo_analise_atingido'
    )
    and (
      a.jogo_status <> 'aguardando_pagamento'
      or a.hold_expires_at is null
      or a.hold_expires_at > now()
    );
$$;

revoke all on function public.jogo_list_ocupacao() from public;
grant execute on function public.jogo_list_ocupacao() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) RPC: criar hold de visitante (service role / API)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_create_hold(
  p_scheduled_at timestamptz,
  p_modalidade text,
  p_amount numeric,
  p_duration_minutes int,
  p_guest_session_token_hash text,
  p_hold_minutes int default 20
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  pai_id uuid;
  cid uuid;
  apt public.appointments%rowtype;
  stamp timestamptz := now();
  hold_until timestamptz;
  code text;
begin
  if p_modalidade not in ('online', 'presencial') then
    raise exception 'modalidade inválida';
  end if;
  if p_guest_session_token_hash is null or length(p_guest_session_token_hash) < 32 then
    raise exception 'guest session inválida';
  end if;

  pai_id := public.jogo_pick_responsible_pai();
  if pai_id is null then
    raise exception 'responsável do Jogo indisponível';
  end if;

  hold_until := stamp + make_interval(mins => greatest(coalesce(p_hold_minutes, 20), 1));

  insert into public.clients (
    full_name, phone, email, notes, is_guest, registration_complete, responsible_profile_id
  ) values (
    'Visitante (reserva)',
    'pendente',
    null,
    'Reserva temporária de Jogo',
    true,
    false,
    pai_id
  ) returning id into cid;

  code := 'FC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.appointments (
    client_id,
    scheduled_at,
    duration_minutes,
    status,
    amount,
    modalidade,
    jogo_status,
    payment_status,
    hold_expires_at,
    guest_session_token_hash,
    ficha_code,
    pai_only_ficha,
    responsible_profile_id,
    chat_unlocked,
    enter_jogo_enabled
  ) values (
    cid,
    p_scheduled_at,
    coalesce(p_duration_minutes, 60),
    'SOLICITADO',
    p_amount,
    p_modalidade,
    'aguardando_pagamento',
    'pendente',
    hold_until,
    p_guest_session_token_hash,
    code,
    true,
    pai_id,
    false,
    false
  ) returning * into apt;

  return apt;
exception
  when unique_violation then
    raise exception 'horário indisponível';
end;
$$;

revoke all on function public.jogo_create_hold(timestamptz, text, numeric, int, text, int) from public;
grant execute on function public.jogo_create_hold(timestamptz, text, numeric, int, text, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7) RPC: completar ficha do visitante
-- ---------------------------------------------------------------------------
create or replace function public.jogo_complete_ficha(
  p_appointment_id uuid,
  p_guest_session_token_hash text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_birth_date date,
  p_observation text,
  p_privacy_accepted boolean
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  apt public.appointments%rowtype;
  stamp timestamptz := now();
begin
  if coalesce(p_privacy_accepted, false) is not true then
    raise exception 'política de privacidade obrigatória';
  end if;

  select * into apt
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'reserva não encontrada';
  end if;
  if apt.guest_session_token_hash is distinct from p_guest_session_token_hash then
    raise exception 'sessão inválida';
  end if;
  if apt.jogo_status = 'aguardando_pagamento'
     and apt.hold_expires_at is not null
     and apt.hold_expires_at < stamp then
    update public.appointments
      set jogo_status = 'cancelado',
          status = 'CANCELADO',
          cancelled_at = stamp,
          updated_at = stamp
      where id = apt.id;
    raise exception 'reserva expirada';
  end if;
  if apt.jogo_status is distinct from 'aguardando_pagamento'
     and coalesce(apt.requested_new_proof, false) is not true then
    raise exception 'ficha não editável';
  end if;

  update public.clients
  set full_name = trim(p_full_name),
      phone = trim(p_phone),
      email = lower(trim(p_email)),
      birth_date = p_birth_date,
      registration_complete = true,
      updated_at = stamp
  where id = apt.client_id;

  update public.appointments
  set guest_ficha = jsonb_build_object(
        'full_name', trim(p_full_name),
        'phone', trim(p_phone),
        'email', lower(trim(p_email)),
        'birth_date', p_birth_date::text,
        'observation', nullif(trim(coalesce(p_observation, '')), ''),
        'privacy_accepted', true,
        'privacy_accepted_at', stamp
      ),
      updated_at = stamp
  where id = apt.id
  returning * into apt;

  return apt;
end;
$$;

revoke all on function public.jogo_complete_ficha(uuid, text, text, text, text, date, text, boolean)
  from public;
grant execute on function public.jogo_complete_ficha(uuid, text, text, text, text, date, text, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8) RPC: anexar metadados de comprovante (arquivo sobe via Storage API)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_attach_comprovante(
  p_appointment_id uuid,
  p_guest_session_token_hash text,
  p_path text,
  p_mime text,
  p_file_name text,
  p_size_bytes int
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  apt public.appointments%rowtype;
  stamp timestamptz := now();
  deadline timestamptz;
begin
  select * into apt
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'reserva não encontrada';
  end if;
  if apt.guest_session_token_hash is distinct from p_guest_session_token_hash then
    raise exception 'sessão inválida';
  end if;
  if apt.guest_ficha is null or nullif(apt.guest_ficha->>'email', '') is null then
    raise exception 'complete a ficha antes do comprovante';
  end if;
  if apt.jogo_status not in ('aguardando_pagamento', 'recusado', 'comprovante_enviado')
     and coalesce(apt.requested_new_proof, false) is not true then
    raise exception 'comprovante não aceito neste status';
  end if;

  deadline := stamp + interval '24 hours';

  update public.appointments
  set comprovante_path = p_path,
      comprovante_mime_type = p_mime,
      comprovante_file_name = p_file_name,
      comprovante_size_bytes = p_size_bytes,
      comprovante_uploaded_at = stamp,
      payment_proof_path = p_path,
      payment_proof_mime = p_mime,
      payment_proof_name = p_file_name,
      payment_proof_size = p_size_bytes,
      proof_uploaded_at = stamp,
      analysis_deadline_at = deadline,
      analysis_reminder_at = deadline - interval '2 hours',
      analysis_deadline_reached = false,
      requested_new_proof = false,
      jogo_status = 'aguardando_aprovacao',
      payment_status = 'comprovante_enviado',
      last_email_event = 'comprovante_recebido',
      updated_at = stamp
  where id = apt.id
  returning * into apt;

  return apt;
end;
$$;

revoke all on function public.jogo_attach_comprovante(uuid, text, text, text, text, int) from public;
grant execute on function public.jogo_attach_comprovante(uuid, text, text, text, text, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- 9) RPC: decisão exclusiva do Pai (authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_pai_decidir(
  p_appointment_id uuid,
  p_decision text,
  p_note text default null,
  p_public_access_token_hash text default null,
  p_access_days int default 14
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  apt public.appointments%rowtype;
  stamp timestamptz := now();
begin
  if public.current_role() is distinct from 'pai_de_santo' then
    raise exception 'not authorized';
  end if;

  select * into apt
  from public.appointments
  where id = p_appointment_id
    and responsible_profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'jogo não encontrado';
  end if;

  if p_decision = 'aprovar' then
    if p_public_access_token_hash is null or length(p_public_access_token_hash) < 32 then
      raise exception 'token hash obrigatório';
    end if;
    update public.appointments
    set status = 'CONFIRMADO',
        jogo_status = 'confirmado',
        payment_status = 'confirmado',
        public_access_token_hash = p_public_access_token_hash,
        public_access_expires_at = stamp + make_interval(days => greatest(coalesce(p_access_days, 14), 1)),
        public_access_revoked_at = null,
        chat_unlocked = true,
        chat_enabled_at = stamp,
        confirmed_at = stamp,
        enter_jogo_enabled = false,
        last_email_event = 'confirmado',
        updated_at = stamp
    where id = apt.id
    returning * into apt;
    return apt;
  end if;

  if p_decision = 'novo_comprovante' then
    update public.appointments
    set jogo_status = 'aguardando_pagamento',
        payment_status = 'novo_comprovante',
        requested_new_proof = true,
        refusal_note = nullif(trim(coalesce(p_note, '')), ''),
        hold_expires_at = stamp + interval '20 minutes',
        last_email_event = 'novo_comprovante',
        updated_at = stamp
    where id = apt.id
    returning * into apt;
    return apt;
  end if;

  if p_decision = 'recusar' then
    update public.appointments
    set status = 'CANCELADO',
        jogo_status = 'recusado',
        payment_status = 'recusado',
        refusal_note = nullif(trim(coalesce(p_note, '')), ''),
        chat_unlocked = false,
        chat_enabled_at = null,
        public_access_revoked_at = coalesce(public_access_revoked_at, stamp),
        rejected_at = stamp,
        last_email_event = 'recusado',
        updated_at = stamp
    where id = apt.id
    returning * into apt;
    return apt;
  end if;

  if p_decision = 'cancelar' then
    update public.appointments
    set status = 'CANCELADO',
        jogo_status = 'cancelado',
        chat_unlocked = false,
        public_access_revoked_at = coalesce(public_access_revoked_at, stamp),
        cancelled_at = stamp,
        updated_at = stamp
    where id = apt.id
    returning * into apt;
    return apt;
  end if;

  raise exception 'decisão inválida';
end;
$$;

revoke all on function public.jogo_pai_decidir(uuid, text, text, text, int) from public;
grant execute on function public.jogo_pai_decidir(uuid, text, text, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) RPC: resolver acesso por hash do token (sem PII sensível além do necessário)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_resolve_access(p_token_hash text)
returns table (
  appointment_id uuid,
  expires_at timestamptz,
  revoked boolean,
  jogo_status text,
  scheduled_at timestamptz,
  modalidade text,
  chat_unlocked boolean,
  ficha_code text,
  amount numeric,
  client_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id,
    a.public_access_expires_at,
    (a.public_access_revoked_at is not null) as revoked,
    a.jogo_status,
    a.scheduled_at,
    a.modalidade,
    a.chat_unlocked,
    a.ficha_code,
    a.amount,
    a.client_id
  from public.appointments a
  where a.public_access_token_hash = p_token_hash
    and a.jogo_status = 'confirmado'
  limit 1;
end;
$$;

revoke all on function public.jogo_resolve_access(text) from public;
grant execute on function public.jogo_resolve_access(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11) RPC: marcar prazo de análise atingido (sem auto-decidir)
-- ---------------------------------------------------------------------------
create or replace function public.jogo_refresh_deadlines()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  m int := 0;
begin
  update public.appointments
  set jogo_status = 'prazo_analise_atingido',
      analysis_deadline_reached = true,
      updated_at = now()
  where jogo_status = 'aguardando_aprovacao'
    and analysis_deadline_at is not null
    and analysis_deadline_at <= now()
    and coalesce(analysis_deadline_reached, false) = false;
  get diagnostics n = row_count;

  update public.appointments
  set jogo_status = 'cancelado',
      status = 'CANCELADO',
      cancelled_at = now(),
      updated_at = now()
  where jogo_status = 'aguardando_pagamento'
    and hold_expires_at is not null
    and hold_expires_at <= now();
  get diagnostics m = row_count;

  return coalesce(n, 0) + coalesce(m, 0);
end;
$$;

revoke all on function public.jogo_refresh_deadlines() from public;
grant execute on function public.jogo_refresh_deadlines() to service_role, authenticated;

-- Observação: o app usa NEXT_PUBLIC_JOGO_REMOTE=1 para ativar o adapter remoto.
-- Enquanto a flag estiver ausente, o fluxo Etapa 2 local/demo permanece isolado.
