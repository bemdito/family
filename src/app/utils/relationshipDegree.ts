import type { Pessoa, Relacionamento, SubtipoRelacionamento, TipoRelacionamento } from '../types';

export type RelationshipConfidence = 'high' | 'medium' | 'low' | 'unknown' | 'none';

export type RelationshipConnectionKind =
  | 'blood'
  | 'adoptive'
  | 'conjugal'
  | 'affinity'
  | 'indirect'
  | 'self'
  | 'none';

export type NormalizedRelationshipType = 'parent' | 'child' | 'sibling' | 'spouse';

export interface RelationshipGraphNode {
  id: string;
  person: Pessoa;
}

export interface RelationshipGraphEdge {
  from: string;
  to: string;
  type: TipoRelacionamento;
  normalizedType: NormalizedRelationshipType;
  subtype?: SubtipoRelacionamento | null;
  active: boolean;
  relationshipIds: string[];
  connectionKind: RelationshipConnectionKind;
  warnings?: string[];
}

export interface RelationshipGraph {
  nodes: Map<string, RelationshipGraphNode>;
  edges: RelationshipGraphEdge[];
  adjacency: Map<string, RelationshipGraphEdge[]>;
  warnings: string[];
}

export interface RelationshipPathStep {
  from: string;
  to: string;
  edge: RelationshipGraphEdge;
}

export interface RelationshipDegreeResult {
  originPersonId: string;
  targetPersonId: string;
  found: boolean;
  samePerson: boolean;
  label: string;
  description: string;
  degree?: number;
  distance: number;
  confidence: RelationshipConfidence;
  connectionKind: RelationshipConnectionKind;
  path: RelationshipPathStep[];
  warnings: string[];
}

export interface RelationshipDegreeInput {
  originPersonId: string;
  targetPersonId: string;
  people: Pessoa[];
  relationships: Relacionamento[];
  maxDepth?: number;
  includeInactiveSpouses?: boolean;
}

interface BuildRelationshipGraphOptions {
  includeInactiveSpouses?: boolean;
}

interface FindRelationshipPathOptions {
  maxDepth?: number;
}

interface RelationshipDescription {
  label: string;
  description: string;
  degree?: number;
  connectionKind: RelationshipConnectionKind;
  confidence: RelationshipConfidence;
  warnings: string[];
}

const DEFAULT_MAX_DEPTH = 8;
const RELATIONSHIP_ORDER: Record<NormalizedRelationshipType, number> = {
  parent: 0,
  child: 1,
  sibling: 2,
  spouse: 3,
};

function getPersonName(person?: Pessoa) {
  return person?.nome_completo?.trim() || 'Pessoa';
}

function isInactiveSpouseRelationship(relationship: Relacionamento) {
  return Boolean(
    relationship.tipo_relacionamento === 'conjuge' &&
    (
      relationship.ativo === false ||
      String(relationship.data_separacao ?? '').trim() ||
      relationship.subtipo_relacionamento === 'separado'
    )
  );
}

function getConnectionKind(
  normalizedType: NormalizedRelationshipType,
  subtype?: SubtipoRelacionamento | null
): RelationshipConnectionKind {
  if (normalizedType === 'spouse') return 'conjugal';
  if (subtype === 'adotivo') return 'adoptive';
  return 'blood';
}

function createEdgeKey(edge: Omit<RelationshipGraphEdge, 'relationshipIds' | 'warnings'>) {
  return [
    edge.from,
    edge.to,
    edge.normalizedType,
    edge.type,
    edge.subtype ?? '',
    edge.active ? 'active' : 'inactive',
  ].join('|');
}

function addGraphEdge(
  edgeMap: Map<string, RelationshipGraphEdge>,
  edge: RelationshipGraphEdge,
  warnings: string[]
) {
  const key = createEdgeKey(edge);
  const existing = edgeMap.get(key);

  if (existing) {
    const ids = new Set([...existing.relationshipIds, ...edge.relationshipIds]);
    existing.relationshipIds = Array.from(ids).sort();
    existing.warnings = Array.from(new Set([...(existing.warnings ?? []), ...(edge.warnings ?? [])]));
    warnings.push(`Relacionamento duplicado normalizado entre ${edge.from} e ${edge.to}.`);
    return;
  }

  edgeMap.set(key, edge);
}

