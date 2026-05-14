import { Pessoa, Relacionamento } from '../types';
import { supabase } from '../lib/supabaseClient';
import { limparCacheParentesco } from './relationshipCacheService';
import { createActivityLog } from './activityLogService';
import { emitTreeDataChanged } from './treeDataCache';
import { includesNormalizedText } from '../utils/searchText';
import { isPersonDeceased } from '../utils/personFields';

type SupabaseErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
  status?: number;
};

const PESSOA_COLUMNS = [
  'nome_completo',
  'data_nascimento',
  'local_nascimento',
  'local_nascimento_exterior',
  'data_falecimento',
  'local_falecimento',
  'local_falecimento_exterior',
  'falecido',
  'local_atual',
  'foto_principal_url',
  'humano_ou_pet',
  'lado',
  'minibio',
  'curiosidades',
  'telefone',
  'endereco',
  'rede_social',
  'instagram_usuario',
  'instagram_url',
  'permitir_exibir_instagram',
  'permitir_mensagens_whatsapp',
  'permitir_exibir_data_nascimento',
  'permitir_exibir_endereco',
  'permitir_exibir_rede_social',
  'permitir_exibir_telefone',
  'geracao_sociologica',
  'manual_generation',
] as const;

const RELACIONAMENTO_COLUMNS = [
  'pessoa_origem_id',
  'pessoa_destino_id',
  'tipo_relacionamento',
  'subtipo_relacionamento',
  'data_casamento',
  'data_separacao',
  'local_casamento',
  'local_separacao',
  'ativo',
  'observacoes',
] as const;

const PRIVACY_FIELDS = new Set([
  'permitir_exibir_instagram',
  'permitir_mensagens_whatsapp',
  'permitir_exibir_data_nascimento',
  'permitir_exibir_endereco',
  'permitir_exibir_rede_social',
  'permitir_exibir_telefone',
]);

type RelacionamentoPayload = Omit<Relacionamento, 'id' | 'ativo'> & { ativo?: boolean };
type InverseOptions = {
  inverseTipoForFilho?: 'pai' | 'mae';
};

function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error(`[Supabase] ${context}: ${error.message || 'Erro desconhecido'}`, {
    code: error.code,
    status: error.status,
    details: error.details,
    hint: error.hint,
  });
}

async function limparCacheParentescoSemBloquear() {
  try {
    await limparCacheParentesco();
  } catch (error) {
    console.warn('Não foi possível limpar cache de parentesco:', error);
  }
}

function getSupabaseErrorMessage(tableName: string, error: SupabaseErrorLike) {
  const rawMessage = error.message || 'Erro desconhecido do Supabase.';
  const message = rawMessage.toLowerCase();
  const details = (error.details || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  if (combined.includes('invalid api key') || combined.includes('invalid jwt')) {
    return `Chave inválida: o Supabase recusou a anon key enviada ao consultar ${tableName}.`;
  }

  if (error.code === '42P01' || combined.includes('does not exist')) {
    return `Tabela inexistente: a tabela ${tableName} não foi encontrada no Supabase.`;
  }

  if (
    error.status === 401 ||
    error.status === 403 ||
    error.code === '42501' ||
    combined.includes('permission denied') ||
    combined.includes('row-level security')
  ) {
    return `RLS/permissão: leitura bloqueada para a tabela ${tableName}.`;
  }

  return `Erro ao carregar ${tableName}: ${rawMessage}`;
}

function toPessoa(row: any): Pessoa {
  return {
    ...row,
    humano_ou_pet: row?.humano_ou_pet || 'Humano',
    falecido: row?.falecido ?? isPersonDeceased(row),
    local_nascimento_exterior: row?.local_nascimento_exterior ?? false,
    local_falecimento_exterior: row?.local_falecimento_exterior ?? false,
    permitir_exibir_data_nascimento: row?.permitir_exibir_data_nascimento ?? true,
    permitir_exibir_endereco: row?.permitir_exibir_endereco ?? true,
    permitir_exibir_rede_social: row?.permitir_exibir_rede_social ?? row?.permitir_exibir_instagram ?? true,
    permitir_exibir_telefone: row?.permitir_exibir_telefone ?? true,
    permitir_exibir_instagram: row?.permitir_exibir_instagram ?? row?.permitir_exibir_rede_social ?? true,
    permitir_mensagens_whatsapp: row?.permitir_mensagens_whatsapp ?? true,
  } as Pessoa;
}

function toRelacionamento(row: any): Relacionamento {
  return {
    ...row,
    ativo: row?.ativo ?? true,
  } as Relacionamento;
}

function pickDefined<T extends readonly string[]>(source: Record<string, any>, keys: T) {
  return keys.reduce<Record<string, any>>((payload, key) => {
    if (source[key] !== undefined) {
      payload[key] = source[key];
    }
    return payload;
  }, {});
}

function normalizeManualGeneration(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const generation = Number(value);
  return Number.isInteger(generation) && generation >= 1 && generation <= 7
    ? generation
    : null;
}

function getSafeChangedFields(payload: Record<string, any>) {
  return Object.keys(payload).filter((field) => field !== 'telefone' && field !== 'endereco');
}

function getSafeRelationshipChangedFields(payload: Record<string, any>) {
  return Object.keys(payload).filter((field) => field !== 'observacoes');
}

// =====================================================
// PESSOAS - CRUD
// =====================================================

export async function obterTodasPessoas(): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .order('nome_completo', { ascending: true });

  if (error) {
    logSupabaseError('Erro ao obter pessoas da tabela pessoas', error);
    throw new Error(getSupabaseErrorMessage('pessoas', error));
  }

  return (data || []).map(toPessoa);
}

