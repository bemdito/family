import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  ActivityLog,
  ActivityLogAction,
  ActivityLogEntityType,
  ActivityLogFilters,
  CreateActivityLogPayload,
  Pessoa,
} from '../types';

type ActorProfileLike = {
  nome_exibicao?: string | null;
  avatar_url?: string | null;
};

export const ACTIVITY_ACTION_LABELS: Record<ActivityLogAction, string> = {
  'person.created': 'Pessoa criada',
  'person.updated': 'Pessoa atualizada',
  'person.photo_updated': 'Foto atualizada',
  'person.privacy_updated': 'Privacidade atualizada',
  'relationship_change_requested': 'Solicitação de vínculo criada',
  'relationship_change_approved': 'Solicitação de vínculo aprovada',
  'relationship_change_rejected': 'Solicitação de vínculo rejeitada',
  'relationship_change_cancelled': 'Solicitação de vínculo cancelada',
  'relationship.created': 'Relacionamento criado',
  'relationship.updated': 'Relacionamento atualizado',
  'relationship.deleted': 'Relacionamento removido',
  'historical_file.added': 'Arquivo histórico adicionado',
  'historical_file.removed': 'Arquivo histórico removido',
  'historical_file.updated': 'Arquivo histórico atualizado',
  'notification_preferences.updated': 'Preferências de notificação atualizadas',
  'first_access.confirmed': 'Primeiro acesso confirmado',
};

export const ACTIVITY_ENTITY_LABELS: Record<ActivityLogEntityType, string> = {
  person: 'Pessoa',
  relationship: 'Relacionamento',
  historical_file: 'Arquivo histórico',
  notification_preferences: 'Notificações',
  first_access: 'Primeiro acesso',
};

const METADATA_LABELS: Record<string, string> = {
  changed_fields: 'Campos',
  file_type: 'Tipo de arquivo',
  has_description: 'Descrição',
  has_inverse: 'Inverso',
  has_observations: 'Observações',
  has_separation_date: 'Data de separação',
  had_inverse: 'Inverso',
  has_photo: 'Foto',
  has_year: 'Ano',
  humano_ou_pet: 'Tipo',
  manual_generation: 'Geração manual',
  order: 'Ordem',
  preference_keys: 'Preferências',
  relationship_subtype: 'Subtipo',
  relationship_type: 'Tipo de vínculo',
};

function toActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
    actor_pessoa_id: row.actor_pessoa_id ? String(row.actor_pessoa_id) : null,
    actor_display_name: row.actor_display_name ? String(row.actor_display_name) : null,
    action: row.action as ActivityLog['action'],
    entity_type: row.entity_type as ActivityLog['entity_type'],
    entity_id: row.entity_id ? String(row.entity_id) : null,
    entity_label: row.entity_label ? String(row.entity_label) : null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};

  const blockedKeys = new Set([
    'telefone',
    'phone',
    'endereco',
    'address',
    'email',
    'rede_social',
    'instagram_usuario',
    'instagram_url',
    'url',
  ]);

  return Object.entries(metadata).reduce<Record<string, unknown>>((safeMetadata, [key, value]) => {
    if (blockedKeys.has(key)) return safeMetadata;
    if (value === undefined) return safeMetadata;
    safeMetadata[key] = value;
    return safeMetadata;
  }, {});
}

export function buildActivityActorFromUser(
  user?: User | null,
  pessoa?: Pick<Pessoa, 'id' | 'nome_completo'> | null,
  profile?: ActorProfileLike | null
): Pick<CreateActivityLogPayload, 'actor_user_id' | 'actor_pessoa_id' | 'actor_display_name'> {
  const metadata = user?.user_metadata ?? {};
  const displayName = (
    pessoa?.nome_completo ||
    profile?.nome_exibicao ||
    (metadata.nome_exibicao as string | undefined) ||
    (metadata.name as string | undefined) ||
    (metadata.full_name as string | undefined) ||
    user?.email ||
    ''
  ).trim();

  return {
    actor_user_id: user?.id ?? null,
    actor_pessoa_id: pessoa?.id ?? null,
    actor_display_name: displayName || null,
  };
}

async function getCurrentActor() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[Supabase] Erro ao obter usuário para activity log:', error.message);
  }

  return buildActivityActorFromUser(data.user);
}

export async function createActivityLog(payload: CreateActivityLogPayload): Promise<ActivityLog | null> {
  try {
    const currentActor = payload.actor_user_id ? {} : await getCurrentActor();
    const activityPayload = {
      ...currentActor,
      ...payload,
      metadata: sanitizeMetadata(payload.metadata),
    };

    if (!activityPayload.actor_user_id) {
      return null;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert(activityPayload);

    if (error) {
      console.error('[Supabase] Erro ao registrar activity log:', error.message, error);
      return null;
    }

    return null;
  } catch (error) {
    console.error('[Supabase] Erro inesperado ao registrar activity log:', error);
    return null;
  }
}

export async function listRecentActivityLogs(limit = 50): Promise<ActivityLog[]> {
  return listActivityLogs({ limit });
}

export async function listActivityLogs(filters: ActivityLogFilters = {}): Promise<ActivityLog[]> {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50);

    if (filters.actor_user_id) query = query.eq('actor_user_id', filters.actor_user_id);
    if (filters.actor_pessoa_id) query = query.eq('actor_pessoa_id', filters.actor_pessoa_id);
    if (filters.actor_query) query = query.ilike('actor_display_name', `%${filters.actor_query}%`);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
    if (filters.entity_id) query = query.eq('entity_id', filters.entity_id);
    if (filters.entity_query) query = query.ilike('entity_label', `%${filters.entity_query}%`);
    if (filters.created_from) query = query.gte('created_at', filters.created_from);
    if (filters.created_to) query = query.lte('created_at', filters.created_to);

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Erro ao listar activity logs:', error.message);
      return [];
    }

    return (data || []).map(toActivityLog);
  } catch (error) {
    console.error('[Supabase] Erro inesperado ao listar activity logs:', error);
    return [];
  }
}

export function getActivityActionLabel(action: ActivityLogAction) {
  return ACTIVITY_ACTION_LABELS[action] ?? action;
}

export function getActivityEntityLabel(entityType: ActivityLogEntityType) {
  return ACTIVITY_ENTITY_LABELS[entityType] ?? entityType;
}

function formatMetadataValue(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

export function getActivityMetadataSummary(metadata: Record<string, unknown> = {}) {
  return Object.entries(metadata)
    .filter(([key, value]) => key !== 'pessoa_id' && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const label = METADATA_LABELS[key] ?? key;
      const formattedValue = formatMetadataValue(value);
      return formattedValue ? `${label}: ${formattedValue}` : '';
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(' · ');
}

export function getActivitySummary(activity: ActivityLog) {
  const actionLabel = getActivityActionLabel(activity.action);
  const entityLabel = activity.entity_label || getActivityEntityLabel(activity.entity_type);
  const metadataSummary = getActivityMetadataSummary(activity.metadata);

  return metadataSummary
    ? `${actionLabel} em ${entityLabel}. ${metadataSummary}`
    : `${actionLabel} em ${entityLabel}`;
}
