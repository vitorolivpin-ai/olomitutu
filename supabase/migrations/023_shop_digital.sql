-- Loja digital: kind/pdf/curso, Pix da casa, pedidos com liberação pelo Financeiro

alter table public.shop_products
  add column if not exists kind text not null default 'fisico'
    check (kind in ('fisico', 'pdf', 'curso')),
  add column if not exists file_url text,
  add column if not exists requires_payment boolean not null default false;

create table if not exists public.house_settings (
  id text primary key default 'casa',
  pix_key text,
  pix_holder_name text,
  updated_at timestamptz not null default now()
);

alter table public.house_settings enable row level security;

drop policy if exists house_settings_staff_all on public.house_settings;
create policy house_settings_staff_all on public.house_settings
for all using (
  public.current_role() in ('administrador', 'pai_de_santo', 'tesouraria')
)
with check (
  public.current_role() in ('administrador', 'pai_de_santo')
);

drop policy if exists house_settings_public_read on public.house_settings;
create policy house_settings_public_read on public.house_settings
for select using (true);

create table if not exists public.shop_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'solicitado'
    check (status in ('solicitado', 'pago_liberado', 'recusado')),
  released_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_purchases_client_idx on public.shop_purchases(client_id);
create index if not exists shop_purchases_status_idx on public.shop_purchases(status);

alter table public.shop_purchases enable row level security;

drop policy if exists shop_purchases_staff on public.shop_purchases;
create policy shop_purchases_staff on public.shop_purchases
for all using (
  public.current_role() in ('administrador', 'pai_de_santo', 'tesouraria')
)
with check (
  public.current_role() in ('administrador', 'pai_de_santo', 'tesouraria')
);

drop policy if exists shop_purchases_client_own on public.shop_purchases;
create policy shop_purchases_client_own on public.shop_purchases
for select using (
  public.current_role() = 'cliente'
  and client_id = (
    select p.client_id from public.profiles p where p.id = auth.uid()
  )
);

drop policy if exists shop_purchases_client_insert on public.shop_purchases;
create policy shop_purchases_client_insert on public.shop_purchases
for insert with check (
  public.current_role() = 'cliente'
  and client_id = (
    select p.client_id from public.profiles p where p.id = auth.uid()
  )
  and status = 'solicitado'
);

-- Vitrine pública (hub /loja sem login) — só itens disponíveis
drop policy if exists shop_public_read_available on public.shop_products;
create policy shop_public_read_available on public.shop_products
for select using (available = true);
