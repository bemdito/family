import { supabase, getSupabaseConfigDiagnostics } from '../lib/supabaseClient';
import {
  NotificationAdminSummary,
  NotificationDispatchLog,
  NotificacaoUsuario,
  PreferenciaNotificacao,
  TipoCanalNotificacao,
  TipoNotificacaoUsuario,
} from '../types';

export type NotificationEmailConfigurationStatus = 'verified' | 'not_verified' | 'not_configured';
export type DailyNotificationsAutomationStatus = 'configured' | 'not_verified' | 'not_configured';

export interface NotificationEmailConfiguration {
  status: NotificationEmailConfigurationStatus;
  functionName: string;
  codeReferenceFound: boolean;
  hasSupabaseUrl: boolean;
  hasAnonKey: boolean;
  message: string;
}

export interface DailyNotificationsAutomationInfo {
  status: DailyNotificationsAutomationStatus;
  functionName: string;
  scheduledTime: string;
  lastOccurrenceAt?: string | null;
  lastOccurrenceDate?: string | null;
  lastDispatchAt?: string | null;
  message: string;
}

function mapNotificacaoRow(row: Record<string, unknown>): NotificacaoUsuario {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    titulo: String(row.titulo ?? ''),
    mensagem: String(row.mensagem ?? ''),
    tipo: (row.tipo as TipoNotificacaoUsuario) || 'notificacao',
    canal: (row.canal as TipoCanalNotificacao) || 'interna',
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

function mapDispatchLogRow(row: Record<string, unknown>): NotificationDispatchLog {
  return {
    id: String(row.id),
    notification_id: row.notification_id ? String(row.notification_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    tipo: String(row.tipo ?? 'notificacao'),
    canal: String(row.canal ?? 'interna'),
    status: (row.status as NotificationDispatchLog['status']) || 'pending',
    provider: row.provider ? String(row.provider) : null,
    error_message: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? {},
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string | undefined) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'nao_informado';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || String(error?.message ?? '').includes('does not exist');
}

export async function listRecentNotificationsAdmin(limit = 50): Promise<NotificacaoUsuario[]> {
  const { data, error } = await supabase
    .from('notificacoes_usuario')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] Erro ao listar notificações admin:', error.message);
    return [];
  }

  return (data || []).map(mapNotificacaoRow);
}

export async function listRecentNotificationPreferencesAdmin(limit = 50): Promise<PreferenciaNotificacao[]> {
  const { data, error } = await supabase
    .from('preferencias_notificacao')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] Erro ao listar preferências de notificação admin:', error.message);
    return [];
  }

  return (data || []).map(mapPreferenciaRow);
}

export async function listRecentNotificationDispatchLogs(limit = 50): Promise<NotificationDispatchLog[]> {
  const { data, error } = await supabase
    .from('notification_dispatch_logs')
    .select('id,notification_id,user_id,tipo,canal,status,provider,error_message,metadata,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (!isMissingTableError(error)) {
      console.error('[Supabase] Erro ao listar logs de dispatch:', error.message);
    }
    return [];
  }

  return (data || []).map(mapDispatchLogRow);
}

export async function getNotificationAdminSummary(): Promise<NotificationAdminSummary> {
  const [notifications, dispatchLogs] = await Promise.all([
    listRecentNotificationsAdmin(1000),
    listRecentNotificationDispatchLogs(100),
  ]);

  const byChannel = countBy(notifications, (notification) => notification.canal);

  return {
    totalNotifications: notifications.length,
    unreadNotifications: notifications.filter((notification) => !notification.lida).length,
    channelsUsed: Object.keys(byChannel).length,
    recentDispatchErrors: dispatchLogs.filter((log) => log.status === 'failed').length,
    byType: countBy(notifications, (notification) => notification.tipo),
    byChannel,
  };
}

export async function getDailyNotificationsAutomationInfo(): Promise<DailyNotificationsAutomationInfo> {
  const [occurrencesResult, dispatchLogsResult] = await Promise.all([
    supabase
      .from('notification_occurrences')
      .select('occurrence_date,created_at')
      .in('tipo', ['aniversario', 'memoria_falecimento'])
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('notification_dispatch_logs')
      .select('created_at,metadata')
      .in('tipo', ['aniversario', 'datas_especiais'])
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const occurrence = occurrencesResult.data?.[0] as
    | { occurrence_date?: string | null; created_at?: string | null }
    | undefined;
  const dispatchLog = dispatchLogsResult.data?.[0] as
    | { created_at?: string | null; metadata?: Record<string, unknown> | null }
    | undefined;

  const edgeLogSeen = dispatchLog?.metadata?.source === 'edge-run-daily-notifications';

  if (occurrencesResult.error || dispatchLogsResult.error) {
    return {
      status: 'not_verified',
      functionName: 'run-daily-notifications',
      scheduledTime: '08:00 America/Sao_Paulo',
      message: 'Não foi possível verificar os registros recentes da rotina automática.',
    };
  }

  return {
    status: edgeLogSeen ? 'configured' : 'not_configured',
    functionName: 'run-daily-notifications',
    scheduledTime: '08:00 America/Sao_Paulo',
    lastOccurrenceAt: occurrence?.created_at ?? null,
    lastOccurrenceDate: occurrence?.occurrence_date ?? null,
    lastDispatchAt: dispatchLog?.created_at ?? null,
    message: edgeLogSeen
      ? 'Há registros recentes gerados pela Edge Function.'
      : 'Rotina automática ainda não verificada. Use o botão manual enquanto o cron não estiver ativado.',
  };
}

export function checkNotificationEmailConfiguration(): NotificationEmailConfiguration {
  const diagnostics = getSupabaseConfigDiagnostics();
  const hasSupabaseUrl = diagnostics.url !== '(ausente)';
  const hasAnonKey = diagnostics.hasAnonKey;
  const codeReferenceFound = true;

  if (!hasSupabaseUrl || !hasAnonKey) {
    return {
      status: 'not_configured',
      functionName: 'send-notification-email',
      codeReferenceFound,
      hasSupabaseUrl,
      hasAnonKey,
      message: 'Cliente Supabase sem configuração mínima para invocar Edge Functions.',
    };
  }

  return {
    status: 'not_verified',
    functionName: 'send-notification-email',
    codeReferenceFound,
    hasSupabaseUrl,
    hasAnonKey,
    message: 'Há referência à função no código, mas este diagnóstico não executa envio nem valida deploy remoto.',
  };
}