export async function obterPessoaPorId(id: string): Promise<Pessoa | undefined> {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logSupabaseError(`Erro ao obter pessoa ${id}`, error);
    return undefined;
  }

  return data ? toPessoa(data) : undefined;
}

export async function obterPessoasPorIds(ids: string[]): Promise<Pessoa[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .in('id', uniqueIds);

  if (error) {
    logSupabaseError('Erro ao obter pessoas por IDs', error);
    throw new Error(getSupabaseErrorMessage('pessoas', error));
  }

  return (data || []).map(toPessoa);
}

export async function adicionarPessoa(pessoa: Omit<Pessoa, 'id'>): Promise<Pessoa | undefined> {
  const payload = pickDefined(pessoa, PESSOA_COLUMNS);
  const { data, error } = await supabase
    .from('pessoas')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('Erro ao adicionar pessoa na tabela pessoas', error);
    return undefined;
  }

  if (data) {
    await createActivityLog({
      action: 'person.created',
      entity_type: 'person',
      entity_id: data.id,
      entity_label: data.nome_completo,
      metadata: {
        humano_ou_pet: data.humano_ou_pet,
        has_photo: Boolean(data.foto_principal_url),
        manual_generation: data.manual_generation ?? null,
      },
    });
    emitTreeDataChanged();
  }

  return data ? toPessoa(data) : undefined;
}

export async function atualizarPessoa(id: string, pessoa: Partial<Pessoa>): Promise<Pessoa | undefined> {
  const payload = pickDefined(pessoa, PESSOA_COLUMNS);
  const { data, error } = await supabase
    .from('pessoas')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar pessoa ${id}`, error);
    return undefined;
  }

  if (data) {
    const changedFields = getSafeChangedFields(payload);

    await createActivityLog({
      action: 'person.updated',
      entity_type: 'person',
      entity_id: data.id,
      entity_label: data.nome_completo,
      metadata: {
        changed_fields: changedFields,
      },
    });

    if ('foto_principal_url' in payload) {
      await createActivityLog({
        action: 'person.photo_updated',
        entity_type: 'person',
        entity_id: data.id,
        entity_label: data.nome_completo,
        metadata: {
          has_photo: Boolean(data.foto_principal_url),
        },
      });
    }

    const privacyFields = changedFields.filter((field) => PRIVACY_FIELDS.has(field));
    if (privacyFields.length > 0) {
      await createActivityLog({
        action: 'person.privacy_updated',
        entity_type: 'person',
        entity_id: data.id,
        entity_label: data.nome_completo,
        metadata: {
          changed_fields: privacyFields,
        },
      });
    }

    emitTreeDataChanged();
  }

  return data ? toPessoa(data) : undefined;
}

export async function atualizarGeracaoManualPessoa(id: string, generation: number): Promise<Pessoa | undefined> {
  if (!Number.isInteger(generation) || generation < 1 || generation > 7) {
    throw new Error('Geração manual inválida. Use um valor entre 1 e 7.');
  }

  const { data, error } = await supabase
    .from('pessoas')
    .update({ manual_generation: generation })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar geração manual da pessoa ${id}`, error);
    throw new Error(error.message || 'Erro ao atualizar geração manual.');
  }

  const updated = data ? toPessoa(data) : undefined;
  if (updated) {
    emitTreeDataChanged();
  }

  return updated;
}

