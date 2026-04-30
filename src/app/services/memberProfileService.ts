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
}

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

export async function linkUserToPerson(params: {
  userId: string;
  pessoaId: string;
  relacaoComPerfil?: string;
  principal?: boolean;
}) {
  const { userId, pessoaId, relacaoComPerfil, principal = true } = params;

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
    })
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
