-- Chat na nuvem: cria colunas se faltarem (mesmo sem ter rodado a 005),
-- kinds vídeo/chamada, storage, realtime, cadastro do cliente

-- Garante tabela messages (caso schema base incompleto)
create table if not exists public.messages (
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

alter table public.messages add column if not exists kind text;
alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists audio_duration_sec numeric(8,2);
alter table public.messages add column if not exists video_url text;
alter table public.messages add column if not exists call_url text;

update public.messages set kind = 'text' where kind is null;
alter table public.messages alter column kind set default 'text';
alter table public.messages alter column kind set not null;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages drop constraint if exists messages_kind_check1;

do $$
begin
  alter table public.messages
    add constraint messages_kind_check
    check (kind in ('text', 'audio', 'video', 'call'));
exception
  when duplicate_object then null;
end $$;

alter table public.clients add column if not exists birth_date date;
alter table public.clients add column if not exists registration_complete boolean not null default false;

alter table public.messages enable row level security;

drop policy if exists messages_staff on public.messages;
create policy messages_staff on public.messages
for all using (public.is_staff_care() or public.current_role() = 'administrador')
with check (public.is_staff_care() or public.current_role() = 'administrador');

drop policy if exists messages_self on public.messages;
create policy messages_self on public.messages
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

drop policy if exists messages_self_insert on public.messages;
create policy messages_self_insert on public.messages
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.client_id = messages.client_id
  )
);

insert into storage.buckets (id, name, public)
values ('chat', 'chat', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists chat_storage_select on storage.objects;
create policy chat_storage_select on storage.objects
for select using (bucket_id = 'chat');

drop policy if exists chat_storage_write on storage.objects;
create policy chat_storage_write on storage.objects
for all using (
  bucket_id = 'chat'
  and auth.uid() is not null
)
with check (
  bucket_id = 'chat'
  and auth.uid() is not null
);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.clients;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when undefined_table then null;
end $$;
