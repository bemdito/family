import { Pessoa, Relacionamento, ArquivoHistorico } from '../types';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-055bf375`;

// Timeout para requisições
const FETCH_TIMEOUT = 120000;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
  'Connection': 'keep-alive',
  'Accept': 'application/json',
});

async function fetchWithTimeout(url: string, options: RequestInit = {}, retries = 2) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // noop
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt === retries) {
        console.error(`❌ Todas as tentativas falharam para ${url}:`, error);
      }

      if (
        attempt < retries &&
        error instanceof Error &&
        (
          error.name === 'AbortError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('connection')
        )
      ) {
        const waitTime = 500 * Math.pow(2, attempt);
        console.log(`⏳ Aguardando ${waitTime}ms antes da tentativa ${attempt + 2}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Falha após múltiplas tentativas');
}

// =====================================================
// PESSOAS - CRUD
// =====================================================

export async function obterTodasPessoas(): Promise<Pessoa[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas`, {
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao obter pessoas:', result.error);
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('Erro na requisição obterTodasPessoas:', error);
    return [];
  }
}

export async function obterPessoaPorId(id: string): Promise<Pessoa | undefined> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas/${id}`, {
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao obter pessoa:', result.error);
      return undefined;
    }

    return result.data;
  } catch (error) {
    console.error('Erro na requisição obterPessoaPorId:', error);
    return undefined;
  }
}

export async function adicionarPessoa(pessoa: Omit<Pessoa, 'id'>): Promise<Pessoa | undefined> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(pessoa),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao adicionar pessoa:', result.error);
      return undefined;
    }

    return result.data;
  } catch (error) {
    console.error('Erro na requisição adicionarPessoa:', error);
    return undefined;
  }
}

export async function atualizarPessoa(id: string, pessoa: Partial<Pessoa>): Promise<Pessoa | undefined> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(pessoa),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao atualizar pessoa:', result.error);
      return undefined;
    }

    return result.data;
  } catch (error) {
    console.error('Erro na requisição atualizarPessoa:', error);
    return undefined;
  }
}

export async function deletarPessoa(id: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao deletar pessoa:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro na requisição deletarPessoa:', error);
    return false;
  }
}

export const excluirPessoa = deletarPessoa;

// =====================================================
// RELACIONAMENTOS - CRUD
// =====================================================

export async function obterTodosRelacionamentos(): Promise<Relacionamento[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/relacionamentos`, {
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao obter relacionamentos:', result.error);
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('Erro na requisição obterTodosRelacionamentos:', error);
    return [];
  }
}

export async function obterRelacionamentosDaPessoa(pessoaId: string) {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/pessoas/${pessoaId}/relacionamentos`, {
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao obter relacionamentos da pessoa:', result.error);
      return { pais: [], maes: [], conjuges: [], filhos: [], irmaos: [] };
    }

    const relacionamentos = result.data || [];
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
  try {
    const response = await fetchWithTimeout(`${API_BASE}/relacionamentos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(relacionamento),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao adicionar relacionamento:', result.error);
      return undefined;
    }

    return result.data;
  } catch (error) {
    console.error('Erro na requisição adicionarRelacionamento:', error);
    return undefined;
  }
}

export async function atualizarRelacionamento(id: string, relacionamento: Partial<Relacionamento>): Promise<Relacionamento | undefined> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/relacionamentos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(relacionamento),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao atualizar relacionamento:', result.error);
      return undefined;
    }

    return result.data;
  } catch (error) {
    console.error('Erro na requisição atualizarRelacionamento:', error);
    return undefined;
  }
}

export async function deletarRelacionamento(id: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/relacionamentos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro ao deletar relacionamento:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro na requisição deletarRelacionamento:', error);
    return false;
  }
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
    const response = await fetchWithTimeout(`${API_BASE}/migrar-dados`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ seed }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Erro na migração:', result.error);
      return { success: false, message: result.error };
    }

    return { success: true, message: result.message, stats: result.stats };
  } catch (error: any) {
    console.error('Erro na requisição de migração:', error);
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