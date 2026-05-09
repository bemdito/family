-- =====================================================
-- ALIGN RELACIONAMENTOS SCHEMA
-- Data: 2026-05-09
-- Objetivo: alinhar public.relacionamentos ao contrato atual sem apagar dados.
-- =====================================================

alter table public.relacionamentos
  add column if not exists ativo boolean not null default true,
  add column if not exists data_casamento date,
  add column if not exists data_separacao date,
  add column if not exists local_casamento text,
  add column if not exists local_separacao text,
  add column if not exists observacoes text;

alter table public.relacionamentos
  drop constraint if exists relacionamentos_subtipo_relacionamento_check,
  drop constraint if exists relacionamentos_subtipo_check;

alter table public.relacionamentos
  add constraint relacionamentos_subtipo_relacionamento_check
  check (
    subtipo_relacionamento is null
    or subtipo_relacionamento in (
      'sangue',
      'adotivo',
      'casamento',
      'uniao_estavel',
      'uniao',
      'separado'
    )
  );

alter table public.relacionamentos
  drop constraint if exists relacionamentos_pessoa_origem_id_pessoa_destino_id_tipo_rel_key;

create unique index if not exists idx_relacionamentos_unique_basic
  on public.relacionamentos (
    pessoa_origem_id,
    pessoa_destino_id,
    tipo_relacionamento,
    coalesce(subtipo_relacionamento, '')
  );
