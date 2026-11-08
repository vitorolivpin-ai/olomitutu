-- 029 — Oficinas (separadas da Loja), inscrições com vagas/lista de espera,
-- certificados (oficina + curso) com verificação pública e assinatura do Pai de Santo.
-- Rode no SQL Editor do Supabase depois da 028.

create extension if not exists pgcrypto;

/* ─────────────── Oficinas ─────────────── */

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null default '',
  about text,
  topics text[] not null default '{}',
  image_url text,
  modality text not null default 'presencial' check (modality in ('presencial', 'online')),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicada', 'em_breve', 'encerrada', 'cancelada')),
  date date,
  start_time text,
  end_time text,
  location text,
  online_link text,
  total_spots integer not null default 0 check (total_spots >= 0),
  allow_waitlist boolean not null default true,
  registration_deadline date,
  price numeric(10, 2) not null default 0,
  workload text,
  issues_certificate boolean not null default true,
  certificate_signer_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null,
  birth_date date,
  house_link text not null default 'nao' check (house_link in ('sim', 'nao', 'frequentador')),
  attended_before boolean not null default false,
  accessibility_needs text,
  notes text,
  accepted_terms boolean not null default false,
  status text not null default 'confirmada'
    check (status in ('confirmada', 'lista_espera', 'cancelada', 'presente')),
  added_by_staff boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workshop_registrations_unique_email
  on public.workshop_registrations (workshop_id, lower(email))
  where status <> 'cancelada';

create index if not exists workshop_registrations_workshop_idx
  on public.workshop_registrations (workshop_id);

/* ─────────────── Certificados ─────────────── */

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  kind text not null check (kind in ('oficina', 'curso')),
  reference_id text,
  printed_name text not null,
  title text not null,
  completed_on date not null,
  modality text not null default 'presencial',
  workload text,
  signer_name text not null,
  signer_title text not null,
  second_signer_label text not null default 'Coordenação de Ensino',
  -- cópia da assinatura no momento da emissão (não muda se a assinatura for trocada depois)
  signature_data_url text,
  status text not null default 'disponivel' check (status in ('disponivel', 'revogado')),
  issued_at timestamptz not null default now(),
  issued_by_name text,
  revoked_at timestamptz,
  revoked_by_name text,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificates_user_idx on public.certificates (user_id);
create index if not exists certificates_email_idx on public.certificates (lower(email));

create table if not exists public.certificate_settings (
  id integer primary key default 1 check (id = 1),
  signer_name text not null default 'Vitor Cardozo · Ògún Yande',
  signer_title text not null default 'Babalorixá · Pai de Santo',
  second_signer_label text not null default 'Coordenação de Ensino',
  signature_data_url text,
  auto_release_on_close boolean not null default false,
  pai_can_delete_any boolean not null default true,
  updated_at timestamptz default now(),
  updated_by_name text
);

