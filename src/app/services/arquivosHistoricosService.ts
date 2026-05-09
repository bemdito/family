import { supabase } from '../lib/supabaseClient';
import { ArquivoHistorico } from '../types';

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
  const idsMantidos = new Set(arquivos.filter((arquivo) => isUuid(arquivo.id)).map((arquivo) => arquivo.id));
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
  }

  for (const [index, arquivo] of arquivos.entries()) {
    const payload = {
      pessoa_id: pessoaId,
      tipo: arquivo.tipo,
      url: arquivo.url,
      titulo: arquivo.titulo,
      descricao: arquivo.descricao ?? null,
      ano: arquivo.ano ?? null,
      ordem: arquivo.ordem ?? index,
    };

    if (isUuid(arquivo.id)) {
      const { error } = await supabase
        .from('arquivos_historicos')
        .update(payload)
        .eq('id', arquivo.id)
        .eq('pessoa_id', pessoaId);

      if (error) {
        throw new Error(getErrorMessage('Erro ao atualizar arquivo histórico', error));
      }
    } else {
      const { error } = await supabase
        .from('arquivos_historicos')
        .insert(payload);

      if (error) {
        throw new Error(getErrorMessage('Erro ao inserir arquivo histórico', error));
      }
    }
  }

  return listarArquivosHistoricosPorPessoa(pessoaId);
}
