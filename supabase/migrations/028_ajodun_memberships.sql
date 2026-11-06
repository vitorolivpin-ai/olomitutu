-- Pedidos de participação em ajodun (filho pede → admin libera planilha)

create table if not exists public.ajodun_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ajodun_event_id text not null,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  unique (user_id, ajodun_event_id)
);

create index if not exists ajodun_memberships_user_idx
  on public.ajodun_memberships (user_id);
create index if not exists ajodun_memberships_status_idx
  on public.ajodun_memberships (status);

alter table public.ajodun_memberships enable row level security;

create policy "ajodun_memberships_select_own_or_staff"
  on public.ajodun_memberships for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('administrador', 'pai_de_santo', 'tesouraria')
    )
  );

create policy "ajodun_memberships_insert_own"
  on public.ajodun_memberships for insert
  with check (user_id = auth.uid());

create policy "ajodun_memberships_update_staff"
  on public.ajodun_memberships for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('administrador', 'pai_de_santo')
    )
  );