insert into public.certificate_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.certificate_corrections (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  requested_name text not null,
  requested_by_name text not null,
  status text not null default 'pendente' check (status in ('pendente', 'resolvida')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

/* ─────────────── RLS ─────────────── */

alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_settings enable row level security;
alter table public.certificate_corrections enable row level security;

-- Oficinas: Pai/Admin gerenciam; qualquer pessoa (inclusive sem login) vê as publicadas
drop policy if exists workshops_staff_all on public.workshops;
create policy workshops_staff_all on public.workshops
for all using (public.current_role() in ('administrador', 'pai_de_santo'))
with check (public.current_role() in ('administrador', 'pai_de_santo'));

drop policy if exists workshops_public_read on public.workshops;
create policy workshops_public_read on public.workshops
for select using (status in ('publicada', 'em_breve', 'encerrada', 'cancelada'));

-- Inscrições: Pai/Admin veem tudo; a pessoa vê/cancela a própria
drop policy if exists workshop_regs_staff_all on public.workshop_registrations;
create policy workshop_regs_staff_all on public.workshop_registrations
for all using (public.current_role() in ('administrador', 'pai_de_santo'))
with check (public.current_role() in ('administrador', 'pai_de_santo'));

drop policy if exists workshop_regs_own_read on public.workshop_registrations;
create policy workshop_regs_own_read on public.workshop_registrations
for select using (
  auth.uid() is not null
  and (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

drop policy if exists workshop_regs_own_cancel on public.workshop_registrations;
create policy workshop_regs_own_cancel on public.workshop_registrations
for update using (auth.uid() is not null and user_id = auth.uid())
with check (user_id = auth.uid() and status = 'cancelada');

-- Certificados: Pai/Admin emitem/revogam; a pessoa vê os próprios
drop policy if exists certificates_staff_all on public.certificates;
create policy certificates_staff_all on public.certificates
for all using (public.current_role() in ('administrador', 'pai_de_santo'))
with check (public.current_role() in ('administrador', 'pai_de_santo'));

drop policy if exists certificates_own_read on public.certificates;
create policy certificates_own_read on public.certificates
for select using (
  auth.uid() is not null
  and status = 'disponivel'
  and (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

drop policy if exists certificate_settings_staff on public.certificate_settings;
create policy certificate_settings_staff on public.certificate_settings
for all using (public.current_role() in ('administrador', 'pai_de_santo'))
with check (public.current_role() in ('administrador', 'pai_de_santo'));

drop policy if exists certificate_corrections_staff on public.certificate_corrections;
create policy certificate_corrections_staff on public.certificate_corrections
for all using (public.current_role() in ('administrador', 'pai_de_santo'))
with check (public.current_role() in ('administrador', 'pai_de_santo'));

drop policy if exists certificate_corrections_own_insert on public.certificate_corrections;
create policy certificate_corrections_own_insert on public.certificate_corrections
for insert with check (
  auth.uid() is not null
  and exists (
    select 1 from public.certificates c
    where c.id = certificate_id
      and (c.user_id = auth.uid() or lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);

drop policy if exists certificate_corrections_own_read on public.certificate_corrections;
create policy certificate_corrections_own_read on public.certificate_corrections
for select using (created_by = auth.uid());

/* ─────────────── Funções ─────────────── */

-- Contagem de vagas para a página pública (sem expor dados das pessoas)
create or replace function public.workshop_spot_counts()
returns table (workshop_id uuid, confirmed bigint, waitlist bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.workshop_id,
         count(*) filter (where r.status in ('confirmada', 'presente')) as confirmed,
         count(*) filter (where r.status = 'lista_espera') as waitlist
  from public.workshop_registrations r
  join public.workshops w on w.id = r.workshop_id
  where w.status <> 'rascunho'
  group by r.workshop_id;
$$;

grant execute on function public.workshop_spot_counts() to anon, authenticated;

-- Inscrição com trava: decide confirmada x lista de espera sem estourar vagas
create or replace function public.register_workshop(p jsonb)
returns setof public.workshop_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.workshops;
  taken integer;
  st text;
  uid uuid := auth.uid();
begin
  select * into w from public.workshops
  where id = (p ->> 'workshop_id')::uuid
  for update;

  if not found or w.status not in ('publicada') then
    raise exception 'Oficina indisponível para inscrição.';
  end if;
  if w.date is not null and w.date < current_date then
    raise exception 'Esta oficina já aconteceu.';
  end if;
  if w.registration_deadline is not null and w.registration_deadline < current_date then
    raise exception 'O prazo de inscrição terminou.';
  end if;
  if coalesce((p ->> 'accepted_terms')::boolean, false) = false then
    raise exception 'É preciso aceitar as orientações da casa.';
  end if;
  if exists (
    select 1 from public.workshop_registrations
    where workshop_id = w.id and status <> 'cancelada'
      and lower(email) = lower(p ->> 'email')
  ) then
    raise exception 'Já existe uma inscrição com este e-mail nesta oficina.';
  end if;

  select count(*) into taken from public.workshop_registrations
  where workshop_id = w.id and status in ('confirmada', 'presente');

  if w.total_spots > 0 and taken >= w.total_spots then
    if not w.allow_waitlist then
      raise exception 'As vagas desta oficina esgotaram.';
    end if;
    st := 'lista_espera';
  else
    st := 'confirmada';
  end if;

  return query
  insert into public.workshop_registrations (
    workshop_id, user_id, full_name, phone, email, birth_date, house_link,
    attended_before, accessibility_needs, notes, accepted_terms, status
  ) values (
    w.id,
    uid,
    trim(p ->> 'full_name'),
    p ->> 'phone',
    lower(trim(p ->> 'email')),
    nullif(p ->> 'birth_date', '')::date,
    coalesce(p ->> 'house_link', 'nao'),
    coalesce((p ->> 'attended_before')::boolean, false),
    nullif(p ->> 'accessibility_needs', ''),
    nullif(p ->> 'notes', ''),
    true,
    st
  )
  returning *;
end;
$$;

grant execute on function public.register_workshop(jsonb) to anon, authenticated;

-- Verificação pública do certificado (QR code) — só dados não sensíveis
create or replace function public.verify_certificate(p_code text)
returns table (
  code text, kind text, printed_name text, title text, completed_on date,
  modality text, workload text, signer_name text, signer_title text,
  status text, issued_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.kind, c.printed_name, c.title, c.completed_on, c.modality,
         c.workload, c.signer_name, c.signer_title, c.status, c.issued_at
  from public.certificates c
  where upper(c.code) = upper(trim(p_code))
  limit 1;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Selo “Novo” some quando a pessoa abre o certificado
create or replace function public.mark_certificate_seen(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.certificates
  set seen_at = coalesce(seen_at, now())
  where id = p_id
    and (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

grant execute on function public.mark_certificate_seen(uuid) to authenticated;

/* ─────────────── Realtime ─────────────── */

do $$ begin
  alter publication supabase_realtime add table public.workshops;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.workshop_registrations;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.certificates;
exception when others then null; end $$;
