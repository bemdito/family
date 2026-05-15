import { supabase } from '../lib/supabaseClient';
import { createActivityLog } from './activityLogService';
import { dispatchNotification } from './notificationDispatchService';
import {
  FavoritoUsuario,
  NotificacaoUsuario,
  Pessoa,
  PreferenciaNotificacao,
  TipoConteudoFavorito,
  TipoNotificacaoUsuario,
} from '../types';

const FAVORITES_KEY = 'arvorefamilia:favorites';
const NOTIFICATIONS_KEY = 'arvorefamilia:notifications';
const DEFAULT_USER_ID = 'demo-user';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  receber_aniversarios: true,
  receber_datas_memoria: true,
  receber_eventos: true,
  receber_avisos_gerais: true,
  receber_email: true,
  receber_push: true,
  receber_whatsapp: true,
  receber_email_novo_usuario: true,
  receber_email_datas_especiais: true,
  receber_email_novas_mensagens_forum: true,
  receber_email_novos_registros_historicos: true,
  receber_email_evento_historico_familia: true,
} satisfies Omit<PreferenciaNotificacao, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentDemoUserId() {
  return DEFAULT_USER_ID;
}

export function listarFavoritos(userId = DEFAULT_USER_ID): FavoritoUsuario[] {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  return favoritos
    .filter((item) => item.user_id === userId)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
}

export function favoritarConteudo(params: {
  tipo: TipoConteudoFavorito;
  conteudoId: string;
  titulo?: string;
  userId?: string;
}) {
  const userId = params.userId ?? DEFAULT_USER_ID;
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);

  const existente = favoritos.find(
    (item) =>
      item.user_id === userId &&
      item.tipo_conteudo === params.tipo &&
      item.conteudo_id === params.conteudoId
  );

  if (existente) {
    return existente;
  }

  const novo: FavoritoUsuario = {
    id: createId('fav'),
    user_id: userId,
    tipo_conteudo: params.tipo,
    conteudo_id: params.conteudoId,
    titulo: params.titulo,
    created_at: new Date().toISOString(),
  };

  favoritos.push(novo);
  writeJson(FAVORITES_KEY, favoritos);
  return novo;
}

export function removerFavorito(favoritoId: string, userId = DEFAULT_USER_ID) {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  const proximo = favoritos.filter((item) => !(item.id === favoritoId && item.user_id === userId));
  writeJson(FAVORITES_KEY, proximo);
}

export function conteudoEstaFavoritado(tipo: TipoConteudoFavorito, conteudoId: string, userId = DEFAULT_USER_ID) {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  return favoritos.some(
    (item) => item.user_id === userId && item.tipo_conteudo === tipo && item.conteudo_id === conteudoId
  );
}

export function alternarFavorito(params: {
  tipo: TipoConteudoFavorito;
  conteudoId: string;
  titulo?: string;
  userId?: string;
}) {
  const userId = params.userId ?? DEFAULT_USER_ID;
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  const existente = favoritos.find(
    (item) =>
      item.user_id === userId &&
      item.tipo_conteudo === params.tipo &&
      item.conteudo_id === params.conteudoId
  );

  if (existente) {
    removerFavorito(existente.id, userId);
    return { active: false };
  }

  favoritarConteudo(params);
  return { active: true };
}

export function listarNotificacoes(userId = DEFAULT_USER_ID): NotificacaoUsuario[] {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  return notificacoes
    .filter((item) => item.user_id === userId)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
}

