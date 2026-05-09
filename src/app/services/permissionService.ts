import { User } from '@supabase/supabase-js';
import { getPrimaryLinkedPerson } from './memberProfileService';
import { supabase } from '../lib/supabaseClient';

export const MAIN_ADMIN_EMAIL = 'tuliust@gmail.com';

export function isMainAdmin(user?: User | null) {
  // TODO: remover fallback após garantir profiles.role = 'admin' em produção.
  return user?.email?.trim().toLowerCase() === MAIN_ADMIN_EMAIL;
}

export async function isAdminUser(user?: User | null) {
  if (!user) return { isAdmin: false, error: undefined as string | undefined };

  const { data, error } = await supabase.rpc('is_admin_user', { target_user_id: user.id });

  if (!error) {
    return { isAdmin: Boolean(data), error: undefined };
  }

  if (isMainAdmin(user)) {
    return { isAdmin: true, error: error.message };
  }

  return { isAdmin: false, error: error.message };
}

export function canEditPerson(params: {
  currentUser?: User | null;
  pessoaId?: string | null;
  linkedPessoaId?: string | null;
}) {
  const { currentUser, pessoaId, linkedPessoaId } = params;
  if (!currentUser || !pessoaId) return false;

  return isMainAdmin(currentUser) || linkedPessoaId === pessoaId;
}

export async function getLinkedPessoaIdForUser(userId: string) {
  const { data, error } = await getPrimaryLinkedPerson(userId);
  return { error, data: data?.pessoa_id ?? null };
}
