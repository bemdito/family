import { supabase } from '../lib/supabaseClient';

type UserIdRow = {
  user_id?: string | null;
  autor_id?: string | null;
};

export function uniqueUserIds(userIds: Array<string | null | undefined>) {
  return Array.from(new Set(userIds.filter((userId): userId is string => Boolean(userId))));
}

export function excludeActor(userIds: string[], actorUserId?: string | null) {
  if (!actorUserId) return userIds;
  return userIds.filter((userId) => userId !== actorUserId);
}

export async function listAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_admin_user_ids');

  if (error) {
    console.warn('[Supabase] Não foi possível listar admins para notificação:', error.message);
    return [];
  }

  return uniqueUserIds(Array.isArray(data) ? data : []);
}

export async function listLinkedUserIdsForPessoa(pessoaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_person_links')
    .select('user_id')
    .eq('pessoa_id', pessoaId);

  if (error) {
    console.warn('[Supabase] Não foi possível listar usuários vinculados à pessoa:', error.message);
    return [];
  }

  return uniqueUserIds(((data || []) as UserIdRow[]).map((row) => row.user_id));
}

async function listPessoaIdsForRelationship(relacionamentoId: string) {
  const { data, error } = await supabase
    .from('relacionamentos')
    .select('pessoa_origem_id,pessoa_destino_id')
    .eq('id', relacionamentoId)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Não foi possível resolver pessoas do relacionamento:', error.message);
    return [];
  }

  return uniqueUserIds([
    data?.pessoa_origem_id ? String(data.pessoa_origem_id) : null,
    data?.pessoa_destino_id ? String(data.pessoa_destino_id) : null,
  ]);
}

export async function listRelevantUserIdsForHistoricalFile(params: {
  pessoaId?: string | null;
  relacionamentoId?: string | null;
  includeAdmins?: boolean;
  actorUserId?: string | null;
}) {
  const recipients: string[] = [];

  if (params.pessoaId) {
    recipients.push(...await listLinkedUserIdsForPessoa(params.pessoaId));
  }

  if (params.relacionamentoId) {
    const pessoaIds = await listPessoaIdsForRelationship(params.relacionamentoId);
    const linkedUserGroups = await Promise.all(pessoaIds.map((pessoaId) => listLinkedUserIdsForPessoa(pessoaId)));
    recipients.push(...linkedUserGroups.flat());
  }

  if (params.includeAdmins) {
    recipients.push(...await listAdminUserIds());
  }

  return excludeActor(uniqueUserIds(recipients), params.actorUserId);
}

export async function listForumTopicParticipantUserIds(topicId: string): Promise<string[]> {
  const [topicResult, repliesResult, commentsResult] = await Promise.all([
    supabase.from('forum_topicos').select('autor_id').eq('id', topicId).maybeSingle(),
    supabase.from('forum_respostas').select('autor_id').eq('topico_id', topicId),
    supabase
      .from('forum_comentarios')
      .select('autor_id, resposta:forum_respostas!inner(topico_id)')
      .eq('resposta.topico_id', topicId),
  ]);

  if (topicResult.error) {
    console.warn('[Supabase] Não foi possível listar autor do tópico para notificação:', topicResult.error.message);
  }

  if (repliesResult.error) {
    console.warn('[Supabase] Não foi possível listar respostas do tópico para notificação:', repliesResult.error.message);
  }

  if (commentsResult.error) {
    console.warn('[Supabase] Não foi possível listar comentários do tópico para notificação:', commentsResult.error.message);
  }

  return uniqueUserIds([
    topicResult.data?.autor_id ? String(topicResult.data.autor_id) : null,
    ...(((repliesResult.data || []) as UserIdRow[]).map((row) => row.autor_id)),
    ...(((commentsResult.data || []) as UserIdRow[]).map((row) => row.autor_id)),
  ]);
}

export async function listForumCommentParticipantUserIds(respostaId: string): Promise<{
  topicId?: string;
  userIds: string[];
}> {
  const { data: reply, error: replyError } = await supabase
    .from('forum_respostas')
    .select('id,topico_id,autor_id')
    .eq('id', respostaId)
    .maybeSingle();

  if (replyError || !reply) {
    if (replyError) {
      console.warn('[Supabase] Não foi possível listar resposta para notificação:', replyError.message);
    }
    return { userIds: [] };
  }

  const [topicParticipants, commentsResult] = await Promise.all([
    listForumTopicParticipantUserIds(String(reply.topico_id)),
    supabase.from('forum_comentarios').select('autor_id').eq('resposta_id', respostaId),
  ]);

  if (commentsResult.error) {
    console.warn('[Supabase] Não foi possível listar comentários da resposta para notificação:', commentsResult.error.message);
  }

  return {
    topicId: String(reply.topico_id),
    userIds: uniqueUserIds([
      String(reply.autor_id),
      ...topicParticipants,
      ...(((commentsResult.data || []) as UserIdRow[]).map((row) => row.autor_id)),
    ]),
  };
}