function mapNotificacaoRow(row: Record<string, unknown>): NotificacaoUsuario {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    titulo: String(row.titulo ?? ''),
    mensagem: String(row.mensagem ?? ''),
    tipo: (row.tipo as TipoNotificacaoUsuario) || 'notificacao',
    canal: (row.canal as NotificacaoUsuario['canal']) || 'interna',
    lida: Boolean(row.lida),
    link: row.link ? String(row.link) : undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? {},
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapPreferenciaRow(row: Record<string, unknown>): PreferenciaNotificacao {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    receber_aniversarios: row.receber_aniversarios !== false,
    receber_datas_memoria: row.receber_datas_memoria !== false,
    receber_eventos: row.receber_eventos !== false,
    receber_avisos_gerais: row.receber_avisos_gerais !== false,
    receber_email: row.receber_email !== false,
    receber_push: row.receber_push !== false,
    receber_whatsapp: row.receber_whatsapp !== false,
    receber_email_novo_usuario: row.receber_email_novo_usuario !== false,
    receber_email_datas_especiais: row.receber_email_datas_especiais !== false,
    receber_email_novas_mensagens_forum: row.receber_email_novas_mensagens_forum !== false,
    receber_email_novos_registros_historicos: row.receber_email_novos_registros_historicos !== false,
    receber_email_evento_historico_familia: row.receber_email_evento_historico_familia !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function getLocalPreferences(userId: string): PreferenciaNotificacao {
  return {
    id: `local-${userId}`,
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };
}

export async function obterPreferenciasNotificacao(userId: string): Promise<PreferenciaNotificacao> {
  try {
    const { data, error } = await supabase
      .from('preferencias_notificacao')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return mapPreferenciaRow(data);

    const { data: created, error: createError } = await supabase
      .from('preferencias_notificacao')
      .insert({ user_id: userId, ...DEFAULT_NOTIFICATION_PREFERENCES })
      .select('*')
      .single();

    if (createError) throw createError;
    return mapPreferenciaRow(created);
  } catch (error) {
    console.error('[Supabase] Erro ao obter preferências de notificação:', error);
    return getLocalPreferences(userId);
  }
}

export async function salvarPreferenciasNotificacao(
  userId: string,
  preferencias: Partial<PreferenciaNotificacao>
): Promise<PreferenciaNotificacao> {
  const payload = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...preferencias,
    user_id: userId,
  };

  delete (payload as Partial<PreferenciaNotificacao>).id;
  delete (payload as Partial<PreferenciaNotificacao>).created_at;
  delete (payload as Partial<PreferenciaNotificacao>).updated_at;

  try {
    const { data, error } = await supabase
      .from('preferencias_notificacao')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) throw error;
    await createActivityLog({
      action: 'notification_preferences.updated',
      entity_type: 'notification_preferences',
      entity_id: userId,
      entity_label: 'Preferências de notificação',
      metadata: {
        preference_keys: Object.keys(payload).filter((key) => key !== 'user_id'),
      },
    });
    return mapPreferenciaRow(data);
  } catch (error) {
    console.error('[Supabase] Erro ao salvar preferências de notificação:', error);
    return {
      ...getLocalPreferences(userId),
      ...preferencias,
    };
  }
}

export async function listarNotificacoesSupabase(userId: string): Promise<NotificacaoUsuario[]> {
  try {
    const { data, error } = await supabase
      .from('notificacoes_usuario')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapNotificacaoRow);
  } catch (error) {
    console.error('[Supabase] Erro ao listar notificações:', error);
    return listarNotificacoes(userId);
  }
}

export async function marcarNotificacaoSupabaseComoLida(notificacaoId: string) {
  const { error } = await supabase
    .from('notificacoes_usuario')
    .update({ lida: true })
    .eq('id', notificacaoId);

  if (error) {
    console.error('[Supabase] Erro ao marcar notificação como lida:', error);
    throw error;
  }
}

export async function marcarTodasNotificacoesSupabaseComoLidas(userId: string) {
  const { error } = await supabase
    .from('notificacoes_usuario')
    .update({ lida: true })
    .eq('user_id', userId)
    .eq('lida', false);

  if (error) {
    console.error('[Supabase] Erro ao marcar todas notificações como lidas:', error);
    throw error;
  }
}

export async function removerNotificacaoSupabase(notificacaoId: string) {
  const { error } = await supabase
    .from('notificacoes_usuario')
    .delete()
    .eq('id', notificacaoId);

  if (error) {
    console.error('[Supabase] Erro ao remover notificação:', error);
    throw error;
  }
}

