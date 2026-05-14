import { supabase } from '../lib/supabaseClient';
import { ArquivoHistorico } from '../types';
import { createActivityLog } from './activityLogService';
import { isAdminUser } from './permissionService';
import { uploadHistoricalFile } from './storageService';
import { emitTreeDataChanged } from './treeDataCache';

type SupabaseErrorLike = {
  message?: string;
};

function getErrorMessage(context: string, error: SupabaseErrorLike) {
  return `${context}: ${error.message || 'erro desconhecido do Supabase'}`;
}

async function assertAdminRelationshipFileWrite() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(error?.message || 'Usuário autenticado não encontrado.');
  }

  const { isAdmin, error: permissionError } = await isAdminUser(data.user);
  if (permissionError) {
    throw new Error(permissionError);
  }

  if (!isAdmin) {
    throw new Error('Apenas administradores podem alterar arquivos históricos de relacionamento.');
  }
}

function toArquivoHistorico(row: any): ArquivoHistorico {
  return {
    id: row.id,
    pessoa_id: row.pessoa_id ?? null,
    relacionamento_id: row.relacionamento_id ?? null,
    tipo: row.tipo,
    url: row.url,
    titulo: row.titulo,
    descricao: row.descricao ?? undefined,
    ano: row.ano ?? undefined,
    ordem: row.ordem ?? 0,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeOptional(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function hasArquivoChanged(current: ArquivoHistorico, next: ArquivoHistorico, nextOrder: number) {
  return (
    current.tipo !== next.tipo ||
    current.url !== next.url ||
    current.titulo !== next.titulo ||
    normalizeOptional(current.descricao) !== normalizeOptional(next.descricao) ||
    normalizeOptional(current.ano) !== normalizeOptional(next.ano) ||
    (current.ordem ?? 0) !== nextOrder
  );
}

type ArquivoHistoricoOwner =
  | { linkedTo: 'person'; pessoaId: string }
  | { linkedTo: 'relationship'; relacionamentoId: string };

type NovoArquivoHistoricoInput = {
  file: File;
  titulo: string;
  descricao?: string | null;
  ano?: string | null;
  ordem?: number;
};

function getOwnerFilter(query: any, owner: ArquivoHistoricoOwner) {
  if (owner.linkedTo === 'person') {
    return query.eq('pessoa_id', owner.pessoaId).is('relacionamento_id', null);
  }

  return query.eq('relacionamento_id', owner.relacionamentoId).is('pessoa_id', null);
}

function getOwnerPayload(owner: ArquivoHistoricoOwner) {
  if (owner.linkedTo === 'person') {
    return {
      pessoa_id: owner.pessoaId,
      relacionamento_id: null,
    };
  }

  return {
    pessoa_id: null,
    relacionamento_id: owner.relacionamentoId,
  };
}

function getOwnerMetadata(owner: ArquivoHistoricoOwner) {
  if (owner.linkedTo === 'person') {
    return {
      linked_to: 'person',
      pessoa_id: owner.pessoaId,
    };
  }

  return {
    linked_to: 'relationship',
    relacionamento_id: owner.relacionamentoId,
  };
}

async function listarArquivosHistoricosPorOwner(owner: ArquivoHistoricoOwner): Promise<ArquivoHistorico[]> {
  const query = supabase
    .from('arquivos_historicos')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await getOwnerFilter(query, owner);

  if (error) {
    throw new Error(getErrorMessage('Erro ao carregar arquivos históricos', error));
  }

  return (data || []).map(toArquivoHistorico);
}

async function salvarArquivosHistoricosPorOwner(
  owner: ArquivoHistoricoOwner,
  arquivos: ArquivoHistorico[]
): Promise<ArquivoHistorico[]> {
  const arquivosExistentes = await listarArquivosHistoricosPorOwner(owner);
  const arquivosExistentesPorId = new Map(arquivosExistentes.map((arquivo) => [arquivo.id, arquivo]));
  const idsMantidos = new Set(arquivos.filter((arquivo) => isUuid(arquivo.id)).map((arquivo) => arquivo.id));
  const arquivosParaRemover = arquivosExistentes.filter((arquivo) => !idsMantidos.has(arquivo.id));
  const idsParaRemover = arquivosExistentes
    .map((arquivo) => arquivo.id)
    .filter((arquivoId) => !idsMantidos.has(arquivoId));
  const ownerPayload = getOwnerPayload(owner);
  const ownerMetadata = getOwnerMetadata(owner);

  if (idsParaRemover.length > 0) {
    const deleteQuery = supabase
      .from('arquivos_historicos')
      .delete()
      .in('id', idsParaRemover);
    const { error } = await getOwnerFilter(deleteQuery, owner);

    if (error) {
      throw new Error(getErrorMessage('Erro ao remover arquivos históricos', error));
    }

    for (const arquivo of arquivosParaRemover) {
      await createActivityLog({
        action: 'historical_file.removed',
        entity_type: 'historical_file',
        entity_id: arquivo.id,
        entity_label: arquivo.titulo,
        metadata: {
          ...ownerMetadata,
          file_type: arquivo.tipo,
        },
      });
    }
  }

  for (const [index, arquivo] of arquivos.entries()) {
    const payload = {
      ...ownerPayload,
      tipo: arquivo.tipo,
      url: arquivo.url,
      titulo: arquivo.titulo,
      descricao: normalizeOptional(arquivo.descricao),
      ano: normalizeOptional(arquivo.ano),
      ordem: arquivo.ordem ?? index,
    };

    if (isUuid(arquivo.id)) {
      const arquivoExistente = arquivosExistentesPorId.get(arquivo.id);
      if (arquivoExistente && !hasArquivoChanged(arquivoExistente, arquivo, payload.ordem)) {
        continue;
      }

      const updateQuery = supabase
        .from('arquivos_historicos')
        .update(payload)
        .eq('id', arquivo.id);
      const { error } = await getOwnerFilter(updateQuery, owner);

      if (error) {
        throw new Error(getErrorMessage('Erro ao atualizar arquivo histórico', error));
      }

      await createActivityLog({
        action: 'historical_file.updated',
        entity_type: 'historical_file',
        entity_id: arquivo.id,
        entity_label: arquivo.titulo,
        metadata: {
          ...ownerMetadata,
          file_type: arquivo.tipo,
          has_description: Boolean(arquivo.descricao),
          has_year: Boolean(arquivo.ano),
          order: payload.ordem,
        },
      });
    } else {
      const { data, error } = await supabase
        .from('arquivos_historicos')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw new Error(getErrorMessage('Erro ao inserir arquivo histórico', error));
      }

      await createActivityLog({
        action: 'historical_file.added',
        entity_type: 'historical_file',
        entity_id: data?.id ?? null,
        entity_label: arquivo.titulo,
        metadata: {
          ...ownerMetadata,
          file_type: arquivo.tipo,
          has_description: Boolean(arquivo.descricao),
          has_year: Boolean(arquivo.ano),
          order: payload.ordem,
        },
      });
    }
  }

  const nextArquivos = await listarArquivosHistoricosPorOwner(owner);
  emitTreeDataChanged();
  return nextArquivos;
}

export async function listarArquivosHistoricosPorPessoa(pessoaId: string): Promise<ArquivoHistorico[]> {
  return listarArquivosHistoricosPorOwner({ linkedTo: 'person', pessoaId });
}

export async function substituirArquivosHistoricosDaPessoa(
  pessoaId: string,
  arquivos: ArquivoHistorico[]
): Promise<ArquivoHistorico[]> {
  return salvarArquivosHistoricosPorOwner({ linkedTo: 'person', pessoaId }, arquivos);
}

export async function listarArquivosHistoricosDoRelacionamento(relacionamentoId: string): Promise<ArquivoHistorico[]> {
  return listarArquivosHistoricosPorOwner({ linkedTo: 'relationship', relacionamentoId });
}

export async function salvarArquivosHistoricosDoRelacionamento(
  relacionamentoId: string,
  arquivos: ArquivoHistorico[]
): Promise<ArquivoHistorico[]> {
  await assertAdminRelationshipFileWrite();
  return salvarArquivosHistoricosPorOwner({ linkedTo: 'relationship', relacionamentoId }, arquivos);
}

export async function adicionarArquivoHistoricoAoRelacionamento(
  relacionamentoId: string,
  input: NovoArquivoHistoricoInput
): Promise<ArquivoHistorico> {
  await assertAdminRelationshipFileWrite();
  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(input.file.type);
  const upload = await uploadHistoricalFile(input.file, { relacionamentoId });
  const arquivosExistentes = await listarArquivosHistoricosDoRelacionamento(relacionamentoId);
  const nextArquivo: ArquivoHistorico = {
    id: `arquivo-${Date.now()}`,
    relacionamento_id: relacionamentoId,
    pessoa_id: null,
    tipo: isImage ? 'imagem' : 'pdf',
    url: upload.url,
    titulo: input.titulo,
    descricao: input.descricao ?? undefined,
    ano: input.ano ?? undefined,
    ordem: input.ordem ?? arquivosExistentes.length,
  };
  const arquivos = await salvarArquivosHistoricosPorOwner(
    { linkedTo: 'relationship', relacionamentoId },
    [...arquivosExistentes, nextArquivo]
  );

  const arquivoCriado = arquivos.find((arquivo) => arquivo.url === upload.url) ?? arquivos[arquivos.length - 1];
  if (!arquivoCriado) {
    throw new Error('Não foi possível localizar o arquivo histórico criado.');
  }

  return arquivoCriado;
}

export async function removerArquivoHistoricoDoRelacionamento(
  relacionamentoId: string,
  arquivoId: string
): Promise<ArquivoHistorico[]> {
  await assertAdminRelationshipFileWrite();
  const arquivos = await listarArquivosHistoricosDoRelacionamento(relacionamentoId);
  return salvarArquivosHistoricosPorOwner(
    { linkedTo: 'relationship', relacionamentoId },
    arquivos.filter((arquivo) => arquivo.id !== arquivoId)
  );
}
