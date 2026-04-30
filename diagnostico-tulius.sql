-- =====================================================
-- DIAGNÓSTICO ESPECÍFICO: Tulius Tsangоpoulos
-- =====================================================
-- Execute este SQL no Supabase SQL Editor para identificar
-- por que Tulius não tem linha verde para cônjuge
-- e linha de filiação dos pais
-- =====================================================

-- 1. Informações básicas de Tulius
SELECT 
  '1️⃣ DADOS DE TULIUS' as secao,
  id,
  nome_completo,
  data_nascimento,
  local_nascimento
FROM pessoas
WHERE nome_completo ILIKE '%tulius%tsang%';

-- 2. Relacionamentos CONJUGAIS de Tulius (deve ter 2: ele->cônjuge e cônjuge->ele)
SELECT 
  '2️⃣ RELACIONAMENTOS CONJUGAIS DE TULIUS' as secao,
  r.id,
  r.tipo_relacionamento,
  r.subtipo_relacionamento,
  p_origem.nome_completo as origem,
  p_destino.nome_completo as destino,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM relacionamentos r2 
      WHERE r2.tipo_relacionamento = 'conjuge'
      AND r2.pessoa_origem_id = r.pessoa_destino_id
      AND r2.pessoa_destino_id = r.pessoa_origem_id
    ) THEN '✅ BIDIRECIONAL'
    ELSE '❌ UNIDIRECIONAL - PROBLEMA!'
  END as status
FROM relacionamentos r
JOIN pessoas p_origem ON p_origem.id = r.pessoa_origem_id
JOIN pessoas p_destino ON p_destino.id = r.pessoa_destino_id
WHERE r.tipo_relacionamento = 'conjuge'
AND (p_origem.nome_completo ILIKE '%tulius%tsang%' OR p_destino.nome_completo ILIKE '%tulius%tsang%');

-- 3. Relacionamentos de FILIAÇÃO de Tulius (pai/mãe)
SELECT 
  '3️⃣ PAIS DE TULIUS' as secao,
  r.id,
  r.tipo_relacionamento,
  r.subtipo_relacionamento,
  p_origem.nome_completo as filho,
  p_destino.nome_completo as pai_mae
FROM relacionamentos r
JOIN pessoas p_origem ON p_origem.id = r.pessoa_origem_id
JOIN pessoas p_destino ON p_destino.id = r.pessoa_destino_id
WHERE (r.tipo_relacionamento = 'pai' OR r.tipo_relacionamento = 'mae')
AND p_origem.nome_completo ILIKE '%tulius%tsang%';

-- 4. Verificar se os PAIS de Tulius têm relacionamento conjugal entre eles
WITH tulius_parents AS (
  SELECT 
    r.pessoa_destino_id as parent_id,
    p.nome_completo as parent_name
  FROM relacionamentos r
  JOIN pessoas p ON p.id = r.pessoa_destino_id
  WHERE (r.tipo_relacionamento = 'pai' OR r.tipo_relacionamento = 'mae')
  AND r.pessoa_origem_id IN (SELECT id FROM pessoas WHERE nome_completo ILIKE '%tulius%tsang%')
)
SELECT 
  '4️⃣ RELACIONAMENTO CONJUGAL ENTRE OS PAIS DE TULIUS' as secao,
  COUNT(*) as total_relacionamentos_conjugais,
  STRING_AGG(p_origem.nome_completo || ' ↔️ ' || p_destino.nome_completo, ', ') as relacionamentos,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ BIDIRECIONAL - OK'
    WHEN COUNT(*) = 1 THEN '⚠️ UNIDIRECIONAL - ADICIONE O REVERSO'
    ELSE '❌ SEM RELACIONAMENTO - ADICIONE!'
  END as status
FROM relacionamentos r
JOIN pessoas p_origem ON p_origem.id = r.pessoa_origem_id
JOIN pessoas p_destino ON p_destino.id = r.pessoa_destino_id
JOIN tulius_parents tp1 ON tp1.parent_id = r.pessoa_origem_id
JOIN tulius_parents tp2 ON tp2.parent_id = r.pessoa_destino_id
WHERE r.tipo_relacionamento = 'conjuge';

-- 5. Verificar se Tulius tem filhos (necessário para criar marriage node)
SELECT 
  '5️⃣ FILHOS DE TULIUS' as secao,
  COUNT(*) as total_filhos,
  STRING_AGG(p_destino.nome_completo, ', ') as nomes_filhos,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ TEM FILHOS - Marriage node deve ser criado'
    ELSE 'ℹ️ SEM FILHOS - Linha verde direta deve ser usada'
  END as status
FROM relacionamentos r
JOIN pessoas p_destino ON p_destino.id = r.pessoa_destino_id
WHERE r.tipo_relacionamento = 'filho'
AND r.pessoa_origem_id IN (SELECT id FROM pessoas WHERE nome_completo ILIKE '%tulius%tsang%');

-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- =====================================================
-- 
-- ✅ CENÁRIO IDEAL:
-- - Seção 2: 2 relacionamentos (bidirecional)
-- - Seção 3: 1 ou 2 relacionamentos (pai/mãe)
-- - Seção 4: 2 relacionamentos (pais são casados, bidirecional)
-- - Seção 5: Qualquer valor (depende se tem filhos)
-- 
-- 🔧 COMO CORRIGIR:
-- 
-- Se Seção 2 mostra apenas 1 relacionamento:
-- ➡️ Adicione o relacionamento reverso no painel admin
--    ou execute:
--    INSERT INTO relacionamentos (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, subtipo_relacionamento)
--    SELECT pessoa_destino_id, pessoa_origem_id, 'conjuge', 'casamento'
--    FROM relacionamentos 
--    WHERE tipo_relacionamento = 'conjuge' 
--    AND id = 'ID_DO_RELACIONAMENTO_EXISTENTE';
-- 
-- Se Seção 4 mostra 0 ou 1 relacionamento:
-- ➡️ Os pais de Tulius precisam ter relacionamento conjugal cadastrado
--    Use o painel admin para adicionar o relacionamento entre os pais
-- 
-- =====================================================
