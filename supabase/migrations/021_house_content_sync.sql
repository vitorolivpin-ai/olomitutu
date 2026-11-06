-- Conteúdo da casa + loja na nuvem (cliente lê o que estiver publicado)

-- Blog (Quem somos)
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text not null,
  category text not null check (category in ('historia_casa', 'historia_pai', 'pessoa', 'outro')),
  author_name text not null,
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

drop policy if exists blog_staff_all on public.blog_posts;
drop policy if exists blog_house_writers on public.blog_posts;
create policy blog_house_writers on public.blog_posts
for all using (
  public.current_role() in ('administrador', 'pai_de_santo', 'biblioteca')
)
with check (
  public.current_role() in ('administrador', 'pai_de_santo', 'biblioteca')
);

drop policy if exists blog_client_read on public.blog_posts;
create policy blog_client_read on public.blog_posts
for select using (
  published = true
  and public.current_role() = 'cliente'
);

-- Educação
create table if not exists public.education_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null check (kind in ('livro', 'video', 'filme', 'podcast')),
  url text,
  author_or_source text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.education_items enable row level security;

drop policy if exists education_house_writers on public.education_items;
create policy education_house_writers on public.education_items
for all using (
  public.current_role() in ('administrador', 'pai_de_santo', 'biblioteca')
)
with check (
  public.current_role() in ('administrador', 'pai_de_santo', 'biblioteca')
);

drop policy if exists education_client_read on public.education_items;
create policy education_client_read on public.education_items
for select using (
  published = true
  and public.current_role() = 'cliente'
);

-- Loja
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  image_url text,
  category text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_products enable row level security;

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

-- Biblioteca: default visível ao cliente ao publicar
alter table public.library_items
  alter column visible_to_clients set default true;

do $$
begin
  alter publication supabase_realtime add table public.blog_posts;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.education_items;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shop_products;
exception when others then null;
end $$;