export async function deletarPessoa(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('pessoas')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar pessoa ${id}`, error);
    return false;
  }

  emitTreeDataChanged();
  return true;
}

export const excluirPessoa = deletarPessoa;

// =====================================================
// RELACIONAMENTOS - CRUD
// =====================================================

export async function obterTodosRelacionamentos(): Promise<Relacionamento[]> {
  const { data, error } = await supabase
    .from('relacionamentos')
    .select('*');

  if (error) {
    logSupabaseError('Erro ao obter relacionamentos da tabela relacionamentos', error);
    throw new Error(getSupabaseErrorMessage('relacionamentos', error));
  }

  return (data || []).map(toRelacionamento);
}

export async function obterRelacionamentosDaPessoa(pessoaId: string) {
  try {
    const { data, error } = await supabase
      .from('relacionamentos')
      .select('*')
      .or(`pessoa_origem_id.eq.${pessoaId},pessoa_destino_id.eq.${pessoaId}`);

    if (error) {
      logSupabaseError(`Erro ao obter relacionamentos da pessoa ${pessoaId}`, error);
      throw new Error(error.message);
    }

    const relacionamentos = (data || []).map(toRelacionamento);
    const relatedIds = relacionamentos.map((rel) =>
      rel.pessoa_origem_id === pessoaId ? rel.pessoa_destino_id : rel.pessoa_origem_id
    );
    const pessoas = await obterPessoasPorIds(relatedIds);
    const pessoasMap = new Map(pessoas.map(p => [p.id, p]));

    const paisSet = new Set<string>();
    const maesSet = new Set<string>();
    const conjugesSet = new Set<string>();
    const filhosSet = new Set<string>();
    const irmaosSet = new Set<string>();
    const parentIdsSet = new Set<string>();

    for (const rel of relacionamentos) {
      // Relações criadas A PARTIR da pessoa atual
      if (rel.pessoa_origem_id === pessoaId) {
        const destino = pessoasMap.get(rel.pessoa_destino_id);
        if (!destino) continue;

        if (rel.tipo_relacionamento === 'pai') paisSet.add(destino.id);
        if (rel.tipo_relacionamento === 'mae') maesSet.add(destino.id);
        if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') parentIdsSet.add(destino.id);
        if (rel.tipo_relacionamento === 'conjuge') conjugesSet.add(destino.id);
        if (rel.tipo_relacionamento === 'filho') filhosSet.add(destino.id);
        if (rel.tipo_relacionamento === 'irmao') irmaosSet.add(destino.id);
      }

      // Relações em que a pessoa atual aparece como DESTINO
      if (rel.pessoa_destino_id === pessoaId) {
        const origem = pessoasMap.get(rel.pessoa_origem_id);
        if (!origem) continue;

        // Bidirecionais
        if (rel.tipo_relacionamento === 'conjuge') conjugesSet.add(origem.id);
        if (rel.tipo_relacionamento === 'irmao') irmaosSet.add(origem.id);

        // Se alguém aponta para a pessoa atual como "pai" ou "mae",
        // então essa origem é filho(a) da pessoa atual.
        if (rel.tipo_relacionamento === 'pai') filhosSet.add(origem.id);
        if (rel.tipo_relacionamento === 'mae') filhosSet.add(origem.id);

        // MUITO IMPORTANTE:
        // Se alguém aponta para a pessoa atual como "filho",
        // essa origem é pai/mãe da pessoa atual no relacionamento reverso,
        // e NÃO deve ser adicionada à seção "Filhos".
        // Por isso não fazemos nada aqui.
        if (rel.tipo_relacionamento === 'filho') parentIdsSet.add(origem.id);
      }
    }

    const parentIds = Array.from(parentIdsSet);

    if (parentIds.length > 0) {
      const parentFilter = parentIds
        .flatMap((parentId) => [`pessoa_origem_id.eq.${parentId}`, `pessoa_destino_id.eq.${parentId}`])
        .join(',');

      const { data: parentRelationshipsData, error: parentRelationshipsError } = await supabase
        .from('relacionamentos')
        .select('*')
        .or(parentFilter);

      if (parentRelationshipsError) {
        logSupabaseError(`Erro ao inferir irmãos da pessoa ${pessoaId}`, parentRelationshipsError);
      } else {
        const parentRelationships = (parentRelationshipsData || []).map(toRelacionamento);

        for (const rel of parentRelationships) {
          let siblingId: string | undefined;

          // Filho(a) -> Pai/Mãe
          if (
            (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') &&
            parentIdsSet.has(rel.pessoa_destino_id)
          ) {
            siblingId = rel.pessoa_origem_id;
          }

          // Pai/Mãe -> Filho(a)
          if (rel.tipo_relacionamento === 'filho' && parentIdsSet.has(rel.pessoa_origem_id)) {
            siblingId = rel.pessoa_destino_id;
          }

          if (siblingId && siblingId !== pessoaId) {
            irmaosSet.add(siblingId);
          }
        }
      }
    }

    const inferredSiblingIds = Array.from(irmaosSet).filter((id) => !pessoasMap.has(id));
    if (inferredSiblingIds.length > 0) {
      const inferredSiblings = await obterPessoasPorIds(inferredSiblingIds);
      for (const sibling of inferredSiblings) {
        pessoasMap.set(sibling.id, sibling);
      }
    }

    const pais = Array.from(paisSet)
      .map(id => pessoasMap.get(id))
      .filter((p): p is Pessoa => !!p);

    const maes = Array.from(maesSet)
      .map(id => pessoasMap.get(id))
      .filter((p): p is Pessoa => !!p);

    const conjuges = Array.from(conjugesSet)
      .map(id => pessoasMap.get(id))
      .filter((p): p is Pessoa => !!p);

    const filhos = Array.from(filhosSet)
      .map(id => pessoasMap.get(id))
      .filter((p): p is Pessoa => !!p);

    const irmaos = Array.from(irmaosSet)
      .map(id => pessoasMap.get(id))
      .filter((p): p is Pessoa => !!p);

    return { pais, maes, conjuges, filhos, irmaos };
  } catch (error) {
    console.error('Erro na requisição obterRelacionamentosDaPessoa:', error);
    return { pais: [], maes: [], conjuges: [], filhos: [], irmaos: [] };
  }
}

export async function adicionarRelacionamento(relacionamento: Omit<Relacionamento, 'id'>): Promise<Relacionamento | undefined> {
  const payload = pickDefined(relacionamento, RELACIONAMENTO_COLUMNS);
  const { data, error } = await supabase
    .from('relacionamentos')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('Erro ao adicionar relacionamento na tabela relacionamentos', error);
    return undefined;
  }

  await limparCacheParentescoSemBloquear();
  return data ? toRelacionamento(data) : undefined;
}

export function getRelacionamentoInversoPayload(
  relacionamento: Pick<Relacionamento, 'pessoa_origem_id' | 'pessoa_destino_id' | 'tipo_relacionamento' | 'subtipo_relacionamento' | 'data_casamento' | 'data_separacao' | 'local_casamento' | 'local_separacao' | 'ativo' | 'observacoes'>,
  options: InverseOptions = {}
): RelacionamentoPayload | undefined {
  let tipoInverso: Relacionamento['tipo_relacionamento'] | undefined;

  if (relacionamento.tipo_relacionamento === 'conjuge' || relacionamento.tipo_relacionamento === 'irmao') {
    tipoInverso = relacionamento.tipo_relacionamento;
  }

  if (relacionamento.tipo_relacionamento === 'pai' || relacionamento.tipo_relacionamento === 'mae') {
    tipoInverso = 'filho';
  }

  if (relacionamento.tipo_relacionamento === 'filho') {
    tipoInverso = options.inverseTipoForFilho;
  }

  if (!tipoInverso) return undefined;

  return {
    pessoa_origem_id: relacionamento.pessoa_destino_id,
    pessoa_destino_id: relacionamento.pessoa_origem_id,
    tipo_relacionamento: tipoInverso,
    subtipo_relacionamento: relacionamento.subtipo_relacionamento,
    data_casamento: relacionamento.data_casamento,
    data_separacao: relacionamento.data_separacao,
    local_casamento: relacionamento.local_casamento,
    local_separacao: relacionamento.local_separacao,
    ativo: relacionamento.ativo ?? true,
    observacoes: relacionamento.observacoes,
  };
}

function hasDuplicateRelationshipError(error: SupabaseErrorLike) {
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return error.code === '23505' || message.includes('duplicate key') || message.includes('already exists');
}

async function buscarRelacionamentoPorPayload(
  relacionamento: Pick<Relacionamento, 'pessoa_origem_id' | 'pessoa_destino_id' | 'tipo_relacionamento' | 'subtipo_relacionamento'>
) {
  let query = supabase
    .from('relacionamentos')
    .select('*')
    .eq('pessoa_origem_id', relacionamento.pessoa_origem_id)
    .eq('pessoa_destino_id', relacionamento.pessoa_destino_id)
    .eq('tipo_relacionamento', relacionamento.tipo_relacionamento);

  query = relacionamento.subtipo_relacionamento
    ? query.eq('subtipo_relacionamento', relacionamento.subtipo_relacionamento)
    : query.is('subtipo_relacionamento', null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    logSupabaseError('Erro ao buscar relacionamento existente', error);
    return undefined;
  }

  return data ? toRelacionamento(data) : undefined;
}

export async function adicionarRelacionamentoComInverso(
  relacionamento: RelacionamentoPayload,
  options: InverseOptions = {}
): Promise<Relacionamento | undefined> {
  const principal = await adicionarRelacionamento(relacionamento);

  if (!principal) {
    return buscarRelacionamentoPorPayload(relacionamento);
  }

  const inverso = getRelacionamentoInversoPayload(principal, options);
  if (!inverso) {
    emitTreeDataChanged();
    return principal;
  }

  const payload = pickDefined(inverso, RELACIONAMENTO_COLUMNS);
  const { error } = await supabase
    .from('relacionamentos')
    .insert(payload);

  if (error && !hasDuplicateRelationshipError(error)) {
    logSupabaseError('Erro ao adicionar relacionamento inverso', error);
  }

  await limparCacheParentescoSemBloquear();
  await createActivityLog({
    action: 'relationship.created',
    entity_type: 'relationship',
    entity_id: principal.id,
    entity_label: principal.tipo_relacionamento,
    metadata: {
      relationship_type: principal.tipo_relacionamento,
      relationship_subtype: principal.subtipo_relacionamento ?? null,
      ativo: principal.ativo,
      has_separation_date: Boolean(principal.data_separacao),
      has_observations: Boolean(principal.observacoes),
      has_inverse: Boolean(inverso),
    },
  });

  emitTreeDataChanged();
  return principal;
}

export async function atualizarRelacionamento(id: string, relacionamento: Partial<Relacionamento>): Promise<Relacionamento | undefined> {
  const payload = pickDefined(relacionamento, RELACIONAMENTO_COLUMNS);
  const { data, error } = await supabase
    .from('relacionamentos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    logSupabaseError(`Erro ao atualizar relacionamento ${id}`, error);
    return undefined;
  }

  await limparCacheParentescoSemBloquear();

  if (data) {
    const updated = toRelacionamento(data);
    await createActivityLog({
      action: 'relationship.updated',
      entity_type: 'relationship',
      entity_id: updated.id,
      entity_label: updated.tipo_relacionamento,
      metadata: {
        changed_fields: getSafeRelationshipChangedFields(payload),
        relationship_type: updated.tipo_relacionamento,
        relationship_subtype: updated.subtipo_relacionamento ?? null,
        ativo: updated.ativo,
        has_separation_date: Boolean(updated.data_separacao),
        has_observations: Boolean(updated.observacoes),
      },
    });
    emitTreeDataChanged();
  }

  return data ? toRelacionamento(data) : undefined;
}

async function deletarRelacionamentoSemInvalidarCache(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('relacionamentos')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar relacionamento ${id}`, error);
    return false;
  }

  await limparCacheParentescoSemBloquear();
  return true;
}

