-- Reparo da loja: colunas digitais + policies de escrita (Pai/Admin)
-- Rode no SQL Editor se salvar produto der erro de permissão / coluna.

alter table public.shop_products
  add column if not exists kind text,
  add column if not exists file_url text,
  add column if not exists requires_payment boolean;

update public.shop_products set kind = 'fisico' where kind is null;
update public.shop_products set requires_payment = false where requires_payment is null;

alter table public.shop_products
  alter column kind set default 'fisico',
  alter column requires_payment set default false;

do $$
begin
  alter table public.shop_products
    alter column kind set not null;
exception when others then null;
end $$;

do $$
begin
  alter table public.shop_products
    alter column requires_payment set not null;
exception when others then null;
end $$;

-- Garante writers da casa
drop policy if exists shop_house_writers on public.shop_products;
create policy shop_house_writers on public.shop_products
for all using (
  public.current_role() in ('administrador', 'pai_de_santo')
)
with check (
  public.current_role() in ('administrador', 'pai_de_santo')
);

drop policy if exists shop_client_read on public.shop_products;
create policy shop_client_read on public.shop_products
for select using (
  available = true
  and public.current_role() = 'cliente'
);

drop policy if exists shop_public_read_available on public.shop_products;
create policy shop_public_read_available on public.shop_products
for select using (available = true);

-- house_settings (Pix)
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

insert into public.house_settings (id, pix_key, pix_holder_name)
values ('casa', null, 'ILÉ OLÓRÒKÈ ÀṢẸ')
on conflict (id) do nothing;