function addRelationshipEdges(params: {
  edgeMap: Map<string, RelationshipGraphEdge>;
  relationship: Relacionamento;
  from: string;
  to: string;
  type: TipoRelacionamento;
  normalizedType: NormalizedRelationshipType;
  active: boolean;
  warnings: string[];
}) {
  const { edgeMap, relationship, from, to, type, normalizedType, active, warnings } = params;
  const edgeWarnings = active ? undefined : ['Relacionamento conjugal inativo usado como aresta opcional.'];

  addGraphEdge(
    edgeMap,
    {
      from,
      to,
      type,
      normalizedType,
      subtype: relationship.subtipo_relacionamento ?? null,
      active,
      relationshipIds: [relationship.id].filter(Boolean),
      connectionKind: getConnectionKind(normalizedType, relationship.subtipo_relacionamento),
      warnings: edgeWarnings,
    },
    warnings
  );
}

function addDerivedSiblingEdges(
  edgeMap: Map<string, RelationshipGraphEdge>,
  warnings: string[]
) {
  const parentEdges = Array.from(edgeMap.values()).filter((edge) => edge.normalizedType === 'parent');
  const childrenByParent = new Map<string, RelationshipGraphEdge[]>();

  for (const edge of parentEdges) {
    const siblings = childrenByParent.get(edge.from) ?? [];
    siblings.push(edge);
    childrenByParent.set(edge.from, siblings);
  }

  for (const [parentId, edges] of childrenByParent) {
    if (edges.length < 2) continue;

    edges.forEach((edgeA, index) => {
      edges.slice(index + 1).forEach((edgeB) => {
        const subtype = edgeA.subtype === edgeB.subtype ? edgeA.subtype : null;
        const connectionKind = edgeA.connectionKind === 'adoptive' || edgeB.connectionKind === 'adoptive'
          ? 'adoptive'
          : 'blood';
        const relationshipIds = Array.from(new Set([...edgeA.relationshipIds, ...edgeB.relationshipIds])).sort();
        const siblingWarning = `Irmandade derivada por parental compartilhado ${parentId}.`;

        [
          [edgeA.to, edgeB.to],
          [edgeB.to, edgeA.to],
        ].forEach(([from, to]) => {
          addGraphEdge(
            edgeMap,
            {
              from,
              to,
              type: 'irmao',
              normalizedType: 'sibling',
              subtype,
              active: edgeA.active && edgeB.active,
              relationshipIds,
              connectionKind,
              warnings: [siblingWarning],
            },
            warnings
          );
        });
      });
    });
  }
}

function buildAdjacency(edges: RelationshipGraphEdge[]) {
  const adjacency = new Map<string, RelationshipGraphEdge[]>();

  for (const edge of edges) {
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge);
    adjacency.set(edge.from, list);
  }

  adjacency.forEach((list) => {
    list.sort((edgeA, edgeB) => {
      const orderA = RELATIONSHIP_ORDER[edgeA.normalizedType];
      const orderB = RELATIONSHIP_ORDER[edgeB.normalizedType];
      if (orderA !== orderB) return orderA - orderB;

      const typeComparison = edgeA.type.localeCompare(edgeB.type);
      if (typeComparison !== 0) return typeComparison;

      return edgeA.to.localeCompare(edgeB.to);
    });
  });

  return adjacency;
}

export function normalizeRelationshipType(type: TipoRelacionamento): NormalizedRelationshipType {
  if (type === 'pai' || type === 'mae') return 'child';
  if (type === 'filho') return 'parent';
  if (type === 'irmao') return 'sibling';
  return 'spouse';
}

