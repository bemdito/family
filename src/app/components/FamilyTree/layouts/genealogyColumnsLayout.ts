import { Edge, Node } from 'reactflow';
import { Pessoa, Relacionamento } from '../../../types';
import type { GenealogyFamilyConnectorNodeData } from '../GenealogyFamilyConnectorNode';
import {
  DEFAULT_GENEALOGY_FILTERS,
  DirectRelationVariant,
  GenealogyFilterKey,
  GenealogyFilters,
  MarriageNodeDetails,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
} from '../types';
import { DIRECT_FAMILY_TOKENS, hasDeathDate } from '../visualTokens';

type GenerationKey = number | null;
export type GenealogyMarriageStatus = 'active' | 'divorced' | 'widowed' | 'unknown';

interface GenerationGroup {
  key: GenerationKey;
  label: string;
  people: GenealogyPersonPlacement[];
}

interface RelationshipIndex {
  parentsByChild: Map<string, Set<string>>;
  childrenByParent: Map<string, Set<string>>;
  childrenByCouple: Map<string, Set<string>>;
  spousesByPerson: Map<string, Set<string>>;
  spousePairKeys: Set<string>;
  spouseRelationshipByPairKey: Map<string, Relacionamento>;
  siblingsByPerson: Map<string, Set<string>>;
}

interface GenealogyPersonPlacement {
  pessoa: Pessoa;
  directRelation: DirectRelationVariant;
}

interface PositionedPerson {
  placement: GenealogyPersonPlacement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GenealogyFamilyConnectorDraft {
  id: string;
  parentIds: string[];
  childIds: string[];
  parentGeneration: GenerationKey;
  childGeneration: GenerationKey;
  originX?: number;
  originY?: number;
  busX?: number;
  childPoints?: Array<{
    id: string;
    x: number;
    y: number;
  }>;
}

interface GenealogyColumnsLayoutOptions {
  filters?: GenealogyFilters;
  onMarriageClick?: (details: MarriageNodeDetails) => void;
}

interface CreateGenealogyFamilyConnectorNodeParams {
  id: string;
  originX: number;
  originY: number;
  busX: number;
  childPoints: Array<{
    id: string;
    x: number;
    y: number;
  }>;
}

const CARD_WIDTH = DIRECT_FAMILY_TOKENS.CARD_WIDTH;
const CARD_HEIGHT = DIRECT_FAMILY_TOKENS.CARD_HEIGHT;
const TITLE_WIDTH = 1180;
const TITLE_TOP = 40;
const TITLE_CENTER_X = 0;
const COLUMN_TOP = 205;
const COLUMN_LABEL_HEIGHT = 30;
const LABEL_TO_CARD_GAP = 16;
const COLUMN_GAP = 82;
const ROW_GAP = 18;
const SPOUSE_ROW_EXTRA_GAP = 36;
const FAMILY_UNIT_GAP = 48;
const FAMILY_CONNECTOR_CHILD_BUS_OFFSET = 24;
const FAMILY_CONNECTOR_LANE_GAP = 10;
const FAMILY_CONNECTOR_MAX_LANES = 4;

const GENERATION_RELATION_VARIANTS: Record<number, {
  base: DirectRelationVariant;
  spouseAlternate?: DirectRelationVariant;
}> = {
  1: { base: 'greatGreatGrandparent' },
  2: { base: 'greatGrandparent' },
  3: { base: 'grandparent', spouseAlternate: 'uncleAunt' },
  4: { base: 'cousin', spouseAlternate: 'spouse' },
  5: { base: 'sibling', spouseAlternate: 'nephewNiece' },
  6: { base: 'child' },
};

function getGenerationKey(pessoa: Pessoa): GenerationKey {
  const generation = pessoa.manual_generation;

  if (typeof generation === 'number' && Number.isFinite(generation)) {
    return generation;
  }

  return null;
}

function getGenerationLabel(key: GenerationKey) {
  return key === null ? 'Sem geração' : `Geração ${key}`;
}

function comparePeopleByBirthAndName(pessoaA: Pessoa, pessoaB: Pessoa) {
  const birthA = getSortableBirthValue(pessoaA.data_nascimento);
  const birthB = getSortableBirthValue(pessoaB.data_nascimento);

  if (birthA !== birthB) {
    return birthA - birthB;
  }

  return (pessoaA.nome_completo || '').localeCompare(pessoaB.nome_completo || '');
}

function buildRelationshipIndex(graph: TreeLayoutParams): RelationshipIndex {
  const parentsByChild = new Map<string, Set<string>>();
  const childrenByParent = new Map<string, Set<string>>();
  const childrenByCouple = new Map<string, Set<string>>();
  const spousesByPerson = new Map<string, Set<string>>();
  const spousePairKeys = new Set<string>();
  const spouseRelationshipByPairKey = new Map<string, Relacionamento>();
  const siblingsByPerson = new Map<string, Set<string>>();

  const addBidirectional = (map: Map<string, Set<string>>, personAId: string, personBId: string) => {
    if (!personAId || !personBId || personAId === personBId) return;

    if (!map.has(personAId)) map.set(personAId, new Set());
    if (!map.has(personBId)) map.set(personBId, new Set());

    map.get(personAId)!.add(personBId);
    map.get(personBId)!.add(personAId);
  };

  graph.relacionamentos.forEach((relacionamento) => {
    if (relacionamento.tipo_relacionamento !== 'conjuge') return;
    if (!relacionamento.pessoa_origem_id || !relacionamento.pessoa_destino_id) return;

    addBidirectional(spousesByPerson, relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id);
    const pairKey = getSpousePairKey(relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id);
    spousePairKeys.add(pairKey);
    spouseRelationshipByPairKey.set(pairKey, relacionamento);
  });

  graph.childParentsMap.forEach((parentIds, childId) => {
    parentsByChild.set(childId, new Set(parentIds));

    parentIds.forEach((parentId) => {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, new Set());
      childrenByParent.get(parentId)!.add(childId);
    });

    const parentIdList = Array.from(parentIds).filter(Boolean).sort();

    parentIdList.forEach((parentAId, parentIndex) => {
      parentIdList.slice(parentIndex + 1).forEach((parentBId) => {
        const coupleKey = getSpousePairKey(parentAId, parentBId);

        if (!childrenByCouple.has(coupleKey)) childrenByCouple.set(coupleKey, new Set());
        childrenByCouple.get(coupleKey)!.add(childId);
      });
    });
  });

