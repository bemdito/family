import { supabase } from '../lib/supabaseClient';
import { ArquivoHistorico } from '../types';
import { createActivityLog } from './activityLogService';
import { emitTreeDataChanged } from './treeDataCache';

type SupabaseErrorLike = {
  message?: string;
};

function getErrorMessage(context: string, error: SupabaseErrorLike) {
  return `${context}: ${error.message || 'erro desconhecido do Supabase'}`;
}

function toArquivoHistorico(row: any): ArquivoHistorico {
  return {
    id: row.id,
    pessoa_id: row.pessoa_id,
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

export async function listarArquivosHistoricosPorPessoa(pessoaId: string): Promise<ArquivoHistorico[]> {
  const { data, error } = await supabase
    .from('arquivos_historicos')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage('Erro ao carregar arquivos históricos', error));
  }

  return (data || []).map(toArquivoHistorico);
}

export async function substituirArquivosHistoricosDaPessoa(
  pessoaId: string,
  arquivos: ArquivoHistorico[]
): Promise<ArquivoHistorico[]> {
  const arquivosExistentes = await listarArquivosHistoricosPorPessoa(pessoaId);
  const arquivosExistentesPorId = new Map(arquivosExistentes.map((arquivo) => [arquivo.id, arquivo]));
  const idsMantidos = new Set(arquivos.filter((arquivo) => isUuid(arquivo.id)).map((arquivo) => arquivo.id));
  const arquivosParaRemover = arquivosExistentes.filter((arquivo) => !idsMantidos.has(arquivo.id));
  const idsParaRemover = arquivosExistentes
    .map((arquivo) => arquivo.id)
    .filter((arquivoId) => !idsMantidos.has(arquivoId));

  if (idsParaRemover.length > 0) {
    const { error } = await supabase
      .from('arquivos_historicos')
      .delete()
      .eq('pessoa_id', pessoaId)
      .in('id', idsParaRemover);

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
          pessoa_id: pessoaId,
          file_type: arquivo.tipo,
        },
      });
    }
  }

  for (const [index, arquivo] of arquivos.entries()) {
    const payload = {
      pessoa_id: pessoaId,
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

      const { error } = await supabase
        .from('arquivos_historicos')
        .update(payload)
        .eq('id', arquivo.id)
        .eq('pessoa_id', pessoaId);

      if (error) {
        throw new Error(getErrorMessage('Erro ao atualizar arquivo histórico', error));
      }

      await createActivityLog({
        action: 'historical_file.updated',
        entity_type: 'historical_file',
        entity_id: arquivo.id,
        entity_label: arquivo.titulo,
        metadata: {
          pessoa_id: pessoaId,
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
          pessoa_id: pessoaId,
          file_type: arquivo.tipo,
          has_description: Boolean(arquivo.descricao),
          has_year: Boolean(arquivo.ano),
          order: payload.ordem,
        },
      });
    }
  }

  const nextArquivos = await listarArquivosHistoricosPorPessoa(pessoaId);
  emitTreeDataChanged();
  return nextArquivos;
}