export async function deletarRelacionamento(id: string): Promise<boolean> {
  const deleted = await deletarRelacionamentoSemInvalidarCache(id);
  if (deleted) {
    emitTreeDataChanged();
  }
  return deleted;
}

export const excluirRelacionamento = deletarRelacionamento;

export async function encontrarRelacionamentoInverso(relacionamento: Relacionamento): Promise<Relacionamento | undefined> {
  const candidatos = await obterTodosRelacionamentos();
  return candidatos.find((candidate) => {
    const samePair =
      candidate.pessoa_origem_id === relacionamento.pessoa_destino_id &&
      candidate.pessoa_destino_id === relacionamento.pessoa_origem_id &&
      candidate.subtipo_relacionamento === relacionamento.subtipo_relacionamento;

    if (!samePair) return false;

    if (relacionamento.tipo_relacionamento === 'conjuge' || relacionamento.tipo_relacionamento === 'irmao') {
      return candidate.tipo_relacionamento === relacionamento.tipo_relacionamento;
    }

    if (relacionamento.tipo_relacionamento === 'pai' || relacionamento.tipo_relacionamento === 'mae') {
      return candidate.tipo_relacionamento === 'filho';
    }

    if (relacionamento.tipo_relacionamento === 'filho') {
      return candidate.tipo_relacionamento === 'pai' || candidate.tipo_relacionamento === 'mae';
    }

    return false;
  });
}

