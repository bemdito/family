import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Pessoa } from '../types';

export interface MemberProfile {
  id: string;
  nome_exibicao?: string | null;
  avatar_url?: string | null;
  role?: 'admin' | 'member' | null;
}

export interface UserPersonLinkRecord {
  id: string;
  user_id: string;
  pessoa_id: string;
  relacao_com_perfil?: string | null;
  principal?: boolean | null;
  dados_confirmados?: boolean | null;
  dados_confirmados_em?: string | null;
}

export interface FirstAccessPersonPreview {
  pessoa_id: string;
  nome_completo: string;
  data_nascimento?: string | null;
  local_nascimento?: string | null;
  already_used: boolean;
}

const PENDING_FIRST_ACCESS_KEYS = {
  pessoaId: 'pendingPessoaId',
  signupEmail: 'pendingSignupEmail',
};

export type LinkResolutionResult =
  | {
      status: 'linked';
      data: UserPersonLinkRecord;
      created: boolean;
    }
  | {
      status: 'missing-pessoa-id';
      data: null;
      created: false;
    }
  | {
      status: 'person-not-found';
      data: null;
      created: false;
    }
  | {
      status: 'person-already-linked';
      data: null;
      created: false;
    }
  | {
      status: 'error';
      error: string;
      data: null;
      created: false;
    };

export type EditableOwnPersonPayload = Pick<
  Partial<Pessoa>,
  | 'nome_completo'
  | 'data_nascimento'
  | 'local_nascimento'
  | 'local_atual'
  | 'foto_principal_url'
  | 'minibio'
  | 'curiosidades'
  | 'telefone'
  | 'endereco'
  | 'rede_social'
  | 'instagram_usuario'
  | 'instagram_url'
  | 'permitir_exibir_instagram'
  | 'permitir_mensagens_whatsapp'
>;

export async function ensureMemberProfile(userId: string, payload?: { nome_exibicao?: string | null; avatar_url?: string | null }) {
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message, data: null as MemberProfile | null };
  }

  if (existing) {
    if (payload?.nome_exibicao && !existing.nome_exibicao) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nome_exibicao: payload.nome_exibicao })
        .eq('id', userId)
        .select('*')
        .single();

      return { error: error?.message, data: (data as MemberProfile) ?? null };
    }

    return { error: undefined, data: existing as MemberProfile };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nome_exibicao: payload?.nome_exibicao ?? null,
      avatar_url: payload?.avatar_url ?? null,
      role: 'member',
    })
    .select('*')
    .single();

  return { error: error?.message, data: (data as MemberProfile) ?? null };
}

export async function getMemberProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return { error: error?.message, data: (data as MemberProfile) ?? null };
}

export async function getPrimaryLinkedPerson(userId: string) {
  const { data, error } = await supabase
    .from('user_person_links')
    .select('*')
    .eq('user_id', userId)
    .order('principal', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { error: error?.message, data: (data as UserPersonLinkRecord) ?? null };
}

export function storePendingFirstAccess(pessoaId: string, email: string) {
  try {
    window.localStorage.setItem(PENDING_FIRST_ACCESS_KEYS.pessoaId, pessoaId);
    window.localStorage.setItem(PENDING_FIRST_ACCESS_KEYS.signupEmail, email.trim().toLowerCase());
  } catch {
    // noop
  }
}

export function clearPendingFirstAccess() {
  try {
    window.localStorage.removeItem(PENDING_FIRST_ACCESS_KEYS.pessoaId);
    window.localStorage.removeItem(PENDING_FIRST_ACCESS_KEYS.signupEmail);
  } catch {
    // noop
  }
}

function readPendingFirstAccess(email?: string | null) {
  try {
    const pessoaId = window.localStorage.getItem(PENDING_FIRST_ACCESS_KEYS.pessoaId);
    const signupEmail = window.localStorage.getItem(PENDING_FIRST_ACCESS_KEYS.signupEmail);

    if (!pessoaId || !signupEmail || !email) return null;
    if (signupEmail !== email.trim().toLowerCase()) return null;

    return { pessoaId, signupEmail };
  } catch {
    return null;
  }
}

export async function getPrimaryLinkedPersonWithPessoa(userId: string) {
  const { data, error } = await supabase
    .from('user_person_links')
    .select('*, pessoa:pessoas(*)')
    .eq('user_id', userId)
    .order('principal', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    error: error?.message,
    data: data
      ? ({
          ...(data as UserPersonLinkRecord),
          pessoa: (data as any).pessoa as Pessoa | null,
        } as UserPersonLinkRecord & { pessoa: Pessoa | null })
      : null,
  };
}

export async function validateFirstAccessCode(accessCode: string) {
  const normalizedCode = accessCode.trim();

  if (!normalizedCode) {
    return { error: 'Informe o código de primeiro acesso.', data: null as FirstAccessPersonPreview | null };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedCode)) {
    return { error: undefined, data: null as FirstAccessPersonPreview | null };
  }

  const { data, error } = await supabase
    .rpc('validate_first_access_code', { access_code: normalizedCode })
    .maybeSingle();

  if (error) {
    return { error: error.message, data: null as FirstAccessPersonPreview | null };
  }

  if (!data) {
    return { error: undefined, data: null as FirstAccessPersonPreview | null };
  }

  return { error: undefined, data: data as FirstAccessPersonPreview };
}

export async function isPersonAlreadyLinked(pessoaId: string) {
  const { data, error } = await supabase
    .rpc('validate_first_access_code', { access_code: pessoaId })
    .maybeSingle();

  if (error) {
    return { error: error.message, alreadyLinked: false };
  }

  return { error: undefined, alreadyLinked: Boolean((data as FirstAccessPersonPreview | null)?.already_used) };
}