export function buildRelationshipGraph(
  people: Pessoa[],
  relationships: Relacionamento[],
  options: BuildRelationshipGraphOptions = {}
): RelationshipGraph {
  const nodes = new Map<string, RelationshipGraphNode>();
  const edgeMap = new Map<string, RelationshipGraphEdge>();
  const warnings: string[] = [];

  for (const person of people) {
    if (!person.id) continue;
    nodes.set(person.id, { id: person.id, person });
  }

  for (const relationship of relationships) {
    const from = relationship.pessoa_origem_id;
    const to = relationship.pessoa_destino_id;

    if (!from || !to) {
      warnings.push(`Relacionamento ${relationship.id || 'sem id'} ignorado por origem ou destino ausente.`);
      continue;
    }

    if (from === to) {
      warnings.push(`Relacionamento ${relationship.id || 'sem id'} ignorado por autoaresta.`);
      continue;
    }

    if (!nodes.has(from) || !nodes.has(to)) {
      warnings.push(`Relacionamento ${relationship.id || 'sem id'} aponta para pessoa inexistente na lista recebida.`);
      continue;
    }

    const normalizedType = normalizeRelationshipType(relationship.tipo_relacionamento);
    const inactiveSpouse = isInactiveSpouseRelationship(relationship);

    if (normalizedType === 'spouse' && inactiveSpouse && !options.includeInactiveSpouses) {
      warnings.push(`Relacionamento conjugal inativo ${relationship.id || 'sem id'} ignorado no grafo principal.`);
      continue;
    }

    const active = !inactiveSpouse;

    const directType = normalizedType === 'child' ? 'filho' : relationship.tipo_relacionamento;

    addRelationshipEdges({
      edgeMap,
      relationship,
      from,
      to,
      type: directType,
      normalizedType,
      active,
      warnings,
    });

    if (normalizedType === 'parent') {
      addRelationshipEdges({
        edgeMap,
        relationship,
        from: to,
        to: from,
        type: 'filho',
        normalizedType: 'child',
        active,
        warnings,
      });
      continue;
    }

    if (normalizedType === 'child') {
      addRelationshipEdges({
        edgeMap,
        relationship,
        from: to,
        to: from,
        type: relationship.tipo_relacionamento,
        normalizedType: 'parent',
        active,
        warnings,
      });
      continue;
    }

    if (normalizedType === 'sibling' || normalizedType === 'spouse') {
      addRelationshipEdges({
        edgeMap,
        relationship,
        from: to,
        to: from,
        type: relationship.tipo_relacionamento,
        normalizedType,
        active,
        warnings,
      });
    }
  }

  addDerivedSiblingEdges(edgeMap, warnings);

  const edges = Array.from(edgeMap.values());
  return {
    nodes,
    edges,
    adjacency: buildAdjacency(edges),
    warnings: Array.from(new Set(warnings)),
  };
}

export function findRelationshipPath(
  graph: RelationshipGraph,
  originPersonId: string,
  targetPersonId: string,
  options: FindRelationshipPathOptions = {}
): RelationshipPathStep[] | null {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (originPersonId === targetPersonId) return [];
  if (!graph.nodes.has(originPersonId) || !graph.nodes.has(targetPersonId)) return null;

  const visited = new Set<string>([originPersonId]);
  const queue: Array<{ personId: string; path: RelationshipPathStep[] }> = [
    { personId: originPersonId, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current.path.length >= maxDepth) continue;

    const neighbors = graph.adjacency.get(current.personId) ?? [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const nextPath = [...current.path, { from: edge.from, to: edge.to, edge }];
      if (edge.to === targetPersonId) return nextPath;

      visited.add(edge.to);
      queue.push({ personId: edge.to, path: nextPath });
    }
  }

  return null;
}

function hasInactiveSpouse(path: RelationshipPathStep[]) {
  return path.some((step) => step.edge.normalizedType === 'spouse' && !step.edge.active);
}

function hasAdoptiveEdge(path: RelationshipPathStep[]) {
  return path.some((step) => step.edge.connectionKind === 'adoptive');
}

function hasConjugalEdge(path: RelationshipPathStep[]) {
  return path.some((step) => step.edge.normalizedType === 'spouse');
}

function getPathConnectionKind(path: RelationshipPathStep[]): RelationshipConnectionKind {
  if (path.length === 0) return 'self';
  if (hasConjugalEdge(path)) return path.length === 1 ? 'conjugal' : 'affinity';
  if (hasAdoptiveEdge(path)) return 'adoptive';
  return path.every((step) => step.edge.connectionKind === 'blood') ? 'blood' : 'indirect';
}

