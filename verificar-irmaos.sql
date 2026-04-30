-- =====================================================
-- VERIFICAÇÃO DE RELACIONAMENTOS DE IRMÃOS
-- =====================================================
-- Execute este SQL no Supabase SQL Editor para verificar
-- se os irmãos estão corretamente interligados no banco
-- =====================================================

-- 1. TOTAL DE RELACIONAMENTOS POR TIPO
-- ----------------------------------------------------
SELECT 
  tipo_relacionamento,
  COUNT(*) as total
FROM relacionamentos
GROUP BY tipo_relacionamento
ORDER BY total DESC;

-- Esperado: Deve ter um número significativo de relacionamentos tipo 'irmao'


-- 2. PESSOAS COM SEUS IRMÃOS (TOP 10)
-- ----------------------------------------------------
SELECT 
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
LIMIT 10;

-- Esperado: Deve listar pessoas com seus irmãos


-- 3. FAMÍLIAS COMPLETAS (Pais e seus filhos como irmãos)
-- ----------------------------------------------------
WITH filhos_por_pai AS (
  SELECT 
    r_pai.pessoa_destino_id as pai_id,
    p_pai.nome_completo as nome_pai,
    r_pai.pessoa_origem_id as filho_id,
    p_filho.nome_completo as nome_filho,
    p_filho.data_nascimento
  FROM relacionamentos r_pai
  JOIN pessoas p_pai ON p_pai.id = r_pai.pessoa_destino_id
  JOIN pessoas p_filho ON p_filho.id = r_pai.pessoa_origem_id
  WHERE r_pai.tipo_relacionamento = 'pai'
)
SELECT 
  nome_pai as pai,
  COUNT(DISTINCT filho_id) as total_filhos,
  STRING_AGG(DISTINCT nome_filho, ', ' ORDER BY nome_filho) as filhos
FROM filhos_por_pai
GROUP BY pai_id, nome_pai
HAVING COUNT(DISTINCT filho_id) >= 2
ORDER BY total_filhos DESC
LIMIT 10;

-- Esperado: Pais com 2+ filhos (estes filhos devem ser irmãos entre si)


-- 4. VERIFICAR SE IRMÃOS ESTÃO BIDIRECIONAL
-- ----------------------------------------------------
-- Relacionamentos de irmãos devem ser bidirecionais
-- Se A é irmão de B, então B deve ser irmão de A
WITH irmaos_unidirecionais AS (
  SELECT 
    r1.pessoa_origem_id as pessoa_a,
    r1.pessoa_destino_id as pessoa_b,
    p1.nome_completo as nome_a,
    p2.nome_completo as nome_b
  FROM relacionamentos r1
  JOIN pessoas p1 ON p1.id = r1.pessoa_origem_id
  JOIN pessoas p2 ON p2.id = r1.pessoa_destino_id
  WHERE r1.tipo_relacionamento = 'irmao'
  AND NOT EXISTS (
    SELECT 1 FROM relacionamentos r2
    WHERE r2.tipo_relacionamento = 'irmao'
    AND r2.pessoa_origem_id = r1.pessoa_destino_id
    AND r2.pessoa_destino_id = r1.pessoa_origem_id
  )
)
SELECT 
  COUNT(*) as total_irmaos_unidirecionais,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos os relacionamentos de irmãos são bidirecionais'
    ELSE '⚠️ ATENÇÃO - Existem relacionamentos de irmãos unidirecionais'
  END as status
FROM irmaos_unidirecionais;

-- Esperado: 0 relacionamentos unidirecionais (todos devem ser bidirecionais)


-- 5. ESTATÍSTICAS GERAIS DE RELACIONAMENTOS
-- ----------------------------------------------------
SELECT 
  'Total de pessoas' as metrica,
  COUNT(*) as valor
FROM pessoas
UNION ALL
SELECT 
  'Pessoas com irmãos',
  COUNT(DISTINCT pessoa_origem_id)
FROM relacionamentos
WHERE tipo_relacionamento = 'irmao'
UNION ALL
SELECT 
  'Total de relacionamentos de irmãos',
  COUNT(*)
FROM relacionamentos
WHERE tipo_relacionamento = 'irmao'
UNION ALL
SELECT 
  'Total de todos relacionamentos',
  COUNT(*)
FROM relacionamentos;


-- 6. EXEMPLO DETALHADO: Uma família específica
-- ----------------------------------------------------
-- Vamos pegar uma família e verificar se todos os filhos estão conectados como irmãos
WITH exemplo_familia AS (
  -- Pegar um pai/mãe com múltiplos filhos
  SELECT pessoa_destino_id as pai_id
  FROM relacionamentos
  WHERE tipo_relacionamento = 'pai'
  GROUP BY pessoa_destino_id
  HAVING COUNT(*) >= 3
  LIMIT 1
),
filhos_da_familia AS (
  SELECT 
    r.pessoa_origem_id as filho_id,
    p.nome_completo as nome_filho
  FROM relacionamentos r
  JOIN pessoas p ON p.id = r.pessoa_origem_id
  WHERE r.tipo_relacionamento = 'pai'
  AND r.pessoa_destino_id = (SELECT pai_id FROM exemplo_familia)
)
SELECT 
  f1.nome_filho as irmao_1,
  f2.nome_filho as irmao_2,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM relacionamentos
      WHERE pessoa_origem_id = f1.filho_id
      AND pessoa_destino_id = f2.filho_id
      AND tipo_relacionamento = 'irmao'
    ) THEN '✅ Conectados'
    ELSE '❌ NÃO conectados'
  END as status_conexao
FROM filhos_da_familia f1
CROSS JOIN filhos_da_familia f2
WHERE f1.filho_id < f2.filho_id
ORDER BY f1.nome_filho, f2.nome_filho;

-- Esperado: Todos devem estar com status "✅ Conectados"


-- 7. PESSOAS SEM RELACIONAMENTOS (Órfãos no grafo)
-- ----------------------------------------------------
SELECT 
  p.nome_completo,
  p.humano_ou_pet,
  COUNT(r.id) as total_relacionamentos
FROM pessoas p
LEFT JOIN relacionamentos r ON (r.pessoa_origem_id = p.id OR r.pessoa_destino_id = p.id)
GROUP BY p.id, p.nome_completo, p.humano_ou_pet
HAVING COUNT(r.id) = 0
ORDER BY p.nome_completo;

-- Esperado: Pode haver alguns pets ou pessoas sem relacionamentos cadastrados


-- =====================================================
-- AÇÕES CORRETIVAS (se necessário)
-- =====================================================

-- Se os relacionamentos de irmãos não existirem, você pode executar
-- a função de detecção acessando:
-- /admin/migrar-dados no painel administrativo
-- 
-- Ou executar manualmente a lógica SQL abaixo:

/*
-- ATENÇÃO: Executar APENAS se os irmãos não estiverem conectados!
-- Esta query cria relacionamentos bidirecionais entre irmãos

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
*/

-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================
