import type { ArquivoHistorico, EventoFamiliar, PersonEvent, Pessoa, Relacionamento } from '../types';

export type PersonTimelineItemType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'union'
  | 'separation'
  | 'child_birth'
  | 'historical_file'
  | 'person_event'
  | 'family_event'
  | 'memory'
  | 'other';

export type PersonTimelinePrecision = 'day' | 'month' | 'year' | 'unknown';

export type PersonTimelineSource =
  | 'person'
  | 'relationship'
  | 'historical_file'
  | 'person_event'
  | 'family_event';

export interface PersonTimelineItem {
  id: string;
  type: PersonTimelineItemType;
  title: string;
  description?: string;
  dateLabel?: string;
  dateValue?: string;
  year?: number;
  month?: number;
  day?: number;
  precision: PersonTimelinePrecision;
  source: PersonTimelineSource;
  sourceId?: string;
  relatedPersonIds?: string[];
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface BuildPersonTimelineInput {
  pessoa: Pessoa;
  relacionamentos?: Relacionamento[];
  pessoas?: Pessoa[];
  filhos?: Pessoa[];
  arquivosHistoricosPessoa?: ArquivoHistorico[];
  arquivosHistoricosRelacionamentos?: ArquivoHistorico[];
  eventosPessoais?: PersonEvent[];
  eventosFamiliares?: EventoFamiliar[];
}

export interface ParsedTimelineDate {
  dateValue?: string;
  dateLabel?: string;
  year?: number;
  month?: number;
  day?: number;
  precision: PersonTimelinePrecision;
  sortValue: number;
}

const UNKNOWN_DATE: ParsedTimelineDate = {
  precision: 'unknown',
  sortValue: Number.POSITIVE_INFINITY,
};

const TIMELINE_TYPE_PRIORITY: Record<PersonTimelineItemType, number> = {
  birth: 0,
  child_birth: 1,
  union: 2,
  marriage: 3,
  separation: 4,
  person_event: 5,
  family_event: 6,
  historical_file: 7,
  memory: 8,
  death: 9,
  other: 10,
};

const SENSITIVE_METADATA_KEYS = new Set([
  'url',
  'file_url',
  'arquivo_url',
  'storage_url',
  'public_url',
  'signed_url',
  'base64',
  'data_url',
  'telefone',
  'phone',
  'email',
  'endereco',
  'address',
  'token',
  'secret',
  'key',
]);

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 1 && year <= 9999;
}

function isValidMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidDay(year: number, month: number, day: number) {
  if (!Number.isInteger(day) || day < 1) return false;
  const lastDay = new Date(year, month, 0).getDate();
  return day <= lastDay;
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function buildSortValue(year?: number, month?: number, day?: number) {
  if (!year) return Number.POSITIVE_INFINITY;
  return year * 10000 + (month ?? 0) * 100 + (day ?? 0);
}

export function parseTimelineDate(value: unknown): ParsedTimelineDate {
  if (value === undefined || value === null) return UNKNOWN_DATE;

  if (typeof value === 'number') {
    if (!isValidYear(value)) return UNKNOWN_DATE;
    return {
      dateValue: String(value),
      dateLabel: String(value),
      year: value,
      precision: 'year',
      sortValue: buildSortValue(value),
    };
  }

  const text = String(value).trim();
  if (!text) return UNKNOWN_DATE;

  const yearMatch = text.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    if (!isValidYear(year)) return UNKNOWN_DATE;
    return {
      dateValue: String(year),
      dateLabel: String(year),
      year,
      precision: 'year',
      sortValue: buildSortValue(year),
    };
  }

  const monthMatch = text.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (!isValidYear(year) || !isValidMonth(month)) return UNKNOWN_DATE;
    return {
      dateValue: `${year}-${padNumber(month)}`,
      dateLabel: `${padNumber(month)}/${year}`,
      year,
      month,
      precision: 'month',
      sortValue: buildSortValue(year, month),
    };
  }

  const brMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    if (!isValidYear(year) || !isValidMonth(month) || !isValidDay(year, month, day)) return UNKNOWN_DATE;
    return {
      dateValue: `${year}-${padNumber(month)}-${padNumber(day)}`,
      dateLabel: `${padNumber(day)}/${padNumber(month)}/${year}`,
      year,
      month,
      day,
      precision: 'day',
      sortValue: buildSortValue(year, month, day),
    };
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidYear(year) || !isValidMonth(month) || !isValidDay(year, month, day)) return UNKNOWN_DATE;
    return {
      dateValue: `${year}-${padNumber(month)}-${padNumber(day)}`,
      dateLabel: `${padNumber(day)}/${padNumber(month)}/${year}`,
      year,
      month,
      day,
      precision: 'day',
      sortValue: buildSortValue(year, month, day),
    };
  }

  return UNKNOWN_DATE;
}

