-- =====================================================
-- SCHEMA DO FORUM DA FAMILIA
-- =====================================================
-- Execute este SQL no Supabase SQL Editor.
-- Este arquivo cria somente as tabelas do forum e nao altera o schema atual.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- HELPERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.forum_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.email(), '') = 'tuliust@gmail.com';
$$;

CREATE OR REPLACE FUNCTION public.forum_update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forum_increment_topic_view(topic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  UPDATE public.forum_topicos
  SET visualizacoes = COALESCE(visualizacoes, 0) + 1
  WHERE id = topic_id
    AND (
      status IN ('aberto', 'resolvido', 'fechado')
      OR public.forum_is_admin()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.forum_mark_solution(target_topico_id UUID, target_resposta_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  topic_author UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT autor_id INTO topic_author
  FROM public.forum_topicos
  WHERE id = target_topico_id;

  IF topic_author IS NULL THEN
    RAISE EXCEPTION 'Topico nao encontrado';
  END IF;

  IF topic_author <> auth.uid() AND NOT public.forum_is_admin() THEN
    RAISE EXCEPTION 'Sem permissao para marcar solucao';
  END IF;

  UPDATE public.forum_respostas
  SET aceita_como_solucao = FALSE
  WHERE topico_id = target_topico_id;

  UPDATE public.forum_respostas
  SET aceita_como_solucao = TRUE
  WHERE id = target_resposta_id
    AND topico_id = target_topico_id
    AND status = 'publicado';

  UPDATE public.forum_topicos
  SET status = 'resolvido'
  WHERE id = target_topico_id;
END;
$$;

-- =====================================================
-- TABELAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descricao TEXT,
  icone TEXT,
  cor_token TEXT,
  ordem INT DEFAULT 0,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_topicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID REFERENCES public.forum_categorias(id) ON DELETE SET NULL,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'discussao' CHECK (tipo IN ('pergunta', 'discussao', 'aviso', 'memoria', 'ajuda')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido', 'fechado', 'oculto')),
  fixado BOOLEAN DEFAULT FALSE,
  destacado BOOLEAN DEFAULT FALSE,
  visualizacoes INT DEFAULT 0,
  pessoa_relacionada_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_respostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topico_id UUID NOT NULL REFERENCES public.forum_topicos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  aceita_como_solucao BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resposta_id UUID NOT NULL REFERENCES public.forum_respostas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_reacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alvo_tipo TEXT NOT NULL CHECK (alvo_tipo IN ('topico', 'resposta', 'comentario')),
  alvo_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('curtir', 'apoiar', 'lembrar', 'celebrar')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alvo_tipo, alvo_id, tipo)
);

CREATE TABLE IF NOT EXISTS public.forum_denuncias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  denunciante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alvo_tipo TEXT NOT NULL CHECK (alvo_tipo IN ('topico', 'resposta', 'comentario')),
  alvo_id UUID NOT NULL,
  motivo TEXT NOT NULL,
  detalhes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'analisada', 'descartada', 'removida')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_forum_categorias_ativa ON public.forum_categorias(ativa);
CREATE INDEX IF NOT EXISTS idx_forum_categorias_ordem ON public.forum_categorias(ordem);
CREATE INDEX IF NOT EXISTS idx_forum_categorias_created_at ON public.forum_categorias(created_at);

CREATE INDEX IF NOT EXISTS idx_forum_topicos_categoria_id ON public.forum_topicos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_forum_topicos_autor_id ON public.forum_topicos(autor_id);
CREATE INDEX IF NOT EXISTS idx_forum_topicos_created_at ON public.forum_topicos(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_topicos_status ON public.forum_topicos(status);
CREATE INDEX IF NOT EXISTS idx_forum_topicos_tipo ON public.forum_topicos(tipo);
CREATE INDEX IF NOT EXISTS idx_forum_topicos_pessoa_relacionada_id ON public.forum_topicos(pessoa_relacionada_id);

CREATE INDEX IF NOT EXISTS idx_forum_respostas_topico_id ON public.forum_respostas(topico_id);
CREATE INDEX IF NOT EXISTS idx_forum_respostas_autor_id ON public.forum_respostas(autor_id);
CREATE INDEX IF NOT EXISTS idx_forum_respostas_created_at ON public.forum_respostas(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_respostas_status ON public.forum_respostas(status);

CREATE INDEX IF NOT EXISTS idx_forum_comentarios_resposta_id ON public.forum_comentarios(resposta_id);
CREATE INDEX IF NOT EXISTS idx_forum_comentarios_autor_id ON public.forum_comentarios(autor_id);
CREATE INDEX IF NOT EXISTS idx_forum_comentarios_created_at ON public.forum_comentarios(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_comentarios_status ON public.forum_comentarios(status);

CREATE INDEX IF NOT EXISTS idx_forum_reacoes_user_id ON public.forum_reacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_reacoes_alvo ON public.forum_reacoes(alvo_tipo, alvo_id);
CREATE INDEX IF NOT EXISTS idx_forum_reacoes_created_at ON public.forum_reacoes(created_at);

CREATE INDEX IF NOT EXISTS idx_forum_denuncias_denunciante_id ON public.forum_denuncias(denunciante_id);
CREATE INDEX IF NOT EXISTS idx_forum_denuncias_alvo ON public.forum_denuncias(alvo_tipo, alvo_id);
CREATE INDEX IF NOT EXISTS idx_forum_denuncias_created_at ON public.forum_denuncias(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_denuncias_status ON public.forum_denuncias(status);

-- =====================================================
-- TRIGGERS UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_forum_categorias_updated_at ON public.forum_categorias;
CREATE TRIGGER update_forum_categorias_updated_at
  BEFORE UPDATE ON public.forum_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.forum_update_updated_at();

DROP TRIGGER IF EXISTS update_forum_topicos_updated_at ON public.forum_topicos;
CREATE TRIGGER update_forum_topicos_updated_at
  BEFORE UPDATE ON public.forum_topicos
  FOR EACH ROW
  EXECUTE FUNCTION public.forum_update_updated_at();

DROP TRIGGER IF EXISTS update_forum_respostas_updated_at ON public.forum_respostas;
CREATE TRIGGER update_forum_respostas_updated_at
  BEFORE UPDATE ON public.forum_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.forum_update_updated_at();

DROP TRIGGER IF EXISTS update_forum_comentarios_updated_at ON public.forum_comentarios;
CREATE TRIGGER update_forum_comentarios_updated_at
  BEFORE UPDATE ON public.forum_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.forum_update_updated_at();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.forum_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_denuncias ENABLE ROW LEVEL SECURITY;

-- Categorias
DROP POLICY IF EXISTS "Forum categorias leitura autenticada" ON public.forum_categorias;
CREATE POLICY "Forum categorias leitura autenticada"
  ON public.forum_categorias FOR SELECT
  TO authenticated
  USING (ativa = TRUE OR public.forum_is_admin());

DROP POLICY IF EXISTS "Forum categorias admin escrita" ON public.forum_categorias;
CREATE POLICY "Forum categorias admin escrita"
  ON public.forum_categorias FOR ALL
  TO authenticated
  USING (public.forum_is_admin())
  WITH CHECK (public.forum_is_admin());

-- Topicos
DROP POLICY IF EXISTS "Forum topicos leitura autenticada" ON public.forum_topicos;
CREATE POLICY "Forum topicos leitura autenticada"
  ON public.forum_topicos FOR SELECT
  TO authenticated
  USING (status IN ('aberto', 'resolvido', 'fechado') OR public.forum_is_admin());

DROP POLICY IF EXISTS "Forum topicos criar proprio" ON public.forum_topicos;
CREATE POLICY "Forum topicos criar proprio"
  ON public.forum_topicos FOR INSERT
  TO authenticated
  WITH CHECK (autor_id = auth.uid());

DROP POLICY IF EXISTS "Forum topicos editar proprio" ON public.forum_topicos;
CREATE POLICY "Forum topicos editar proprio"
  ON public.forum_topicos FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin())
  WITH CHECK (autor_id = auth.uid() OR public.forum_is_admin());

DROP POLICY IF EXISTS "Forum topicos deletar proprio" ON public.forum_topicos;
CREATE POLICY "Forum topicos deletar proprio"
  ON public.forum_topicos FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin());

-- Respostas
DROP POLICY IF EXISTS "Forum respostas leitura autenticada" ON public.forum_respostas;
CREATE POLICY "Forum respostas leitura autenticada"
  ON public.forum_respostas FOR SELECT
  TO authenticated
  USING (
    public.forum_is_admin()
    OR (
      status = 'publicado'
      AND EXISTS (
        SELECT 1
        FROM public.forum_topicos t
        WHERE t.id = forum_respostas.topico_id
          AND t.status IN ('aberto', 'resolvido', 'fechado')
      )
    )
  );

DROP POLICY IF EXISTS "Forum respostas criar propria" ON public.forum_respostas;
CREATE POLICY "Forum respostas criar propria"
  ON public.forum_respostas FOR INSERT
  TO authenticated
  WITH CHECK (autor_id = auth.uid());

DROP POLICY IF EXISTS "Forum respostas editar propria" ON public.forum_respostas;
CREATE POLICY "Forum respostas editar propria"
  ON public.forum_respostas FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin())
  WITH CHECK (autor_id = auth.uid() OR public.forum_is_admin());

DROP POLICY IF EXISTS "Forum respostas deletar propria" ON public.forum_respostas;
CREATE POLICY "Forum respostas deletar propria"
  ON public.forum_respostas FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin());

-- Comentarios
DROP POLICY IF EXISTS "Forum comentarios leitura autenticada" ON public.forum_comentarios;
CREATE POLICY "Forum comentarios leitura autenticada"
  ON public.forum_comentarios FOR SELECT
  TO authenticated
  USING (
    public.forum_is_admin()
    OR (
      status = 'publicado'
      AND EXISTS (
        SELECT 1
        FROM public.forum_respostas r
        JOIN public.forum_topicos t ON t.id = r.topico_id
        WHERE r.id = forum_comentarios.resposta_id
          AND r.status = 'publicado'
          AND t.status IN ('aberto', 'resolvido', 'fechado')
      )
    )
  );

DROP POLICY IF EXISTS "Forum comentarios criar proprio" ON public.forum_comentarios;
CREATE POLICY "Forum comentarios criar proprio"
  ON public.forum_comentarios FOR INSERT
  TO authenticated
  WITH CHECK (autor_id = auth.uid());

DROP POLICY IF EXISTS "Forum comentarios editar proprio" ON public.forum_comentarios;
CREATE POLICY "Forum comentarios editar proprio"
  ON public.forum_comentarios FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin())
  WITH CHECK (autor_id = auth.uid() OR public.forum_is_admin());