export async function criarNotificacaoSupabase(params: {
  userId: string;
  titulo: string;
  mensagem: string;
  tipo?: TipoNotificacaoUsuario;
  canal?: NotificacaoUsuario['canal'];
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('notificacoes_usuario')
    .insert({
      user_id: params.userId,
      titulo: params.titulo,
      mensagem: params.mensagem,
      tipo: params.tipo || 'notificacao',
      canal: params.canal || 'interna',
      link: params.link,
      metadata: params.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] Erro ao criar notificação:', error);
    throw error;
  }

  return mapNotificacaoRow(data);
}

export async function garantirNotificacaoInicialSupabase(userId: string) {
  const notificacoes = await listarNotificacoesSupabase(userId);
  if (notificacoes.length > 0) return;

  await criarNotificacaoSupabase({
    userId,
    titulo: 'Bem-vindo à central de notificações',
    mensagem:
      'Aqui você acompanhará aniversários, datas de memória, mensagens do fórum, registros históricos e avisos importantes da família.',
    tipo: 'notificacao',
    canal: 'interna',
    link: '/notificacoes',
  });
}

export async function criarNotificacaoComEmail(params: {
  userId: string;
  notificationType: TipoNotificacaoUsuario;
  titulo: string;
  mensagem: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const results = await dispatchNotification({
    userId: params.userId,
    type: params.notificationType,
    titulo: params.titulo,
    mensagem: params.mensagem,
    link: params.link,
    metadata: params.metadata,
    channels: ['interna', 'email'],
  });

  const internalResult = results.find((result) => result.channel === 'interna' && result.notificationId);

  if (internalResult?.notificationId) {
    const notificacoes = await listarNotificacoesSupabase(params.userId);
    const notificacao = notificacoes.find((item) => item.id === internalResult.notificationId);
    if (notificacao) return notificacao;
  }

  const internalFailure = results.find((result) => result.channel === 'interna' && result.status === 'failed');
  throw new Error(internalFailure?.errorMessage || 'Não foi possível criar a notificação interna.');
}

export function criarNotificacao(params: Omit<NotificacaoUsuario, 'id' | 'user_id' | 'created_at' | 'lida'> & { userId?: string }) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const nova: NotificacaoUsuario = {
    id: createId('notif'),
    user_id: params.userId ?? DEFAULT_USER_ID,
    titulo: params.titulo,
    mensagem: params.mensagem,
    tipo: params.tipo,
    canal: params.canal,
    link: params.link,
    lida: false,
    created_at: new Date().toISOString(),
  };

  notificacoes.push(nova);
  writeJson(NOTIFICATIONS_KEY, notificacoes);
  return nova;
}

export function marcarNotificacaoComoLida(notificacaoId: string, userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const atualizadas = notificacoes.map((item) => {
    if (item.id === notificacaoId && item.user_id === userId) {
      return { ...item, lida: true };
    }
    return item;
  });
  writeJson(NOTIFICATIONS_KEY, atualizadas);
}

export function marcarTodasComoLidas(userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const atualizadas = notificacoes.map((item) =>
    item.user_id === userId ? { ...item, lida: true } : item
  );
  writeJson(NOTIFICATIONS_KEY, atualizadas);
}

export function removerNotificacao(notificacaoId: string, userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const proxima = notificacoes.filter((item) => !(item.id === notificacaoId && item.user_id === userId));
  writeJson(NOTIFICATIONS_KEY, proxima);
}

export function garantirNotificacoesIniciais(pessoas: Pessoa[], userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const existentesDoUsuario = notificacoes.filter((item) => item.user_id === userId);
  if (existentesDoUsuario.length > 0) return;

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const aniversariantesMes = pessoas.filter((pessoa) => {
    const valor = String(pessoa.data_nascimento ?? '');
    if (!valor) return false;
    const br = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (br) return Number(br[2]) === mesAtual;
    if (iso) return Number(iso[2]) === mesAtual;
    return false;
  });

  const seeds: NotificacaoUsuario[] = [
    {
      id: createId('notif'),
      user_id: userId,
      titulo: 'Bem-vindo à central de notificações',
      mensagem: 'Aqui você acompanhará aniversários, datas de memória, eventos e avisos da família.',
      tipo: 'notificacao',
      canal: 'interna',
      lida: false,
      created_at: new Date().toISOString(),
    },
    {
      id: createId('notif'),
      user_id: userId,
      titulo: 'Aniversariantes do mês',
      mensagem: `Há ${aniversariantesMes.length} pessoa(s) com aniversário neste mês cadastradas na árvore.`,
      tipo: 'aniversario',
      canal: 'interna',
      link: '/calendario-familiar',
      lida: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ];

  writeJson(NOTIFICATIONS_KEY, [...notificacoes, ...seeds]);
}
