import { Pessoa, Relacionamento, ArquivoHistorico } from '../types';
import { supabase } from '../lib/supabaseClient';

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
  'data_falecimento',
  'local_falecimento',
  'local_atual',
  'foto_principal_url',
  'humano_ou_pet',
  'lado',
  'cor_bg_card',
  'minibio',
  'curiosidades',
  'telefone',
  'endereco',
  'rede_social',
  'instagram_usuario',
  'instagram_url',
  'permitir_exibir_instagram',
  'permitir_mensagens_whatsapp',
  'geracao_sociologica',
  'manual_generation',
] as const;

const RELACIONAMENTO_COLUMNS = [
  'pessoa_origem_id',
  'pessoa_destino_id',
  'tipo_relacionamento',
  'subtipo_relacionamento',
] as const;

function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error(`[Supabase] ${context}: ${error.message || 'Erro desconhecido'}`, {
    code: error.code,
    status: error.status,
    details: error.details,
    hint: error.hint,
  });
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

  return data ? toPessoa(data) : undefined;
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
    const pessoas = await obterTodasPessoas();
    const pessoasMap = new Map(pessoas.map(p => [p.id, p]));

    const paisSet = new Set<string>();
    const maesSet = new Set<string>();
    const conjugesSet = new Set<string>();
    const filhosSet = new Set<string>();
    const irmaosSet = new Set<string>();

    for (const rel of relacionamentos) {
      // Relações criadas A PARTIR da pessoa atual
      if (rel.pessoa_origem_id === pessoaId) {
        const destino = pessoasMap.get(rel.pessoa_destino_id);
        if (!destino) continue;

        if (rel.tipo_relacionamento === 'pai') paisSet.add(destino.id);
        if (rel.tipo_relacionamento === 'mae') maesSet.add(destino.id);
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

  return data ? toRelacionamento(data) : undefined;
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

  return data ? toRelacionamento(data) : undefined;
}

export async function deletarRelacionamento(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('relacionamentos')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`Erro ao deletar relacionamento ${id}`, error);
    return false;
  }

  return true;
}

export const excluirRelacionamento = deletarRelacionamento;

// =====================================================
// BUSCA
// =====================================================

export async function buscarPessoas(termo: string): Promise<Pessoa[]> {
  try {
    const pessoas = await obterTodasPessoas();
    const termoLower = termo.toLowerCase();

    return pessoas.filter(p =>
      p.nome_completo.toLowerCase().includes(termoLower) ||
      p.local_nascimento?.toLowerCase().includes(termoLower) ||
      p.local_atual?.toLowerCase().includes(termoLower)
    );
  } catch (error) {
    console.error('Erro na busca de pessoas:', error);
    return [];
  }
}

// =====================================================
// MIGRAÇÃO DE DADOS
// =====================================================

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
          data_falecimento: registro['Data de falecimento']?.toString() || registro.data_falecimento?.toString() || '',
          local_falecimento: registro['Local de Falecimento'] || registro.local_falecimento || '',
          humano_ou_pet: registro['Humano ou pet'] || registro.humano_ou_pet || 'Humano',
          lado: registro.lado || 'esquerda',
          manual_generation: normalizeManualGeneration(registro.manual_generation),
          local_atual: registro.local_atual || '',
          foto_principal_url: registro.foto_principal_url || '',
          cor_bg_card: registro.cor_bg_card || '',
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
            await adicionarRelacionamento({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: paiId,
              tipo_relacionamento: 'pai',
              subtipo_relacionamento: tipoFiliacao,
            });

            await adicionarRelacionamento({
              pessoa_origem_id: paiId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'filho',
              subtipo_relacionamento: tipoFiliacao,
            });
          }
        }

        if (mae) {
          const maeId = nomeParaId.get(mae);
          if (maeId) {
            await adicionarRelacionamento({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: maeId,
              tipo_relacionamento: 'mae',
              subtipo_relacionamento: tipoFiliacao,
            });

            await adicionarRelacionamento({
              pessoa_origem_id: maeId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'filho',
              subtipo_relacionamento: tipoFiliacao,
            });
          }
        }

        if (conjuge) {
          const conjugeId = nomeParaId.get(conjuge);
          if (conjugeId) {
            await adicionarRelacionamento({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: conjugeId,
              tipo_relacionamento: 'conjuge',
              subtipo_relacionamento: 'casamento',
            });

            await adicionarRelacionamento({
              pessoa_origem_id: conjugeId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'conjuge',
              subtipo_relacionamento: 'casamento',
            });
          }
        }
      } catch (error: any) {
        erros.push(`Erro ao criar relacionamento: ${error.message}`);
      }
    }

    return {
      pessoas,
      relacionamentos,
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
