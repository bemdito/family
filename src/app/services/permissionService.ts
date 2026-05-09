import { User } from '@supabase/supabase-js';
import { getPrimaryLinkedPerson } from './memberProfileService';
import { supabase } from '../lib/supabaseClient';

export async function isAdminUser(user?: User | null) {
  if (!user) return { isAdmin: false, error: undefined as string | undefined };

  const { data, error } = await supabase.rpc('is_admin_user', { target_user_id: user.id });

  if (!error) {
    return { isAdmin: Boolean(data), error: undefined };
  }

  return { isAdmin: false, error: error.message };
}

export function canEditPerson(params: {
  currentUser?: User | null;
  pessoaId?: string | null;
  linkedPessoaId?: string | null;
  isAdmin?: boolean;
}) {
  const { currentUser, pessoaId, linkedPessoaId, isAdmin = false } = params;
  if (!currentUser || !pessoaId) return false;

  return isAdmin || linkedPessoaId === pessoaId;
}

export async function getLinkedPessoaIdForUser(userId: string) {
  const { data, error } = await getPrimaryLinkedPerson(userId);
  return { error, data: data?.pessoa_id ?? null };
}
