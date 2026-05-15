import { supabase } from '../lib/supabaseClient';
import { createActivityLog } from './activityLogService';
import {
  NotificationDispatchResult,
  NotificationDispatchStatus,
  NotificationIntent,
  NotificationTargetChannel,
  NotificacaoUsuario,
  PreferenciaNotificacao,
  TipoCanalNotificacao,
  TipoNotificacaoUsuario,
} from '../types';

const DEFAULT_CHANNELS: NotificationTargetChannel[] = ['interna'];

const DEFAULT_NOTIFICATION_PREFERENCES = {
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

const SENSITIVE_KEY_PATTERNS = [
  /senha/i,
  /password/i,
  /token/i,
  /secret/i,
  /email/i,
  /telefone/i,
  /phone/i,
  /whatsapp/i,
  /endereco/i,
  /address/i,
  /url/i,
  /arquivo/i,
  /file/i,
  /base64/i,
];

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

function localDefaultPreferences(userId: string): PreferenciaNotificacao {
  return {
    id: `local-${userId}`,
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };
}

async function getNotificationPreferences(userId: string): Promise<PreferenciaNotificacao> {
  try {
    const { data, error } = await supabase
      .from('preferencias_notificacao')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return mapPreferenciaRow(data);
  } catch (error) {
    console.error('[Supabase] Erro ao carregar preferências para dispatch:', error);
  }

  return localDefaultPreferences(userId);
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return '[redacted]';
    if (/https?:\/\//i.test(trimmed)) return '[redacted]';
    if (/data:[^;]+;base64,/i.test(trimmed)) return '[redacted]';
    if (trimmed.length > 300) return `${trimmed.slice(0, 300)}...`;
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
  if (typeof value === 'object') return sanitizeNotificationMetadata(value as Record<string, unknown>);
  return String(value);
}

export function sanitizeNotificationMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};

  return Object.entries(metadata).reduce<Record<string, unknown>>((safeMetadata, [key, value]) => {
    if (isSensitiveKey(key) || value === undefined) return safeMetadata;
    safeMetadata[key] = sanitizeValue(value);
    return safeMetadata;
  }, {});
}

function shouldSendGeneralNotification(preferences: PreferenciaNotificacao, type: TipoNotificacaoUsuario) {
  switch (type) {
    case 'aniversario':
      return preferences.receber_aniversarios;
    case 'datas_especiais':
    case 'memoria':
    case 'falecimento':
      return preferences.receber_datas_memoria;
    case 'evento_historico_familia':
      return preferences.receber_eventos || preferences.receber_datas_memoria;
    case 'novo_usuario':
    case 'novos_registros_historicos':
    case 'novas_mensagens_forum':
    case 'aviso':
      return preferences.receber_avisos_gerais;
    case 'evento':
    case 'casamento':
    case 'confraternizacao':
    case 'encontro':
      return preferences.receber_eventos;
    case 'notificacao':
    case 'evento_historico':
    case 'outro':
    default:
      return true;
  }
}

function shouldSendEmailNotification(preferences: PreferenciaNotificacao, type: TipoNotificacaoUsuario) {
  if (!preferences.receber_email) return false;

  switch (type) {
    case 'aniversario':
    case 'datas_especiais':
    case 'memoria':
    case 'falecimento':
      return preferences.receber_email_datas_especiais;
    case 'evento_historico_familia':
      return preferences.receber_email_evento_historico_familia;
    case 'novo_usuario':
      return preferences.receber_email_novo_usuario;
    case 'novos_registros_historicos':
      return preferences.receber_email_novos_registros_historicos;
    case 'novas_mensagens_forum':
      return preferences.receber_email_novas_mensagens_forum;
    case 'aviso':
    case 'evento':
    case 'casamento':
    case 'confraternizacao':
    case 'encontro':
    case 'notificacao':
    case 'evento_historico':
    case 'outro':
    default:
      return true;
  }
}

