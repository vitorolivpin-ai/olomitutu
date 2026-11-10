-- Oficinas + inscricoes (schema de referência; MVP demo usa localStorage)

create table if not exists public.oficinas (
  id text primary key,
  titulo text not null,
  descricao_curta text not null,
  sobre text not null default '',
  conteudo jsonb not null default '[]'::jsonb,
  imagem text,
  modalidade text not null check (modalidade in ('Presencial', 'Online')),
  status text not null check (
    status in ('Rascunho', 'Publicada', 'Em breve', 'Encerrada', 'Cancelada')
  ),
  data date,
  hora_inicio text,
  hora_fim text,
  local text,
  link text,
  total_vagas integer not null default 0,
  permitir_lista_espera boolean not null default true,
  data_limite_inscricao date,
  valor numeric,
  criado_por text not null,
  atualizado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.inscricoes_oficina (
  id text primary key,
  oficina_id text not null references public.oficinas (id) on delete cascade,
  usuario_id text,
  nome_completo text not null,
  telefone text not null,
  email text not null,
  data_nascimento date,
  e_filho_da_casa text not null check (
    e_filho_da_casa in ('Sim', 'Não', 'Frequentador')
  ),
  ja_participou_antes boolean not null default false,
  necessidade_especial_ou_acessibilidade text,
  observacoes text,
  aceite_termos boolean not null default false,
  status text not null check (
    status in ('Confirmada', 'Lista de espera', 'Cancelada', 'Presente')
  ),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create index if not exists inscricoes_oficina_oficina_idx
  on public.inscricoes_oficina (oficina_id);

create unique index if not exists inscricoes_oficina_unique_email_active
  on public.inscricoes_oficina (oficina_id, lower(email))
  where status <> 'Cancelada';
