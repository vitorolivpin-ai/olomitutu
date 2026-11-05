-- Row Level Security

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monthly_fees enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.clients enable row level security;
alter table public.availability enable row level security;
alter table public.appointments enable row level security;
alter table public.messages enable row level security;
alter table public.internal_notes enable row level security;
alter table public.notifications enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff_finance()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('administrador', 'tesouraria');
$$;

create or replace function public.is_staff_care()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('administrador', 'pai_de_santo');
$$;

-- profiles
create policy profiles_select_own_or_admin on public.profiles
for select using (
  id = auth.uid() or public.current_role() = 'administrador'
);

create policy profiles_update_own on public.profiles
for update using (id = auth.uid() or public.current_role() = 'administrador');

-- finance tables: admin + tesouraria only
create policy members_finance on public.members
for all using (public.is_staff_finance())
with check (public.is_staff_finance());

create policy monthly_fees_finance on public.monthly_fees
for all using (public.is_staff_finance())
with check (public.is_staff_finance());

create policy payments_finance on public.payments
for all using (public.is_staff_finance())
with check (public.is_staff_finance());

create policy expenses_finance on public.expenses
for all using (public.is_staff_finance())
with check (public.is_staff_finance());

-- clients / agenda / chat
create policy clients_staff on public.clients
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

create policy clients_self on public.clients
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = clients.id
  )
);

create policy appointments_staff on public.appointments
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

create policy appointments_self on public.appointments
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = appointments.client_id
  )
);

create policy appointments_self_insert on public.appointments
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = appointments.client_id
  )
);

create policy availability_read on public.availability
for select using (auth.uid() is not null);

create policy availability_write on public.availability
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

-- messages: staff care + own client. Tesouraria blocked.
create policy messages_staff on public.messages
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

create policy messages_self on public.messages
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

create policy messages_self_insert on public.messages
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

-- internal notes never visible to cliente / tesouraria
create policy internal_notes_staff on public.internal_notes
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

create policy notifications_own on public.notifications
for select using (user_id = auth.uid() or public.current_role() = 'administrador');

create policy notifications_update_own on public.notifications
for update using (user_id = auth.uid() or public.current_role() = 'administrador');
