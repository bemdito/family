-- =====================================================
-- SCRIPT DE CORREÇÃO AUTOMÁTICA
-- =====================================================
-- Este script corrige o problema da pessoa isolada
-- Execute APENAS uma das opções abaixo
-- =====================================================

-- =====================================================
-- ANÁLISE DO PROBLEMA
-- =====================================================

-- Ver pessoa isolada
SELECT 
  p.id,
  p.nome_completo,
  p.humano_ou_pet,
  p.data_nascimento,
  p.local_nascimento,
  COUNT(r.id) as total_relacionamentos
FROM pessoas p
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
WHERE p.nome_completo = 'Glauce Thaís Barros'
GROUP BY p.id, p.nome_completo, p.humano_ou_pet, p.data_nascimento, p.local_nascimento;

-- Resultado esperado: 0 relacionamentos


-- =====================================================
-- OPÇÃO 1: REMOVER PESSOA ISOLADA (MAIS SIMPLES)
-- =====================================================
-- Execute se esta pessoa não deve estar na árvore

-- ATENÇÃO: Isso é permanente! Faça backup antes!

BEGIN;

-- Backup antes de deletar (copie o resultado)
SELECT * FROM pessoas WHERE nome_completo = 'Glauce Thaís Barros';

-- Deletar pessoa
DELETE FROM pessoas WHERE nome_completo = 'Glauce Thaís Barros';

-- Verificar resultado
SELECT COUNT(*) as pessoas_isoladas
FROM pessoas p
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
GROUP BY p.id
HAVING COUNT(r.id) = 0;
-- Esperado: 0

COMMIT;
-- ou ROLLBACK; se quiser desfazer


-- =====================================================
-- OPÇÃO 2: ADICIONAR RELACIONAMENTOS (EXEMPLO)
-- =====================================================
-- Execute se souber quem são os pais/família desta pessoa

-- PASSO 1: Identificar os pais
-- Exemplo: Supondo que os pais sejam "João Barros" e "Maria Silva"

/*
BEGIN;

-- Adicionar relacionamento com pai
INSERT INTO relacionamentos (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, subtipo_relacionamento)
VALUES (
  (SELECT id FROM pessoas WHERE nome_completo = 'Glauce Thaís Barros'),
  (SELECT id FROM pessoas WHERE nome_completo = 'João Barros'), -- SUBSTITUIR pelo nome correto
  'pai',
  'sangue'
);

-- Adicionar relacionamento com mãe
INSERT INTO relacionamentos (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, subtipo_relacionamento)
VALUES (
  (SELECT id FROM pessoas WHERE nome_completo = 'Glauce Thaís Barros'),
  (SELECT id FROM pessoas WHERE nome_completo = 'Maria Silva'), -- SUBSTITUIR pelo nome correto
  'mae',
  'sangue'
);

-- PASSO 2: Detectar e criar irmãos automaticamente
WITH irmaos_detectados AS (
  -- Detectar irmãos pelo mesmo pai
  SELECT DISTINCT
    r1.pessoa_origem_id as pessoa_a,
    r2.pessoa_origem_id as pessoa_b
  FROM relacionamentos r1
  JOIN relacionamentos r2 
    ON r1.pessoa_destino_id = r2.pessoa_destino_id
    AND r1.pessoa_origem_id < r2.pessoa_origem_id
  WHERE r1.tipo_relacionamento = 'pai'
  AND r2.tipo_relacionamento = 'pai'
  
  UNION
  
  -- Detectar irmãos pela mesma mãe
  SELECT DISTINCT
    r1.pessoa_origem_id as pessoa_a,
    r2.pessoa_origem_id as pessoa_b
  FROM relacionamentos r1
  JOIN relacionamentos r2 
    ON r1.pessoa_destino_id = r2.pessoa_destino_id
    AND r1.pessoa_origem_id < r2.pessoa_origem_id
  WHERE r1.tipo_relacionamento = 'mae'
  AND r2.tipo_relacionamento = 'mae'
)
INSERT INTO relacionamentos (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, subtipo_relacionamento)
SELECT pessoa_a, pessoa_b, 'irmao', 'sangue' FROM irmaos_detectados
UNION ALL
SELECT pessoa_b, pessoa_a, 'irmao', 'sangue' FROM irmaos_detectados
ON CONFLICT (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento) DO NOTHING;

-- PASSO 3: Verificar resultado
SELECT 
  p1.nome_completo as pessoa,
  COUNT(r.id) as total_relacionamentos,
  STRING_AGG(
    CASE 
      WHEN r.tipo_relacionamento = 'pai' THEN 'Pai: ' || p2.nome_completo
      WHEN r.tipo_relacionamento = 'mae' THEN 'Mãe: ' || p2.nome_completo
      WHEN r.tipo_relacionamento = 'irmao' THEN 'Irmão/Irmã: ' || p2.nome_completo
      ELSE r.tipo_relacionamento || ': ' || p2.nome_completo
    END,
    ', '
  ) as relacionamentos
FROM pessoas p1
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p1.id OR r.pessoa_destino_id = p1.id)
LEFT JOIN pessoas p2 ON (
  CASE 
    WHEN r.pessoa_origem_id = p1.id THEN r.pessoa_destino_id
    ELSE r.pessoa_origem_id
  END = p2.id
)
WHERE p1.nome_completo = 'Glauce Thaís Barros'
GROUP BY p1.id, p1.nome_completo;

COMMIT;
-- ou ROLLBACK; se algo deu errado
*/