  childrenByParent.forEach((childrenIds) => {
    const childIdList = Array.from(childrenIds);
    if (childIdList.length < 2) return;

    childIdList.forEach((childAId, index) => {
      childIdList.slice(index + 1).forEach((childBId) => {
        addBidirectional(siblingsByPerson, childAId, childBId);
      });
    });
  });

  return {
    parentsByChild,
    childrenByParent,
    childrenByCouple,
    spousesByPerson,
    spousePairKeys,
    spouseRelationshipByPairKey,
    siblingsByPerson,
  };
}

function getSpousePairKey(personAId: string, personBId: string) {
  return [personAId, personBId].sort().join('__');
}

function areSpouses(personAId: string | undefined, personBId: string | undefined, relationshipIndex: RelationshipIndex) {
  if (!personAId || !personBId) return false;
  return relationshipIndex.spousePairKeys.has(getSpousePairKey(personAId, personBId));
}

export function getGenealogyMarriageStatus(
  relacionamento: Relacionamento | undefined,
  pessoaA: Pessoa | undefined,
  pessoaB: Pessoa | undefined
): GenealogyMarriageStatus {
  if (!relacionamento || !pessoaA || !pessoaB) {
    return 'unknown';
  }

  if (
    relacionamento.subtipo_relacionamento === 'separado' ||
    Boolean(relacionamento.data_separacao) ||
    relacionamento.ativo === false
  ) {
    return 'divorced';
  }

  if (hasDeathDate(pessoaA.data_falecimento) || hasDeathDate(pessoaB.data_falecimento)) {
    return 'widowed';
  }

  return 'active';
}

function sortRelatedPeople(
  personIds: Iterable<string>,
  peopleById: Map<string, Pessoa>,
  baseIndexById: Map<string, number>,
  sameGenerationIds: Set<string>,
  visitedIds: Set<string>
) {
  return Array.from(personIds)
    .filter((personId) => sameGenerationIds.has(personId) && !visitedIds.has(personId))
    .map((personId) => peopleById.get(personId))
    .filter((pessoa): pessoa is Pessoa => Boolean(pessoa))
    .sort((pessoaA, pessoaB) => {
      const indexA = baseIndexById.get(pessoaA.id) ?? Number.POSITIVE_INFINITY;
      const indexB = baseIndexById.get(pessoaB.id) ?? Number.POSITIVE_INFINITY;

      if (indexA !== indexB) return indexA - indexB;
      return comparePeopleByBirthAndName(pessoaA, pessoaB);
    });
}

function getGenerationRelationVariants(key: GenerationKey) {
  if (key === null) {
    return { base: 'central' as DirectRelationVariant };
  }

  return GENERATION_RELATION_VARIANTS[key] || { base: 'central' as DirectRelationVariant };
}

