import { supabase } from '../lib/supabaseClient';
import { PersonEvent, PersonEventType } from '../types';
import { createActivityLog } from './activityLogService';
import { emitTreeDataChanged } from './treeDataCache';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseErrorLike = {
  message?: string;
};

function getErrorMessage(context: string, error: SupabaseErrorLike) {
  return `${context}: ${error.message || 'erro desconhecido do Supabase'}`;
}

function isUuid(value?: string | null) {
  return Boolean(value && UUID_RE.test(value));
}

function normalizeOptional(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return String(value).trim();
}

function toPersonEvent(row: Record<string, unknown>): PersonEvent {
  return {
    id: String(row.id),
    pessoa_id: String(row.pessoa_id),
    tipo: (row.tipo || 'outro') as PersonEventType,
    titulo: String(row.titulo || ''),
    data_evento: row.data_evento ? String(row.data_evento) : null,
    local: row.local ? String(row.local) : null,
    descricao: row.descricao ? String(row.descricao) : null,
    ordem: Number(row.ordem ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function hasEventChanged(current: PersonEvent, next: PersonEvent, nextOrder: number) {
  return (
    current.tipo !== next.tipo ||
    current.titulo !== next.titulo ||
    normalizeOptional(current.data_evento) !== normalizeOptional(next.data_evento) ||
    normalizeOptional(current.local) !== normalizeOptional(next.local) ||
    normalizeOptional(current.descricao) !== normalizeOptional(next.descricao) ||
    (current.ordem ?? 0) !== nextOrder
  );
}

function getPayload(pessoaId: string, evento: PersonEvent, ordem: number) {
  return {
    pessoa_id: pessoaId,
    tipo: evento.tipo || 'outro',
    titulo: evento.titulo.trim(),
    data_evento: normalizeOptional(evento.data_evento),
    local: normalizeOptional(evento.local),
    descricao: normalizeOptional(evento.descricao),
    ordem,
  };
}

export async function listarEventosDaPessoa(pessoaId: string): Promise<PersonEvent[]> {
  const { data, error } = await supabase
    .from('person_events')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage('Erro ao carregar eventos da pessoa', error));
  }

  return (data || []).map(toPersonEvent);
}

export async function salvarEventosDaPessoa(pessoaId: string, eventos: PersonEvent[]): Promise<PersonEvent[]> {
  const eventosValidos = eventos
    .map((evento, index) => ({
      ...evento,
      titulo: evento.titulo.trim(),
      ordem: index,
    }))
    .filter((evento) => evento.titulo);

  const eventosExistentes = await listarEventosDaPessoa(pessoaId);
  const eventosExistentesPorId = new Map(eventosExistentes.map((evento) => [evento.id, evento]));
  const idsMantidos = new Set(eventosValidos.filter((evento) => isUuid(evento.id)).map((evento) => evento.id));
  const eventosParaRemover = eventosExistentes.filter((evento) => !idsMantidos.has(evento.id));

  if (eventosParaRemover.length > 0) {
    const { error } = await supabase
      .from('person_events')
      .delete()
      .eq('pessoa_id', pessoaId)
      .in('id', eventosParaRemover.map((evento) => evento.id));

    if (error) {
      throw new Error(getErrorMessage('Erro ao remover eventos da pessoa', error));
    }

    for (const evento of eventosParaRemover) {
      await createActivityLog({
        action: 'person_event.removed',
        entity_type: 'person_event',
        entity_id: evento.id,
        entity_label: evento.titulo,
        metadata: {
          pessoa_id: pessoaId,
          event_type: evento.tipo,
        },
      });
    }
  }

  for (const [index, evento] of eventosValidos.entries()) {
    const payload = getPayload(pessoaId, evento, index);

    if (isUuid(evento.id)) {
      const eventoExistente = eventosExistentesPorId.get(evento.id);
      if (eventoExistente && !hasEventChanged(eventoExistente, evento, index)) {
        continue;
      }

      const { error } = await supabase
        .from('person_events')
        .update(payload)
        .eq('pessoa_id', pessoaId)
        .eq('id', evento.id);

      if (error) {
        throw new Error(getErrorMessage('Erro ao atualizar evento da pessoa', error));
      }

      await createActivityLog({
        action: 'person_event.updated',
        entity_type: 'person_event',
        entity_id: evento.id,
        entity_label: evento.titulo,
        metadata: {
          pessoa_id: pessoaId,
          event_type: evento.tipo,
          has_date: Boolean(payload.data_evento),
          has_location: Boolean(payload.local),
          order: index,
        },
      });
    } else {
      const { data, error } = await supabase
        .from('person_events')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw new Error(getErrorMessage('Erro ao inserir evento da pessoa', error));
      }

      await createActivityLog({
        action: 'person_event.added',
        entity_type: 'person_event',
        entity_id: data?.id ?? null,
        entity_label: evento.titulo,
        metadata: {
          pessoa_id: pessoaId,
          event_type: evento.tipo,
          has_date: Boolean(payload.data_evento),
          has_location: Boolean(payload.local),
          order: index,
        },
      });
    }
  }

  const nextEventos = await listarEventosDaPessoa(pessoaId);
  emitTreeDataChanged();
  return nextEventos;
}

export async function adicionarEventoDaPessoa(
  pessoaId: string,
  evento: Omit<PersonEvent, 'id' | 'pessoa_id'>
): Promise<PersonEvent> {
  const eventos = await listarEventosDaPessoa(pessoaId);
  const eventosAtualizados = await salvarEventosDaPessoa(pessoaId, [
    ...eventos,
    {
      ...evento,
      id: `person-event-${Date.now()}`,
      pessoa_id: pessoaId,
      ordem: eventos.length,
    },
  ]);

  const criado = eventosAtualizados.find((item) => item.titulo === evento.titulo && item.ordem === eventos.length);
  if (!criado) {
    throw new Error('Não foi possível localizar o evento criado.');
  }

  return criado;
}

export async function removerEventoDaPessoa(pessoaId: string, eventoId: string): Promise<PersonEvent[]> {
  const eventos = await listarEventosDaPessoa(pessoaId);
  return salvarEventosDaPessoa(
    pessoaId,
    eventos.filter((evento) => evento.id !== eventoId)
  );
}