export async function excluirRelacionamentoComInverso(id: string): Promise<boolean> {
  const relacionamentos = await obterTodosRelacionamentos();
  const relacionamento = relacionamentos.find((rel) => rel.id === id);

  if (!relacionamento) {
    return deletarRelacionamento(id);
  }

  const inverso = await encontrarRelacionamentoInverso(relacionamento);
  const deleted = await deletarRelacionamentoSemInvalidarCache(id);

  if (!deleted) return false;

  if (inverso) {
    await deletarRelacionamentoSemInvalidarCache(inverso.id);
  }

  await createActivityLog({
    action: 'relationship.deleted',
    entity_type: 'relationship',
    entity_id: relacionamento.id,
    entity_label: relacionamento.tipo_relacionamento,
    metadata: {
      relationship_type: relacionamento.tipo_relacionamento,
      relationship_subtype: relacionamento.subtipo_relacionamento ?? null,
      had_inverse: Boolean(inverso),
    },
  });

  emitTreeDataChanged();
  return true;
}

export async function excluirRelacionamentoPorPayloadComInverso(
  relacionamento: Pick<Relacionamento, 'pessoa_origem_id' | 'pessoa_destino_id' | 'tipo_relacionamento' | 'subtipo_relacionamento'>
): Promise<boolean> {
  const existing = await buscarRelacionamentoPorPayload(relacionamento);
  if (!existing) return true;

  return excluirRelacionamentoComInverso(existing.id);
}

