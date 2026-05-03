import { Edge, Node } from 'reactflow';
import { Relacionamento } from '../../../types';
import {
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelativeFilters,
  TREE_CONSTANTS,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
} from '../types';
import { FAMILY_TREE_COLORS } from '../visualTokens';

interface DirectFamilyLayoutOptions {
  centralPersonId?: string;
  filters?: DirectRelativeFilters;
}

const {
  NODE_WIDTH,
  NODE_HEIGHT,
  INITIAL_X,
  INITIAL_Y,
} = TREE_CONSTANTS;

const COLUMN_GAP = 56;
const GENERATION_GAP = 245;
const CENTER_X = INITIAL_X + 980;
const CENTER_Y = INITIAL_Y + 940;
const SPOUSE_X = CENTER_X + NODE_WIDTH + 80;
const SIBLING_GAP = NODE_WIDTH + COLUMN_GAP;
const COUSIN_X = SPOUSE_X + NODE_WIDTH + 120;

function unique(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function sortPersonIds(ids: string[], pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>) {
  return [...ids].sort((aId, bId) => {
    const pessoaA = pessoasById.get(aId);
    const pessoaB = pessoasById.get(bId);
    const birthA = getSortableBirthValue(pessoaA?.data_nascimento);
    const birthB = getSortableBirthValue(pessoaB?.data_nascimento);

    if (birthA !== birthB) return birthA - birthB;
    return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
  });
}

function getParentChildIds(rel: Relacionamento) {
  if (rel.tipo_relacionamento === 'filho') {
    return {
      parentId: rel.pessoa_origem_id,
      childId: rel.pessoa_destino_id,
    };
  }

  if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') {
    return {
      parentId: rel.pessoa_destino_id,
      childId: rel.pessoa_origem_id,
    };
  }

  return null;
}

function placeRowCentered(
  ids: string[],
  y: number,
  centerX: number,
  positionedNodes: Node[],
  positionedIds: Set<string>,
  personNodeById: Map<string, Node>
) {
  const totalWidth = ids.length * NODE_WIDTH + Math.max(0, ids.length - 1) * COLUMN_GAP;
  const startX = centerX - totalWidth / 2;

  ids.forEach((id, index) => {
    if (positionedIds.has(id)) return;

    const node = personNodeById.get(id);
    if (!node) return;

    node.position = {
      x: startX + index * (NODE_WIDTH + COLUMN_GAP),
      y,
    };
    positionedNodes.push(node);
    positionedIds.add(id);
  });
}

function placeColumn(
  ids: string[],
  x: number,
  y: number,
  positionedNodes: Node[],
  positionedIds: Set<string>,
  personNodeById: Map<string, Node>
) {
  ids.forEach((id, index) => {
    if (positionedIds.has(id)) return;

    const node = personNodeById.get(id);
    if (!node) return;

    node.position = {
      x,
      y: y + index * (NODE_HEIGHT + 36),
    };
    positionedNodes.push(node);
    positionedIds.add(id);
  });
}

