import { supabase } from '../lib/supabaseClient';
import {
  CreateUserFavoritePayload,
  FavoriteEntityType,
  FavoriteFilters,
  UserFavorite,
} from '../types';

const SENSITIVE_METADATA_KEYS = new Set([
  'address',
  'base64',
  'email',
  'endereco',
  'file_url',
  'phone',
  'secret',
  'senha',
  'telefone',
  'token',
  'url',
  'wa_url',
  'whatsapp',
]);

function sanitizeMetadata(metadata: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      const normalizedKey = key.toLowerCase();

      if (SENSITIVE_METADATA_KEYS.has(normalizedKey)) return false;
      if (typeof value === 'string' && value.startsWith('data:')) return false;
      if (typeof value === 'string' && value.length > 300) return false;

      return true;
    })
  );
}

function mapFavoriteRow(row: Record<string, unknown>): UserFavorite {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    entity_type: row.entity_type as FavoriteEntityType,
    entity_id: String(row.entity_id),
    label: String(row.label ?? 'Favorito'),
    description: row.description ? String(row.description) : null,
    href: row.href ? String(row.href) : null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[favoritesService] Erro ao obter usuário atual:', error);
    return null;
  }

  return data.user?.id ?? null;
}

export async function listFavorites(filters: FavoriteFilters = {}): Promise<UserFavorite[]> {
  const userId = await getCurrentUserId();

  if (!userId) return [];

  try {
    let query = supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.entity_type) {
      if (Array.isArray(filters.entity_type)) {
        query = query.in('entity_type', filters.entity_type);
      } else {
        query = query.eq('entity_type', filters.entity_type);
      }
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const favorites = (data ?? []).map((row) => mapFavoriteRow(row));

    if (!filters.search?.trim()) return favorites;

    const search = filters.search.trim().toLowerCase();

    return favorites.filter((favorite) =>
      [favorite.label, favorite.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  } catch (error) {
    console.error('[favoritesService] Erro ao listar favoritos:', error);
    return [];
  }
}

export async function isFavorite(entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

    if (error) throw error;

    return Boolean(data);
  } catch (error) {
    console.error('[favoritesService] Erro ao verificar favorito:', error);
    return false;
  }
}

export async function addFavorite(payload: CreateUserFavoritePayload): Promise<UserFavorite> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('Usuário autenticado não encontrado para salvar favorito.');
  }

  const favoritePayload = {
    user_id: userId,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    label: payload.label,
    description: payload.description ?? null,
    href: payload.href ?? null,
    metadata: sanitizeMetadata(payload.metadata),
  };

  const { data, error } = await supabase
    .from('user_favorites')
    .upsert(favoritePayload, {
      onConflict: 'user_id,entity_type,entity_id',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[favoritesService] Erro ao adicionar favorito:', error);
    throw error;
  }

  return mapFavoriteRow(data);
}

export async function removeFavoriteByEntity(
  entityType: FavoriteEntityType,
  entityId: string
): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) return;

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('[favoritesService] Erro ao remover favorito por entidade:', error);
    throw error;
  }
}

export async function removeFavoriteById(id: string): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) return;

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) {
    console.error('[favoritesService] Erro ao remover favorito:', error);
    throw error;
  }
}

export async function toggleFavorite(
  payload: CreateUserFavoritePayload
): Promise<{ active: boolean; favorite?: UserFavorite | null }> {
  const active = await isFavorite(payload.entity_type, payload.entity_id);

  if (active) {
    await removeFavoriteByEntity(payload.entity_type, payload.entity_id);
    return { active: false, favorite: null };
  }

  const favorite = await addFavorite(payload);
  return { active: true, favorite };
}