import {
  ForumAlvoTipo,
  ForumCategoria,
  ForumComentario,
  ForumConteudoStatus,
  ForumDenuncia,
  ForumReacao,
  ForumReacaoTipo,
  ForumResposta,
  ForumTopico,
  ForumTopicoStatus,
  ForumTopicoTipo,
  Pessoa,
} from '../types';
import { supabase } from '../lib/supabaseClient';
import { notifyForumCommentCreated, notifyForumReplyCreated } from './notificationTriggersService';

type SupabaseErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
  status?: number;
};

export type ForumTopicoFiltros = {
  categoriaId?: string;
  autorId?: string;
  status?: ForumTopicoStatus | ForumTopicoStatus[];
  tipo?: ForumTopicoTipo | ForumTopicoTipo[];
  pessoaRelacionadaId?: string;
  busca?: string;
  limite?: number;
};

export type CriarTopicoForumPayload = {
  categoria_id?: string | null;
  autor_id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  tipo?: ForumTopicoTipo;
  status?: ForumTopicoStatus;
  pessoa_relacionada_id?: string | null;
};

export type AtualizarTopicoForumPayload = Partial<
  Pick<
    ForumTopico,
    | 'categoria_id'
    | 'titulo'
    | 'slug'
    | 'conteudo'
    | 'tipo'
    | 'status'
    | 'fixado'
    | 'destacado'
    | 'pessoa_relacionada_id'
  >
>;

export type CriarRespostaForumPayload = {
  topico_id: string;
  autor_id: string;
  conteudo: string;
  status?: ForumConteudoStatus;
};

export type AtualizarRespostaForumPayload = Partial<
  Pick<ForumResposta, 'conteudo' | 'status' | 'aceita_como_solucao'>
>;

export type CriarComentarioForumPayload = {
  resposta_id: string;
  autor_id: string;
  conteudo: string;
  status?: ForumConteudoStatus;
};

export type AtualizarComentarioForumPayload = Partial<Pick<ForumComentario, 'conteudo' | 'status'>>;

export type CriarDenunciaForumPayload = {
  denunciante_id: string;
  alvo_tipo: ForumAlvoTipo;
  alvo_id: string;
  motivo: string;
  detalhes?: string | null;
};

export type ResumoReacoesForum = Record<ForumReacaoTipo, number>;

const TOPICO_SELECT = `
  *,
  categoria:forum_categorias(*),
  pessoa_relacionada:pessoas(*)
`;

const REACAO_TIPOS: ForumReacaoTipo[] = ['curtir', 'apoiar', 'lembrar', 'celebrar'];

function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error(`[Supabase] ${context}: ${error.message || 'Erro desconhecido'}`, {
    code: error.code,
    status: error.status,
    details: error.details,
    hint: error.hint,
  });
}

async function obterUsuarioAtualId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    logSupabaseError('Erro ao obter usuário autenticado', error);
    return undefined;
  }

  return data.user?.id;
}

function criarResumoReacoes(reacoes: Pick<ForumReacao, 'tipo'>[]): ResumoReacoesForum {
  return reacoes.reduce<ResumoReacoesForum>(
    (resumo, reacao) => {
      resumo[reacao.tipo] += 1;
      return resumo;
    },
    { curtir: 0, apoiar: 0, lembrar: 0, celebrar: 0 }
  );
}

// =====================================================
// CATEGORIAS
// =====================================================

export async function listarCategoriasForum(): Promise<ForumCategoria[]> {
  const { data, error } = await supabase
    .from('forum_categorias')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) {
    logSupabaseError('Erro ao listar categorias do fórum', error);
    return [];
  }

  return (data || []) as ForumCategoria[];
}

// =====================================================
// TÓPICOS
// =====================================================

export async function listarTopicosForum(filtros: ForumTopicoFiltros = {}): Promise<ForumTopico[]> {
  let query = supabase
    .from('forum_topicos')
    .select(TOPICO_SELECT)
    .order('fixado', { ascending: false })
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false });

  if (filtros.categoriaId) {
    query = query.eq('categoria_id', filtros.categoriaId);
  }

  if (filtros.autorId) {
    query = query.eq('autor_id', filtros.autorId);
  }

  if (filtros.status) {
    query = Array.isArray(filtros.status)
      ? query.in('status', filtros.status)
      : query.eq('status', filtros.status);
  }

  if (filtros.tipo) {
    query = Array.isArray(filtros.tipo)
      ? query.in('tipo', filtros.tipo)
      : query.eq('tipo', filtros.tipo);
  }

  if (filtros.pessoaRelacionadaId) {
    query = query.eq('pessoa_relacionada_id', filtros.pessoaRelacionadaId);
  }

  if (filtros.busca) {
    const termo = filtros.busca.trim();
    if (termo) {
      query = query.or(`titulo.ilike.%${termo}%,conteudo.ilike.%${termo}%`);
    }
  }

  if (filtros.limite && filtros.limite > 0) {
    query = query.limit(filtros.limite);
  }

  const { data, error } = await query;

  if (error) {
    logSupabaseError('Erro ao listar tópicos do fórum', error);
    return [];
  }

  return (data || []) as ForumTopico[];
}

