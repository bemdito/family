import { supabase } from '../lib/supabaseClient';
import {
  Relacionamento,
  RelationshipChangeRequest,
  RelationshipChangeRequestAction,
  RelationshipChangeRequestStatus,
  SubtipoRelacionamento,
  TipoRelacionamento,
} from '../types';
import { createActivityLog } from './activityLogService';
import {
  adicionarRelacionamentoComInverso,
  atualizarRelacionamento,
  excluirRelacionamentoComInverso,
  obterTodosRelacionamentos,
} from './dataService';
import { getPrimaryLinkedPerson } from './memberProfileService';
import { isAdminUser } from './permissionService';

type RelationshipChangeRequestRow = Record<string, unknown>;

export type RelationshipChangeRequestDetails = {
  data_casamento?: string | null;
  data_separacao?: string | null;
  local_casamento?: string | null;
  local_separacao?: string | null;
  ativo?: boolean | null;
  observacoes?: string | null;
  inverseTipoForFilho?: 'pai' | 'mae';
};

export type CreateRelationshipChangeRequestInput = {
  requester_pessoa_id?: string | null;
  action: RelationshipChangeRequestAction;
  target_pessoa_id?: string | null;
  related_pessoa_id?: string | null;
  relationship_id?: string | null;
  relationship_type: TipoRelacionamento;
  relationship_subtype?: SubtipoRelacionamento | null;
  payload?: Record<string, unknown>;
  details?: RelationshipChangeRequestDetails;
  changes?: Partial<Relacionamento>;
  reason?: string;
};

export type RelationshipChangeRequestFilters = {
  status?: RelationshipChangeRequestStatus;
  action?: RelationshipChangeRequestAction;
  relationship_type?: TipoRelacionamento;
  requester_user_id?: string;
  requester_pessoa_id?: string;
  target_pessoa_id?: string;
  related_pessoa_id?: string;
  limit?: number;
};

function toRelationshipChangeRequest(row: RelationshipChangeRequestRow): RelationshipChangeRequest {
  return {
    id: String(row.id),
    requester_user_id: String(row.requester_user_id),
    requester_pessoa_id: String(row.requester_pessoa_id),
    action: row.action as RelationshipChangeRequestAction,
    status: row.status as RelationshipChangeRequestStatus,
    target_pessoa_id: row.target_pessoa_id ? String(row.target_pessoa_id) : null,
    related_pessoa_id: row.related_pessoa_id ? String(row.related_pessoa_id) : null,
    relationship_id: row.relationship_id ? String(row.relationship_id) : null,
    relationship_type: row.relationship_type as TipoRelacionamento,
    relationship_subtype: (row.relationship_subtype as SubtipoRelacionamento | null) ?? null,
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    admin_reviewed_by: row.admin_reviewed_by ? String(row.admin_reviewed_by) : null,
    admin_reviewed_at: row.admin_reviewed_at ? String(row.admin_reviewed_at) : null,
    admin_note: row.admin_note ? String(row.admin_note) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(error?.message || 'Usuário autenticado não encontrado.');
  }

  return data.user;
}

async function assertAdmin() {
  const user = await getCurrentUser();
  const { isAdmin, error } = await isAdminUser(user);

  if (error) {
    throw new Error(error);
  }

  if (!isAdmin) {
    throw new Error('Apenas administradores podem revisar solicitações de vínculo.');
  }

  return user;
}

async function resolveRequesterPessoaId(userId: string, explicitPessoaId?: string | null) {
  if (explicitPessoaId) return explicitPessoaId;

  const { data, error } = await getPrimaryLinkedPerson(userId);
  if (error) {
    throw new Error(error);
  }

  if (!data?.pessoa_id) {
    throw new Error('Não foi possível localizar a pessoa vinculada ao usuário.');
  }

  return data.pessoa_id;
}

function getSafeRequestMetadata(request: RelationshipChangeRequest) {
  return {
    request_id: request.id,
    request_action: request.action,
    request_status: request.status,
    relationship_type: request.relationship_type,
    relationship_subtype: request.relationship_subtype ?? null,
    has_payload: Object.keys(request.payload || {}).length > 0,
  };
}

function getPayloadForInsert(input: CreateRelationshipChangeRequestInput) {
  if (input.payload) return input.payload;
  if (input.action === 'create') return { details: input.details ?? {} };
  if (input.action === 'update') return { changes: input.changes ?? {} };
  return { reason: input.reason ?? null };
}

function getDetails(payload: Record<string, unknown>) {
  return ((payload.details as RelationshipChangeRequestDetails | undefined) ?? {}) as RelationshipChangeRequestDetails;
}

function getChanges(payload: Record<string, unknown>) {
  return ((payload.changes as Partial<Relacionamento> | undefined) ?? {}) as Partial<Relacionamento>;
}