async function ensureOwnFirstAccessLink(userId: string, pessoaId: string) {
  const { data, error } = await supabase
    .rpc('ensure_first_access_person_link', { target_pessoa_id: pessoaId })
    .maybeSingle();

  if (!error && data) {
    return { error: undefined, data: data as UserPersonLinkRecord };
  }

  if (error) {
    const message = error.message || '';

    if (message.includes('person_not_found')) {
      return { error: 'person_not_found', data: null as UserPersonLinkRecord | null };
    }

    if (message.includes('person_already_linked')) {
      return { error: 'person_already_linked', data: null as UserPersonLinkRecord | null };
    }

    if (!message.includes('ensure_first_access_person_link')) {
      return { error: message, data: null as UserPersonLinkRecord | null };
    }
  }

  return linkUserToPerson({
    userId,
    pessoaId,
    relacaoComPerfil: 'Sou esta pessoa',
    principal: true,
    dadosConfirmados: false,
  });
}

function getMetadataPessoaId(user: User) {
  const metadataPessoaId = user.user_metadata?.pessoa_id;
  const appMetadataPessoaId = user.app_metadata?.pessoa_id;

  if (typeof metadataPessoaId === 'string' && metadataPessoaId.trim()) {
    return metadataPessoaId.trim();
  }

  if (typeof appMetadataPessoaId === 'string' && appMetadataPessoaId.trim()) {
    return appMetadataPessoaId.trim();
  }

  return undefined;
}

export async function resolveFirstAccessLinkForUser(user: User): Promise<LinkResolutionResult> {
  const existingLink = await getPrimaryLinkedPerson(user.id);

  if (existingLink.error) {
    return { status: 'error', error: existingLink.error, data: null, created: false };
  }

  if (existingLink.data) {
    clearPendingFirstAccess();
    return { status: 'linked', data: existingLink.data, created: false };
  }

  const pending = readPendingFirstAccess(user.email);
  const pessoaId = getMetadataPessoaId(user) || pending?.pessoaId;

  if (!pessoaId) {
    return { status: 'missing-pessoa-id', data: null, created: false };
  }

  const validation = await validateFirstAccessCode(pessoaId);

  if (validation.error) {
    return { status: 'error', error: validation.error, data: null, created: false };
  }

  if (!validation.data) {
    return { status: 'person-not-found', data: null, created: false };
  }

  if (validation.data.already_used) {
    return { status: 'person-already-linked', data: null, created: false };
  }

  const profile = await ensureMemberProfile(user.id, {
    nome_exibicao:
      (user.user_metadata?.nome_exibicao as string | undefined) ||
      validation.data.nome_completo ||
      user.email ||
      null,
  });

  if (profile.error) {
    return { status: 'error', error: profile.error, data: null, created: false };
  }

  const link = await ensureOwnFirstAccessLink(user.id, pessoaId);

  if (link.error === 'person_not_found') {
    return { status: 'person-not-found', data: null, created: false };
  }

  if (link.error === 'person_already_linked') {
    return { status: 'person-already-linked', data: null, created: false };
  }

  if (link.error || !link.data) {
    return {
      status: 'error',
      error: link.error || 'Não foi possível criar o vínculo com a pessoa da árvore.',
      data: null,
      created: false,
    };
  }

  clearPendingFirstAccess();
  return { status: 'linked', data: link.data, created: true };
}

export async function linkUserToPerson(params: {
  userId: string;
  pessoaId: string;
  relacaoComPerfil?: string;
  principal?: boolean;
  dadosConfirmados?: boolean;
}) {
  const { userId, pessoaId, relacaoComPerfil, principal = true, dadosConfirmados = false } = params;

  if (principal) {
    await supabase
      .from('user_person_links')
      .update({ principal: false })
      .eq('user_id', userId);
  }

  const { data: existing, error: existingError } = await supabase
    .from('user_person_links')
    .select('*')
    .eq('user_id', userId)
    .eq('pessoa_id', pessoaId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message, data: null as UserPersonLinkRecord | null };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('user_person_links')
      .update({
        principal,
        relacao_com_perfil: relacaoComPerfil ?? existing.relacao_com_perfil ?? null,
        dados_confirmados: existing.dados_confirmados ?? dadosConfirmados,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    return { error: error?.message, data: (data as UserPersonLinkRecord) ?? null };
  }

  const { data, error } = await supabase
    .from('user_person_links')
    .insert({
      user_id: userId,
      pessoa_id: pessoaId,
      relacao_com_perfil: relacaoComPerfil ?? null,
      principal,
      dados_confirmados: dadosConfirmados,
    })
    .select('*')
    .single();

  return { error: error?.message, data: (data as UserPersonLinkRecord) ?? null };
}

export async function updateOwnLinkedPerson(pessoaId: string, payload: EditableOwnPersonPayload) {
  const { data, error } = await supabase
    .from('pessoas')
    .update(payload)
    .eq('id', pessoaId)
    .select('*')
    .single();

  return { error: error?.message, data: (data as Pessoa) ?? null };
}

export async function confirmOwnLinkedPersonData(linkId: string) {
  const { data, error } = await supabase
    .from('user_person_links')
    .update({
      dados_confirmados: true,
      dados_confirmados_em: new Date().toISOString(),
    })
    .eq('id', linkId)
    .select('*')
    .single();

  return { error: error?.message, data: (data as UserPersonLinkRecord) ?? null };
}

export async function listLinkablePeople() {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .order('nome_completo', { ascending: true });

  return { error: error?.message, data: (data as Pessoa[]) ?? [] };
}