export function getPersonDisplayName(pessoa?: Pessoa) {
  return pessoa?.nome_completo?.trim() || 'Pessoa sem nome';
}

export function createTimelineDescription(parts: Array<string | null | undefined>) {
  const cleanParts = parts.map((part) => part?.trim()).filter(Boolean);
  return cleanParts.length > 0 ? cleanParts.join(' · ') : undefined;
}

function isSensitiveMetadataValue(value: unknown) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^(https?:\/\/|data:)/i.test(trimmed);
}

function isSerializableMetadataValue(value: unknown) {
  if (value === null) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) {
    return value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item));
  }
  return false;
}

export function sanitizeTimelineMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_METADATA_KEYS.has(normalizedKey)) continue;
    if (!isSerializableMetadataValue(value)) continue;
    if (isSensitiveMetadataValue(value)) continue;
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function getOtherPersonFromRelationship(
  relacionamento: Relacionamento,
  pessoaId: string,
  pessoas: Pessoa[] = []
) {
  const otherId =
    relacionamento.pessoa_origem_id === pessoaId
      ? relacionamento.pessoa_destino_id
      : relacionamento.pessoa_destino_id === pessoaId
        ? relacionamento.pessoa_origem_id
        : undefined;

  return otherId ? pessoas.find((pessoa) => pessoa.id === otherId) : undefined;
}

export function getRelationshipPairKey(relacionamento: Relacionamento) {
  return [relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id].sort().join(':');
}

function getRelationshipPairIds(relacionamento: Relacionamento) {
  return [relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id].sort();
}

function buildTimelineItemId(item: PersonTimelineItem) {
  const dateKey = item.dateValue ?? 'unknown';
  const relatedIds = [...(item.relatedPersonIds ?? [])].sort();

  if (item.type === 'birth' && item.sourceId) return `person:${item.sourceId}:birth`;
  if (item.type === 'death' && item.sourceId) return `person:${item.sourceId}:death`;
  if ((item.type === 'marriage' || item.type === 'union') && relatedIds.length >= 2) {
    return `relationship:${relatedIds[0]}:${relatedIds[1]}:${item.type}:${dateKey}`;
  }
  if (item.type === 'separation' && relatedIds.length >= 2) {
    return `relationship-separation:${relatedIds[0]}:${relatedIds[1]}:${dateKey}`;
  }
  if (item.type === 'historical_file' && item.sourceId) return `historical-file:${item.sourceId}`;
  if ((item.type === 'person_event' || item.type === 'memory') && item.sourceId) {
    return `person-event:${item.sourceId}`;
  }
  if (item.type === 'family_event' && item.sourceId) return `family-event:${item.sourceId}`;

  return item.id;
}