DROP POLICY IF EXISTS "Forum comentarios deletar proprio" ON public.forum_comentarios;
CREATE POLICY "Forum comentarios deletar proprio"
  ON public.forum_comentarios FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR public.forum_is_admin());

-- Reacoes
DROP POLICY IF EXISTS "Forum reacoes leitura autenticada" ON public.forum_reacoes;
CREATE POLICY "Forum reacoes leitura autenticada"
  ON public.forum_reacoes FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Forum reacoes criar propria" ON public.forum_reacoes;
CREATE POLICY "Forum reacoes criar propria"
  ON public.forum_reacoes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Forum reacoes deletar propria" ON public.forum_reacoes;
CREATE POLICY "Forum reacoes deletar propria"
  ON public.forum_reacoes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.forum_is_admin());

-- Denuncias
DROP POLICY IF EXISTS "Forum denuncias admin leitura" ON public.forum_denuncias;
CREATE POLICY "Forum denuncias admin leitura"
  ON public.forum_denuncias FOR SELECT
  TO authenticated
  USING (public.forum_is_admin());

DROP POLICY IF EXISTS "Forum denuncias criar propria" ON public.forum_denuncias;
CREATE POLICY "Forum denuncias criar propria"
  ON public.forum_denuncias FOR INSERT
  TO authenticated
  WITH CHECK (denunciante_id = auth.uid());

