-- Biblioteca completa (cria tabela se faltar) + papel biblioteca + storage + realtime
-- Pode rodar sozinho mesmo sem ter aplicado a 009 antes.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'library_kind' and n.nspname = 'public'
  ) then
    create type public.library_kind as enum ('video', 'cantiga', 'pdf', 'outro');
  end if;
end $$;

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind public.library_kind not null,
  external_url text,
  file_url text,
  file_name text,
  mime_type text,
  visible_to_clients boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

create or replace function public.can_manage_library()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('administrador', 'pai_de_santo', 'biblioteca');
$$;

drop policy if exists library_staff_all on public.library_items;
create policy library_staff_all on public.library_items
for all using (public.can_manage_library())
with check (public.can_manage_library());

drop policy if exists library_client_read on public.library_items;
create policy library_client_read on public.library_items
for select using (
  visible_to_clients = true
  and public.current_role() = 'cliente'
);

insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists library_storage_select on storage.objects;
create policy library_storage_select on storage.objects
for select using (bucket_id = 'library');

drop policy if exists library_storage_write on storage.objects;
create policy library_storage_write on storage.objects
for all using (
  bucket_id = 'library'
  and public.can_manage_library()
)
with check (
  bucket_id = 'library'
  and public.can_manage_library()
);

do $$
begin
  alter publication supabase_realtime add table public.library_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when undefined_table then null;
end $$;
