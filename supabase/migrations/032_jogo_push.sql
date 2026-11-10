-- Etapa 4 — push subscriptions para fluxo de Jogo (forward-only; NÃO executar automaticamente).
-- Estende 020_push_subscriptions.sql. Não altera 030/031.
-- Visitante: jogo_id + visitor_token_hash (nunca token bruto).
-- Pai autenticado: user_id = profiles.id (auth.uid()).
-- Admin / Financeiro: sem leitura de assinaturas de Jogo.

-- ---------------------------------------------------------------------------
-- 1) Colunas extras (compatíveis com rows existentes da 020)
-- ---------------------------------------------------------------------------
alter table if exists public.push_subscriptions
  alter column user_id drop not null;

alter table if exists public.push_subscriptions
  add column if not exists jogo_id uuid references public.appointments (id) on delete cascade,
  add column if not exists visitor_token_hash text,
  add column if not exists p256dh text,
  add column if not exists auth text,
  add column if not exists user_agent text,
  add column if not exists platform text,
  add column if not exists active boolean not null default true,
  add column if not exists environment text,
  add column if not exists last_success_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists revoked_at timestamptz;

-- Dono obrigatório: perfil autenticado OU visitante do Jogo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_owner_chk'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_owner_chk
      check (
        user_id is not null
        or (jogo_id is not null and visitor_token_hash is not null)
      );
  end if;
end;
$$;

create index if not exists push_subscriptions_jogo_token_idx
  on public.push_subscriptions (jogo_id, visitor_token_hash)
  where jogo_id is not null and coalesce(active, true) = true;

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id)
  where user_id is not null and coalesce(active, true) = true;

-- Flags leves de anti-reenvio nos appointments (opcional / local+remoto)
alter table if exists public.appointments
  add column if not exists push_prazo_proximo_sent boolean not null default false,
  add column if not exists push_prazo_atingido_sent boolean not null default false,
  add column if not exists push_lembrete_1h_sent boolean not null default false,
  add column if not exists push_lembrete_15min_sent boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) RLS — autenticado só as próprias rows; visitante só via service role (APIs)
-- ---------------------------------------------------------------------------
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
for all using (
  user_id = auth.uid()
  and public.current_role() is not null
  and public.current_role() <> 'administrador'
  and public.current_role() <> 'tesouraria'
)
with check (
  user_id = auth.uid()
  and public.current_role() is not null
  and public.current_role() <> 'administrador'
  and public.current_role() <> 'tesouraria'
);

-- Observação: inserts de visitante usam SUPABASE_SERVICE_ROLE_KEY nas Route Handlers.
-- Admin e Financeiro não listam assinaturas de Jogo (sem policy adicional).
