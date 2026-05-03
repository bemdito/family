// Tipos principais do sistema de árvore genealógica

export type TipoEntidade = 'Humano' | 'Pet';

export type TipoRelacionamento = 'conjuge' | 'pai' | 'mae' | 'filho' | 'irmao';

export type SubtipoRelacionamento = 'sangue' | 'adotivo' | 'uniao' | 'casamento' | 'separado';

export type LadoPessoa = 'esquerda' | 'direita';

export type TipoVisualizacaoArvore = 'familiares-diretos' | 'lados' | 'geracoes' | 'lista';

export type GeracaoSociologica =
  | 'Geração Silenciosa'
  | 'Baby Boomer'
  | 'Geração X'
  | 'Geração Y / Millennials'
  | 'Geração Z'
  | 'Geração Alpha';

export type TipoEventoFamiliar = 'aniversario' | 'memoria' | 'encontro' | 'aviso' | 'outro';

export type TipoConteudoFavorito =
  | 'pessoa'
  | 'arquivo'
  | 'topico'
  | 'evento'
  | 'pagina'
  | 'historia';

export type TipoCanalNotificacao = 'interna' | 'email' | 'push' | 'whatsapp';

export interface ArquivoHistorico {
  id: string;
  tipo: 'imagem' | 'pdf';
  url: string;
  titulo: string;
  descricao?: string;
}

export interface Pessoa {
  id: string;
  nome_completo: string;
  data_nascimento?: number | string;
  local_nascimento?: string;
  data_falecimento?: number | string;
  local_falecimento?: string;
  local_atual?: string;
  foto_principal_url?: string;
  humano_ou_pet: TipoEntidade;
  lado?: LadoPessoa;
  cor_bg_card?: string;
  minibio?: string;
  curiosidades?: string;
  telefone?: string;
  endereco?: string;
  rede_social?: string;
  instagram_usuario?: string;
  instagram_url?: string;
  permitir_exibir_instagram?: boolean;
  permitir_mensagens_whatsapp?: boolean;
  geracao_sociologica?: GeracaoSociologica;
  manual_generation?: number | null;
  arquivos_historicos?: ArquivoHistorico[];
  created_at?: string;
  updated_at?: string;
}

export interface ImagemPessoa {
  id: string;
  pessoa_id: string;
  image_url: string;
  legenda?: string;
  ordem: number;
}

export interface Relacionamento {
  id: string;
  pessoa_origem_id: string;
  pessoa_destino_id: string;
  tipo_relacionamento: TipoRelacionamento;
  subtipo_relacionamento?: SubtipoRelacionamento;
  data_casamento?: string;
  data_separacao?: string;
  local_casamento?: string;
  local_separacao?: string;
  ativo: boolean;
  observacoes?: string;
}

export interface EventoFamiliar {
  id: string;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  local?: string;
  tipo: TipoEventoFamiliar;
  pessoa_relacionada_id?: string;
  created_by?: string;
}

export interface FavoritoUsuario {
  id: string;
  user_id: string;
  tipo_conteudo: TipoConteudoFavorito;
  conteudo_id: string;
  titulo?: string;
  created_at?: string;
}

export interface NotificacaoUsuario {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoEventoFamiliar | 'notificacao';
  canal: TipoCanalNotificacao;
  lida: boolean;
  link?: string;
  created_at?: string;
}

export interface PreferenciaNotificacao {
  id: string;
  user_id: string;
  receber_aniversarios: boolean;
  receber_datas_memoria: boolean;
  receber_eventos: boolean;
  receber_avisos_gerais: boolean;
  receber_email: boolean;
  receber_push: boolean;
  receber_whatsapp: boolean;
}

export interface VinculoUsuarioPessoa {
  id: string;
  user_id: string;
  pessoa_id: string;
  relacao_com_perfil?: string;
  principal?: boolean;
}

export interface DadosImportacao {
  'Nome completo': string;
  'Data de nascimento'?: number | string;
  'Local de Nascimento'?: string;
  'Data de falecimento'?: number | string;
  'Local de falecimento'?: string;
  'Cônjuge'?: string;
  'Pai'?: string;
  'Mãe'?: string;
  'Filho (a) de (de sangue; adotivo'?: string;
  'Humano ou pet': string;
}

export interface PessoaComRelacionamentos extends Pessoa {
  pais: Pessoa[];
  maes: Pessoa[];
  conjuges: Pessoa[];
  filhos: Pessoa[];
}

export interface FamilyTreeNode {
  id: string;
  pessoa: Pessoa;
  generation: number;
}

export interface FamilyTreeEdge {
  id: string;
  source: string;
  target: string;
  tipo: 'casamento' | 'filiacao';
  subtipo?: SubtipoRelacionamento;
}