export function getRelationshipConfidence(path: RelationshipPathStep[] | null): RelationshipConfidence {
  if (!path) return 'none';
  if (path.length === 0) return 'high';
  if (hasInactiveSpouse(path)) return 'low';
  if (path.length > 4) return 'low';
  if (hasConjugalEdge(path) || hasAdoptiveEdge(path)) return 'medium';
  return 'high';
}

function relationPattern(path: RelationshipPathStep[]) {
  return path.map((step) => step.edge.normalizedType).join('>');
}

function getDirectParentLabel(edge: RelationshipGraphEdge) {
  if (edge.type === 'pai') return 'pai';
  if (edge.type === 'mae') return 'mae';
  return 'pai/mãe';
}

function describeDirectRelationship(
  path: RelationshipPathStep[],
  originName: string,
  targetName: string
): RelationshipDescription | null {
  if (path.length !== 1) return null;

  const edge = path[0].edge;

  if (edge.normalizedType === 'parent') {
    const label = getDirectParentLabel(edge);
    return {
      label,
      description: `${originName} e ${label} de ${targetName}.`,
      degree: 1,
      connectionKind: edge.connectionKind,
      confidence: edge.connectionKind === 'adoptive' ? 'medium' : 'high',
      warnings: [],
    };
  }

  if (edge.normalizedType === 'child') {
    return {
      label: 'filho(a)',
      description: `${originName} e filho(a) de ${targetName}.`,
      degree: 1,
      connectionKind: edge.connectionKind,
      confidence: edge.connectionKind === 'adoptive' ? 'medium' : 'high',
      warnings: edge.type === 'filho' ? [] : ['Vinculo filial derivado de relacionamento inverso.'],
    };
  }

  if (edge.normalizedType === 'sibling') {
    return {
      label: 'irmão(ã)',
      description: `${originName} e irmão(ã) de ${targetName}.`,
      degree: 2,
      connectionKind: edge.connectionKind,
      confidence: edge.connectionKind === 'adoptive' ? 'medium' : 'high',
      warnings: edge.relationshipIds.length === 0 ? ['Irmandade derivada por parental compartilhado.'] : [],
    };
  }

  return {
    label: edge.active ? 'cônjuge' : 'ex-cônjuge',
    description: `${originName} e ${edge.active ? 'cônjuge' : 'ex-cônjuge'} de ${targetName}.`,
    degree: undefined,
    connectionKind: 'conjugal',
    confidence: edge.active ? 'medium' : 'low',
    warnings: edge.active ? [] : ['Caminho usa relacionamento conjugal inativo.'],
  };
}

function describeKnownPattern(
  path: RelationshipPathStep[],
  originName: string,
  targetName: string
): RelationshipDescription | null {
  const pattern = relationPattern(path);
  const connectionKind = getPathConnectionKind(path);
  const confidence = getRelationshipConfidence(path);
  const warnings = hasInactiveSpouse(path) ? ['Caminho usa relacionamento conjugal inativo.'] : [];

  const knownPatterns: Record<string, { label: string; degree?: number; description: string }> = {
    'parent>parent': {
      label: 'avô/avó',
      degree: 2,
      description: `${originName} e avô/avó de ${targetName}.`,
    },
    'child>child': {
      label: 'neto(a)',
      degree: 2,
      description: `${originName} e neto(a) de ${targetName}.`,
    },
    'sibling>parent': {
      label: 'tio(a)',
      degree: 3,
      description: `${originName} e tio(a) de ${targetName}.`,
    },
    'child>sibling': {
      label: 'sobrinho(a)',
      degree: 3,
      description: `${originName} e sobrinho(a) de ${targetName}.`,
    },
    'child>sibling>parent': {
      label: 'primo(a)',
      degree: 4,
      description: `${originName} e primo(a) de ${targetName}.`,
    },
  };

  const match = knownPatterns[pattern];
  if (!match) return null;

  return {
    ...match,
    connectionKind,
    confidence,
    warnings,
  };
}