DROP POLICY IF EXISTS "Forum denuncias admin atualizar" ON public.forum_denuncias;
CREATE POLICY "Forum denuncias admin atualizar"
  ON public.forum_denuncias FOR UPDATE
  TO authenticated
  USING (public.forum_is_admin())
  WITH CHECK (public.forum_is_admin());

DROP POLICY IF EXISTS "Forum denuncias admin deletar" ON public.forum_denuncias;
CREATE POLICY "Forum denuncias admin deletar"
  ON public.forum_denuncias FOR DELETE
  TO authenticated
  USING (public.forum_is_admin());

-- =====================================================
-- CATEGORIAS INICIAIS
-- =====================================================

INSERT INTO public.forum_categorias (nome, slug, descricao, icone, cor_token, ordem, ativa)
VALUES
  ('Dúvidas da Família', 'duvidas-da-familia', 'Perguntas sobre parentes, vínculos, histórias e informações familiares.', 'help-circle', 'blue', 10, TRUE),
  ('Histórias e Memórias', 'historias-e-memorias', 'Relatos, lembranças, causos e registros afetivos da família.', 'book-open', 'amber', 20, TRUE),
  ('Documentos e Fotos', 'documentos-e-fotos', 'Espaço para organizar pedidos, achados e conversas sobre fotos e documentos.', 'image', 'emerald', 30, TRUE),
  ('Eventos e Encontros', 'eventos-e-encontros', 'Conversas sobre aniversários, encontros, viagens e eventos familiares.', 'calendar-days', 'violet', 40, TRUE),
  ('Ajuda com a Árvore', 'ajuda-com-a-arvore', 'Ajuda para usar, corrigir e enriquecer a árvore genealógica.', 'tree-pine', 'slate', 50, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  cor_token = EXCLUDED.cor_token,
  ordem = EXCLUDED.ordem,
  ativa = EXCLUDED.ativa,
  updated_at = NOW();

COMMENT ON TABLE public.forum_categorias IS 'Categorias do forum familiar';
COMMENT ON TABLE public.forum_topicos IS 'Topicos do forum familiar';
COMMENT ON TABLE public.forum_respostas IS 'Respostas dos topicos do forum familiar';
COMMENT ON TABLE public.forum_comentarios IS 'Comentarios em respostas do forum familiar';
COMMENT ON TABLE public.forum_reacoes IS 'Reacoes de usuarios a topicos, respostas e comentarios';
COMMENT ON TABLE public.forum_denuncias IS 'Denuncias para moderacao do forum familiar';