export function directFamilyLayout(
  {
    personNodes,
    pessoas,
    relacionamentos,
  }: TreeLayoutParams,
  options: DirectFamilyLayoutOptions = {}
): TreeLayoutResult {
  const centralPersonId = options.centralPersonId;
  if (!centralPersonId) {
    return { nodes: [], edges: [] };
  }

  const filters = options.filters || DEFAULT_DIRECT_RELATIVE_FILTERS;
  const personNodeById = new Map(personNodes.map((node) => [node.id, node]));
  const pessoasById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));

  if (!personNodeById.has(centralPersonId)) {
    return { nodes: [], edges: [] };
  }

  const parentsByChild = new Map<string, Set<string>>();
  const childrenByParent = new Map<string, Set<string>>();
  const spousesByPerson = new Map<string, Set<string>>();

  relacionamentos.forEach((rel) => {
    if (rel.tipo_relacionamento === 'conjuge') {
      if (!spousesByPerson.has(rel.pessoa_origem_id)) spousesByPerson.set(rel.pessoa_origem_id, new Set());
      if (!spousesByPerson.has(rel.pessoa_destino_id)) spousesByPerson.set(rel.pessoa_destino_id, new Set());
      spousesByPerson.get(rel.pessoa_origem_id)!.add(rel.pessoa_destino_id);
      spousesByPerson.get(rel.pessoa_destino_id)!.add(rel.pessoa_origem_id);
      return;
    }

    const ids = getParentChildIds(rel);
    if (!ids?.parentId || !ids.childId) return;

    if (!parentsByChild.has(ids.childId)) parentsByChild.set(ids.childId, new Set());
    if (!childrenByParent.has(ids.parentId)) childrenByParent.set(ids.parentId, new Set());
    parentsByChild.get(ids.childId)!.add(ids.parentId);
    childrenByParent.get(ids.parentId)!.add(ids.childId);
  });

  const getParents = (personId: string) => sortPersonIds(unique(Array.from(parentsByChild.get(personId) || [])), pessoasById);
  const getChildren = (personId: string) => sortPersonIds(unique(Array.from(childrenByParent.get(personId) || [])), pessoasById);

  const parents = getParents(centralPersonId);
  const grandparents = unique(parents.flatMap(getParents));
  const greatGrandparents = unique(grandparents.flatMap(getParents));
  const greatGreatGrandparents = unique(greatGrandparents.flatMap(getParents));
  const spouses = sortPersonIds(unique(Array.from(spousesByPerson.get(centralPersonId) || [])), pessoasById);
  const children = getChildren(centralPersonId);
  const grandchildren = unique(children.flatMap(getChildren));
  const siblings = unique(parents.flatMap(getChildren).filter((id) => id !== centralPersonId));
  const uncles = unique(grandparents.flatMap(getChildren).filter((id) => !parents.includes(id)));
  const cousins = unique(uncles.flatMap(getChildren));

  const visibleIds = new Set<string>([centralPersonId]);
  const addVisible = (enabled: boolean, ids: string[]) => {
    if (!enabled) return;
    ids.forEach((id) => {
      if (personNodeById.has(id)) visibleIds.add(id);
    });
  };

  addVisible(filters.pais, parents);
  addVisible(filters.avos, grandparents);
  addVisible(filters.bisavos, greatGrandparents);
  addVisible(filters.tataravos, greatGreatGrandparents);
  addVisible(filters.conjuge, spouses);
  addVisible(filters.filhos, children);
  addVisible(filters.netos, grandchildren);
  addVisible(filters.irmaos, siblings);
  addVisible(filters.tios, uncles);
  addVisible(filters.primos, cousins);

  const positionedNodes: Node[] = [];
  const positionedIds = new Set<string>();
  const visibleSorted = (ids: string[]) => sortPersonIds(ids.filter((id) => visibleIds.has(id)), pessoasById);

  placeRowCentered(visibleSorted(greatGreatGrandparents), CENTER_Y - 4 * GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);
  placeRowCentered(visibleSorted(greatGrandparents), CENTER_Y - 3 * GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);
  placeRowCentered(visibleSorted(grandparents), CENTER_Y - 2 * GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);
  placeRowCentered(visibleSorted([...parents, ...uncles]), CENTER_Y - GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);
  placeColumn(visibleSorted(siblings), CENTER_X - SIBLING_GAP * Math.max(1, Math.ceil(siblings.length / 2)), CENTER_Y, positionedNodes, positionedIds, personNodeById);

  const centralNode = personNodeById.get(centralPersonId)!;
  centralNode.position = { x: CENTER_X, y: CENTER_Y };
  positionedNodes.push({
    ...centralNode,
    data: {
      ...centralNode.data,
      isCentralPerson: true,
      isSelected: true,
    },
  });
  positionedIds.add(centralPersonId);

  placeColumn(visibleSorted(spouses), SPOUSE_X, CENTER_Y, positionedNodes, positionedIds, personNodeById);
  placeColumn(visibleSorted(cousins), COUSIN_X, CENTER_Y + NODE_HEIGHT + 52, positionedNodes, positionedIds, personNodeById);
  placeRowCentered(visibleSorted(children), CENTER_Y + GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);
  placeRowCentered(visibleSorted(grandchildren), CENTER_Y + 2 * GENERATION_GAP, CENTER_X, positionedNodes, positionedIds, personNodeById);

  const edgeIds = new Set<string>();
  const edges: Edge[] = [];
  const addEdge = (edge: Edge) => {
    if (!positionedIds.has(edge.source) || !positionedIds.has(edge.target)) return;
    if (edgeIds.has(edge.id)) return;
    edgeIds.add(edge.id);
    edges.push(edge);
  };

  relacionamentos.forEach((rel) => {
    if (rel.tipo_relacionamento === 'conjuge') {
      const originNode = positionedNodes.find((node) => node.id === rel.pessoa_origem_id);
      const destinationNode = positionedNodes.find((node) => node.id === rel.pessoa_destino_id);
      const [leftPersonId, rightPersonId] =
        originNode && destinationNode && originNode.position.x > destinationNode.position.x
          ? [rel.pessoa_destino_id, rel.pessoa_origem_id]
          : [rel.pessoa_origem_id, rel.pessoa_destino_id];

      addEdge({
        id: `direct-spouse-${[rel.pessoa_origem_id, rel.pessoa_destino_id].sort().join('-')}`,
        source: leftPersonId,
        sourceHandle: 'spouse-right',
        target: rightPersonId,
        targetHandle: 'spouse-left',
        type: 'spouseEdge',
        style: { stroke: FAMILY_TREE_COLORS.EDGE_SPOUSE, strokeWidth: 3 },
      });
      return;
    }

    const ids = getParentChildIds(rel);
    if (!ids) return;

    addEdge({
      id: `direct-child-${ids.parentId}-${ids.childId}`,
      source: ids.parentId,
      sourceHandle: 'bottom',
      target: ids.childId,
      targetHandle: 'top',
      type: 'childEdge',
      style: { stroke: FAMILY_TREE_COLORS.EDGE_CHILD, strokeWidth: 2.5 },
    });
  });

  visibleSorted(siblings).forEach((siblingId) => {
    addEdge({
      id: `direct-sibling-${centralPersonId}-${siblingId}`,
      source: siblingId,
      sourceHandle: 'sibling-left',
      target: centralPersonId,
      targetHandle: 'sibling-left',
      type: 'siblingEdge',
      data: {
        kind: 'siblings',
        attachGap: 20,
      },
      style: {
        stroke: FAMILY_TREE_COLORS.EDGE_SIBLING,
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
    });
  });

  return {
    nodes: positionedNodes,
    edges,
  };
}
