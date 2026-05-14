import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileWarning,
  GitPullRequest,
  History,
  Link2,
  RefreshCcw,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { supabase } from '../../lib/supabaseClient';
import { ACTIVITY_ACTION_LABELS, ACTIVITY_ENTITY_LABELS, listActivityLogs } from '../../services/activityLogService';
import { obterTodasPessoas, obterTodosRelacionamentos } from '../../services/dataService';
import { listAllRelationshipChangeRequests } from '../../services/relationshipChangeRequestService';
import {
  ActivityLog,
  ActivityLogAction,
  ActivityLogEntityType,
  ArquivoHistorico,
  Pessoa,
  Relacionamento,
  RelationshipChangeRequest,
  TipoRelacionamento,
} from '../../types';

type Severity = 'critical' | 'warning' | 'info';

type IntegrityIssue = {
  id: string;
  severity: Severity;
  title: string;
  description?: string;
  link?: string;
  linkLabel?: string;
};

type UserPersonLinkRow = {
  id: string;
  user_id: string;
  pessoa_id: string;
  principal?: boolean | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  nome_exibicao?: string | null;
  role?: string | null;
};

type IntegrityData = {
  pessoas: Pessoa[];
  relacionamentos: Relacionamento[];
  arquivos: ArquivoHistorico[];
  activityLogs: ActivityLog[];
  relationshipRequests: RelationshipChangeRequest[];
  relationshipRequestsAvailable: boolean;
  userPersonLinks: UserPersonLinkRow[];
  profiles: ProfileRow[];
  userLinksAvailable: boolean;
};

type DiagnosticSection = {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  issues: IntegrityIssue[];
  info?: string;
};

const VALID_PERSON_TYPES = new Set(['Humano', 'Pet']);
const VALID_RELATIONSHIP_TYPES = new Set<TipoRelacionamento>(['conjuge', 'pai', 'mae', 'filho', 'irmao']);
const SENSITIVE_METADATA_PATTERN = /(https?:\/\/|data:|base64|[\w.+-]+@[\w-]+\.[\w.-]+|\(?\d{2}\)?\s?\d{4,5}-?\d{4}|endereco|address|telefone|phone|email)/i;

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '';
}

function hasDataUrl(value: unknown) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('data:');
}

function getPersonName(pessoasById: Map<string, Pessoa>, pessoaId?: string | null) {
  if (!pessoaId) return 'Pessoa não informada';
  return pessoasById.get(pessoaId)?.nome_completo || pessoaId;
}

function getRelLabel(rel: Relacionamento, pessoasById: Map<string, Pessoa>) {
  return `${getPersonName(pessoasById, rel.pessoa_origem_id)} -> ${getPersonName(pessoasById, rel.pessoa_destino_id)} (${rel.tipo_relacionamento || 'tipo ausente'})`;
}

function getPairKey(idA?: string | null, idB?: string | null) {
  return [idA || '', idB || ''].sort().join('__');
}

function getExpectedInverse(rel: Relacionamento): TipoRelacionamento | null {
  if (rel.tipo_relacionamento === 'conjuge' || rel.tipo_relacionamento === 'irmao') return rel.tipo_relacionamento;
  if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') return 'filho';
  if (rel.tipo_relacionamento === 'filho') return null;
  return null;
}

function hasInverse(rel: Relacionamento, relacionamentos: Relacionamento[]) {
  const expectedType = getExpectedInverse(rel);
  if (!expectedType) return true;

  return relacionamentos.some((candidate) => (
    candidate.id !== rel.id &&
    candidate.pessoa_origem_id === rel.pessoa_destino_id &&
    candidate.pessoa_destino_id === rel.pessoa_origem_id &&
    candidate.tipo_relacionamento === expectedType
  ));
}

function classifyUrl(url?: string | null): 'missing' | 'legacy' | 'storage' | 'suspicious' {
  const value = String(url ?? '').trim();
  if (!value) return 'missing';
  if (value.toLowerCase().startsWith('data:')) return 'legacy';
  if (/^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/(person-avatars|historical-files)\//i.test(value)) {
    return 'storage';
  }
  return 'suspicious';
}