export async function obterTopicoForumPorId(id: string): Promise<ForumTopico | undefined> {
  const { data, error } = await supabase
    .from('forum_topicos')
    .select(TOPICO_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logSupabaseError(`Erro ao obter tópico do fórum ${id}`, error);
    return undefined;
  }

  return data ? (data as ForumTopico) : undefined;
}

export async function criarTopicoForum(payload: CriarTopicoForumPayload): Promise<ForumTopico | undefined> {
  const { data, error } = await supabase
    .from('forum_topicos')
    .insert(payload)
    .select(TOPICO_SELECT)
    .single();

  if (error) {
    logSupabaseError('Erro ao criar tópico do fórum', error);
    return undefined;
  }

  return data ? (data as ForumTopico) : undefined;
}

export async function vincularPessoasAoTopico(topicoId: string, pessoaIds: string[]) {
  const uniquePessoaIds = Array.from(new Set(pessoaIds.filter(Boolean)));

  if (uniquePessoaIds.length === 0) return;

  const payload = uniquePessoaIds.map((pessoaId) => ({
    topico_id: topicoId,
    pessoa_id: pessoaId,
  }));

  const { error } = await supabase
    .from('forum_topico_pessoas')
    .upsert(payload, {
      onConflict: 'topico_id,pessoa_id',
    });

  if (error) {
    logSupabaseError(`Erro ao vincular pessoas ao tópico ${topicoId}`, error);
    throw new Error(error.message);
  }
}

export async function listarPessoasDoTopico(topicoId: string): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .from('forum_topico_pessoas')
    .select('pessoa_id, pessoas(*)')
    .eq('topico_id', topicoId);

  if (error) {
    logSupabaseError(`Erro ao listar pessoas do tópico ${topicoId}`, error);
    return [];
  }

  return (data || [])
    .map((row) => row.pessoas)
    .filter(Boolean) as Pessoa[];
}

export async function atualizarTopicoForum(
  id: string,
  payload: AtualizarTopicoForumPayload
): Promise<ForumTopico | undefined> {
  const { data, error } = await supabase
    .from('forum_topicos')
    .update(payload)
    .eq('id', id)
    .select(TOPICO_SELECT)
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar tópico do fórum ${id}`, error);
    return undefined;
  }

  return data ? (data as ForumTopico) : undefined;
}

export async function deletarTopicoForum(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('forum_topicos')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar tópico do fórum ${id}`, error);
    return false;
  }

  return true;
}

export async function incrementarVisualizacaoTopico(id: string): Promise<boolean> {
  const { error } = await supabase.rpc('forum_increment_topic_view', { topic_id: id });

  if (error) {
    logSupabaseError(`Erro ao incrementar visualização do tópico ${id}`, error);
    return false;
  }

  return true;
}

// =====================================================
// RESPOSTAS
// =====================================================

export async function listarRespostasDoTopico(topicoId: string): Promise<ForumResposta[]> {
  const { data, error } = await supabase
    .from('forum_respostas')
    .select('*')
    .eq('topico_id', topicoId)
    .order('aceita_como_solucao', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError(`Erro ao listar respostas do tópico ${topicoId}`, error);
    return [];
  }

  return (data || []) as ForumResposta[];
}

export async function criarRespostaForum(payload: CriarRespostaForumPayload): Promise<ForumResposta | undefined> {
  const { data, error } = await supabase
    .from('forum_respostas')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('Erro ao criar resposta no fórum', error);
    return undefined;
  }

  if (!data) return undefined;

  const resposta = data as ForumResposta;
  if (resposta.status === 'publicado') {
    try {
      await notifyForumReplyCreated({
        topicId: resposta.topico_id,
        replyId: resposta.id,
        actorUserId: resposta.autor_id,
      });
    } catch (notificationError) {
      console.warn('[Notificações] Falha ao notificar nova resposta no fórum:', notificationError);
    }
  }

  return resposta;
}

export async function atualizarRespostaForum(
  id: string,
  payload: AtualizarRespostaForumPayload
): Promise<ForumResposta | undefined> {
  const { data, error } = await supabase
    .from('forum_respostas')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar resposta do fórum ${id}`, error);
    return undefined;
  }

  return data ? (data as ForumResposta) : undefined;
}

export async function deletarRespostaForum(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('forum_respostas')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar resposta do fórum ${id}`, error);
    return false;
  }

  return true;
}

export async function marcarRespostaComoSolucao(topicoId: string, respostaId: string): Promise<boolean> {
  const { error } = await supabase.rpc('forum_mark_solution', {
    target_topico_id: topicoId,
    target_resposta_id: respostaId,
  });

  if (error) {
    logSupabaseError(`Erro ao marcar resposta ${respostaId} como solução`, error);
    return false;
  }

  return true;
}

// =====================================================
// COMENTÁRIOS
// =====================================================

export async function listarComentariosDaResposta(respostaId: string): Promise<ForumComentario[]> {
  const { data, error } = await supabase
    .from('forum_comentarios')
    .select('*')
    .eq('resposta_id', respostaId)
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError(`Erro ao listar comentários da resposta ${respostaId}`, error);
    return [];
  }

  return (data || []) as ForumComentario[];
}

