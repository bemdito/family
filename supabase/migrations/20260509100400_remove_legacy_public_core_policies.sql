-- =====================================================
-- REMOVE LEGACY PUBLIC CORE POLICIES
-- Data: 2026-05-09
-- Objetivo: remover policies antigas permissivas que anulam RLS novo.
-- =====================================================

drop policy if exists "Permitir leitura pública de pessoas" on public.pessoas;
drop policy if exists "Permitir inserção de pessoas via service role" on public.pessoas;
drop policy if exists "Permitir atualização de pessoas via service role" on public.pessoas;
drop policy if exists "Permitir deleção de pessoas via service role" on public.pessoas;

drop policy if exists "Permitir leitura pública de arquivos históricos" on public.arquivos_historicos;
drop policy if exists "Permitir inserção de arquivos via service role" on public.arquivos_historicos;
drop policy if exists "Permitir atualização de arquivos via service role" on public.arquivos_historicos;
drop policy if exists "Permitir deleção de arquivos via service role" on public.arquivos_historicos;