export function describeRelationshipPath(
  path: RelationshipPathStep[],
  peopleById: Map<string, Pessoa>,
  originPersonId: string,
  targetPersonId: string
): RelationshipDescription {
  const originName = getPersonName(peopleById.get(originPersonId));
  const targetName = getPersonName(peopleById.get(targetPersonId));

  if (originPersonId === targetPersonId || path.length === 0) {
    return {
      label: 'a própria pessoa',
      description: `${originName} e a própria pessoa.`,
      degree: 0,
      connectionKind: 'self',
      confidence: 'high',
      warnings: [],
    };
  }

  const direct = describeDirectRelationship(path, originName, targetName);
  if (direct) return direct;

  const knownPattern = describeKnownPattern(path, originName, targetName);
  if (knownPattern) return knownPattern;

  return {
    label: 'vínculo familiar indireto',
    description: `Ha um caminho familiar entre ${originName} e ${targetName}, mas sem classificacao especifica nesta versao.`,
    degree: path.length,
    connectionKind: getPathConnectionKind(path) === 'blood' ? 'indirect' : getPathConnectionKind(path),
    confidence: path.length <= 4 && !hasInactiveSpouse(path) ? 'medium' : 'low',
    warnings: ['Vinculo encontrado, mas classificacao especifica indisponivel.'],
  };
}

export function calculateRelationshipDegree(input: RelationshipDegreeInput): RelationshipDegreeResult {
  const maxDepth = input.maxDepth ?? DEFAULT_MAX_DEPTH;
  const graph = buildRelationshipGraph(input.people, input.relationships, {
    includeInactiveSpouses: input.includeInactiveSpouses,
  });
  const peopleById = graph.nodes;
  const warnings = [...graph.warnings];
  const originPerson = peopleById.get(input.originPersonId)?.person;
  const targetPerson = peopleById.get(input.targetPersonId)?.person;

  if (!originPerson) {
    warnings.push('Origem nao encontrada na lista de pessoas recebida.');
  }

  if (!targetPerson) {
    warnings.push('Destino nao encontrado na lista de pessoas recebida.');
  }

  if (!originPerson || !targetPerson) {
    return {
      originPersonId: input.originPersonId,
      targetPersonId: input.targetPersonId,
      found: false,
      samePerson: false,
      label: 'vínculo desconhecido',
      description: 'Dados insuficientes para calcular o vinculo.',
      distance: 0,
      confidence: 'unknown',
      connectionKind: 'none',
      path: [],
      warnings: Array.from(new Set(warnings)),
    };
  }

  if (input.originPersonId === input.targetPersonId) {
    const description = describeRelationshipPath([], new Map(input.people.map((person) => [person.id, person])), input.originPersonId, input.targetPersonId);

    return {
      originPersonId: input.originPersonId,
      targetPersonId: input.targetPersonId,
      found: true,
      samePerson: true,
      label: description.label,
      description: description.description,
      degree: description.degree,
      distance: 0,
      confidence: description.confidence,
      connectionKind: description.connectionKind,
      path: [],
      warnings: Array.from(new Set(warnings)),
    };
  }

  const path = findRelationshipPath(graph, input.originPersonId, input.targetPersonId, { maxDepth });

  if (!path) {
    warnings.push(`Nenhum caminho encontrado ate a profundidade maxima ${maxDepth}.`);

    return {
      originPersonId: input.originPersonId,
      targetPersonId: input.targetPersonId,
      found: false,
      samePerson: false,
      label: 'sem vínculo encontrado',
      description: `Nao foi encontrado vinculo familiar entre ${getPersonName(originPerson)} e ${getPersonName(targetPerson)} com os dados recebidos.`,
      distance: 0,
      confidence: 'none',
      connectionKind: 'none',
      path: [],
      warnings: Array.from(new Set(warnings)),
    };
  }

  const description = describeRelationshipPath(
    path,
    new Map(input.people.map((person) => [person.id, person])),
    input.originPersonId,
    input.targetPersonId
  );
  const pathWarnings = path.flatMap((step) => step.edge.warnings ?? []);

  return {
    originPersonId: input.originPersonId,
    targetPersonId: input.targetPersonId,
    found: true,
    samePerson: false,
    label: description.label,
    description: description.description,
    degree: description.degree,
    distance: path.length,
    confidence: description.confidence,
    connectionKind: description.connectionKind,
    path,
    warnings: Array.from(new Set([...warnings, ...pathWarnings, ...description.warnings])),
  };
}
