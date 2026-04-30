-- =====================================================
-- SCRIPT DE MIGRAÇÃO: Dados iniciais da família
-- =====================================================
-- Execute este SQL DEPOIS de executar database-schema.sql
-- Este script popula o banco com os 62 membros da família
-- =====================================================
-- IMPORTANTE: Os IDs serão gerados automaticamente pelo Supabase
-- Você precisará ajustar os relacionamentos após a primeira inserção
-- =====================================================

-- Este é um arquivo de referência para estrutura
-- Os dados serão migrados via endpoint API do servidor
-- que irá processar o seed.ts existente e criar os registros
-- com os UUIDs corretos automaticamente

-- Para migrar os dados:
-- 1. Execute database-schema.sql primeiro
-- 2. Acesse /admin/migrar-dados no painel administrativo
-- 3. O sistema irá processar automaticamente o seed.ts
-- 4. Todos os relacionamentos serão criados com os UUIDs corretos

-- OU execute a rota via API:
-- POST /make-server-055bf375/migrar-dados
-- Authorization: Bearer {publicAnonKey}

-- Isso irá:
-- 1. Limpar dados existentes (se houver)
-- 2. Criar todas as pessoas do seed
-- 3. Mapear nomes para UUIDs
-- 4. Criar todos os relacionamentos automaticamente
-- 5. Detectar e criar relacionamentos de irmãos
