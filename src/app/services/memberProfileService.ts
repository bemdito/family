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
