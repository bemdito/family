// Tipos principais do sistema de árvore genealógica

export type TipoEntidade = 'Humano' | 'Pet';

export type TipoRelacionamento = 'conjuge' | 'pai' | 'mae' | 'filho' | 'irmao';

export type SubtipoRelacionamento = 'sangue' | 'adotivo' | 'uniao' | 'casamento' | 'separado';

export type LadoPessoa = 'esquerda' | 'direita';

export type LinhaParentesco =
  | 'ascendente'
  | 'descendente'
  | 'colateral'
  | 'conjugal'
  | 'auto';

export type LadoParentesco =
  | 'paterno'
  | 'materno'
  | 'ambos'
  | 'indefinido';

export type GeracaoSociologica =
  | 'Geração Silenciosa'
  | 'Baby Boomer'
  | 'Geração X'
  | 'Geração Y / Millennials'
  | 'Geração Z'
  | 'Geração Alpha';

export type TipoEventoFamiliar =
  | 'aniversario'
  | 'casamento'
  | 'falecimento'
  | 'evento_historico'
  | 'confraternizacao'
  | 'memoria'
  | 'encontro'
  | 'aviso'
  | 'outro';

export type TipoNotificacaoUsuario =
  | TipoEventoFamiliar
  | 'notificacao'
  | 'novo_usuario'
  | 'datas_especiais'
  | 'novas_mensagens_forum'
  | 'novos_registros_historicos'
  | 'evento_historico_familia';

export type TipoConteudoFavorito =
  | 'pessoa'
  | 'arquivo'
  | 'topico'
  | 'evento'
  | 'pagina'
  | 'historia';

export type TipoCanalNotificacao = 'interna' | 'email' | 'push' | 'whatsapp';

export type ActivityLogAction =
  | 'person.created'
  | 'person.updated'
  | 'person.photo_updated'
  | 'person.privacy_updated'
  | 'relationship_change_requested'
  | 'relationship_change_approved'
  | 'relationship_change_rejected'
  | 'relationship_change_cancelled'
  | 'relationship.created'
  | 'relationship.updated'
  | 'relationship.deleted'
  | 'historical_file.added'
  | 'historical_file.removed'
  | 'historical_file.updated'
  | 'notification_preferences.updated'
  | 'first_access.confirmed';

export type ActivityLogEntityType =
  | 'person'
  | 'relationship'
  | 'historical_file'
  | 'notification_preferences'
  | 'first_access';

export type RelationshipChangeRequestAction = 'create' | 'update' | 'delete';

export type RelationshipChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ForumTopicoTipo = 'pergunta' | 'discussao' | 'aviso' | 'memoria' | 'ajuda';

export type ForumTopicoStatus = 'aberto' | 'resolvido' | 'fechado' | 'oculto';

export type ForumConteudoStatus = 'publicado' | 'oculto';

export type ForumReacaoTipo = 'curtir' | 'apoiar' | 'lembrar' | 'celebrar';

export type ForumAlvoTipo = 'topico' | 'resposta' | 'comentario';

export interface ArquivoHistorico {
  id: string;
  pessoa_id?: string | null;
  relacionamento_id?: string | null;
  tipo: 'imagem' | 'pdf';
  url: string;
  titulo: string;
  descricao?: string;
  ano?: string;
  ordem?: number;
}

export interface Pessoa {
  id: string;
  nome_completo: string;
  data_nascimento?: number | string;
  local_nascimento?: string;
  local_nascimento_exterior?: boolean;
  data_falecimento?: number | string;
  local_falecimento?: string;
  local_falecimento_exterior?: boolean;
  falecido?: boolean;
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
  permitir_exibir_data_nascimento?: boolean;
  permitir_exibir_endereco?: boolean;
  permitir_exibir_rede_social?: boolean;
  permitir_exibir_telefone?: boolean;
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
  subtipo_relacionamento?: SubtipoRelacionamento | null;
  data_casamento?: string | null;
  data_separacao?: string | null;
  local_casamento?: string | null;
  local_separacao?: string | null;
  ativo: boolean;
  observacoes?: string | null;
}

export type RelationshipChangeRequestPayload = Record<string, unknown>;

