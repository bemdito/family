-- =====================================================
-- ALIGN MARRIAGE FIELDS TO APP FORMAT
-- Data: 2026-05-12
-- Objetivo: garantir que data/local de casamento aceitem datas flexiveis
-- como DD/MM/AAAA ou apenas AAAA, conforme o formulario da aplicacao.
-- =====================================================

alter table public.relacionamentos
  add column if not exists data_casamento text,
  add column if not exists local_casamento text;

alter table public.relacionamentos
  alter column data_casamento type text using data_casamento::text,
  alter column local_casamento type text using local_casamento::text;
