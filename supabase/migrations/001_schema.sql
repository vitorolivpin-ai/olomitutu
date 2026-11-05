-- ILÉ OLÓRÒKÈ ÀṢẸ — schema inicial
-- Execute no SQL Editor do Supabase

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'administrador',
  'tesouraria',
  'pai_de_santo',
  'estoque',
  'biblioteca',
  'cliente'
);

create type public.member_status as enum ('ativo', 'afastado', 'isento', 'inativo');
create type public.fee_status as enum ('PAGO', 'AGUARDANDO', 'VENCIDO', 'ISENTO', 'CANCELADO');
create type public.expense_status as enum ('PAGA', 'EM_ABERTO', 'VENCIDA');
create type public.expense_category as enum (
  'luz', 'agua', 'internet', 'aluguel', 'manutencao', 'materiais', 'outras'
);
create type public.appointment_status as enum (
  'SOLICITADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'REALIZADO', 'CANCELADO', 'NAO_COMPARECEU'
);
create type public.payment_method as enum ('PIX', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'cliente',
  phone text,
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  monthly_fee_amount numeric(12,2) not null check (monthly_fee_amount >= 0),
  due_day int not null check (due_day between 1 and 28),
  entry_date date not null,
  status public.member_status not null default 'ativo',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monthly_fees (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  competence text not null, -- YYYY-MM
  amount numeric(12,2) not null,
  due_date date not null,
  status public.fee_status not null default 'AGUARDANDO',
  paid_at timestamptz,
  payment_method public.payment_method,
  amount_received numeric(12,2),
  observation text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, competence)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  monthly_fee_id uuid not null references public.monthly_fees(id) on delete cascade,
  method public.payment_method not null,
  amount numeric(12,2) not null,
  status text not null check (status in ('pending', 'paid', 'cancelled')),
  pix_copy_paste text,
  boleto_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category public.expense_category not null,
  description text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  competence text not null,
  status public.expense_status not null default 'EM_ABERTO',
  paid_at timestamptz,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int not null default 60,
  break_minutes int not null default 0,
  is_blocked boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  status public.appointment_status not null default 'SOLICITADO',
  started_at timestamptz,
  ended_at timestamptz,
  amount numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index appointments_unique_slot
  on public.appointments (scheduled_at)
  where status not in ('CANCELADO', 'NAO_COMPARECEU');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role public.user_role not null,
  sender_name text not null,
  recipient_role public.user_role,
  body text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  read boolean not null default false,
  href text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger trg_members_updated before update on public.members
for each row execute function public.set_updated_at();
create trigger trg_monthly_fees_updated before update on public.monthly_fees
for each row execute function public.set_updated_at();
create trigger trg_payments_updated before update on public.payments
for each row execute function public.set_updated_at();
create trigger trg_expenses_updated before update on public.expenses
for each row execute function public.set_updated_at();
create trigger trg_clients_updated before update on public.clients
for each row execute function public.set_updated_at();
create trigger trg_availability_updated before update on public.availability
for each row execute function public.set_updated_at();
create trigger trg_appointments_updated before update on public.appointments
for each row execute function public.set_updated_at();