function sortPeopleWithinGeneration(
  pessoas: Pessoa[],
  generationKey: GenerationKey,
  relationshipIndex: RelationshipIndex
): GenealogyPersonPlacement[] {
  const peopleById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const sameGenerationIds = new Set(pessoas.map((pessoa) => pessoa.id));
  const baseSortedPeople = [...pessoas].sort(comparePeopleByBirthAndName);
  const baseIndexById = new Map(baseSortedPeople.map((pessoa, index) => [pessoa.id, index]));
  const visitedIds = new Set<string>();
  const orderedPeople: GenealogyPersonPlacement[] = [];
  const relationVariants = getGenerationRelationVariants(generationKey);

  const appendPersonWithSpouses = (pessoa: Pessoa) => {
    if (visitedIds.has(pessoa.id)) return [];

    const block = [pessoa];
    visitedIds.add(pessoa.id);
    orderedPeople.push({
      pessoa,
      directRelation: relationVariants.base,
    });

    const spouses = sortRelatedPeople(
      relationshipIndex.spousesByPerson.get(pessoa.id) || [],
      peopleById,
      baseIndexById,
      sameGenerationIds,
      visitedIds
    );

    spouses.forEach((spouse) => {
      visitedIds.add(spouse.id);
      block.push(spouse);
      orderedPeople.push({
        pessoa: spouse,
        directRelation: relationVariants.spouseAlternate || relationVariants.base,
      });
    });

    return block;
  };

  baseSortedPeople.forEach((pessoa) => {
    const block = appendPersonWithSpouses(pessoa);
    if (block.length === 0) return;

    const siblingCandidates = new Set<string>();
    block.forEach((blockPerson) => {
      relationshipIndex.siblingsByPerson.get(blockPerson.id)?.forEach((siblingId) => {
        siblingCandidates.add(siblingId);
      });
    });

    const siblings = sortRelatedPeople(
      siblingCandidates,
      peopleById,
      baseIndexById,
      sameGenerationIds,
      visitedIds
    );

    siblings.forEach((sibling) => appendPersonWithSpouses(sibling));
  });

  return orderedPeople;
}

function groupPeopleByGeneration(
  graph: TreeLayoutParams,
  relationshipIndex: RelationshipIndex
): GenerationGroup[] {
  const groupsByKey = new Map<GenerationKey, Pessoa[]>();

  graph.pessoas.forEach((pessoa) => {
    const key = getGenerationKey(pessoa);
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key)!.push(pessoa);
  });

  const keys = Array.from(groupsByKey.keys()).sort((keyA, keyB) => {
    if (keyA === null && keyB === null) return 0;
    if (keyA === null) return 1;
    if (keyB === null) return -1;
    return keyA - keyB;
  });

  return keys.map((key) => ({
    key,
    label: getGenerationLabel(key),
    people: sortPeopleWithinGeneration(groupsByKey.get(key) || [], key, relationshipIndex),
  }));
}

function addLabelNode(
  nodes: Node[],
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  variant: 'group' | 'title',
  subtitle?: string
) {
  nodes.push({
    id,
    type: 'directFamilyLabelNode',
    data: { label, subtitle, width, variant },
    position: { x, y },
    draggable: false,
    selectable: false,
  });
}

function clonePersonNode(node: Node, x: number, y: number, directRelation: DirectRelationVariant): Node {
  return {
    ...node,
    position: { x, y },
    draggable: false,
    selectable: false,
    data: {
      ...node.data,
      directRelation,
      useDirectRelationStyleForPet: true,
      useCentralDirectLayout: false,
      isCentralPerson: false,
      isSelected: false,
    },
  };
}

function getPlacementFilterKey(placement: GenealogyPersonPlacement): GenealogyFilterKey | undefined {
  switch (placement.pessoa.manual_generation) {
    case 1:
      return 'generation1';
    case 2:
      return 'generation2';
    case 3:
      return placement.directRelation === 'uncleAunt' ? 'generation3Spouses' : 'generation3Family';
    case 4:
      return placement.directRelation === 'spouse' ? 'generation4Spouses' : 'generation4Family';
    case 5:
      return placement.directRelation === 'nephewNiece' ? 'generation5Spouses' : 'generation5Family';
    case 6:
      return 'generation6';
    default:
      return undefined;
  }
}

function isPlacementVisible(placement: GenealogyPersonPlacement, filters: GenealogyFilters) {
  const filterKey = getPlacementFilterKey(placement);
  return filterKey ? filters[filterKey] : true;
}

function getVisiblePlacements(placements: GenealogyPersonPlacement[], filters: GenealogyFilters) {
  return placements.filter((placement) => isPlacementVisible(placement, filters));
}

function getGapBetweenPeople(
  previousPersonId: string | undefined,
  nextPersonId: string | undefined,
  relationshipIndex: RelationshipIndex
) {
  return ROW_GAP + (areSpouses(previousPersonId, nextPersonId, relationshipIndex) ? SPOUSE_ROW_EXTRA_GAP : 0);
}

function getPlacementBlockHeight(placements: GenealogyPersonPlacement[], relationshipIndex: RelationshipIndex) {
  if (placements.length === 0) return 0;

  return placements.reduce((height, placement, index) => {
    if (index === 0) return CARD_HEIGHT;

    const previousPlacement = placements[index - 1];
    return height + getGapBetweenPeople(previousPlacement?.pessoa.id, placement.pessoa.id, relationshipIndex) + CARD_HEIGHT;
  }, 0);
}

