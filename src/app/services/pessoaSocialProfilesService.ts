import { supabase } from '../lib/supabaseClient';
import type { Pessoa, PessoaSocialProfile } from '../types';
import {
  createSocialProfile,
  SocialProfileForm,
} from '../utils/personFields';

type SocialProfilePayload = {
  rede: string;
  perfil?: string | null;
  url?: string | null;
  exibir_no_perfil?: boolean;
};

function getSocialProfileUrl(rede: string, perfil?: string | null) {
  const value = String(perfil ?? '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const cleanValue = value.replace(/^@+/, '');

  if (rede === 'Instagram') return `https://instagram.com/${cleanValue}`;
  if (rede === 'TikTok') return `https://tiktok.com/@${cleanValue}`;
  if (rede === 'Facebook') return `https://facebook.com/${cleanValue}`;
  if (rede === 'LinkedIn') return `https://linkedin.com/in/${cleanValue}`;

  return value;
}

function toPessoaSocialProfile(row: any): PessoaSocialProfile {
  return {
    id: row.id,
    pessoa_id: row.pessoa_id,
    rede: row.rede,
    perfil: row.perfil ?? null,
    url: row.url ?? null,
    exibir_no_perfil: row.exibir_no_perfil ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizePayload(payload: SocialProfilePayload) {
  const rede = payload.rede.trim();
  const perfil = payload.perfil?.trim() || null;

  return {
    rede,
    perfil,
    url: payload.url?.trim() || getSocialProfileUrl(rede, perfil),
    exibir_no_perfil: payload.exibir_no_perfil ?? true,
  };
}

function isMissingSocialProfilesTable(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

export function buildSocialProfilesFromRows(rows: PessoaSocialProfile[], pessoa?: Pick<Pessoa, 'rede_social' | 'instagram_usuario'> | null) {
  const visibleRows = rows.filter((row) => row.exibir_no_perfil !== false);
  if (visibleRows.length > 0) {
    return visibleRows.map((row) => createSocialProfile(row.rede, row.perfil ?? ''));
  }

  return [
    createSocialProfile(
      String(pessoa?.rede_social ?? ''),
      String(pessoa?.instagram_usuario ?? ''),
    ),
  ];
}

export async function listarPessoaSocialProfiles(
  pessoaId: string,
  options: { onlyVisible?: boolean } = {},
): Promise<PessoaSocialProfile[]> {
  let query = supabase
    .from('pessoa_social_profiles')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('created_at', { ascending: true });

  if (options.onlyVisible) {
    query = query.eq('exibir_no_perfil', true);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSocialProfilesTable(error)) return [];
    throw new Error(error.message || 'Erro ao carregar redes sociais.');
  }

  return (data || []).map(toPessoaSocialProfile);
}

export async function criarPessoaSocialProfile(
  pessoaId: string,
  payload: SocialProfilePayload,
): Promise<PessoaSocialProfile> {
  const { data, error } = await supabase
    .from('pessoa_social_profiles')
    .insert({
      pessoa_id: pessoaId,
      ...normalizePayload(payload),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Erro ao criar rede social.');
  return toPessoaSocialProfile(data);
}

export async function atualizarPessoaSocialProfile(
  profileId: string,
  payload: SocialProfilePayload,
): Promise<PessoaSocialProfile> {
  const { data, error } = await supabase
    .from('pessoa_social_profiles')
    .update(normalizePayload(payload))
    .eq('id', profileId)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Erro ao atualizar rede social.');
  return toPessoaSocialProfile(data);
}

export async function removerPessoaSocialProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('pessoa_social_profiles')
    .delete()
    .eq('id', profileId);

  if (error) throw new Error(error.message || 'Erro ao remover rede social.');
}

export async function substituirPessoaSocialProfiles(
  pessoaId: string,
  profiles: SocialProfileForm[],
  options: { exibirNoPerfil?: boolean } = {},
): Promise<PessoaSocialProfile[]> {
  const seenNetworks = new Set<string>();
  const normalizedProfiles = profiles
    .map((profile) => ({
      rede: profile.rede.trim(),
      perfil: profile.perfil.trim(),
      exibir_no_perfil: options.exibirNoPerfil ?? true,
    }))
    .filter((profile) => profile.rede || profile.perfil)
    .filter((profile) => {
      const key = profile.rede.toLocaleLowerCase('pt-BR');
      if (!key) return true;
      if (seenNetworks.has(key)) return false;
      seenNetworks.add(key);
      return true;
    });

  const existing = await listarPessoaSocialProfiles(pessoaId);
  const existingByNetwork = new Map(existing.map((profile) => [profile.rede.toLocaleLowerCase('pt-BR'), profile]));
  const keptIds = new Set<string>();

  for (const profile of normalizedProfiles) {
    const current = existingByNetwork.get(profile.rede.toLocaleLowerCase('pt-BR'));
    if (current) {
      await atualizarPessoaSocialProfile(current.id, profile);
      keptIds.add(current.id);
    } else {
      const created = await criarPessoaSocialProfile(pessoaId, profile);
      keptIds.add(created.id);
    }
  }

  const idsToDelete = existing.filter((profile) => !keptIds.has(profile.id)).map((profile) => profile.id);
  for (const profileId of idsToDelete) {
    await removerPessoaSocialProfile(profileId);
  }

  return listarPessoaSocialProfiles(pessoaId);
}