export interface RelationshipChangeRequest {
  id: string;
  requester_user_id: string;
  requester_pessoa_id: string;
  action: RelationshipChangeRequestAction;
  status: RelationshipChangeRequestStatus;
  target_pessoa_id?: string | null;
  related_pessoa_id?: string | null;
  relationship_id?: string | null;
  relationship_type: TipoRelacionamento;
  relationship_subtype?: SubtipoRelacionamento | null;
  payload: RelationshipChangeRequestPayload;
  admin_reviewed_by?: string | null;
  admin_reviewed_at?: string | null;
  admin_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegraParentesco {
  id: string;
  codigo: string;
  nome: string;
  nome_feminino?: string | null;
  nome_masculino?: string | null;
  nome_plural?: string | null;
  caminho: string[];
  descricao_template: string;
  descricao_curta_template?: string | null;
  grau?: number | null;
  linha?: LinhaParentesco | null;
  lado?: LadoParentesco | null;
  ativo?: boolean;
  created_at?: string;
}

export interface ResultadoParentesco {
  pessoaOrigemId: string;
  pessoaDestinoId: string;
  encontrado: boolean;
  codigo?: string;
  nome?: string;
  descricao?: string;
  descricaoCurta?: string;
  caminhoPessoas: Array<{
    id: string;
    nome: string;
  }>;
  caminhoRelacoes: string[];
  distancia: number;
  descricaoContextual?: string;
  relacoesIntermediarias?: Array<{
    pessoaId: string;
    pessoaNome: string;
    parentescoComOrigem?: string;
    parentescoComDestino?: string;
    frase?: string;
  }>;
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
  tipo: TipoNotificacaoUsuario;
  canal: TipoCanalNotificacao;
  lida: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
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
  receber_email_novo_usuario: boolean;
  receber_email_datas_especiais: boolean;
  receber_email_novas_mensagens_forum: boolean;
  receber_email_novos_registros_historicos: boolean;
  receber_email_evento_historico_familia: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  actor_user_id?: string | null;
  actor_pessoa_id?: string | null;
  actor_display_name?: string | null;
  action: ActivityLogAction;
  entity_type: ActivityLogEntityType;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface CreateActivityLogPayload {
  actor_user_id?: string | null;
  actor_pessoa_id?: string | null;
  actor_display_name?: string | null;
  action: ActivityLogAction;
  entity_type: ActivityLogEntityType;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogFilters {
  actor_user_id?: string;
  actor_pessoa_id?: string;
  actor_query?: string;
  action?: ActivityLogAction;
  entity_type?: ActivityLogEntityType;
  entity_id?: string;
  entity_query?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
}

export interface VinculoUsuarioPessoa {
  id: string;
  user_id: string;
  pessoa_id: string;
  relacao_com_perfil?: string;
  principal?: boolean;
}

export interface ForumCategoria {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  icone?: string | null;
  cor_token?: string | null;
  ordem?: number | null;
  ativa?: boolean | null;
  created_at?: string;
  updated_at?: string;
  total_topicos?: number;
}

export interface ForumTopico {
  id: string;
  categoria_id?: string | null;
  autor_id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  tipo: ForumTopicoTipo;
  status: ForumTopicoStatus;
  fixado?: boolean | null;
  destacado?: boolean | null;
  visualizacoes?: number | null;
  pessoa_relacionada_id?: string | null;
  created_at?: string;
  updated_at?: string;
  categoria?: ForumCategoria | null;
  pessoa_relacionada?: Pessoa | null;
  respostas_count?: number;
  reacoes_count?: number;
}

export interface ForumResposta {
  id: string;
  topico_id: string;
  autor_id: string;
  conteudo: string;
  aceita_como_solucao?: boolean | null;
  status: ForumConteudoStatus;
  created_at?: string;
  updated_at?: string;
  comentarios_count?: number;
  reacoes_count?: number;
}

export interface ForumComentario {
  id: string;
  resposta_id: string;
  autor_id: string;
  conteudo: string;
  status: ForumConteudoStatus;
  created_at?: string;
  updated_at?: string;
  reacoes_count?: number;
}

export interface ForumReacao {
  id: string;
  user_id: string;
  alvo_tipo: ForumAlvoTipo;
  alvo_id: string;
  tipo: ForumReacaoTipo;
  created_at?: string;
}

export interface ForumDenuncia {
  id: string;
  denunciante_id: string;
  alvo_tipo: ForumAlvoTipo;
  alvo_id: string;
  motivo: string;
  detalhes?: string | null;
  status: 'pendente' | 'analisada' | 'descartada' | 'removida';
  created_at?: string;
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