export function shouldSendNotificationChannel(
  preferences: PreferenciaNotificacao,
  type: TipoNotificacaoUsuario,
  channel: NotificationTargetChannel
) {
  if (channel === 'email') return shouldSendEmailNotification(preferences, type);
  if (channel === 'push') return preferences.receber_push && shouldSendGeneralNotification(preferences, type);
  if (channel === 'whatsapp') return preferences.receber_whatsapp && shouldSendGeneralNotification(preferences, type);
  return shouldSendGeneralNotification(preferences, type);
}

export async function createInternalNotification(intent: NotificationIntent) {
  const metadata = sanitizeNotificationMetadata(intent.metadata);
  const { data, error } = await supabase.rpc('create_internal_notification_for_user', {
    target_user_id: intent.userId,
    notification_title: intent.titulo,
    notification_message: intent.mensagem,
    notification_type: intent.type,
    notification_link: intent.link ?? null,
    notification_metadata: metadata,
  });

  if (!error && data) {
    return {
      id: String(data),
      user_id: intent.userId,
      titulo: intent.titulo,
      mensagem: intent.mensagem,
      tipo: intent.type,
      canal: 'interna',
      lida: false,
      link: intent.link,
      metadata,
    } satisfies NotificacaoUsuario;
  }

  if (error && error.message && !error.message.includes('create_internal_notification_for_user')) {
    throw error;
  }

  const fallback = await supabase
    .from('notificacoes_usuario')
    .insert({
      user_id: intent.userId,
      titulo: intent.titulo,
      mensagem: intent.mensagem,
      tipo: intent.type,
      canal: 'interna',
      link: intent.link,
      metadata,
    })
    .select('*')
    .single();

  if (fallback.error) throw fallback.error;
  return mapNotificacaoRow(fallback.data);
}

export async function trySendEmailNotification(intent: NotificationIntent) {
  const { error } = await supabase.functions.invoke('send-notification-email', {
    body: {
      userId: intent.userId,
      notificationType: intent.type,
      titulo: intent.titulo,
      mensagem: intent.mensagem,
      link: intent.link,
      metadata: sanitizeNotificationMetadata(intent.metadata),
    },
  });

  if (error) throw error;
}

export async function logNotificationDispatch(result: NotificationDispatchResult) {
  try {
    const metadata = sanitizeNotificationMetadata(result.metadata);
    const { error } = await supabase.rpc('insert_notification_dispatch_log_for_user', {
      target_notification_id: result.notificationId ?? null,
      target_user_id: result.userId,
      notification_type: result.type,
      notification_channel: result.channel,
      dispatch_status: result.status,
      dispatch_provider: result.provider ?? null,
      dispatch_error_message: result.errorMessage ?? null,
      dispatch_metadata: metadata,
    });

    if (error) {
      const fallback = await supabase
        .from('notification_dispatch_logs')
        .insert({
          notification_id: result.notificationId ?? null,
          user_id: result.userId,
          tipo: result.type,
          canal: result.channel,
          status: result.status,
          provider: result.provider ?? null,
          error_message: result.errorMessage ?? null,
          metadata,
        });

      if (fallback.error) {
        console.warn('[Supabase] Log de dispatch de notificação não registrado:', fallback.error.message);
      }
    }
  } catch (error) {
    console.warn('[Supabase] Erro inesperado ao registrar dispatch de notificação:', error);
  }
}