function addGenealogySpouseEdge(
  edges: Edge[],
  sourcePersonId: string,
  targetPersonId: string,
  relationshipIndex: RelationshipIndex,
  peopleById: Map<string, Pessoa>,
  onMarriageClick?: (details: MarriageNodeDetails) => void
) {
  const pairKey = getSpousePairKey(sourcePersonId, targetPersonId);
  const relationship = relationshipIndex.spouseRelationshipByPairKey.get(pairKey);
  const person1 = peopleById.get(sourcePersonId);
  const person2 = peopleById.get(targetPersonId);

  if (edges.some((edge) => edge.id === `genealogy-spouse-${pairKey}`)) {
    return;
  }

  edges.push({
    id: `genealogy-spouse-${pairKey}`,
    source: sourcePersonId,
    sourceHandle: 'bottom',
    target: targetPersonId,
    targetHandle: 'top',
    type: 'genealogySpouseEdge',
    animated: false,
    style: {
      stroke: DIRECT_FAMILY_TOKENS.EDGE_STROKE,
      strokeWidth: DIRECT_FAMILY_TOKENS.SPOUSE_EDGE_STROKE_WIDTH,
      opacity: DIRECT_FAMILY_TOKENS.EDGE_OPACITY,
    },
    data: {
      marriageStatus: getGenealogyMarriageStatus(relationship, person1, person2),
      marriageDetails: {
        id: relationship?.id,
        marriageKey: pairKey,
        person1Id: sourcePersonId,
        person2Id: targetPersonId,
        person1,
        person2,
        relationship,
      },
      onMarriageClick,
    },
  });
}

export function createGenealogyFamilyConnectorNode({
  id,
  originX,
  originY,
  busX,
  childPoints,
}: CreateGenealogyFamilyConnectorNodeParams): Node<GenealogyFamilyConnectorNodeData> | null {
  if (childPoints.length === 0) return null;

  const minX = Math.min(originX, busX, ...childPoints.map((point) => point.x));
  const maxX = Math.max(originX, busX, ...childPoints.map((point) => point.x));
  const minY = Math.min(originY, ...childPoints.map((point) => point.y));
  const maxY = Math.max(originY, ...childPoints.map((point) => point.y));
  const padding = 8;
  const nodeX = minX - padding;
  const nodeY = minY - padding;

  return {
    id,
    type: 'genealogyFamilyConnectorNode',
    position: { x: nodeX, y: nodeY },
    data: {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      originX: originX - nodeX,
      originY: originY - nodeY,
      busX: busX - nodeX,
      childPoints: childPoints.map((point) => ({
        id: point.id,
        x: point.x - nodeX,
        y: point.y - nodeY,
      })),
    },
    draggable: false,
    selectable: false,
    zIndex: -20,
  };
}

