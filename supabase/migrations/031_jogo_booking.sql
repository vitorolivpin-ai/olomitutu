-- Etapa 2 — fluxo público de Jogo (forward-only; NÃO executar automaticamente).
-- Preserva Etapa 1: comprovante privado; Admin/Financeiro sem acesso a Jogo.

-- Campos extras em appointments (quando a tabela existir no projeto remoto)
alter table if exists public.appointments
  add column if not exists modalidade text
    check (modalidade is null or modalidade in ('online', 'presencial')),
  add column if not exists jogo_status text
    check (
      jogo_status is null
      or jogo_status in (
        'aguardando_pagamento',
        'comprovante_enviado',
        'aguardando_aprovacao',
        'confirmado',
        'recusado',
        'cancelado',
        'prazo_analise_atingido'
      )
    ),
  add column if not exists hold_expires_at timestamptz,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists analysis_deadline_at timestamptz,
  add column if not exists analysis_deadline_reached boolean default false,
  add column if not exists analysis_reminder_at timestamptz,
  add column if not exists access_token text,
  add column if not exists access_token_expires_at timestamptz,
  add column if not exists access_token_revoked boolean default false,
  add column if not exists chat_unlocked boolean default false,
  add column if not exists enter_jogo_enabled boolean default false,
  add column if not exists requested_new_proof boolean default false,
  add column if not exists refusal_note text,
  add column if not exists payment_proof_path text,
  add column if not exists payment_proof_mime text,
  add column if not exists payment_proof_name text,
  add column if not exists payment_proof_size integer;

create unique index if not exists appointments_access_token_uidx
  on public.appointments (access_token)
  where access_token is not null and coalesce(access_token_revoked, false) = false;

-- Bucket privado para comprovantes de Jogo (path: jogo/{appointment_id}/...)
insert into storage.buckets (id, name, public)
values ('jogo-comprovantes', 'jogo-comprovantes', false)
on conflict (id) do update set public = false;

-- RLS storage: somente Pai dono do atendimento OU visitante com token validado via RPC.
-- Políticas concretas devem reutilizar current_role() / responsible_profile_id da migration 030.
-- Admin e tesouraria: SEM acesso ao bucket de Jogo.

-- Observação: o MVP atual persiste Jogo no AppState/local; esta migration prepara o remoto.