async function logNotificationActivity(result: NotificationDispatchResult) {
  if (result.channel === 'interna' && result.status === 'sent') {
    await createActivityLog({
      action: 'notification.created',
      entity_type: 'notification',
      entity_id: result.notificationId ?? undefined,
      entity_label: result.type,
      metadata: {
        canal: result.channel,
        status: result.status,
        tipo: result.type,
      },
    });
    return;
  }

  if (result.status === 'sent') {
    await createActivityLog({
      action: 'notification.dispatched',
      entity_type: 'notification_dispatch',
      entity_id: result.notificationId ?? undefined,
      entity_label: result.type,
      metadata: {
        canal: result.channel,
        status: result.status,
        provider: result.provider,
        tipo: result.type,
      },
    });
    return;
  }

  if (result.status === 'failed') {
    await createActivityLog({
      action: 'notification.dispatch_failed',
      entity_type: 'notification_dispatch',
      entity_id: result.notificationId ?? undefined,
      entity_label: result.type,
      metadata: {
        canal: result.channel,
        status: result.status,
        provider: result.provider,
        tipo: result.type,
      },
    });
  }
}

function buildResult(params: {
  intent: NotificationIntent;
  channel: NotificationTargetChannel;
  status: NotificationDispatchStatus;
  notificationId?: string | null;
  provider?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}): NotificationDispatchResult {
  return {
    notificationId: params.notificationId ?? null,
    userId: params.intent.userId,
    type: params.intent.type,
    channel: params.channel,
    status: params.status,
    provider: params.provider ?? null,
    errorMessage: params.errorMessage ?? null,
    metadata: sanitizeNotificationMetadata(params.metadata ?? params.intent.metadata),
  };
}

async function persistResult(result: NotificationDispatchResult) {
  await logNotificationDispatch(result);
  await logNotificationActivity(result);
}

function normalizeChannels(channels?: NotificationTargetChannel[]) {
  const selectedChannels = channels && channels.length > 0 ? channels : DEFAULT_CHANNELS;
  return Array.from(new Set(selectedChannels));
}

export async function dispatchNotification(intent: NotificationIntent): Promise<NotificationDispatchResult[]> {
  const preferences = await getNotificationPreferences(intent.userId);
  const respectPreferences = intent.respectPreferences !== false;
  const channels = normalizeChannels(intent.channels);
  const results: NotificationDispatchResult[] = [];
  let internalNotificationId: string | null = null;

  for (const channel of channels) {
    const allowedByPreferences =
      !respectPreferences || shouldSendNotificationChannel(preferences, intent.type, channel);

    if (!allowedByPreferences) {
      const result = buildResult({
        intent,
        channel,
        status: 'disabled_by_preferences',
        notificationId: internalNotificationId,
      });
      results.push(result);
      await persistResult(result);
      continue;
    }

    if (channel === 'interna') {
      try {
        const notification = await createInternalNotification(intent);
        internalNotificationId = notification.id;
        const result = buildResult({
          intent,
          channel,
          status: 'sent',
          notificationId: notification.id,
          provider: 'supabase',
        });
        results.push(result);
        await persistResult(result);
      } catch (error) {
        const result = buildResult({
          intent,
          channel,
          status: 'failed',
          provider: 'supabase',
          errorMessage: error instanceof Error ? error.message : 'Erro ao criar notificação interna.',
        });
        results.push(result);
        await persistResult(result);
      }
      continue;
    }

    if (channel === 'email') {
      try {
        await trySendEmailNotification(intent);
        const result = buildResult({
          intent,
          channel,
          status: 'sent',
          notificationId: internalNotificationId,
          provider: 'send-notification-email',
        });
        results.push(result);
        await persistResult(result);
      } catch (error) {
        const result = buildResult({
          intent,
          channel,
          status: 'failed',
          notificationId: internalNotificationId,
          provider: 'send-notification-email',
          errorMessage: error instanceof Error ? error.message : 'Erro ao enviar e-mail de notificação.',
        });
        results.push(result);
        await persistResult(result);
      }
      continue;
    }

    const result = buildResult({
      intent,
      channel,
      status: 'not_configured',
      notificationId: internalNotificationId,
      provider: channel,
      metadata: {
        ...intent.metadata,
        reason: 'Canal ainda não possui provedor configurado.',
      },
    });
    results.push(result);
    await persistResult(result);
  }

  return results;
}
