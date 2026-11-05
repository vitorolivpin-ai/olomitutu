-- Estoque com código de barras e validade por lote

create type public.stock_movement_type as enum ('entrada', 'saida');

create table public.stock_products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  unit text not null default 'un',
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.stock_products(id) on delete cascade,
  barcode text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  expires_at date not null,
  batch_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_lots_product_expiry_idx
  on public.stock_lots (product_id, expires_at);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.stock_products(id) on delete cascade,
  lot_id uuid references public.stock_lots(id) on delete set null,
  barcode text not null,
  type public.stock_movement_type not null,
  quantity numeric(12,3) not null check (quantity > 0),
  expires_at date,
  performed_by uuid not null references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff_stock()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('administrador', 'tesouraria', 'pai_de_santo');
$$;

alter table public.stock_products enable row level security;
alter table public.stock_lots enable row level security;
alter table public.stock_movements enable row level security;

create policy stock_products_staff on public.stock_products
for all using (public.is_staff_stock())
with check (public.is_staff_stock());

create policy stock_lots_staff on public.stock_lots
for all using (public.is_staff_stock())
with check (public.is_staff_stock());

create policy stock_movements_staff on public.stock_movements
for all using (public.is_staff_stock())
with check (public.is_staff_stock());
