-- =====================================================
-- SCHEMA DA ÁRVORE GENEALÓGICA
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Cole este código > Run
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: pessoas
-- Armazena informações sobre membros da família e pets
-- =====================================================
CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_completo VARCHAR(255) NOT NULL,
  data_nascimento VARCHAR(50), -- Permite ano (1990) ou data completa (15/03/1990)
  local_nascimento VARCHAR(255),
  data_falecimento VARCHAR(50),
  local_falecimento VARCHAR(255),
  local_atual VARCHAR(255),
  foto_principal_url TEXT,
  humano_ou_pet VARCHAR(20) NOT NULL DEFAULT 'Humano' CHECK (humano_ou_pet IN ('Humano', 'Pet')),
  lado VARCHAR(20) DEFAULT 'esquerda' CHECK (lado IN ('esquerda', 'direita')),
  manual_generation SMALLINT CHECK (manual_generation IS NULL OR manual_generation BETWEEN 1 AND 7),
  cor_bg_card VARCHAR(20), -- Cor de fundo do card (hex)
  minibio TEXT,
  curiosidades TEXT,
  telefone VARCHAR(20),
  endereco TEXT,
  rede_social VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome_completo);
CREATE INDEX IF NOT EXISTS idx_pessoas_tipo ON pessoas(humano_ou_pet);
CREATE INDEX IF NOT EXISTS idx_pessoas_lado ON pessoas(lado);
CREATE INDEX IF NOT EXISTS idx_pessoas_manual_generation ON pessoas(manual_generation);
CREATE INDEX IF NOT EXISTS idx_pessoas_created_at ON pessoas(created_at);

-- =====================================================
-- TABELA: relacionamentos
-- Armazena as conexões entre pessoas
-- =====================================================
CREATE TABLE IF NOT EXISTS relacionamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_origem_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  pessoa_destino_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  tipo_relacionamento VARCHAR(50) NOT NULL CHECK (tipo_relacionamento IN ('pai', 'mae', 'filho', 'conjuge', 'irmao')),
  subtipo_relacionamento VARCHAR(50) CHECK (subtipo_relacionamento IN ('sangue', 'adotivo', 'casamento', 'uniao_estavel')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicatas exatas
  UNIQUE(pessoa_origem_id, pessoa_destino_id, tipo_relacionamento)
);

-- Índices para queries otimizadas
CREATE INDEX IF NOT EXISTS idx_rel_origem ON relacionamentos(pessoa_origem_id);
CREATE INDEX IF NOT EXISTS idx_rel_destino ON relacionamentos(pessoa_destino_id);
CREATE INDEX IF NOT EXISTS idx_rel_tipo ON relacionamentos(tipo_relacionamento);

-- =====================================================
-- TABELA: arquivos_historicos
-- Armazena fotos e documentos históricos de cada pessoa
-- =====================================================
CREATE TABLE IF NOT EXISTS arquivos_historicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  ano VARCHAR(10), -- Ano relacionado ao arquivo
  tipo VARCHAR(50) DEFAULT 'foto' CHECK (tipo IN ('foto', 'documento', 'video', 'outro')),
  ordem INT DEFAULT 0, -- Para ordenar os arquivos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_arquivos_pessoa ON arquivos_historicos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_ordem ON arquivos_historicos(pessoa_id, ordem);

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_pessoas_updated_at ON pessoas;
CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON pessoas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_relacionamentos_updated_at ON relacionamentos;
CREATE TRIGGER update_relacionamentos_updated_at
  BEFORE UPDATE ON relacionamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_arquivos_updated_at ON arquivos_historicos;
CREATE TRIGGER update_arquivos_updated_at
  BEFORE UPDATE ON arquivos_historicos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- Por enquanto, permitir acesso público para prototipagem
-- Em produção, adicionar políticas baseadas em autenticação
-- =====================================================

-- Habilitar RLS
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relacionamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_historicos ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (área pública do site)
CREATE POLICY "Permitir leitura pública de pessoas"
  ON pessoas FOR SELECT
  USING (true);

CREATE POLICY "Permitir leitura pública de relacionamentos"
  ON relacionamentos FOR SELECT
  USING (true);

CREATE POLICY "Permitir leitura pública de arquivos históricos"
  ON arquivos_historicos FOR SELECT
  USING (true);

-- Políticas para escrita (apenas via service_role no backend)
CREATE POLICY "Permitir inserção de pessoas via service role"
  ON pessoas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de pessoas via service role"
  ON pessoas FOR UPDATE
  USING (true);

CREATE POLICY "Permitir deleção de pessoas via service role"
  ON pessoas FOR DELETE
  USING (true);

CREATE POLICY "Permitir inserção de relacionamentos via service role"
  ON relacionamentos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de relacionamentos via service role"
  ON relacionamentos FOR UPDATE
  USING (true);

CREATE POLICY "Permitir deleção de relacionamentos via service role"
  ON relacionamentos FOR DELETE
  USING (true);

CREATE POLICY "Permitir inserção de arquivos via service role"
  ON arquivos_historicos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de arquivos via service role"
  ON arquivos_historicos FOR UPDATE
  USING (true);

CREATE POLICY "Permitir deleção de arquivos via service role"
  ON arquivos_historicos FOR DELETE
  USING (true);

-- =====================================================
-- VIEWS ÚTEIS (opcional)
-- =====================================================

-- View com contagem de relacionamentos por pessoa
CREATE OR REPLACE VIEW pessoas_com_estatisticas AS
SELECT 
  p.*,
  COUNT(DISTINCT CASE WHEN r.tipo_relacionamento = 'conjuge' THEN r.id END) as total_conjuges,
  COUNT(DISTINCT CASE WHEN r.tipo_relacionamento = 'filho' THEN r.id END) as total_filhos,
  COUNT(DISTINCT CASE WHEN r.tipo_relacionamento IN ('pai', 'mae') THEN r.id END) as total_pais,
  COUNT(DISTINCT a.id) as total_arquivos
FROM pessoas p
LEFT JOIN relacionamentos r ON r.pessoa_origem_id = p.id
LEFT JOIN arquivos_historicos a ON a.pessoa_id = p.id
GROUP BY p.id;

-- =====================================================
-- COMENTÁRIOS (documentação do schema)
-- =====================================================

COMMENT ON TABLE pessoas IS 'Armazena informações sobre membros da família e pets';
COMMENT ON TABLE relacionamentos IS 'Define as conexões entre pessoas (pai, mãe, cônjuge, irmão, filho)';
COMMENT ON TABLE arquivos_historicos IS 'Fotos e documentos históricos associados a cada pessoa';

COMMENT ON COLUMN pessoas.data_nascimento IS 'Flexível: aceita ano (1990) ou data completa (15/03/1990)';
COMMENT ON COLUMN pessoas.humano_ou_pet IS 'Tipo da entidade: Humano ou Pet';
COMMENT ON COLUMN pessoas.manual_generation IS 'Geração manual da árvore: 1 a 7. NULL usa cálculo automático.';
COMMENT ON COLUMN pessoas.cor_bg_card IS 'Cor de fundo personalizada do card na árvore (formato hex)';

COMMENT ON COLUMN relacionamentos.tipo_relacionamento IS 'Tipo: pai, mae, filho, conjuge, irmao';
COMMENT ON COLUMN relacionamentos.subtipo_relacionamento IS 'Subtipo: sangue, adotivo, casamento, uniao_estavel';

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