function pickRelationshipChanges(changes: Partial<Relacionamento>) {
  const allowedKeys: Array<keyof Relacionamento> = [
    'subtipo_relacionamento',
    'data_casamento',
    'data_separacao',
    'local_casamento',
    'local_separacao',
    'ativo',
    'observacoes',
  ];

  return allowedKeys.reduce<Partial<Relacionamento>>((payload, key) => {
    if (changes[key] !== undefined) {
      (payload as Record<string, unknown>)[key] = changes[key];
    }
    return payload;
  }, {});
}

function findInverseRelationship(relacionamento: Relacionamento, relacionamentos: Relacionamento[]) {
  return relacionamentos.find((candidate) => {
    if (candidate.id === relacionamento.id) return false;
    if (candidate.pessoa_origem_id !== relacionamento.pessoa_destino_id) return false;
    if (candidate.pessoa_destino_id !== relacionamento.pessoa_origem_id) return false;
    if (candidate.subtipo_relacionamento !== relacionamento.subtipo_relacionamento) return false;

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

async function updateRequestStatus(
  requestId: string,
  status: Extract<RelationshipChangeRequestStatus, 'approved' | 'rejected' | 'cancelled'>,
  adminNote?: string
) {
  const user = await getCurrentUser();
  const updates: Record<string, unknown> = { status };

  if (status === 'approved' || status === 'rejected') {
    updates.admin_reviewed_by = user.id;
    updates.admin_reviewed_at = new Date().toISOString();
    updates.admin_note = adminNote ?? null;
  }

  const { data, error } = await supabase
    .from('relationship_change_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toRelationshipChangeRequest(data as RelationshipChangeRequestRow);
}

function applyFilters(query: any, filters: RelationshipChangeRequestFilters = {}) {
  let nextQuery = query;
  if (filters.status) nextQuery = nextQuery.eq('status', filters.status);
  if (filters.action) nextQuery = nextQuery.eq('action', filters.action);
  if (filters.relationship_type) nextQuery = nextQuery.eq('relationship_type', filters.relationship_type);
  if (filters.requester_user_id) nextQuery = nextQuery.eq('requester_user_id', filters.requester_user_id);
  if (filters.requester_pessoa_id) nextQuery = nextQuery.eq('requester_pessoa_id', filters.requester_pessoa_id);
  if (filters.target_pessoa_id) nextQuery = nextQuery.eq('target_pessoa_id', filters.target_pessoa_id);
  if (filters.related_pessoa_id) nextQuery = nextQuery.eq('related_pessoa_id', filters.related_pessoa_id);
  return nextQuery.limit(filters.limit ?? 100);
}

function hasSamePendingRequestCombination(
  request: RelationshipChangeRequest,
  input: CreateRelationshipChangeRequestInput
) {
  if (request.status !== 'pending') return false;
  if (request.action !== input.action) return false;
  if (request.relationship_type !== input.relationship_type) return false;
  if ((request.relationship_subtype ?? null) !== (input.relationship_subtype ?? null)) return false;

  if (input.relationship_id || request.relationship_id) {
    return (request.relationship_id ?? null) === (input.relationship_id ?? null);
  }

  const targetId = input.target_pessoa_id ?? null;
  const relatedId = input.related_pessoa_id ?? null;

  if (!targetId || !relatedId || !request.target_pessoa_id || !request.related_pessoa_id) {
    return false;
  }

  const exactMatch = request.target_pessoa_id === targetId && request.related_pessoa_id === relatedId;
  if (exactMatch) return true;

  const symmetricRelationship = input.relationship_type === 'conjuge' || input.relationship_type === 'irmao';
  return symmetricRelationship && request.target_pessoa_id === relatedId && request.related_pessoa_id === targetId;
}

export async function findPendingDuplicateRelationshipChangeRequest(input: CreateRelationshipChangeRequestInput) {
  const requests = await listOwnRelationshipChangeRequests();
  return requests.find((request) => hasSamePendingRequestCombination(request, input));
}

export async function createRelationshipChangeRequest(input: CreateRelationshipChangeRequestInput) {
  const user = await getCurrentUser();
  const requesterPessoaId = await resolveRequesterPessoaId(user.id, input.requester_pessoa_id);

  const insertPayload = {
    requester_user_id: user.id,
    requester_pessoa_id: requesterPessoaId,
    action: input.action,
    status: 'pending',
    target_pessoa_id: input.target_pessoa_id ?? null,
    related_pessoa_id: input.related_pessoa_id ?? null,
    relationship_id: input.relationship_id ?? null,
    relationship_type: input.relationship_type,
    relationship_subtype: input.relationship_subtype ?? null,
    payload: getPayloadForInsert(input),
  };

  const { data, error } = await supabase
    .from('relationship_change_requests')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const request = toRelationshipChangeRequest(data as RelationshipChangeRequestRow);
  await createActivityLog({
    action: 'relationship_change_requested',
    entity_type: 'relationship',
    entity_id: request.id,
    entity_label: request.relationship_type,
    metadata: getSafeRequestMetadata(request),
  });

  return request;
}

export async function listOwnRelationshipChangeRequests(userId?: string) {
  const currentUser = await getCurrentUser();
  const requesterUserId = userId ?? currentUser.id;

  if (requesterUserId !== currentUser.id) {
    const { isAdmin } = await isAdminUser(currentUser);
    if (!isAdmin) {
      throw new Error('Usuários comuns só podem listar as próprias solicitações.');
    }
  }

  const { data, error } = await supabase
    .from('relationship_change_requests')
    .select('*')
    .eq('requester_user_id', requesterUserId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toRelationshipChangeRequest(row as RelationshipChangeRequestRow));
}

export async function listPendingRelationshipChangeRequests(filters: RelationshipChangeRequestFilters = {}) {
  return listAllRelationshipChangeRequests({ ...filters, status: 'pending' });
}

export async function listAllRelationshipChangeRequests(filters: RelationshipChangeRequestFilters = {}) {
  await assertAdmin();

  const query = supabase
    .from('relationship_change_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const { data, error } = await applyFilters(query, filters);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: RelationshipChangeRequestRow) => toRelationshipChangeRequest(row));
}

export async function getRelationshipChangeRequestById(requestId: string) {
  const { data, error } = await supabase
    .from('relationship_change_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toRelationshipChangeRequest(data as RelationshipChangeRequestRow);
}

export async function cancelOwnRelationshipChangeRequest(requestId: string) {
  const request = await updateRequestStatus(requestId, 'cancelled');

  await createActivityLog({
    action: 'relationship_change_cancelled',
    entity_type: 'relationship',
    entity_id: request.id,
    entity_label: request.relationship_type,
    metadata: getSafeRequestMetadata(request),
  });

  return request;
}

export async function approveRelationshipChangeRequest(requestId: string, adminNote?: string) {
  await assertAdmin();
  const request = await getRelationshipChangeRequestById(requestId);

  if (request.status !== 'pending') {
    throw new Error('Apenas solicitações pendentes podem ser aprovadas.');
  }

  if (request.action === 'create') {
    if (!request.target_pessoa_id || !request.related_pessoa_id) {
      throw new Error('Solicitação de criação sem pessoas de origem/destino.');
    }

    const details = getDetails(request.payload);
    const created = await adicionarRelacionamentoComInverso({
      pessoa_origem_id: request.target_pessoa_id,
      pessoa_destino_id: request.related_pessoa_id,
      tipo_relacionamento: request.relationship_type,
      subtipo_relacionamento: request.relationship_subtype,
      data_casamento: details.data_casamento ?? undefined,
      data_separacao: details.data_separacao ?? undefined,
      local_casamento: details.local_casamento ?? undefined,
      local_separacao: details.local_separacao ?? undefined,
      ativo: details.ativo ?? true,
      observacoes: details.observacoes ?? undefined,
    }, { inverseTipoForFilho: details.inverseTipoForFilho });

    if (!created) {
      throw new Error('Não foi possível criar o relacionamento solicitado.');
    }
  }

  if (request.action === 'update') {
    if (!request.relationship_id) {
      throw new Error('Solicitação de atualização sem relacionamento alvo.');
    }

    const relacionamentos = await obterTodosRelacionamentos();
    const current = relacionamentos.find((rel) => rel.id === request.relationship_id);
    const changes = pickRelationshipChanges(getChanges(request.payload));
    const updated = await atualizarRelacionamento(request.relationship_id, changes);

    if (!updated) {
      throw new Error('Não foi possível atualizar o relacionamento solicitado.');
    }

    if (current) {
      const inverse = findInverseRelationship(current, relacionamentos);
      if (inverse) {
        await atualizarRelacionamento(inverse.id, changes);
      }
    }
  }

  if (request.action === 'delete') {
    if (!request.relationship_id) {
      throw new Error('Solicitação de remoção sem relacionamento alvo.');
    }

    const removed = await excluirRelacionamentoComInverso(request.relationship_id);
    if (!removed) {
      throw new Error('Não foi possível remover o relacionamento solicitado.');
    }
  }

  const approved = await updateRequestStatus(requestId, 'approved', adminNote);
  await createActivityLog({
    action: 'relationship_change_approved',
    entity_type: 'relationship',
    entity_id: approved.id,
    entity_label: approved.relationship_type,
    metadata: getSafeRequestMetadata(approved),
  });

  return approved;
}

export async function rejectRelationshipChangeRequest(requestId: string, adminNote?: string) {
  await assertAdmin();
  const request = await getRelationshipChangeRequestById(requestId);

  if (request.status !== 'pending') {
    throw new Error('Apenas solicitações pendentes podem ser rejeitadas.');
  }

  const rejected = await updateRequestStatus(requestId, 'rejected', adminNote);
  await createActivityLog({
    action: 'relationship_change_rejected',
    entity_type: 'relationship',
    entity_id: rejected.id,
    entity_label: rejected.relationship_type,
    metadata: getSafeRequestMetadata(rejected),
  });

  return rejected;
}