-- =====================================================
-- OPÇÃO 3: INVESTIGAR FAMÍLIA (ANTES DE DECIDIR)
-- =====================================================
-- Execute para descobrir quem pode ser a família desta pessoa

-- Buscar pessoas com sobrenome similar
SELECT 
  id,
  nome_completo,
  data_nascimento,
  local_nascimento,
  (
    SELECT COUNT(*) 
    FROM relacionamentos 
    WHERE pessoa_origem_id = p.id OR pessoa_destino_id = p.id
  ) as total_relacionamentos
FROM pessoas p
WHERE nome_completo LIKE '%Barros%'
ORDER BY nome_completo;

-- Resultado: Lista de pessoas com sobrenome "Barros"
-- Use isso para identificar potenciais pais/irmãos


-- Buscar famílias Barros (pais com filhos)
SELECT 
  p_pai.nome_completo as pai,
  COUNT(DISTINCT r.pessoa_origem_id) as total_filhos,
  STRING_AGG(DISTINCT p_filho.nome_completo, ', ' ORDER BY p_filho.nome_completo) as filhos
FROM relacionamentos r
JOIN pessoas p_pai ON p_pai.id = r.pessoa_destino_id
JOIN pessoas p_filho ON p_filho.id = r.pessoa_origem_id
WHERE r.tipo_relacionamento = 'pai'
AND p_pai.nome_completo LIKE '%Barros%'
GROUP BY p_pai.id, p_pai.nome_completo
ORDER BY total_filhos DESC;

-- Resultado: Famílias Barros e seus filhos
-- Identifique em qual família Glauce pertence


-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute após qualquer correção para validar

-- Teste 1: Nenhuma pessoa isolada
SELECT 
  '✅ TESTE: Pessoas isoladas' as teste,
  COUNT(*) as total_pessoas_isoladas,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCESSO - Nenhuma pessoa isolada'
    ELSE '❌ ERRO - Ainda existem ' || COUNT(*) || ' pessoas isoladas'
  END as resultado
FROM (
  SELECT p.id
  FROM pessoas p
  LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
  GROUP BY p.id
  HAVING COUNT(r.id) = 0
) subquery;


-- Teste 2: Glauce tem relacionamentos (se não foi deletada)
SELECT 
  '✅ TESTE: Glauce tem relacionamentos' as teste,
  COALESCE(COUNT(r.id), 0) as total_relacionamentos,
  CASE 
    WHEN COUNT(r.id) > 0 THEN '✅ SUCESSO - Glauce tem ' || COUNT(r.id) || ' relacionamentos'
    WHEN COUNT(r.id) = 0 THEN '⚠️ ATENÇÃO - Glauce não tem relacionamentos'
    ELSE '✅ OK - Glauce foi removida do banco'
  END as resultado
FROM pessoas p
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
WHERE p.nome_completo = 'Glauce Thaís Barros'
GROUP BY p.id;


-- Teste 3: Estatísticas atualizadas
SELECT 
  'Total de pessoas' as metrica,
  COUNT(*)::text as valor
FROM pessoas
UNION ALL
SELECT 
  'Pessoas com relacionamentos',
  COUNT(DISTINCT p.id)::text
FROM pessoas p
JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
UNION ALL
SELECT 
  'Pessoas isoladas',
  COUNT(DISTINCT p.id)::text
FROM pessoas p
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
WHERE r.id IS NULL
UNION ALL
SELECT 
  'Total de relacionamentos',
  COUNT(*)::text
FROM relacionamentos;


-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
-- 
-- 1. ANÁLISE DO PROBLEMA
--    Execute a primeira query para ver a pessoa isolada
-- 
-- 2. ESCOLHA UMA OPÇÃO:
--    
--    OPÇÃO 1 (Remover): 
--    - Use se a pessoa não deve estar na árvore
--    - Mais rápido e simples
--    - Irreversível (mas pode re-adicionar via migração)
--    
--    OPÇÃO 2 (Adicionar relacionamentos):
--    - Use se souber quem são os pais
--    - Mais completo
--    - SUBSTITUA os nomes dos pais pelos corretos
--    
--    OPÇÃO 3 (Investigar):
--    - Use ANTES das outras opções
--    - Descobre famílias e potenciais relacionamentos
--    - Ajuda a decidir qual opção usar
-- 
-- 3. VERIFICAÇÃO FINAL
--    Execute os 3 testes finais para validar
-- 
-- 4. ATUALIZAR SEED.TS
--    Não esqueça de atualizar /src/app/data/seed.ts
--    para manter sincronizado com o banco!
-- 
-- =====================================================

-- =====================================================
-- ATALHO: CORREÇÃO RÁPIDA (REMOVER)
-- =====================================================
-- Descomente e execute se quiser simplesmente remover

-- DELETE FROM pessoas WHERE nome_completo = 'Glauce Thaís Barros';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