function appendPlacementNodes(
  placements: GenealogyPersonPlacement[],
  x: number,
  startY: number,
  relationshipIndex: RelationshipIndex,
  personNodeById: Map<string, Node>,
  peopleById: Map<string, Pessoa>,
  filters: GenealogyFilters,
  nodes: Node[],
  edges: Edge[],
  onMarriageClick?: (details: MarriageNodeDetails) => void,
  positionedPeople?: Map<string, PositionedPerson>
) {
  let currentY = startY;
  const visiblePlacements = getVisiblePlacements(placements, filters);

  visiblePlacements.forEach(({ pessoa, directRelation }, index) => {
    const node = personNodeById.get(pessoa.id);
    if (!node) return;

    if (index > 0) {
      const previousPlacement = visiblePlacements[index - 1];
      const gap = getGapBetweenPeople(previousPlacement?.pessoa.id, pessoa.id, relationshipIndex);
      currentY += CARD_HEIGHT + gap;

      if (areSpouses(previousPlacement?.pessoa.id, pessoa.id, relationshipIndex)) {
        addGenealogySpouseEdge(edges, previousPlacement.pessoa.id, pessoa.id, relationshipIndex, peopleById, onMarriageClick);
      }
    }

    nodes.push(clonePersonNode(node, x, currentY, directRelation));
    positionedPeople?.set(pessoa.id, {
      placement: { pessoa, directRelation },
      x,
      y: currentY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  });

  return currentY + CARD_HEIGHT;
}

function getSpousesForPlacement(
  pessoa: Pessoa,
  peopleById: Map<string, Pessoa>,
  baseIndexById: Map<string, number>,
  sameGenerationIds: Set<string>,
  visitedIds: Set<string>,
  relationshipIndex: RelationshipIndex
) {
  return sortRelatedPeople(
    relationshipIndex.spousesByPerson.get(pessoa.id) || [],
    peopleById,
    baseIndexById,
    sameGenerationIds,
    visitedIds
  );
}

function buildChildFamilyBlock(
  childIds: Iterable<string>,
  group: GenerationGroup,
  relationshipIndex: RelationshipIndex,
  visitedIds: Set<string>
) {
  const peopleById = new Map(group.people.map((placement) => [placement.pessoa.id, placement.pessoa]));
  const baseIndexById = new Map(group.people.map((placement, index) => [placement.pessoa.id, index]));
  const sameGenerationIds = new Set(group.people.map((placement) => placement.pessoa.id));
  const relationVariants = getGenerationRelationVariants(group.key);
  const placements: GenealogyPersonPlacement[] = [];

  Array.from(childIds)
    .map((childId) => peopleById.get(childId))
    .filter((pessoa): pessoa is Pessoa => Boolean(pessoa) && !visitedIds.has(pessoa.id))
    .sort(comparePeopleByBirthAndName)
    .forEach((child) => {
      if (visitedIds.has(child.id)) return;

      visitedIds.add(child.id);
      placements.push({
        pessoa: child,
        directRelation: relationVariants.base,
      });

      const spouses = getSpousesForPlacement(
        child,
        peopleById,
        baseIndexById,
        sameGenerationIds,
        visitedIds,
        relationshipIndex
      );

      spouses.forEach((spouse) => {
        visitedIds.add(spouse.id);
        placements.push({
          pessoa: spouse,
          directRelation: relationVariants.spouseAlternate || relationVariants.base,
        });
      });
    });

  return placements;
}

function getOrderedParentPlacements(
  parentGroup: GenerationGroup,
  positionedPeople?: Map<string, PositionedPerson>
) {
  if (!positionedPeople) return parentGroup.people;

  const positioned = parentGroup.people
    .map((placement, originalIndex) => ({
      placement,
      originalIndex,
      positioned: positionedPeople.get(placement.pessoa.id),
    }))
    .filter((item) => item.positioned)
    .sort((itemA, itemB) => {
      const yA = itemA.positioned?.y ?? Number.POSITIVE_INFINITY;
      const yB = itemB.positioned?.y ?? Number.POSITIVE_INFINITY;

      if (yA !== yB) return yA - yB;
      return itemA.originalIndex - itemB.originalIndex;
    })
    .map((item) => item.positioned?.placement || item.placement);

  return positioned.length > 0 ? positioned : parentGroup.people;
}

function getParentBlockMetrics(
  parentPlacements: GenealogyPersonPlacement[],
  relationshipIndex: RelationshipIndex,
  filters: GenealogyFilters,
  positionedPeople?: Map<string, PositionedPerson>
) {
  const visibleParentPlacements = getVisiblePlacements(parentPlacements, filters);

  if (visibleParentPlacements.length === 0) {
    return { height: 0, topY: 0, centerY: 0 };
  }

  const positionedYs = visibleParentPlacements
    .map((placement) => positionedPeople?.get(placement.pessoa.id))
    .map((positioned) => positioned ? positioned.y + positioned.height / 2 : undefined)
    .filter((y): y is number => typeof y === 'number');

  if (positionedYs.length === visibleParentPlacements.length) {
    const positionedParents = visibleParentPlacements
      .map((placement) => positionedPeople?.get(placement.pessoa.id))
      .filter((positioned): positioned is PositionedPerson => Boolean(positioned));
    const minY = Math.min(...positionedParents.map((positioned) => positioned.y));
    const maxY = Math.max(...positionedParents.map((positioned) => positioned.y + positioned.height));

    return {
      height: maxY - minY,
      topY: minY,
      centerY: minY + (maxY - minY) / 2,
    };
  }

  const height = getPlacementBlockHeight(visibleParentPlacements, relationshipIndex);

  return {
    height,
    topY: 0,
    centerY: height / 2,
  };
}

function buildAdjacentGenerationParentUnits(
  parentGroup: GenerationGroup,
  childGroup: GenerationGroup | undefined,
  relationshipIndex: RelationshipIndex,
  filters: GenealogyFilters,
  visitedChildIds: Set<string>,
  positionedParents?: Map<string, PositionedPerson>
) {
  const units: Array<{
    parentPlacements: GenealogyPersonPlacement[];
    childPlacements: GenealogyPersonPlacement[];
    connectedChildIds: string[];
    parentHeight: number;
    parentTopY?: number;
    parentCenterY?: number;
    childrenHeight: number;
    unitHeight: number;
  }> = [];
  const parentPlacementsInOrder = getOrderedParentPlacements(parentGroup, positionedParents);

  for (let index = 0; index < parentPlacementsInOrder.length; index++) {
    const currentPlacement = parentPlacementsInOrder[index];
    const nextPlacement = parentPlacementsInOrder[index + 1];
    const parentPlacements = [currentPlacement];
    const childIds = new Set<string>();

    if (nextPlacement && areSpouses(currentPlacement.pessoa.id, nextPlacement.pessoa.id, relationshipIndex)) {
      parentPlacements.push(nextPlacement);
      relationshipIndex.childrenByCouple.get(
        getSpousePairKey(currentPlacement.pessoa.id, nextPlacement.pessoa.id)
      )?.forEach((childId) => childIds.add(childId));

      index++;
    } else {
      relationshipIndex.childrenByParent.get(currentPlacement.pessoa.id)?.forEach((childId) => {
        const parentIds = relationshipIndex.parentsByChild.get(childId);
        if (parentIds?.size === 1) {
          childIds.add(childId);
        }
      });
    }

    const childPlacements = childGroup
      ? buildChildFamilyBlock(childIds, childGroup, relationshipIndex, visitedChildIds)
      : [];
    const connectedChildIds = childGroup
      ? Array.from(childIds).filter((childId) => childGroup.people.some((placement) => placement.pessoa.id === childId))
      : [];
    const parentMetrics = getParentBlockMetrics(parentPlacements, relationshipIndex, filters, positionedParents);
    const childrenHeight = getPlacementBlockHeight(getVisiblePlacements(childPlacements, filters), relationshipIndex);

    units.push({
      parentPlacements,
      childPlacements,
      connectedChildIds,
      parentHeight: parentMetrics.height,
      parentTopY: positionedParents ? parentMetrics.topY : undefined,
      parentCenterY: positionedParents ? parentMetrics.centerY : undefined,
      childrenHeight,
      unitHeight: Math.max(parentMetrics.height, childrenHeight),
    });
  }

  return units;
}

function addFamilyConnectorDraft(
  drafts: GenealogyFamilyConnectorDraft[],
  parentPlacements: GenealogyPersonPlacement[],
  connectedChildIds: string[],
  parentGeneration: GenerationKey,
  childGeneration: GenerationKey,
  positionedPeople: Map<string, PositionedPerson>,
  filters: GenealogyFilters
) {
  const visibleParentIds = getVisiblePlacements(parentPlacements, filters)
    .map((placement) => placement.pessoa.id)
    .filter((personId) => positionedPeople.has(personId));
  const visibleChildIds = connectedChildIds.filter((childId) => {
    const positionedChild = positionedPeople.get(childId);
    return positionedChild ? isPlacementVisible(positionedChild.placement, filters) : false;
  });

  if (visibleParentIds.length === 0 || visibleChildIds.length === 0) {
    return;
  }

  const parentPositions = visibleParentIds
    .map((parentId) => positionedPeople.get(parentId))
    .filter((positioned): positioned is PositionedPerson => Boolean(positioned));
  const childPoints = visibleChildIds
    .map((childId) => positionedPeople.get(childId))
    .filter((positioned): positioned is PositionedPerson => Boolean(positioned))
    .map((positioned) => ({
      id: positioned.placement.pessoa.id,
      x: positioned.x,
      y: positioned.y + positioned.height / 2,
    }));

  if (parentPositions.length === 0 || childPoints.length === 0) {
    return;
  }

  const originX = Math.max(...parentPositions.map((positioned) => positioned.x + positioned.width));
  const originY = parentPositions.reduce(
    (total, positioned) => total + positioned.y + positioned.height / 2,
    0
  ) / parentPositions.length;
  const busX = originX + COLUMN_GAP / 2;
  const connectorId = [
    'genealogy-family-draft',
    parentGeneration ?? 'sem-geracao',
    childGeneration ?? 'sem-geracao',
    ...visibleParentIds,
    ...visibleChildIds,
  ].join('-');

  drafts.push({
    id: connectorId,
    parentIds: visibleParentIds,
    childIds: visibleChildIds,
    parentGeneration,
    childGeneration,
    originX,
    originY,
    busX,
    childPoints,
  });
}

function getFamilyConnectorOrigin(
  parentIds: string[],
  positionedPeople: Map<string, PositionedPerson>
) {
  const parentPositions = parentIds
    .map((parentId) => positionedPeople.get(parentId))
    .filter((positioned): positioned is PositionedPerson => Boolean(positioned));

  if (parentIds.length >= 2) {
    if (parentPositions.length < 2) return null;

    const [firstParent, secondParent] = parentPositions;
    const upperParent = firstParent.y <= secondParent.y ? firstParent : secondParent;
    const lowerParent = firstParent.y <= secondParent.y ? secondParent : firstParent;

    return {
      x: upperParent.x + upperParent.width / 2 + 16,
      y: (upperParent.y + upperParent.height + lowerParent.y) / 2,
    };
  }

  const parent = parentPositions[0];
  if (!parent) return null;

  return {
    x: parent.x + parent.width,
    y: parent.y + parent.height / 2,
  };
}

function getVisibleConnectedChildIds(
  connectedChildIds: string[],
  childGroup: GenerationGroup | undefined,
  filters: GenealogyFilters
) {
  if (!childGroup) return [];

  const childPlacementById = new Map(childGroup.people.map((placement) => [placement.pessoa.id, placement]));

  return connectedChildIds.filter((childId) => {
    const childPlacement = childPlacementById.get(childId);
    return childPlacement ? isPlacementVisible(childPlacement, filters) : false;
  });
}

function addGenealogyFamilyConnectorNodes({
  nodes,
  drafts,
  positionedPeople,
}: {
  nodes: Node[];
  drafts: GenealogyFamilyConnectorDraft[];
  positionedPeople: Map<string, PositionedPerson>;
}) {
  const addedConnectorIds = new Set<string>();
  const connectorItems = drafts
    .map((draft) => {
      const origin = getFamilyConnectorOrigin(draft.parentIds, positionedPeople);
      if (!origin) return null;

      const childPoints = draft.childIds
        .map((childId) => positionedPeople.get(childId))
        .filter((positioned): positioned is PositionedPerson => Boolean(positioned))
        .map((positioned) => ({
          id: positioned.placement.pessoa.id,
          x: positioned.x,
          y: positioned.y + positioned.height / 2,
        }));

      if (childPoints.length === 0) return null;

      const firstChildY = Math.min(...childPoints.map((point) => point.y));
      const childColumnLeftX = Math.min(...childPoints.map((point) => point.x));
      const generationPairKey = `${draft.parentGeneration ?? 'sem-geracao'}->${
        draft.childGeneration ?? 'sem-geracao'
      }`;

      return {
        draft,
        origin,
        childPoints,
        firstChildY,
        childColumnLeftX,
        generationPairKey,
        connectorId: `genealogy-family-connector-${draft.id}`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const laneByConnectorId = new Map<string, number>();
  const connectorItemsByGenerationPair = new Map<string, typeof connectorItems>();

  connectorItems.forEach((item) => {
    const generationPairItems = connectorItemsByGenerationPair.get(item.generationPairKey) ?? [];
    generationPairItems.push(item);
    connectorItemsByGenerationPair.set(item.generationPairKey, generationPairItems);
  });

  connectorItemsByGenerationPair.forEach((generationPairItems) => {
    generationPairItems
      .sort((itemA, itemB) => (
        itemA.origin.y - itemB.origin.y
        || itemA.firstChildY - itemB.firstChildY
        || itemA.connectorId.localeCompare(itemB.connectorId)
      ))
      .forEach((item, index) => {
        laneByConnectorId.set(item.connectorId, index % FAMILY_CONNECTOR_MAX_LANES);
      });
  });

  connectorItems.forEach((item) => {
    const laneIndex = laneByConnectorId.get(item.connectorId) ?? 0;
    const busX = item.childColumnLeftX
      - FAMILY_CONNECTOR_CHILD_BUS_OFFSET
      - laneIndex * FAMILY_CONNECTOR_LANE_GAP;

    if (addedConnectorIds.has(item.connectorId)) return;

    const connectorNode = createGenealogyFamilyConnectorNode({
      id: item.connectorId,
      originX: item.origin.x,
      originY: item.origin.y,
      busX,
      childPoints: item.childPoints,
    });

    if (!connectorNode) return;

    addedConnectorIds.add(item.connectorId);
    nodes.unshift(connectorNode);
  });
}

function layoutAdjacentGenerationFamilyUnits({
  parentGroup,
  childGroup,
  parentX,
  childX,
  baseY,
  relationshipIndex,
  personNodeById,
  peopleById,
  filters,
  nodes,
  edges,
  positionedPeople,
  familyConnectorDrafts,
  positionParents,
  onMarriageClick,
}: {
  parentGroup: GenerationGroup;
  childGroup?: GenerationGroup;
  parentX: number;
  childX?: number;
  baseY: number;
  relationshipIndex: RelationshipIndex;
  personNodeById: Map<string, Node>;
  peopleById: Map<string, Pessoa>;
  filters: GenealogyFilters;
  nodes: Node[];
  edges: Edge[];
  positionedPeople: Map<string, PositionedPerson>;
  familyConnectorDrafts: GenealogyFamilyConnectorDraft[];
  positionParents: boolean;
  onMarriageClick?: (details: MarriageNodeDetails) => void;
}) {
  const visitedChildIds = new Set<string>();
  const units = buildAdjacentGenerationParentUnits(
    parentGroup,
    childGroup,
    relationshipIndex,
    filters,
    visitedChildIds,
    positionParents ? undefined : positionedPeople
  );
  let currentUnitTopY = baseY;
  let childColumnBottomY = baseY;

  units.forEach((unit) => {
    const unitCenterY = positionParents
      ? currentUnitTopY + unit.unitHeight / 2
      : unit.parentCenterY ?? currentUnitTopY + unit.unitHeight / 2;
    const parentBlockTopY = unitCenterY - unit.parentHeight / 2;
    const childrenBlockTopY = unitCenterY - unit.childrenHeight / 2;

    if (positionParents) {
      appendPlacementNodes(
        unit.parentPlacements,
        parentX,
        parentBlockTopY,
        relationshipIndex,
        personNodeById,
        peopleById,
        filters,
        nodes,
        edges,
        onMarriageClick,
        positionedPeople
      );
    }

    const visibleChildPlacements = getVisiblePlacements(unit.childPlacements, filters);
    const visibleConnectedChildIds = getVisibleConnectedChildIds(unit.connectedChildIds, childGroup, filters);
    const parentIdsForConnector = getVisiblePlacements(unit.parentPlacements, filters)
      .map((placement) => placement.pessoa.id)
      .filter((personId) => positionedPeople.has(personId));
    const singleChildOrigin = unit.connectedChildIds.length === 1 && visibleConnectedChildIds.length === 1
      ? getFamilyConnectorOrigin(parentIdsForConnector, positionedPeople)
      : null;
    const alignedSingleChildTopY = singleChildOrigin
      ? singleChildOrigin.y - CARD_HEIGHT / 2
      : null;
    const minimumChildTopY = Math.max(baseY, childColumnBottomY);
    const canUseSingleChildAlignment = alignedSingleChildTopY !== null && alignedSingleChildTopY >= minimumChildTopY;
    const childStartY = canUseSingleChildAlignment
      ? alignedSingleChildTopY
      : Math.max(
          minimumChildTopY,
          currentUnitTopY,
          alignedSingleChildTopY ?? childrenBlockTopY
        );

    if (childGroup && childX !== undefined && visibleChildPlacements.length > 0) {
      appendPlacementNodes(
        unit.childPlacements,
        childX,
        childStartY,
        relationshipIndex,
        personNodeById,
        peopleById,
        filters,
        nodes,
        edges,
        onMarriageClick,
        positionedPeople
      );
    }

    if (childGroup) {
      addFamilyConnectorDraft(
        familyConnectorDrafts,
        unit.parentPlacements,
        unit.connectedChildIds,
        parentGroup.key,
        childGroup.key,
        positionedPeople,
        filters
      );
    }

    const parentBottomY = positionParents
      ? parentBlockTopY + unit.parentHeight
      : (unit.parentTopY ?? parentBlockTopY) + unit.parentHeight;
    const childrenBottomY = visibleChildPlacements.length > 0
      ? childStartY + unit.childrenHeight
      : currentUnitTopY + unit.unitHeight;
    if (visibleChildPlacements.length > 0) {
      childColumnBottomY = childrenBottomY + FAMILY_UNIT_GAP;
    }
    currentUnitTopY = Math.max(currentUnitTopY + unit.unitHeight, parentBottomY, childrenBottomY) + FAMILY_UNIT_GAP;
  });

  if (!childGroup || childX === undefined) return;

  const remainingPlacements = childGroup.people.filter((placement) => !visitedChildIds.has(placement.pessoa.id));
  if (remainingPlacements.length === 0) return;

  appendPlacementNodes(
    remainingPlacements,
    childX,
    Math.max(baseY, currentUnitTopY, childColumnBottomY),
    relationshipIndex,
    personNodeById,
    peopleById,
    filters,
    nodes,
    edges,
    onMarriageClick,
    positionedPeople
  );
}

export function genealogyColumnsLayout(
  graph: TreeLayoutParams,
  options: GenealogyColumnsLayoutOptions = {}
): TreeLayoutResult {
  const filters = options.filters ?? DEFAULT_GENEALOGY_FILTERS;
  const onMarriageClick = options.onMarriageClick;
  const relationshipIndex = buildRelationshipIndex(graph);
  const groups = groupPeopleByGeneration(graph, relationshipIndex);
  const personNodeById = new Map(graph.personNodes.map((node) => [node.id, node]));
  const peopleById = new Map(graph.pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const positionedPeople = new Map<string, PositionedPerson>();
  const familyConnectorDrafts: GenealogyFamilyConnectorDraft[] = [];

  if (groups.length === 0) {
    addLabelNode(
      nodes,
      'genealogy-title',
      'Árvore Genealógica',
      TITLE_CENTER_X - TITLE_WIDTH / 2,
      TITLE_TOP,
      TITLE_WIDTH,
      'title',
      'Use o zoom, arraste a árvore e clique na pessoa para abrir detalhes.'
    );

    return { nodes, edges: [] };
  }

  const totalWidth = groups.length * CARD_WIDTH + Math.max(0, groups.length - 1) * COLUMN_GAP;
  const startX = -totalWidth / 2;
  const getColumnX = (columnIndex: number) => startX + columnIndex * (CARD_WIDTH + COLUMN_GAP);
  const columnIndexByGeneration = new Map(groups.map((group, index) => [group.key, index]));

  addLabelNode(
    nodes,
    'genealogy-title',
    'Árvore Genealógica',
    TITLE_CENTER_X - TITLE_WIDTH / 2,
    TITLE_TOP,
    TITLE_WIDTH,
    'title',
    'Use o zoom, arraste a árvore e clique na pessoa para abrir detalhes.'
  );

  groups.forEach((group, columnIndex) => {
    const x = getColumnX(columnIndex);
    const labelId = group.key === null ? 'genealogy-generation-empty' : `genealogy-generation-${group.key}`;

    addLabelNode(nodes, labelId, group.label, x, COLUMN_TOP, CARD_WIDTH, 'group');
  });

  groups.forEach((group, columnIndex) => {
    const x = getColumnX(columnIndex);
    const firstCardY = COLUMN_TOP + COLUMN_LABEL_HEIGHT + LABEL_TO_CARD_GAP;
    const nextGenerationKey = typeof group.key === 'number' ? group.key + 1 : undefined;
    const childGroupIndex = nextGenerationKey !== undefined
      ? columnIndexByGeneration.get(nextGenerationKey)
      : undefined;
    const childGroup = childGroupIndex !== undefined ? groups[childGroupIndex] : undefined;
    const hasPositionedGroupPeople = group.people.some((placement) => positionedPeople.has(placement.pessoa.id));

    if (childGroup) {
      layoutAdjacentGenerationFamilyUnits({
        parentGroup: group,
        childGroup,
        parentX: x,
        childX: getColumnX(childGroupIndex),
        baseY: firstCardY,
        relationshipIndex,
        personNodeById,
        peopleById,
        filters,
        nodes,
        edges,
        positionedPeople,
        familyConnectorDrafts,
        positionParents: !hasPositionedGroupPeople,
        onMarriageClick,
      });

      return;
    }

    if (hasPositionedGroupPeople) {
      return;
    }

    appendPlacementNodes(
      group.people,
      x,
      firstCardY,
      relationshipIndex,
      personNodeById,
      peopleById,
      filters,
      nodes,
      edges,
      onMarriageClick,
      positionedPeople
    );
  });

  addGenealogyFamilyConnectorNodes({
    nodes,
    drafts: familyConnectorDrafts,
    positionedPeople,
  });

  return { nodes, edges };
}
