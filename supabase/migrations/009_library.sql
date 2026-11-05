-- Biblioteca: vídeos, cantigas, PDFs

create type public.library_kind as enum ('video', 'cantiga', 'pdf', 'outro');

create table public.library_items (
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
  select public.current_role() in ('administrador', 'pai_de_santo');
$$;

create policy library_staff_all on public.library_items
for all using (public.can_manage_library())
with check (public.can_manage_library());

create policy library_client_read on public.library_items
for select using (
  visible_to_clients = true
  and public.current_role() = 'cliente'
);