export async function criarComentarioForum(payload: CriarComentarioForumPayload): Promise<ForumComentario | undefined> {
  const { data, error } = await supabase
    .from('forum_comentarios')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('Erro ao criar comentário no fórum', error);
    return undefined;
  }

  if (!data) return undefined;

  const comentario = data as ForumComentario;
  if (comentario.status === 'publicado') {
    try {
      await notifyForumCommentCreated({
        responseId: comentario.resposta_id,
        commentId: comentario.id,
        actorUserId: comentario.autor_id,
      });
    } catch (notificationError) {
      console.warn('[Notificações] Falha ao notificar novo comentário no fórum:', notificationError);
    }
  }

  return comentario;
}

export async function atualizarComentarioForum(
  id: string,
  payload: AtualizarComentarioForumPayload
): Promise<ForumComentario | undefined> {
  const { data, error } = await supabase
    .from('forum_comentarios')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar comentário do fórum ${id}`, error);
    return undefined;
  }

  return data ? (data as ForumComentario) : undefined;
}

export async function deletarComentarioForum(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('forum_comentarios')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar comentário do fórum ${id}`, error);
    return false;
  }

  return true;
}

// =====================================================
// REAÇÕES
// =====================================================

export async function reagirAoConteudo(
  alvoTipo: ForumAlvoTipo,
  alvoId: string,
  tipo: ForumReacaoTipo
): Promise<ForumReacao | undefined> {
  const userId = await obterUsuarioAtualId();

  if (!userId) {
    console.error('[Supabase] Erro ao criar reação no fórum: usuário não autenticado');
    return undefined;
  }

  const { data, error } = await supabase
    .from('forum_reacoes')
    .upsert(
      {
        user_id: userId,
        alvo_tipo: alvoTipo,
        alvo_id: alvoId,
        tipo,
      },
      { onConflict: 'user_id,alvo_tipo,alvo_id,tipo' }
    )
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao criar reação ${tipo} em ${alvoTipo} ${alvoId}`, error);
    return undefined;
  }

  return data ? (data as ForumReacao) : undefined;
}

export async function removerReacao(
  alvoTipo: ForumAlvoTipo,
  alvoId: string,
  tipo: ForumReacaoTipo
): Promise<boolean> {
  const userId = await obterUsuarioAtualId();

  if (!userId) {
    console.error('[Supabase] Erro ao remover reação do fórum: usuário não autenticado');
    return false;
  }

  const { error } = await supabase
    .from('forum_reacoes')
    .delete()
    .eq('user_id', userId)
    .eq('alvo_tipo', alvoTipo)
    .eq('alvo_id', alvoId)
    .eq('tipo', tipo);

  if (error) {
    logSupabaseError(`Erro ao remover reação ${tipo} de ${alvoTipo} ${alvoId}`, error);
    return false;
  }

  return true;
}

export async function obterResumoReacoes(
  alvoTipo: ForumAlvoTipo,
  alvoId: string
): Promise<ResumoReacoesForum> {
  const { data, error } = await supabase
    .from('forum_reacoes')
    .select('tipo')
    .eq('alvo_tipo', alvoTipo)
    .eq('alvo_id', alvoId)
    .in('tipo', REACAO_TIPOS);

  if (error) {
    logSupabaseError(`Erro ao obter resumo de reações de ${alvoTipo} ${alvoId}`, error);
    return criarResumoReacoes([]);
  }

  return criarResumoReacoes((data || []) as Pick<ForumReacao, 'tipo'>[]);
}

// =====================================================
// DENÚNCIAS
// =====================================================

export async function denunciarConteudo(payload: CriarDenunciaForumPayload): Promise<ForumDenuncia | undefined> {
  const { data, error } = await supabase
    .from('forum_denuncias')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('Erro ao denunciar conteúdo do fórum', error);
    return undefined;
  }

  return data ? (data as ForumDenuncia) : undefined;
}

// =====================================================
// ADMIN / MODERAÇÃO
// =====================================================

export async function listarDenunciasForum(): Promise<ForumDenuncia[]> {
  const { data, error } = await supabase
    .from('forum_denuncias')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('Erro ao listar denúncias do fórum', error);
    return [];
  }

  return (data || []) as ForumDenuncia[];
}

export async function ocultarTopicoForum(id: string): Promise<ForumTopico | undefined> {
  return atualizarTopicoForum(id, { status: 'oculto' });
}

export async function ocultarRespostaForum(id: string): Promise<ForumResposta | undefined> {
  return atualizarRespostaForum(id, { status: 'oculto' });
}

export async function ocultarComentarioForum(id: string): Promise<ForumComentario | undefined> {
  return atualizarComentarioForum(id, { status: 'oculto' });
}

export async function fecharTopicoForum(id: string): Promise<ForumTopico | undefined> {
  return atualizarTopicoForum(id, { status: 'fechado' });
}

export async function reabrirTopicoForum(id: string): Promise<ForumTopico | undefined> {
  return atualizarTopicoForum(id, { status: 'aberto' });
}
