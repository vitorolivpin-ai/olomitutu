-- Compras sem conta: envio por e-mail + ficha de NF

alter table public.shop_purchases
  alter column client_id drop not null;

alter table public.shop_purchases
  add column if not exists delivery text not null default 'conta'
    check (delivery in ('conta', 'email')),
  add column if not exists guest_email text,
  add column if not exists invoice jsonb;

update public.shop_purchases
set delivery = 'conta'
where delivery is null;

drop policy if exists shop_purchases_client_insert on public.shop_purchases;
create policy shop_purchases_client_insert on public.shop_purchases
for insert with check (
  (
    public.current_role() = 'cliente'
    and client_id = (
      select p.client_id from public.profiles p where p.id = auth.uid()
    )
    and status = 'solicitado'
    and delivery = 'conta'
  )
);

-- Visitante (anon) pode abrir pedido com ficha NF
drop policy if exists shop_purchases_guest_insert on public.shop_purchases;
create policy shop_purchases_guest_insert on public.shop_purchases
for insert with check (
  delivery = 'email'
  and client_id is null
  and guest_email is not null
  and status = 'solicitado'
);
