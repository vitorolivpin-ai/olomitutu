-- Comprovantes de mensalidade (recibo no app + e-mail)

create table if not exists public.fee_receipts (
  id uuid primary key default gen_random_uuid(),
  monthly_fee_id text not null,
  member_id text not null,
  profile_id uuid references public.profiles (id) on delete set null,
  number text not null,
  payer_name text not null,
  payer_email text,
  competence text not null,
  amount numeric(12, 2) not null,
  payment_method text not null,
  paid_at timestamptz not null,
  email_sent boolean not null default false,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists fee_receipts_member_idx on public.fee_receipts (member_id);
create index if not exists fee_receipts_profile_idx on public.fee_receipts (profile_id);

alter table public.fee_receipts enable row level security;

create policy "fee_receipts_select_own_or_staff"
  on public.fee_receipts for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('administrador', 'tesouraria', 'pai_de_santo')
    )
  );

create policy "fee_receipts_insert_staff"
  on public.fee_receipts for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('administrador', 'tesouraria', 'pai_de_santo', 'cliente')
    )
  );

create policy "fee_receipts_update_staff"
  on public.fee_receipts for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('administrador', 'tesouraria', 'pai_de_santo')
    )
  );
