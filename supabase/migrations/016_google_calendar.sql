-- Conexão Google Calendar do Pai de Santo (App → Google)

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  calendar_id text not null default 'primary',
  google_email text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

drop policy if exists gcal_select_own on public.google_calendar_connections;
create policy gcal_select_own on public.google_calendar_connections
for select using (
  user_id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
);

drop policy if exists gcal_upsert_own on public.google_calendar_connections;
create policy gcal_upsert_own on public.google_calendar_connections
for all using (
  user_id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
)
with check (
  user_id = auth.uid()
  or public.current_role() in ('administrador', 'pai_de_santo')
);

create trigger trg_gcal_updated
  before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();