// =====================================================
// BUSCA
// =====================================================

export async function buscarPessoas(termo: string): Promise<Pessoa[]> {
  try {
    const pessoas = await obterTodasPessoas();

    return pessoas.filter(p =>
      includesNormalizedText(p.nome_completo, termo) ||
      includesNormalizedText(p.local_nascimento, termo) ||
      includesNormalizedText(p.local_atual, termo) ||
      includesNormalizedText(p.local_falecimento, termo)
    );
  } catch (error) {
    console.error('Erro na busca de pessoas:', error);
    return [];
  }
}

// =====================================================
// MIGRAÇÃO DE DADOS
// =====================================================

/**
 * @deprecated Operacao destrutiva e nao transacional. Nao chame pelo frontend.
 * Substituir por rotina server-side/RPC transacional com validacao de admin.
 */
export async function migrarDados(seed: any[]): Promise<{ success: boolean; message?: string; stats?: any }> {
  try {
    const { error: relacionamentosError } = await supabase
      .from('relacionamentos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (relacionamentosError) {
      logSupabaseError('Erro ao limpar relacionamentos antes da migração', relacionamentosError);
      return { success: false, message: relacionamentosError.message };
    }

    const { error: pessoasError } = await supabase
      .from('pessoas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (pessoasError) {
      logSupabaseError('Erro ao limpar pessoas antes da migração', pessoasError);
      return { success: false, message: pessoasError.message };
    }

    const result = await importarDadosFamilia(seed);

    return {
      success: result.sucesso,
      message: result.sucesso
        ? 'Migração concluída com sucesso!'
        : result.erros.join('\n') || 'Erro ao migrar dados',
      stats: {
        pessoas: result.pessoas.length,
        relacionamentos: result.relacionamentos.length,
      },
    };
  } catch (error: any) {
    console.error('[Supabase] Erro na migração de dados:', error);
    return { success: false, message: error.message };
  }
}

// =====================================================
// IMPORTAÇÃO DE DADOS
// =====================================================

