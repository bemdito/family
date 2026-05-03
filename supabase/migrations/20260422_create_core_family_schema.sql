-- =====================================================
-- CORE FAMILY SCHEMA - ÁRVORE FAMILIAR
-- Data: 2026-04-22
-- Objetivo: criar as tabelas-base exigidas pelas migrations posteriores.
-- =====================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- FUNÇÃO UPDATED_AT
-- =====================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- PESSOAS
-- =====================================================

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),

  nome_completo text not null,

  data_nascimento text,
  local_nascimento text,
  data_falecimento text,
  local_falecimento text,
  local_atual text,

  foto_principal_url text,

  humano_ou_pet text not null default 'Humano',
  lado text default 'esquerda',
  cor_bg_card text,

  minibio text,
  curiosidades text,

  telefone text,
  endereco text,
  rede_social text,

  instagram_usuario text,
  instagram_url text,
  permitir_exibir_instagram boolean not null default false,
  permitir_mensagens_whatsapp boolean not null default false,

  geracao_sociologica text,
  manual_generation smallint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pessoas_humano_ou_pet_check
    check (humano_ou_pet in ('Humano', 'Pet')),

  constraint pessoas_lado_check
    check (lado in ('esquerda', 'direita')),

  constraint pessoas_manual_generation_range
    check (manual_generation is null or manual_generation between 1 and 7)
);

create index if not exists idx_pessoas_nome_completo
  on public.pessoas (nome_completo);

create index if not exists idx_pessoas_humano_ou_pet
  on public.pessoas (humano_ou_pet);

create index if not exists idx_pessoas_lado
  on public.pessoas (lado);

create index if not exists idx_pessoas_manual_generation
  on public.pessoas (manual_generation);

create index if not exists idx_pessoas_geracao_sociologica
  on public.pessoas (geracao_sociologica);

create index if not exists idx_pessoas_instagram_usuario
  on public.pessoas (instagram_usuario);

drop trigger if exists update_pessoas_updated_at on public.pessoas;

create trigger update_pessoas_updated_at
before update on public.pessoas
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- RELACIONAMENTOS
-- =====================================================

create table if not exists public.relacionamentos (
  id uuid primary key default gen_random_uuid(),

  pessoa_origem_id uuid not null references public.pessoas(id) on delete cascade,
  pessoa_destino_id uuid not null references public.pessoas(id) on delete cascade,

  tipo_relacionamento text not null,
  subtipo_relacionamento text,

  data_casamento text,
  data_separacao text,
  local_casamento text,
  local_separacao text,

  ativo boolean not null default true,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint relacionamentos_tipo_check
    check (tipo_relacionamento in ('conjuge', 'pai', 'mae', 'filho', 'irmao')),

  constraint relacionamentos_subtipo_check
    check (
      subtipo_relacionamento is null
      or subtipo_relacionamento in ('sangue', 'adotivo', 'uniao', 'casamento', 'separado')
    ),

  constraint relacionamentos_pessoas_diferentes_check
    check (pessoa_origem_id <> pessoa_destino_id)
);

create index if not exists idx_relacionamentos_origem
  on public.relacionamentos (pessoa_origem_id);

create index if not exists idx_relacionamentos_destino
  on public.relacionamentos (pessoa_destino_id);

create index if not exists idx_relacionamentos_tipo
  on public.relacionamentos (tipo_relacionamento);

create index if not exists idx_relacionamentos_subtipo
  on public.relacionamentos (subtipo_relacionamento);

create unique index if not exists idx_relacionamentos_unique_basic
  on public.relacionamentos (
    pessoa_origem_id,
    pessoa_destino_id,
    tipo_relacionamento,
    coalesce(subtipo_relacionamento, '')
  );

drop trigger if exists update_relacionamentos_updated_at on public.relacionamentos;

create trigger update_relacionamentos_updated_at
before update on public.relacionamentos
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- IMAGENS DE PESSOA
-- =====================================================

create table if not exists public.imagens_pessoa (
  id uuid primary key default gen_random_uuid(),

  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  image_url text not null,
  legenda text,
  ordem integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_imagens_pessoa_pessoa_id
  on public.imagens_pessoa (pessoa_id);

create index if not exists idx_imagens_pessoa_ordem
  on public.imagens_pessoa (pessoa_id, ordem);

drop trigger if exists update_imagens_pessoa_updated_at on public.imagens_pessoa;

create trigger update_imagens_pessoa_updated_at
before update on public.imagens_pessoa
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- ARQUIVOS HISTÓRICOS
-- =====================================================

create table if not exists public.arquivos_historicos (
  id uuid primary key default gen_random_uuid(),

  pessoa_id uuid references public.pessoas(id) on delete cascade,

  tipo text not null default 'imagem',
  url text not null,
  titulo text not null,
  descricao text,
  ano text,
  ordem integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint arquivos_historicos_tipo_check
    check (tipo in ('imagem', 'pdf'))
);

create index if not exists idx_arquivos_historicos_pessoa_id
  on public.arquivos_historicos (pessoa_id);

create index if not exists idx_arquivos_historicos_tipo
  on public.arquivos_historicos (tipo);

create index if not exists idx_arquivos_historicos_ordem
  on public.arquivos_historicos (pessoa_id, ordem);

drop trigger if exists update_arquivos_historicos_updated_at on public.arquivos_historicos;

create trigger update_arquivos_historicos_updated_at
before update on public.arquivos_historicos
for each row
execute function public.update_updated_at_column();

