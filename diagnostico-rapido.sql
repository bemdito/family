-- =====================================================
-- DIAGNÓSTICO RÁPIDO: Verificar se irmãos estão conectados
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Tempo de execução: ~5 segundos
-- =====================================================

-- ✅ TESTE 1: Existem irmãos no banco?
-- ----------------------------------------------------
SELECT 
  '✅ TESTE 1: Irmãos no banco' as teste,
  COUNT(*) as total_relacionamentos_irmaos,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASSOU - Irmãos foram criados'
    ELSE '❌ FALHOU - Nenhum irmão no banco. Execute a migração em /admin/migrar-dados'
  END as resultado
FROM relacionamentos
WHERE tipo_relacionamento = 'irmao';

-- ✅ TESTE 2: Relacionamentos são bidirecionais?
-- ----------------------------------------------------
WITH irmaos_unidirecionais AS (
  SELECT 
    r1.pessoa_origem_id,
    r1.pessoa_destino_id
  FROM relacionamentos r1
  WHERE r1.tipo_relacionamento = 'irmao'
  AND NOT EXISTS (
    SELECT 1 FROM relacionamentos r2
    WHERE r2.tipo_relacionamento = 'irmao'
    AND r2.pessoa_origem_id = r1.pessoa_destino_id
    AND r2.pessoa_destino_id = r1.pessoa_origem_id
  )
)
SELECT 
  '✅ TESTE 2: Bidirecionalidade' as teste,
  COUNT(*) as total_irmaos_unidirecionais,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASSOU - Todos relacionamentos são bidirecionais'
    ELSE '⚠️ ATENÇÃO - ' || COUNT(*) || ' relacionamentos são unidirecionais. Re-execute a migração.'
  END as resultado
FROM irmaos_unidirecionais;

-- ✅ TESTE 3: Exemplos de pessoas com irmãos
-- ----------------------------------------------------
SELECT 
  '✅ TESTE 3: Exemplos de irmãos' as teste,
  p1.nome_completo as pessoa,
  COUNT(r.id) as total_irmaos,
  STRING_AGG(p2.nome_completo, ', ' ORDER BY p2.nome_completo) as nomes_irmaos
FROM pessoas p1
LEFT JOIN relacionamentos r ON r.pessoa_origem_id = p1.id AND r.tipo_relacionamento = 'irmao'
LEFT JOIN pessoas p2 ON p2.id = r.pessoa_destino_id
WHERE p1.humano_ou_pet = 'Humano'
GROUP BY p1.id, p1.nome_completo
HAVING COUNT(r.id) > 0
ORDER BY total_irmaos DESC
LIMIT 5;

-- ✅ TESTE 4: Estatísticas gerais
-- ----------------------------------------------------
SELECT 
  'Total de pessoas' as metrica,
  COUNT(*)::text as valor
FROM pessoas
UNION ALL
SELECT 
  'Pessoas com irmãos',
  COUNT(DISTINCT pessoa_origem_id)::text
FROM relacionamentos
WHERE tipo_relacionamento = 'irmao'
UNION ALL
SELECT 
  'Relacionamentos de irmãos',
  COUNT(*)::text
FROM relacionamentos
WHERE tipo_relacionamento = 'irmao'
UNION ALL
SELECT 
  'Total de relacionamentos',
  COUNT(*)::text
FROM relacionamentos;

-- ✅ TESTE 5: Distribuição de relacionamentos por tipo
-- ----------------------------------------------------
SELECT 
  tipo_relacionamento,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM relacionamentos
GROUP BY tipo_relacionamento
ORDER BY total DESC;

-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- =====================================================
-- 
-- ✅ TUDO CORRETO SE:
-- - TESTE 1: total_relacionamentos_irmaos > 0
-- - TESTE 2: total_irmaos_unidirecionais = 0
-- - TESTE 3: Lista com 5 exemplos de pessoas e seus irmãos
-- - TESTE 4: "Relacionamentos de irmãos" > 0
-- - TESTE 5: Linha "irmao" aparece na lista
-- 
-- ❌ SE ALGUM TESTE FALHOU:
-- 1. Execute /database-schema.sql no Supabase (se ainda não executou)
-- 2. Execute a migração em /admin/migrar-dados
-- 3. Execute este diagnóstico novamente
-- 
-- =====================================================