export function dedupeTimelineItems(items: PersonTimelineItem[]) {
  const seen = new Set<string>();
  const deduped: PersonTimelineItem[] = [];

  for (const item of items) {
    const key = buildTimelineItemId(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function getTimelineItemSortValue(item: PersonTimelineItem) {
  if (item.precision === 'unknown') return Number.POSITIVE_INFINITY;
  return buildSortValue(item.year, item.month, item.day);
}

export function sortTimelineItems(items: PersonTimelineItem[]) {
  return [...items].sort((a, b) => {
    const dateDiff = getTimelineItemSortValue(a) - getTimelineItemSortValue(b);
    if (dateDiff !== 0) return dateDiff;

    const priorityDiff = TIMELINE_TYPE_PRIORITY[a.type] - TIMELINE_TYPE_PRIORITY[b.type];
    if (priorityDiff !== 0) return priorityDiff;

    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

function withParsedDate(
  item: Omit<PersonTimelineItem, 'precision' | 'dateValue' | 'dateLabel' | 'year' | 'month' | 'day'>,
  parsedDate: ParsedTimelineDate,
  fallbackDateLabel?: string
): PersonTimelineItem {
  return {
    ...item,
    dateValue: parsedDate.dateValue,
    dateLabel: parsedDate.dateLabel ?? fallbackDateLabel,
    year: parsedDate.year,
    month: parsedDate.month,
    day: parsedDate.day,
    precision: parsedDate.precision,
    metadata: sanitizeTimelineMetadata(item.metadata),
  };
}

function isRelationshipForPerson(relacionamento: Relacionamento, pessoaId: string) {
  return relacionamento.pessoa_origem_id === pessoaId || relacionamento.pessoa_destino_id === pessoaId;
}

function getRelationshipOtherPersonId(relacionamento: Relacionamento, pessoaId: string) {
  if (relacionamento.pessoa_origem_id === pessoaId) return relacionamento.pessoa_destino_id;
  if (relacionamento.pessoa_destino_id === pessoaId) return relacionamento.pessoa_origem_id;
  return undefined;
}

function getChildrenFromRelationships(relacionamentos: Relacionamento[], pessoaId: string, pessoas: Pessoa[] = []) {
  const childIds = new Set<string>();

  for (const rel of relacionamentos) {
    if (rel.tipo_relacionamento === 'filho' && rel.pessoa_origem_id === pessoaId) {
      childIds.add(rel.pessoa_destino_id);
    }

    if (
      (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') &&
      rel.pessoa_destino_id === pessoaId
    ) {
      childIds.add(rel.pessoa_origem_id);
    }
  }

  return pessoas.filter((pessoa) => childIds.has(pessoa.id));
}

function createBirthItem(pessoa: Pessoa) {
  const parsedDate = parseTimelineDate(pessoa.data_nascimento);
  if (parsedDate.precision === 'unknown') return undefined;

  return withParsedDate(
    {
      id: `person:${pessoa.id}:birth`,
      type: 'birth',
      title: 'Nascimento',
      description: createTimelineDescription([pessoa.local_nascimento]),
      source: 'person',
      sourceId: pessoa.id,
      relatedPersonIds: [pessoa.id],
      metadata: {
        pessoa_id: pessoa.id,
        local: pessoa.local_nascimento,
        precision: parsedDate.precision,
      },
    },
    parsedDate
  );
}

function createDeathItem(pessoa: Pessoa) {
  const parsedDate = parseTimelineDate(pessoa.data_falecimento);

  if (parsedDate.precision !== 'unknown') {
    return withParsedDate(
      {
        id: `person:${pessoa.id}:death`,
        type: 'death',
        title: 'Falecimento',
        description: createTimelineDescription([pessoa.local_falecimento]),
        source: 'person',
        sourceId: pessoa.id,
        relatedPersonIds: [pessoa.id],
        metadata: {
          pessoa_id: pessoa.id,
          local: pessoa.local_falecimento,
          precision: parsedDate.precision,
        },
      },
      parsedDate
    );
  }

  if (!pessoa.falecido) return undefined;

  return withParsedDate(
    {
      id: `person:${pessoa.id}:death`,
      type: 'death',
      title: 'Falecimento informado',
      description: createTimelineDescription([pessoa.local_falecimento]),
      source: 'person',
      sourceId: pessoa.id,
      relatedPersonIds: [pessoa.id],
      metadata: {
        pessoa_id: pessoa.id,
        local: pessoa.local_falecimento,
        precision: 'unknown',
      },
    },
    parsedDate,
    'Data desconhecida'
  );
}

function createRelationshipItems(relacionamento: Relacionamento, pessoa: Pessoa, pessoas: Pessoa[]) {
  if (relacionamento.tipo_relacionamento !== 'conjuge' || !isRelationshipForPerson(relacionamento, pessoa.id)) {
    return [];
  }

  const otherPerson = getOtherPersonFromRelationship(relacionamento, pessoa.id, pessoas);
  const otherPersonId = getRelationshipOtherPersonId(relacionamento, pessoa.id);
  const otherName = getPersonDisplayName(otherPerson);
  const pairIds = getRelationshipPairIds(relacionamento);
  const items: PersonTimelineItem[] = [];
  const relationshipType: PersonTimelineItemType =
    relacionamento.subtipo_relacionamento === 'uniao' ? 'union' : 'marriage';
  const relationshipDate = parseTimelineDate(relacionamento.data_casamento);

  items.push(
    withParsedDate(
      {
        id: `relationship:${pairIds[0]}:${pairIds[1]}:${relationshipType}:${relationshipDate.dateValue ?? 'unknown'}`,
        type: relationshipType,
        title: `${relationshipType === 'union' ? 'União' : 'Casamento'} com ${otherName}`,
        description: createTimelineDescription([relacionamento.local_casamento]),
        source: 'relationship',
        sourceId: relacionamento.id,
        relatedPersonIds: otherPersonId ? [pessoa.id, otherPersonId] : [pessoa.id],
        metadata: {
          relationship_id: relacionamento.id,
          linked_to: 'relationship',
          local: relacionamento.local_casamento,
          precision: relationshipDate.precision,
        },
      },
      relationshipDate
    )
  );

  const shouldCreateSeparation =
    Boolean(relacionamento.data_separacao) ||
    relacionamento.ativo === false ||
    relacionamento.subtipo_relacionamento === 'separado';

  if (shouldCreateSeparation) {
    const separationDate = parseTimelineDate(relacionamento.data_separacao);
    items.push(
      withParsedDate(
        {
          id: `relationship-separation:${pairIds[0]}:${pairIds[1]}:${separationDate.dateValue ?? 'unknown'}`,
          type: 'separation',
          title: `Separação de ${otherName}`,
          description: createTimelineDescription([relacionamento.local_separacao]),
          source: 'relationship',
          sourceId: relacionamento.id,
          relatedPersonIds: otherPersonId ? [pessoa.id, otherPersonId] : [pessoa.id],
          metadata: {
            relationship_id: relacionamento.id,
            linked_to: 'relationship',
            local: relacionamento.local_separacao,
            precision: separationDate.precision,
          },
        },
        separationDate,
        separationDate.precision === 'unknown' ? 'Data desconhecida' : undefined
      )
    );
  }

  return items;
}

function createChildBirthItem(child: Pessoa, pessoaId: string) {
  const parsedDate = parseTimelineDate(child.data_nascimento);
  if (parsedDate.precision === 'unknown') return undefined;

  return withParsedDate(
    {
      id: `person:${child.id}:child-birth`,
      type: 'child_birth',
      title: `Nascimento de ${getPersonDisplayName(child)}`,
      description: createTimelineDescription([child.local_nascimento]),
      source: 'person',
      sourceId: child.id,
      relatedPersonIds: [pessoaId, child.id],
      metadata: {
        pessoa_id: child.id,
        local: child.local_nascimento,
        precision: parsedDate.precision,
      },
    },
    parsedDate
  );
}

function createHistoricalFileItem(arquivo: ArquivoHistorico, linkedTo: 'person' | 'relationship') {
  const parsedDate = parseTimelineDate(arquivo.ano);

  return withParsedDate(
    {
      id: `historical-file:${arquivo.id}`,
      type: 'historical_file',
      title: arquivo.titulo?.trim() || 'Arquivo histórico',
      description: createTimelineDescription([arquivo.descricao]),
      source: 'historical_file',
      sourceId: arquivo.id,
      relatedPersonIds: arquivo.pessoa_id ? [arquivo.pessoa_id] : undefined,
      metadata: {
        file_type: arquivo.tipo,
        ano: arquivo.ano,
        linked_to: linkedTo,
        relationship_id: arquivo.relacionamento_id,
        pessoa_id: arquivo.pessoa_id,
        precision: parsedDate.precision,
      },
    },
    parsedDate
  );
}

function createPersonEventItem(evento: PersonEvent) {
  const parsedDate = parseTimelineDate(evento.data_evento);
  const type: PersonTimelineItemType = evento.tipo === 'memoria' ? 'memory' : 'person_event';

  return withParsedDate(
    {
      id: `person-event:${evento.id}`,
      type,
      title: evento.titulo?.trim() || 'Evento pessoal',
      description: createTimelineDescription([evento.descricao, evento.local]),
      source: 'person_event',
      sourceId: evento.id,
      relatedPersonIds: [evento.pessoa_id],
      metadata: {
        event_type: evento.tipo,
        local: evento.local,
        pessoa_id: evento.pessoa_id,
        precision: parsedDate.precision,
      },
    },
    parsedDate
  );
}

function createFamilyEventItem(evento: EventoFamiliar) {
  const parsedDate = parseTimelineDate(evento.data_inicio);

  return withParsedDate(
    {
      id: `family-event:${evento.id}`,
      type: 'family_event',
      title: evento.titulo?.trim() || 'Evento familiar',
      description: createTimelineDescription([evento.descricao, evento.local]),
      source: 'family_event',
      sourceId: evento.id,
      relatedPersonIds: evento.pessoa_relacionada_id ? [evento.pessoa_relacionada_id] : undefined,
      metadata: {
        event_type: evento.tipo,
        local: evento.local,
        pessoa_id: evento.pessoa_relacionada_id,
        precision: parsedDate.precision,
      },
    },
    parsedDate
  );
}

export function buildPersonTimeline(input: BuildPersonTimelineInput): PersonTimelineItem[] {
  const {
    pessoa,
    relacionamentos = [],
    pessoas = [],
    arquivosHistoricosPessoa = [],
    arquivosHistoricosRelacionamentos = [],
    eventosPessoais = [],
    eventosFamiliares = [],
  } = input;
  const items: PersonTimelineItem[] = [];
  const birthItem = createBirthItem(pessoa);
  const deathItem = createDeathItem(pessoa);

  if (birthItem) items.push(birthItem);
  if (deathItem) items.push(deathItem);

  for (const relacionamento of relacionamentos) {
    items.push(...createRelationshipItems(relacionamento, pessoa, pessoas));
  }

  const children = input.filhos ?? getChildrenFromRelationships(relacionamentos, pessoa.id, pessoas);
  for (const child of children) {
    const childBirthItem = createChildBirthItem(child, pessoa.id);
    if (childBirthItem) items.push(childBirthItem);
  }

  for (const arquivo of arquivosHistoricosPessoa) {
    items.push(createHistoricalFileItem(arquivo, 'person'));
  }

  for (const arquivo of arquivosHistoricosRelacionamentos) {
    items.push(createHistoricalFileItem(arquivo, 'relationship'));
  }

  for (const evento of eventosPessoais) {
    items.push(createPersonEventItem(evento));
  }

  for (const evento of eventosFamiliares) {
    items.push(createFamilyEventItem(evento));
  }

  return sortTimelineItems(dedupeTimelineItems(items));
}