export async function importarDadosFamilia(dados: any[]) {
  const pessoas: Pessoa[] = [];
  const relacionamentos: any[] = [];
  const erros: string[] = [];

  try {
    const nomeParaId = new Map<string, string>();

    for (const registro of dados) {
      try {
        const nomeCompleto = registro['Nome completo'] || registro.nome_completo;

        if (!nomeCompleto) {
          erros.push('Registro sem nome completo encontrado');
          continue;
        }

        const pessoaData = {
          nome_completo: nomeCompleto,
          data_nascimento: registro['Data de nascimento']?.toString() || registro.data_nascimento?.toString() || '',
          local_nascimento: registro['Local de Nascimento'] || registro.local_nascimento || '',
          local_nascimento_exterior: Boolean(registro.local_nascimento_exterior === true || registro.local_nascimento_exterior === 'true'),
          data_falecimento: registro['Data de falecimento']?.toString() || registro.data_falecimento?.toString() || '',
          local_falecimento: registro['Local de Falecimento'] || registro.local_falecimento || '',
          local_falecimento_exterior: Boolean(registro.local_falecimento_exterior === true || registro.local_falecimento_exterior === 'true'),
          falecido: Boolean(
            registro.falecido === true ||
            registro.falecido === 'true' ||
            registro['Data de falecimento'] ||
            registro.data_falecimento ||
            registro['Local de Falecimento'] ||
            registro.local_falecimento
          ),
          humano_ou_pet: registro['Humano ou pet'] || registro.humano_ou_pet || 'Humano',
          lado: registro.lado || 'esquerda',
          manual_generation: normalizeManualGeneration(registro.manual_generation),
          local_atual: registro.local_atual || '',
          foto_principal_url: registro.foto_principal_url || '',
          minibio: registro.minibio || '',
          curiosidades: registro.curiosidades || '',
          telefone: registro.telefone || '',
          endereco: registro.endereco || '',
          rede_social: registro.rede_social || '',
        };

        const novaPessoa = await adicionarPessoa(pessoaData);

        if (novaPessoa) {
          pessoas.push(novaPessoa);
          nomeParaId.set(nomeCompleto, novaPessoa.id);
        } else {
          erros.push(`Erro ao criar pessoa: ${nomeCompleto}`);
        }
      } catch (error: any) {
        erros.push(`Erro ao processar registro: ${error.message}`);
      }
    }

    for (const registro of dados) {
      try {
        const nomeCompleto = registro['Nome completo'] || registro.nome_completo;
        const pessoaId = nomeParaId.get(nomeCompleto);

        if (!pessoaId) continue;

        const pai = registro['Pai'] || registro.pai;
        const mae = registro['Mãe'] || registro.mae;
        const conjuge = registro['Cônjuge'] || registro.conjuge;
        const tipoFiliacao = (registro['Filho (a) de (de sangue; adotivo'] || registro.tipo_filiacao || 'Sangue').toLowerCase();

        if (pai) {
          const paiId = nomeParaId.get(pai);
          if (paiId) {
            await adicionarRelacionamentoComInverso({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: paiId,
              tipo_relacionamento: 'pai',
              subtipo_relacionamento: tipoFiliacao,
            });
          }
        }

        if (mae) {
          const maeId = nomeParaId.get(mae);
          if (maeId) {
            await adicionarRelacionamentoComInverso({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: maeId,
              tipo_relacionamento: 'mae',
              subtipo_relacionamento: tipoFiliacao,
            });
          }
        }

        if (conjuge) {
          const conjugeId = nomeParaId.get(conjuge);
          if (conjugeId) {
            await adicionarRelacionamentoComInverso({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: conjugeId,
              tipo_relacionamento: 'conjuge',
              subtipo_relacionamento: 'casamento',
            });
          }
        }
      } catch (error: any) {
        erros.push(`Erro ao criar relacionamento: ${error.message}`);
      }
    }

    const relacionamentosCriados = await obterTodosRelacionamentos();

    return {
      pessoas,
      relacionamentos: relacionamentosCriados,
      erros,
      sucesso: pessoas.length > 0,
    };
  } catch (error: any) {
    console.error('Erro na importação de dados:', error);
    return {
      pessoas: [],
      relacionamentos: [],
      erros: [`Erro geral na importação: ${error.message}`],
      sucesso: false,
    };
  }
}