function formatDate(value?: string) {
  if (!value) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function countSeverity(issues: IntegrityIssue[], severity: Severity) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function buildPersonIssues(pessoas: Pessoa[]) {
  const issues: IntegrityIssue[] = [];

  pessoas.forEach((pessoa) => {
    const editLink = `/admin/pessoas/${pessoa.id}/editar`;
    const missingFields = [
      isBlank(pessoa.nome_completo) ? 'nome' : '',
      isBlank(pessoa.data_nascimento) ? 'data de nascimento' : '',
      isBlank(pessoa.local_nascimento) ? 'local de nascimento' : '',
      isBlank(pessoa.humano_ou_pet) ? 'tipo humano/pet' : '',
    ].filter(Boolean);

    if (isBlank(pessoa.manual_generation)) {
      issues.push({
        id: `person-generation-${pessoa.id}`,
        severity: 'warning',
        title: `${pessoa.nome_completo || pessoa.id} sem geração manual`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }

    if (isBlank(pessoa.data_nascimento)) {
      issues.push({
        id: `person-birth-${pessoa.id}`,
        severity: 'warning',
        title: `${pessoa.nome_completo || pessoa.id} sem data de nascimento`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }

    if (isBlank(pessoa.local_nascimento)) {
      issues.push({
        id: `person-birth-place-${pessoa.id}`,
        severity: 'info',
        title: `${pessoa.nome_completo || pessoa.id} sem local de nascimento`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }

    const photoStatus = classifyUrl(String(pessoa.foto_principal_url ?? ''));
    if (photoStatus === 'missing') {
      issues.push({
        id: `person-photo-missing-${pessoa.id}`,
        severity: 'info',
        title: `${pessoa.nome_completo || pessoa.id} sem foto principal`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }
    if (photoStatus === 'legacy') {
      issues.push({
        id: `person-photo-legacy-${pessoa.id}`,
        severity: 'info',
        title: `${pessoa.nome_completo || pessoa.id} com foto em data URL/base64 legado`,
        description: 'Legado compatível; considerar migração futura para Storage.',
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }
    if (typeof pessoa.foto_principal_url === 'string' && pessoa.foto_principal_url.length > 0 && pessoa.foto_principal_url.trim() === '') {
      issues.push({
        id: `person-photo-blank-${pessoa.id}`,
        severity: 'warning',
        title: `${pessoa.nome_completo || pessoa.id} com foto em branco`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }

    if (!VALID_PERSON_TYPES.has(String(pessoa.humano_ou_pet ?? ''))) {
      issues.push({
        id: `person-type-${pessoa.id}`,
        severity: 'critical',
        title: `${pessoa.nome_completo || pessoa.id} com humano_ou_pet inválido`,
        description: `Valor atual: ${String(pessoa.humano_ou_pet ?? 'ausente')}`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }

    if (missingFields.length > 0) {
      issues.push({
        id: `person-essential-${pessoa.id}`,
        severity: 'warning',
        title: `${pessoa.nome_completo || pessoa.id} com dados essenciais incompletos`,
        description: `Campos: ${missingFields.join(', ')}`,
        link: editLink,
        linkLabel: 'Editar pessoa',
      });
    }
  });

  return issues;
}

function buildRelationshipIssues(pessoas: Pessoa[], relacionamentos: Relacionamento[]) {
  const issues: IntegrityIssue[] = [];
  const pessoasById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const conjugalPairs = new Map<string, Relacionamento[]>();
  const parentLinksByChild = new Map<string, Relacionamento[]>();

  relacionamentos.forEach((rel) => {
    const label = getRelLabel(rel, pessoasById);

    if (!VALID_RELATIONSHIP_TYPES.has(rel.tipo_relacionamento as TipoRelacionamento)) {
      issues.push({
        id: `rel-type-${rel.id}`,
        severity: 'critical',
        title: `Relacionamento com tipo inválido ou ausente`,
        description: label,
        link: '/admin/relacionamentos',
        linkLabel: 'Gerenciar relacionamentos',
      });
    }

    if (!pessoasById.has(rel.pessoa_origem_id) || !pessoasById.has(rel.pessoa_destino_id)) {
      issues.push({
        id: `rel-missing-person-${rel.id}`,
        severity: 'critical',
        title: 'Relacionamento aponta para pessoa inexistente',
        description: label,
        link: '/admin/relacionamentos',
        linkLabel: 'Gerenciar relacionamentos',
      });
    }

    if (!hasInverse(rel, relacionamentos)) {
      issues.push({
        id: `rel-inverse-${rel.id}`,
        severity: 'warning',
        title: 'Relacionamento sem inverso esperado',
        description: label,
        link: '/admin/relacionamentos',
        linkLabel: 'Gerenciar relacionamentos',
      });
    }

    if (rel.tipo_relacionamento === 'conjuge') {
      const pairKey = getPairKey(rel.pessoa_origem_id, rel.pessoa_destino_id);
      conjugalPairs.set(pairKey, [...(conjugalPairs.get(pairKey) ?? []), rel]);

      if (isBlank(rel.subtipo_relacionamento) && isBlank(rel.data_casamento) && isBlank(rel.data_separacao)) {
        issues.push({
          id: `rel-conjugal-status-${rel.id}`,
          severity: 'info',
          title: 'Relacionamento conjugal sem status claro',
          description: label,
          link: '/admin/relacionamentos',
          linkLabel: 'Gerenciar relacionamentos',
        });
      }

      if (rel.subtipo_relacionamento === 'separado' && isBlank(rel.data_separacao)) {
        issues.push({
          id: `rel-separated-no-date-${rel.id}`,
          severity: 'warning',
          title: 'Relacionamento separado sem data de separação',
          description: label,
          link: '/admin/relacionamentos',
          linkLabel: 'Gerenciar relacionamentos',
        });
      }

      if (!isBlank(rel.data_separacao) && rel.ativo === true) {
        issues.push({
          id: `rel-separation-active-${rel.id}`,
          severity: 'warning',
          title: 'Relacionamento com data de separação ainda ativo',
          description: label,
          link: '/admin/relacionamentos',
          linkLabel: 'Gerenciar relacionamentos',
        });
      }
    }

    if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') {
      parentLinksByChild.set(rel.pessoa_origem_id, [...(parentLinksByChild.get(rel.pessoa_origem_id) ?? []), rel]);
    }
    if (rel.tipo_relacionamento === 'filho') {
      parentLinksByChild.set(rel.pessoa_destino_id, [...(parentLinksByChild.get(rel.pessoa_destino_id) ?? []), rel]);
    }
  });

  conjugalPairs.forEach((rels, pairKey) => {
    if (rels.length > 2) {
      issues.push({
        id: `rel-conjugal-duplicate-${pairKey}`,
        severity: 'warning',
        title: 'Relacionamento conjugal duplicado',
        description: `${rels.length} registros para o mesmo par.`,
        link: '/admin/relacionamentos',
        linkLabel: 'Gerenciar relacionamentos',
      });
    }
  });

  parentLinksByChild.forEach((rels, childId) => {
    const uniqueParents = new Set(rels.map((rel) => (
      rel.tipo_relacionamento === 'filho' ? rel.pessoa_origem_id : rel.pessoa_destino_id
    )));
    if (uniqueParents.size > 2) {
      issues.push({
        id: `rel-too-many-parents-${childId}`,
        severity: 'warning',
        title: `${getPersonName(pessoasById, childId)} com mais de dois vínculos parentais`,
        description: `${uniqueParents.size} pessoas parentais inferidas.`,
        link: '/admin/relacionamentos',
        linkLabel: 'Gerenciar relacionamentos',
      });
    }
  });

  return issues;
}

function buildFileIssues(arquivos: ArquivoHistorico[], pessoas: Pessoa[], relacionamentos: Relacionamento[]) {
  const issues: IntegrityIssue[] = [];
  const pessoasById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const relacionamentosById = new Set(relacionamentos.map((rel) => rel.id));

  arquivos.forEach((arquivo) => {
    const urlStatus = classifyUrl(arquivo.url);
    const label = arquivo.titulo || arquivo.id;

    if (urlStatus === 'missing') {
      issues.push({
        id: `file-url-missing-${arquivo.id}`,
        severity: 'critical',
        title: `Arquivo sem URL: ${label}`,
      });
    }
    if (urlStatus === 'legacy') {
      issues.push({
        id: `file-url-legacy-${arquivo.id}`,
        severity: 'info',
        title: `Arquivo legado em data URL/base64: ${label}`,
        description: 'Compatível para leitura; considerar migração futura para Storage.',
      });
    }
    if (urlStatus === 'suspicious') {
      issues.push({
        id: `file-url-suspicious-${arquivo.id}`,
        severity: 'warning',
        title: `Arquivo com URL suspeita: ${label}`,
      });
    }

    if (!arquivo.pessoa_id && !arquivo.relacionamento_id) {
      issues.push({
        id: `file-no-owner-${arquivo.id}`,
        severity: 'critical',
        title: `Arquivo sem pessoa_id e sem relacionamento_id: ${label}`,
      });
    }

    if (arquivo.pessoa_id && !pessoasById.has(arquivo.pessoa_id)) {
      issues.push({
        id: `file-missing-person-${arquivo.id}`,
        severity: 'critical',
        title: `Arquivo aponta para pessoa inexistente: ${label}`,
        description: arquivo.pessoa_id,
      });
    }

    if (arquivo.relacionamento_id && !relacionamentosById.has(arquivo.relacionamento_id)) {
      issues.push({
        id: `file-missing-rel-${arquivo.id}`,
        severity: 'critical',
        title: `Arquivo aponta para relacionamento inexistente: ${label}`,
        description: arquivo.relacionamento_id,
      });
    }

    if (arquivo.pessoa_id && arquivo.relacionamento_id) {
      issues.push({
        id: `file-ambiguous-owner-${arquivo.id}`,
        severity: 'warning',
        title: `Arquivo com pessoa_id e relacionamento_id preenchidos: ${label}`,
      });
    }

    if (isBlank(arquivo.titulo)) {
      issues.push({
        id: `file-title-${arquivo.id}`,
        severity: 'warning',
        title: `Arquivo sem título: ${arquivo.id}`,
      });
    }
  });

  return issues;
}

function buildUserLinkIssues(pessoas: Pessoa[], links: UserPersonLinkRow[], profiles: ProfileRow[], available: boolean) {
  const issues: IntegrityIssue[] = [];
  const pessoasById = new Set(pessoas.map((pessoa) => pessoa.id));
  const linkedPessoaIds = new Set(links.map((link) => link.pessoa_id));
  const profilesById = new Set(profiles.map((profile) => profile.id));
  const principalByUser = new Map<string, UserPersonLinkRow[]>();

  if (!available) {
    return [{
      id: 'user-links-unavailable',
      severity: 'info',
      title: 'Diagnóstico de vínculos de usuário indisponível',
      description: 'A consulta a user_person_links/profiles não retornou dados pela política atual.',
    }];
  }

  links.forEach((link) => {
    if (!pessoasById.has(link.pessoa_id)) {
      issues.push({
        id: `upl-missing-person-${link.id}`,
        severity: 'critical',
        title: 'user_person_link aponta para pessoa inexistente',
        description: link.pessoa_id,
      });
    }

    if (profiles.length > 0 && !profilesById.has(link.user_id)) {
      issues.push({
        id: `upl-missing-profile-${link.id}`,
        severity: 'warning',
        title: 'user_person_link sem profile correspondente',
        description: 'Não valida auth.users no frontend; checagem feita contra public.profiles.',
      });
    }

    if (link.principal !== false) {
      principalByUser.set(link.user_id, [...(principalByUser.get(link.user_id) ?? []), link]);
    }
  });

  pessoas.forEach((pessoa) => {
    if (!linkedPessoaIds.has(pessoa.id)) {
      issues.push({
        id: `person-no-user-${pessoa.id}`,
        severity: 'info',
        title: `${pessoa.nome_completo || pessoa.id} sem usuário vinculado`,
        link: `/admin/pessoas/${pessoa.id}/editar`,
        linkLabel: 'Editar pessoa',
      });
    }
  });

  principalByUser.forEach((principalLinks, userId) => {
    if (principalLinks.length > 1) {
      issues.push({
        id: `user-multiple-principal-${userId}`,
        severity: 'warning',
        title: 'Usuário com mais de uma pessoa principal',
        description: `${principalLinks.length} vínculos principais. Usuário: ${userId}`,
      });
    }
  });

  return issues;
}

function buildActivityIssues(activityLogs: ActivityLog[]) {
  const issues: IntegrityIssue[] = [];
  const knownActions = new Set(Object.keys(ACTIVITY_ACTION_LABELS));
  const knownEntityTypes = new Set(Object.keys(ACTIVITY_ENTITY_LABELS));

  activityLogs.forEach((log) => {
    if (!log.actor_user_id) {
      issues.push({
        id: `log-actor-${log.id}`,
        severity: 'warning',
        title: 'Activity log sem actor_user_id',
        description: `${log.action} em ${formatDate(log.created_at)}`,
        link: '/admin/atividades',
        linkLabel: 'Ver atividades',
      });
    }

    if (!log.entity_id) {
      issues.push({
        id: `log-entity-${log.id}`,
        severity: 'warning',
        title: 'Activity log sem entity_id',
        description: `${log.action} em ${formatDate(log.created_at)}`,
        link: '/admin/atividades',
        linkLabel: 'Ver atividades',
      });
    }

    if (!knownActions.has(log.action)) {
      issues.push({
        id: `log-action-${log.id}`,
        severity: 'warning',
        title: 'Activity log com action desconhecida',
        description: log.action,
        link: '/admin/atividades',
        linkLabel: 'Ver atividades',
      });
    }

    if (!log.entity_type || !knownEntityTypes.has(log.entity_type)) {
      issues.push({
        id: `log-entity-type-${log.id}`,
        severity: 'warning',
        title: 'Activity log com entity_type ausente ou desconhecido',
        description: String(log.entity_type || 'ausente'),
        link: '/admin/atividades',
        linkLabel: 'Ver atividades',
      });
    }

    const metadataText = JSON.stringify(log.metadata ?? {});
    if (SENSITIVE_METADATA_PATTERN.test(metadataText)) {
      issues.push({
        id: `log-sensitive-${log.id}`,
        severity: 'critical',
        title: 'Activity log com metadata potencialmente sensível',
        description: `${log.action} em ${formatDate(log.created_at)}`,
        link: '/admin/atividades',
        linkLabel: 'Ver atividades',
      });
    }
  });

  return issues;
}

function buildRequestIssues(requests: RelationshipChangeRequest[], pessoas: Pessoa[], available: boolean) {
  if (!available) {
    return [{
      id: 'requests-unavailable',
      severity: 'info' as Severity,
      title: 'Solicitações de vínculos indisponíveis',
      description: 'A tabela/service relationship_change_requests não retornou dados.',
      link: '/admin/solicitacoes-vinculos',
      linkLabel: 'Ver solicitações',
    }];
  }

  const issues: IntegrityIssue[] = [];
  const pessoasById = new Set(pessoas.map((pessoa) => pessoa.id));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  requests.forEach((request) => {
    if (request.status === 'pending' && request.created_at && new Date(request.created_at).getTime() < sevenDaysAgo) {
      issues.push({
        id: `request-old-${request.id}`,
        severity: 'warning',
        title: 'Solicitação pendente há mais de 7 dias',
        description: `${request.action} ${request.relationship_type}`,
        link: '/admin/solicitacoes-vinculos',
        linkLabel: 'Ver solicitações',
      });
    }

    ([
      ['requester_pessoa_id', request.requester_pessoa_id],
      ['target_pessoa_id', request.target_pessoa_id],
      ['related_pessoa_id', request.related_pessoa_id],
    ] as const).forEach(([field, pessoaId]) => {
      if (pessoaId && !pessoasById.has(pessoaId)) {
        issues.push({
          id: `request-missing-${field}-${request.id}`,
          severity: 'critical',
          title: `Solicitação com ${field} inexistente`,
          description: pessoaId,
          link: '/admin/solicitacoes-vinculos',
          linkLabel: 'Ver solicitações',
        });
      }
    });

    if (request.status === 'approved' && !request.admin_reviewed_by) {
      issues.push({
        id: `request-approved-admin-${request.id}`,
        severity: 'warning',
        title: 'Solicitação aprovada sem admin_reviewed_by',
        link: '/admin/solicitacoes-vinculos',
        linkLabel: 'Ver solicitações',
      });
    }

    if ((request.status === 'approved' || request.status === 'rejected') && !request.admin_reviewed_at) {
      issues.push({
        id: `request-reviewed-at-${request.id}`,
        severity: 'warning',
        title: 'Solicitação aprovada/rejeitada sem admin_reviewed_at',
        link: '/admin/solicitacoes-vinculos',
        linkLabel: 'Ver solicitações',
      });
    }
  });

  return issues;
}

function getActionVolumes(logs: ActivityLog[]) {
  const counts = new Map<string, number>();
  logs.forEach((log) => counts.set(log.action, (counts.get(log.action) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function getRequestStatusCounts(requests: RelationshipChangeRequest[]) {
  return {
    pending: requests.filter((request) => request.status === 'pending').length,
    approved: requests.filter((request) => request.status === 'approved').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
    cancelled: requests.filter((request) => request.status === 'cancelled').length,
  };
}

async function loadIntegrityData(): Promise<IntegrityData> {
  const [pessoas, relacionamentos, activityLogs, arquivosResult, linksResult, profilesResult] = await Promise.all([
    obterTodasPessoas(),
    obterTodosRelacionamentos(),
    listActivityLogs({ limit: 500 }),
    supabase.from('arquivos_historicos').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('user_person_links').select('*').limit(1000),
    supabase.from('profiles').select('id,nome_exibicao,role').limit(1000),
  ]);

  let relationshipRequests: RelationshipChangeRequest[] = [];
  let relationshipRequestsAvailable = true;
  try {
    relationshipRequests = await listAllRelationshipChangeRequests({ limit: 1000 });
  } catch (error) {
    relationshipRequestsAvailable = false;
    console.error('[AdminIntegridade] relationship_change_requests indisponível:', error);
  }

  return {
    pessoas,
    relacionamentos,
    activityLogs,
    arquivos: ((arquivosResult.data || []) as ArquivoHistorico[]),
    relationshipRequests,
    relationshipRequestsAvailable,
    userPersonLinks: ((linksResult.data || []) as UserPersonLinkRow[]),
    profiles: ((profilesResult.data || []) as ProfileRow[]),
    userLinksAvailable: !linksResult.error,
  };
}

export function AdminIntegridade() {
  const navigate = useNavigate();
  const [data, setData] = useState<IntegrityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextData = await loadIntegrityData();
      setData(nextData);
    } catch (loadError) {
      console.error('[AdminIntegridade] Erro ao carregar diagnóstico:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar diagnóstico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const diagnostics = useMemo<DiagnosticSection[]>(() => {
    if (!data) return [];

    return [
      {
        key: 'pessoas',
        title: 'Pessoas',
        description: `${data.pessoas.length} pessoa(s) analisada(s).`,
        icon: Users,
        issues: buildPersonIssues(data.pessoas),
      },
      {
        key: 'relacionamentos',
        title: 'Relacionamentos',
        description: `${data.relacionamentos.length} relacionamento(s) analisado(s).`,
        icon: Link2,
        issues: buildRelationshipIssues(data.pessoas, data.relacionamentos),
      },
      {
        key: 'arquivos',
        title: 'Arquivos históricos',
        description: `${data.arquivos.length} arquivo(s) analisado(s).`,
        icon: FileWarning,
        issues: buildFileIssues(data.arquivos, data.pessoas, data.relacionamentos),
        info: 'Validação de Storage é sintática; não verifica existência física dos objetos.',
      },
      {
        key: 'usuarios',
        title: 'Usuários/vínculos',
        description: `${data.userPersonLinks.length} vínculo(s) e ${data.profiles.length} profile(s) analisado(s).`,
        icon: Users,
        issues: buildUserLinkIssues(data.pessoas, data.userPersonLinks, data.profiles, data.userLinksAvailable),
        info: 'auth.users não é consultado pelo frontend; quando possível, a checagem usa public.profiles.',
      },
      {
        key: 'activity',
        title: 'Histórico de atividades',
        description: `${data.activityLogs.length} log(s) recente(s) analisado(s).`,
        icon: History,
        issues: buildActivityIssues(data.activityLogs),
      },
      {
        key: 'requests',
        title: 'Solicitações de vínculos',
        description: data.relationshipRequestsAvailable
          ? `${data.relationshipRequests.length} solicitação(ões) analisada(s).`
          : 'Não disponível.',
        icon: GitPullRequest,
        issues: buildRequestIssues(data.relationshipRequests, data.pessoas, data.relationshipRequestsAvailable),
      },
    ];
  }, [data]);

  const totalIssues = diagnostics.reduce((sum, section) => sum + section.issues.length, 0);
  const requestCounts = data ? getRequestStatusCounts(data.relationshipRequests) : null;
  const actionVolumes = data ? getActionVolumes(data.activityLogs).slice(0, 8) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Integridade dos dados</h1>
              <p className="text-sm text-gray-500">Diagnóstico somente leitura da árvore, vínculos, arquivos e auditoria.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Painel
            </Button>
            <Button onClick={loadData} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar diagnóstico
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label="Problemas totais" value={totalIssues} tone={totalIssues > 0 ? 'warning' : 'ok'} />
          <SummaryCard label="Críticos" value={diagnostics.reduce((sum, section) => sum + countSeverity(section.issues, 'critical'), 0)} tone="critical" />
          <SummaryCard label="Atenção" value={diagnostics.reduce((sum, section) => sum + countSeverity(section.issues, 'warning'), 0)} tone="warning" />
          <SummaryCard label="Informativos" value={diagnostics.reduce((sum, section) => sum + countSeverity(section.issues, 'info'), 0)} tone="info" />
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-500">Carregando diagnóstico...</CardContent>
          </Card>
        ) : diagnostics.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-500">Nenhum dado disponível para diagnóstico.</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {diagnostics.map((section) => (
                <DiagnosticSummary key={section.key} section={section} />
              ))}
            </div>

            {data && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Volume de logs por ação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {actionVolumes.length === 0 ? (
                      <p className="text-sm text-gray-500">Sem logs recentes.</p>
                    ) : (
                      <div className="space-y-2">
                        {actionVolumes.map(([action, count]) => (
                          <div key={action} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                            <span className="text-gray-700">{ACTIVITY_ACTION_LABELS[action as ActivityLogAction] ?? action}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Solicitações por status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {requestCounts ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <StatusPill label="Pendentes" value={requestCounts.pending} />
                        <StatusPill label="Aprovadas" value={requestCounts.approved} />
                        <StatusPill label="Rejeitadas" value={requestCounts.rejected} />
                        <StatusPill label="Canceladas" value={requestCounts.cancelled} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Solicitações não disponíveis.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-6">
              {diagnostics.map((section) => (
                <DiagnosticDetails key={section.key} section={section} onNavigate={navigate} />
              ))}
            </div>

            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Últimos logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.activityLogs.slice(0, 10).length === 0 ? (
                    <p className="text-sm text-gray-500">Sem logs recentes.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {data.activityLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="grid gap-2 py-3 text-sm md:grid-cols-[160px_220px_1fr]">
                          <span className="text-gray-500">{formatDate(log.created_at)}</span>
                          <span className="font-medium text-gray-900">{ACTIVITY_ACTION_LABELS[log.action] ?? log.action}</span>
                          <span className="text-gray-600">{log.entity_label || log.entity_id || 'Sem entidade'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'critical' | 'warning' | 'info' }) {
  const classes = {
    ok: 'bg-emerald-50 text-emerald-700',
    critical: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-2 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${classes[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DiagnosticSummary({ section }: { section: DiagnosticSection }) {
  const Icon = section.icon;
  const critical = countSeverity(section.issues, 'critical');
  const warning = countSeverity(section.issues, 'warning');
  const info = countSeverity(section.issues, 'info');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-gray-500" />
          {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-500">{section.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="critical">Crítico: {critical}</Badge>
          <Badge tone="warning">Atenção: {warning}</Badge>
          <Badge tone="info">Info: {info}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function DiagnosticDetails({
  section,
  onNavigate,
}: {
  section: DiagnosticSection;
  onNavigate: (path: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{section.title}</span>
          <span className="text-sm font-normal text-gray-500">{section.issues.length} item(ns)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {section.info && <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{section.info}</p>}
        {section.issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Nenhum problema encontrado nesta área.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {section.issues.slice(0, 50).map((issue) => (
              <div key={issue.id} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[110px_1fr_auto] lg:items-center">
                <Badge tone={issue.severity}>{issue.severity === 'critical' ? 'Crítico' : issue.severity === 'warning' ? 'Atenção' : 'Info'}</Badge>
                <div>
                  <p className="font-medium text-gray-900">{issue.title}</p>
                  {issue.description && <p className="mt-1 text-gray-500">{issue.description}</p>}
                </div>
                {issue.link && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(issue.link!)}>
                    {issue.linkLabel || 'Abrir'}
                  </Button>
                )}
              </div>
            ))}
            {section.issues.length > 50 && (
              <p className="px-4 py-3 text-sm text-gray-500">Mostrando 50 de {section.issues.length} itens.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Badge({ tone, children }: { tone: Severity; children: React.ReactNode }) {
  const classes = {
    critical: 'bg-red-50 text-red-700 ring-red-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
  };

  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${classes[tone]}`}>
      {tone === 'critical' && <AlertTriangle className="h-3 w-3" />}
      {children}
    </span>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
