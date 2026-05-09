import { Edge, Node } from 'reactflow';
import { Relacionamento } from '../../../types';
import {
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelationVariant,
  DirectRelativeFilters,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
} from '../types';
import { DIRECT_FAMILY_TOKENS } from '../visualTokens';

interface DirectFamilyLayoutOptions {
  centralPersonId?: string;
  filters?: DirectRelativeFilters;
}

type ParentKind = 'pai' | 'mae' | 'parent';
type DirectSide = 'paternal' | 'maternal';

interface ParentLink {
  parentId: string;
  childId: string;
  kind: ParentKind;
}

interface RelationshipIndex {
  parentsByChild: Map<string, ParentLink[]>;
  childrenByParent: Map<string, Set<string>>;
  siblingsByPerson: Map<string, Set<string>>;
  spousesByPerson: Map<string, Set<string>>;
}

interface GroupSpec {
  key: string;
  label: string;
  ids: string[];
  variant: DirectRelationVariant;
  maxPerRow: number;
  centerX: number;
  side?: DirectSide;
  laneWidth?: number;
  alignBoundary?: {
    side: 'left' | 'right';
    x: number;
  };
}

interface GroupBoxBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

interface GroupLayoutUnit {
  ids: string[];
}

interface GroupGridMetrics {
  rows: GroupLayoutUnit[][];
  largestRow: number;
  columns: number;
  cardsHeight: number;
  cardsWidth: number;
}

const FRAME_LEFT = 10;
const FRAME_RIGHT = 3210;
const FRAME_TOP = 10;
const FRAME_BOTTOM = 2190;
const TITLE_TOP = FRAME_TOP + 10;
const TITLE_WIDTH = 1540;
const TITLE_RESERVED_HEIGHT = 80;
const VIEW_CENTER_X = (FRAME_LEFT + FRAME_RIGHT) / 2;
const VIEW_CENTER_Y = (FRAME_TOP + FRAME_BOTTOM) / 2;

const CARD_WIDTH = DIRECT_FAMILY_TOKENS.CARD_WIDTH;
const CARD_HEIGHT = DIRECT_FAMILY_TOKENS.CARD_HEIGHT;
const CENTRAL_WIDTH = DIRECT_FAMILY_TOKENS.CENTRAL_WIDTH;
const CENTRAL_HEIGHT = DIRECT_FAMILY_TOKENS.CENTRAL_HEIGHT;
const LEGEND_WIDTH = Math.min(760, CENTRAL_WIDTH * 1.8);
const LEGEND_HEIGHT = 92;
const LEGEND_BOTTOM_GAP = 30;

const SIDE_GROUPS_TOP = 155;
const SIDE_GROUPS_BOTTOM = 1835;
const CENTRAL_GROUP_TOP = 250;
const CENTRAL_GROUP_BOTTOM = 1585;

const GROUP_BOX_PADDING_X = 10;
const GROUP_BOX_PADDING_Y = 10;
const LABEL_HEIGHT = 30;
const LABEL_TO_CARD_GAP = 8;
const COLUMN_GAP = 14;
const ROW_GAP = 16;
const ROW_STEP = CARD_HEIGHT + ROW_GAP;
const SIDE_TOP = SIDE_GROUPS_TOP;
const SIDE_BOTTOM = SIDE_GROUPS_BOTTOM;
const SIDE_GROUP_MIN_GAP = 8;
const CENTRAL_X = VIEW_CENTER_X - CENTRAL_WIDTH / 2;
const CENTRAL_Y = 520;
const PARENT_GROUP_Y = CENTRAL_GROUP_TOP + 65;
const PARENT_GROUP_GAP = 260;
const FATHER_GROUP_CENTER_X = VIEW_CENTER_X - PARENT_GROUP_GAP;
const MOTHER_GROUP_CENTER_X = VIEW_CENTER_X + PARENT_GROUP_GAP;
const CENTRAL_LEFT_BOUNDARY = CENTRAL_X - 80;
const CENTRAL_RIGHT_BOUNDARY = CENTRAL_X + CENTRAL_WIDTH + 80;
const SIDE_INNER_GAP = 12;
const PATERNAL_LANE_LEFT = FRAME_LEFT;
const PATERNAL_LANE_RIGHT = CENTRAL_LEFT_BOUNDARY - SIDE_INNER_GAP;
const MATERNAL_LANE_LEFT = CENTRAL_RIGHT_BOUNDARY + SIDE_INNER_GAP;
const MATERNAL_LANE_RIGHT = FRAME_RIGHT;
const SIDE_LANE_WIDTH = Math.min(
  PATERNAL_LANE_RIGHT - PATERNAL_LANE_LEFT,
  MATERNAL_LANE_RIGHT - MATERNAL_LANE_LEFT
);
const PATERNAL_GROUP_LANE_WIDTH = Math.min(820, SIDE_LANE_WIDTH);
const MATERNAL_GROUP_LANE_WIDTH = Math.min(820, SIDE_LANE_WIDTH);
const PATERNAL_CENTER_X = FRAME_LEFT + (CENTRAL_LEFT_BOUNDARY - FRAME_LEFT) / 2;
const MATERNAL_CENTER_X = CENTRAL_RIGHT_BOUNDARY + (FRAME_RIGHT - CENTRAL_RIGHT_BOUNDARY) / 2;
const LOWER_GROUP_Y = CENTRAL_Y + CENTRAL_HEIGHT + 80;
const LOWER_LANE_WIDTH = 760;
const LOWER_GROUP_GAP = 18;
const LOWER_LEFT_GROUP_CENTER_X = FATHER_GROUP_CENTER_X;
const LOWER_RIGHT_GROUP_CENTER_X = MOTHER_GROUP_CENTER_X;
const DIRECT_STRUCTURAL_EDGE_STYLE = {
  stroke: DIRECT_FAMILY_TOKENS.EDGE_STROKE,
  strokeWidth: DIRECT_FAMILY_TOKENS.EDGE_STROKE_WIDTH,
  opacity: DIRECT_FAMILY_TOKENS.EDGE_OPACITY,
};
const ANCESTOR_SPOUSE_EDGE_STYLE = {
  stroke: DIRECT_FAMILY_TOKENS.EDGE_STROKE,
  strokeWidth: DIRECT_FAMILY_TOKENS.SPOUSE_EDGE_STROKE_WIDTH,
  opacity: DIRECT_FAMILY_TOKENS.EDGE_OPACITY,
};

function unique(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function sortPersonIds(ids: string[], pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>) {
  return unique(ids).sort((aId, bId) => {
    const pessoaA = pessoasById.get(aId);
    const pessoaB = pessoasById.get(bId);
    const birthA = getSortableBirthValue(pessoaA?.data_nascimento);
    const birthB = getSortableBirthValue(pessoaB?.data_nascimento);

    if (birthA !== birthB) return birthA - birthB;
    return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
  });
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string) {
  if (!key || !value || key === value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

function addParentLink(index: RelationshipIndex, link: ParentLink) {
  if (!link.parentId || !link.childId || link.parentId === link.childId) return;

  const current = index.parentsByChild.get(link.childId) || [];
  const hasLink = current.some(
    (item) => item.parentId === link.parentId && item.childId === link.childId
  );

  if (!hasLink) {
    current.push(link);
    index.parentsByChild.set(link.childId, current);
  }

  addToSetMap(index.childrenByParent, link.parentId, link.childId);
}

function buildRelationshipIndex(relacionamentos: Relacionamento[]): RelationshipIndex {
  const index: RelationshipIndex = {
    parentsByChild: new Map(),
    childrenByParent: new Map(),
    siblingsByPerson: new Map(),
    spousesByPerson: new Map(),
  };

  relacionamentos.forEach((rel) => {
    if (rel.tipo_relacionamento === 'conjuge') {
      addToSetMap(index.spousesByPerson, rel.pessoa_origem_id, rel.pessoa_destino_id);
      addToSetMap(index.spousesByPerson, rel.pessoa_destino_id, rel.pessoa_origem_id);
      return;
    }

    if (rel.tipo_relacionamento === 'irmao') {
      addToSetMap(index.siblingsByPerson, rel.pessoa_origem_id, rel.pessoa_destino_id);
      addToSetMap(index.siblingsByPerson, rel.pessoa_destino_id, rel.pessoa_origem_id);
      return;
    }

    if (rel.tipo_relacionamento === 'filho') {
      addParentLink(index, {
        parentId: rel.pessoa_origem_id,
        childId: rel.pessoa_destino_id,
        kind: 'parent',
      });
      return;
    }

    if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') {
      addParentLink(index, {
        parentId: rel.pessoa_destino_id,
        childId: rel.pessoa_origem_id,
        kind: rel.tipo_relacionamento,
      });
    }
  });

  return index;
}

function findParents(
  personId: string,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  return sortPersonIds((index.parentsByChild.get(personId) || []).map((link) => link.parentId), pessoasById);
}

function findParentByKind(
  personId: string,
  kind: 'pai' | 'mae',
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  const explicit = (index.parentsByChild.get(personId) || []).find((link) => link.kind === kind)?.parentId;
  if (explicit) return explicit;
  return findParents(personId, index, pessoasById)[kind === 'pai' ? 0 : 1];
}

function findChildren(
  personId: string | undefined,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  if (!personId) return [];
  return sortPersonIds(Array.from(index.childrenByParent.get(personId) || []), pessoasById);
}

function findSiblings(
  personId: string,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  const parentIds = findParents(personId, index, pessoasById);
  const sharedParentSiblings = parentIds.flatMap((parentId) => findChildren(parentId, index, pessoasById));
  const explicitSiblings = Array.from(index.siblingsByPerson.get(personId) || []);

  return sortPersonIds(
    unique([...sharedParentSiblings, ...explicitSiblings]).filter((id) => id !== personId),
    pessoasById
  );
}

function findGrandparents(
  parentId: string | undefined,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  if (!parentId) return [];
  return findParents(parentId, index, pessoasById);
}

function findGreatGrandparents(
  ancestorIds: string[],
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  return sortPersonIds(ancestorIds.flatMap((ancestorId) => findParents(ancestorId, index, pessoasById)), pessoasById);
}

function findUnclesAndAunts(
  parentId: string | undefined,
  otherParentId: string | undefined,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  if (!parentId) return [];
  return findSiblings(parentId, index, pessoasById).filter((id) => id !== otherParentId);
}

function findCousins(
  uncleAndAuntIds: string[],
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  return sortPersonIds(uncleAndAuntIds.flatMap((id) => findChildren(id, index, pessoasById)), pessoasById);
}

function groupByPaternalMaternalSide(
  centralPersonId: string,
  index: RelationshipIndex,
  pessoasById: Map<string, TreeLayoutParams['pessoas'][number]>
) {
  const parents = findParents(centralPersonId, index, pessoasById);
  const fatherId = findParentByKind(centralPersonId, 'pai', index, pessoasById) || parents[0];
  const motherId = findParentByKind(centralPersonId, 'mae', index, pessoasById) || parents.find((id) => id !== fatherId);

  const paternalGrandparents = findGrandparents(fatherId, index, pessoasById);
  const maternalGrandparents = findGrandparents(motherId, index, pessoasById);
  const paternalGreatGrandparents = findGreatGrandparents(paternalGrandparents, index, pessoasById);
  const maternalGreatGrandparents = findGreatGrandparents(maternalGrandparents, index, pessoasById);
  const paternalGreatGreatGrandparents = findGreatGrandparents(paternalGreatGrandparents, index, pessoasById);
  const maternalGreatGreatGrandparents = findGreatGrandparents(maternalGreatGrandparents, index, pessoasById);
  const paternalUncles = findUnclesAndAunts(fatherId, motherId, index, pessoasById);
  const maternalUncles = findUnclesAndAunts(motherId, fatherId, index, pessoasById);

  return {
    fatherId,
    motherId,
    paternal: {
      greatGreatGrandparents: paternalGreatGreatGrandparents,
      greatGrandparents: paternalGreatGrandparents,
      grandparents: paternalGrandparents,
      parent: fatherId ? [fatherId] : [],
      uncles: paternalUncles,
      cousins: findCousins(paternalUncles, index, pessoasById),
    },
    maternal: {
      greatGreatGrandparents: maternalGreatGreatGrandparents,
      greatGrandparents: maternalGreatGrandparents,
      grandparents: maternalGrandparents,
      parent: motherId ? [motherId] : [],
      uncles: maternalUncles,
      cousins: findCousins(maternalUncles, index, pessoasById),
    },
  };
}

function finitePosition(x: number, y: number) {
  return {
    x: Number.isFinite(x) ? x : VIEW_CENTER_X,
    y: Number.isFinite(y) ? y : VIEW_CENTER_Y,
  };
}

function labelWidth(label: string, variant: 'group' | 'title' = 'group') {
  if (variant === 'title') return TITLE_WIDTH;
  return Math.min(420, Math.max(220, label.length * 11 + 40));
}

function addLabel(
  nodes: Node[],
  id: string,
  label: string,
  centerX: number,
  y: number,
  variant: 'group' | 'title' = 'group',
  subtitle?: string
) {
  const width = labelWidth(label, variant);
  nodes.push({
    id,
    type: 'directFamilyLabelNode',
    data: { label, subtitle, width, variant },
    position: finitePosition(centerX - width / 2, y),
    draggable: false,
    selectable: false,
  });
}

function clonePersonNode(
  node: Node,
  x: number,
  y: number,
  variant: DirectRelationVariant,
  isCentral = false
): Node {
  return {
    ...node,
    position: finitePosition(x, y),
    draggable: false,
    selectable: false,
    data: {
      ...node.data,
      directRelation: variant,
      isCentralPerson: isCentral,
      isSelected: isCentral || node.data?.isSelected,
    },
  };
}

function addGroupBox(nodes: Node[], id: string, x: number, y: number, width: number, height: number) {
  nodes.unshift({
    id: `direct-group-box-${id}`,
    type: 'directFamilyGroupBoxNode',
    data: { width, height },
    position: finitePosition(x, y),
    draggable: false,
    selectable: false,
    zIndex: -10,
  });
}

function addAnchor(nodes: Node[], positionedIds: Set<string>, id: string, x: number, y: number) {
  nodes.push({
    id,
    type: 'directFamilyAnchorNode',
    data: {},
    position: finitePosition(x, y),
    draggable: false,
    selectable: false,
  });
  positionedIds.add(id);
}

function getGroupBoxBounds(nodes: Node[], key: string): GroupBoxBounds | null {
  const groupBox = nodes.find((node) => node.id === `direct-group-box-${key}`);
  if (!groupBox) return null;

  const width = Number(groupBox.data?.width) || 0;
  const height = Number(groupBox.data?.height) || 0;
  if (width <= 0 || height <= 0) return null;

  return {
    minX: groupBox.position.x,
    minY: groupBox.position.y,
    maxX: groupBox.position.x + width,
    maxY: groupBox.position.y + height,
    centerX: groupBox.position.x + width / 2,
    centerY: groupBox.position.y + height / 2,
  };
}

function unitCardCount(unit: GroupLayoutUnit) {
  return unit.ids.length;
}

function rowCardCount(row: GroupLayoutUnit[]) {
  return row.reduce((sum, unit) => sum + unitCardCount(unit), 0);
}

function buildGroupLayoutUnits(ids: string[], index?: RelationshipIndex) {
  const groupIds = new Set(ids);
  const usedIds = new Set<string>();
  const units: GroupLayoutUnit[] = [];

  ids.forEach((id) => {
    if (usedIds.has(id)) return;

    const spouseId = Array.from(index?.spousesByPerson.get(id) || []).find(
      (candidateId) => groupIds.has(candidateId) && !usedIds.has(candidateId)
    );

    if (spouseId) {
      units.push({ ids: [id, spouseId] });
      usedIds.add(id);
      usedIds.add(spouseId);
      return;
    }

    units.push({ ids: [id] });
    usedIds.add(id);
  });

  return units;
}

function buildGroupRows(ids: string[], maxPerRow: number, index?: RelationshipIndex) {
  const units = buildGroupLayoutUnits(ids, index);
  const columns = Math.max(
    1,
    Math.min(
      Math.max(maxPerRow, ...units.map(unitCardCount)),
      Math.max(1, ids.length)
    )
  );
  const rows: GroupLayoutUnit[][] = [];
  let currentRow: GroupLayoutUnit[] = [];
  let currentCards = 0;

  units.forEach((unit) => {
    const unitSize = unitCardCount(unit);
    if (currentRow.length > 0 && currentCards + unitSize > columns) {
      rows.push(currentRow);
      currentRow = [];
      currentCards = 0;
    }

    currentRow.push(unit);
    currentCards += unitSize;
  });

  if (currentRow.length > 0) rows.push(currentRow);
  if (rows.length === 0) rows.push([]);

  return { rows, columns };
}

function groupGridMetrics(ids: string[], maxPerRow: number, index?: RelationshipIndex): GroupGridMetrics {
  const { rows, columns } = buildGroupRows(ids, maxPerRow, index);
  const largestRow = Math.max(1, ...rows.map(rowCardCount));
  const rowCount = Math.max(1, rows.length);

  return {
    rows,
    largestRow,
    columns,
    cardsHeight: rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * ROW_GAP,
    cardsWidth: largestRow * CARD_WIDTH + Math.max(0, largestRow - 1) * COLUMN_GAP,
  };
}

function groupHeight(ids: string[], maxPerRow: number, index?: RelationshipIndex) {
  const metrics = groupGridMetrics(ids, maxPerRow, index);
  return GROUP_BOX_PADDING_Y * 2 + LABEL_HEIGHT + LABEL_TO_CARD_GAP + metrics.cardsHeight;
}

function groupWidthForColumns(label: string, columns: number) {
  const cardsWidth = columns * CARD_WIDTH + Math.max(0, columns - 1) * COLUMN_GAP;
  return Math.max(cardsWidth, labelWidth(label)) + GROUP_BOX_PADDING_X * 2;
}

function compactColumns(ids: string[], label: string, maxColumns: number, laneWidth: number, index?: RelationshipIndex) {
  const visibleCount = Math.max(1, ids.length);
  const units = buildGroupLayoutUnits(ids, index);
  const minColumns = Math.max(1, ...units.map(unitCardCount));
  if (maxColumns <= 1) return 1;

  const cappedMax = Math.min(Math.max(maxColumns, minColumns), visibleCount);
  const preferred = visibleCount <= 2
    ? Math.min(Math.max(2, minColumns), cappedMax)
    : visibleCount <= 4
      ? Math.min(Math.max(2, minColumns), cappedMax)
      : Math.min(3, cappedMax);

  for (let columns = preferred; columns >= minColumns; columns -= 1) {
    if (groupWidthForColumns(label, columns) <= laneWidth) return columns;
  }

  return minColumns;
}

function resolveGroupColumns(spec: GroupSpec, ids = spec.ids, index?: RelationshipIndex) {
  return compactColumns(ids, spec.label, spec.maxPerRow, spec.laneWidth || SIDE_LANE_WIDTH, index);
}

function visibleGroupHeight(ids: string[], maxPerRow: number, index?: RelationshipIndex) {
  return ids.length > 0 ? groupHeight(ids, maxPerRow, index) : 0;
}

function placeGroup(
  spec: GroupSpec,
  topY: number,
  positionedNodes: Node[],
  positionedIds: Set<string>,
  personNodeById: Map<string, Node>,
  index?: RelationshipIndex
) {
  const visibleIds = spec.ids.filter((id) => !positionedIds.has(id) && personNodeById.has(id));
  if (visibleIds.length === 0) return [];

  const maxPerRow = resolveGroupColumns(spec, visibleIds, index);
  const metrics = groupGridMetrics(visibleIds, maxPerRow, index);
  const groupWidth = Math.max(metrics.cardsWidth, labelWidth(spec.label)) + GROUP_BOX_PADDING_X * 2;
  const groupX = spec.alignBoundary?.side === 'left'
    ? spec.alignBoundary.x
    : spec.alignBoundary?.side === 'right'
      ? spec.alignBoundary.x - groupWidth
      : spec.centerX - groupWidth / 2;
  const groupCenterX = groupX + groupWidth / 2;
  const labelY = topY + GROUP_BOX_PADDING_Y;
  const firstCardY = labelY + LABEL_HEIGHT + LABEL_TO_CARD_GAP;
  const placedIds: string[] = [];

  addLabel(positionedNodes, `direct-label-${spec.key}`, spec.label, groupCenterX, labelY);

  for (let rowIndex = 0; rowIndex < metrics.rows.length; rowIndex += 1) {
    const rowIds = metrics.rows[rowIndex].flatMap((unit) => unit.ids);
    const rowWidth = rowIds.length * CARD_WIDTH + Math.max(0, rowIds.length - 1) * COLUMN_GAP;
    const startX = groupCenterX - rowWidth / 2;

    rowIds.forEach((id, index) => {
      const node = personNodeById.get(id);
      if (!node) return;

      positionedNodes.push(clonePersonNode(
        node,
        startX + index * (CARD_WIDTH + COLUMN_GAP),
        firstCardY + rowIndex * ROW_STEP,
        spec.variant
      ));
      positionedIds.add(id);
      placedIds.push(id);
    });
  }

  addGroupBox(positionedNodes, spec.key, groupX, topY, groupWidth, groupHeight(visibleIds, maxPerRow, index));

  return placedIds;
}

function placeGroupStack(
  groups: GroupSpec[],
  positionedNodes: Node[],
  positionedIds: Set<string>,
  personNodeById: Map<string, Node>,
  index?: RelationshipIndex
) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      ids: group.ids.filter((id) => !positionedIds.has(id) && personNodeById.has(id)),
    }))
    .filter((group) => group.ids.length > 0);

  if (visibleGroups.length === 0) return [];

  const resolvedGroups = visibleGroups.map((group) => ({
    ...group,
    maxPerRow: resolveGroupColumns(group, group.ids, index),
  }));
  const heights = resolvedGroups.map((group) => groupHeight(group.ids, group.maxPerRow, index));
  const availableHeight = SIDE_BOTTOM - SIDE_TOP;
  const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  const rawGap = resolvedGroups.length > 1
    ? (availableHeight - totalHeight) / (resolvedGroups.length - 1)
    : (availableHeight - totalHeight) / 2;
  const uniformGap = Math.max(
    SIDE_GROUP_MIN_GAP,
    Number.isFinite(rawGap) ? rawGap : SIDE_GROUP_MIN_GAP
  );
  let cursorY = SIDE_TOP;
  const placedIds: string[] = [];

  resolvedGroups.forEach((group, groupIndex) => {
    placedIds.push(...placeGroup(group, cursorY, positionedNodes, positionedIds, personNodeById, index));
    cursorY += heights[groupIndex] + uniformGap;
  });

  return placedIds;
}

function addCentralPerson(
  centralPersonId: string,
  positionedNodes: Node[],
  positionedIds: Set<string>,
  personNodeById: Map<string, Node>
) {
  const node = personNodeById.get(centralPersonId);
  if (!node) return;

  positionedNodes.push(clonePersonNode(node, CENTRAL_X, CENTRAL_Y, 'central', true));
  positionedIds.add(centralPersonId);
}

function createEdgeBuilder(positionedIds: Set<string>) {
  const edges: Edge[] = [];
  const signatures = new Set<string>();

  const addEdge = (edge: Edge) => {
    if (!positionedIds.has(edge.source) || !positionedIds.has(edge.target)) return;
    const signature = [edge.source, edge.target, edge.type, edge.sourceHandle, edge.targetHandle].join('|');
    if (signatures.has(signature)) return;
    signatures.add(signature);
    edges.push(edge);
  };

  return { edges, addEdge };
}

function addGroupBoundaryAnchors(
  nodes: Node[],
  positionedIds: Set<string>,
  key: string,
  bounds: GroupBoxBounds
) {
  addAnchor(nodes, positionedIds, `direct-group-${key}-top-anchor`, bounds.centerX, bounds.minY);
  addAnchor(nodes, positionedIds, `direct-group-${key}-bottom-anchor`, bounds.centerX, bounds.maxY);
  addAnchor(nodes, positionedIds, `direct-group-${key}-left-anchor`, bounds.minX, bounds.centerY);
  addAnchor(nodes, positionedIds, `direct-group-${key}-right-anchor`, bounds.maxX, bounds.centerY);
  addAnchor(nodes, positionedIds, `direct-group-${key}-center-anchor`, bounds.centerX, bounds.centerY);
}

function addDirectStructuralEdge(
  addEdge: (edge: Edge) => void,
  id: string,
  source: string,
  target: string,
  kind: 'directHorizontal' | 'directElbowFromCenter' | 'directSideElbow',
  options: {
    sourceHandle?: string;
    targetHandle?: string;
    elbowY?: number;
    elbowX?: number;
  } = {}
) {
  addEdge({
    id,
    source,
    sourceHandle: options.sourceHandle || 'right',
    target,
    targetHandle: options.targetHandle || 'left',
    type: 'childEdge',
    selectable: false,
    style: DIRECT_STRUCTURAL_EDGE_STYLE,
    data: {
      kind,
      elbowY: options.elbowY,
      elbowX: options.elbowX,
    },
  });
}

function addGroupBoxConnection(
  addEdge: (edge: Edge) => void,
  sourceGroupKey: string,
  targetGroupKey: string
) {
  addDirectStructuralEdge(
    addEdge,
    `direct-group-${sourceGroupKey}-to-${targetGroupKey}`,
    `direct-group-${sourceGroupKey}-bottom-anchor`,
    `direct-group-${targetGroupKey}-top-anchor`,
    'directHorizontal',
    {
      sourceHandle: 'bottom',
      targetHandle: 'top',
    }
  );
}

function addConsecutiveGroupConnections(
  addEdge: (edge: Edge) => void,
  groupKeys: string[],
  groupBoundsByKey: Map<string, GroupBoxBounds>
) {
  const visibleKeys = groupKeys.filter((key) => groupBoundsByKey.has(key));

  for (let index = 0; index < visibleKeys.length - 1; index += 1) {
    addGroupBoxConnection(addEdge, visibleKeys[index], visibleKeys[index + 1]);
  }
}

function findPositionedNode(nodes: Node[], id: string) {
  return nodes.find((node) => node.id === id);
}

function addAncestorSpouseEdge(addEdge: (edge: Edge) => void, leftId: string | undefined, rightId: string | undefined) {
  if (!leftId || !rightId || leftId === rightId) return;

  addEdge({
    id: `direct-ancestor-spouse-${[leftId, rightId].sort().join('-')}`,
    source: leftId,
    sourceHandle: 'spouse-right',
    target: rightId,
    targetHandle: 'spouse-left',
    type: 'spouseEdge',
    selectable: false,
    style: ANCESTOR_SPOUSE_EDGE_STYLE,
    data: {
      kind: 'directHorizontal',
      forceHorizontal: true,
      horizontalTolerance: 4,
    },
  });
}

function addAncestorSpouseEdges(
  addEdge: (edge: Edge) => void,
  ids: string[],
  positionedNodes: Node[],
  index: RelationshipIndex
) {
  const groupIds = new Set(ids);
  const addedPairs = new Set<string>();

  ids.forEach((personId) => {
    Array.from(index.spousesByPerson.get(personId) || [])
      .filter((spouseId) => groupIds.has(spouseId))
      .forEach((spouseId) => {
        const pairKey = [personId, spouseId].sort().join('|');
        if (addedPairs.has(pairKey)) return;
        addedPairs.add(pairKey);

        const personNode = findPositionedNode(positionedNodes, personId);
        const spouseNode = findPositionedNode(positionedNodes, spouseId);
        if (!personNode || !spouseNode) return;

        const leftId = personNode.position.x <= spouseNode.position.x ? personId : spouseId;
        const rightId = leftId === personId ? spouseId : personId;
        addAncestorSpouseEdge(addEdge, leftId, rightId);
      });
  });
}

function addTitle(nodes: Node[], centralPersonName: string) {
  const firstName = centralPersonName.trim().split(/\s+/)[0] || centralPersonName;
  addLabel(
    nodes,
    'direct-title',
    `Linha Genealógica de ${firstName}`,
    VIEW_CENTER_X,
    TITLE_TOP,
    'title',
    'Use zoom, arraste a árvore e clique nas pessoas para abrir detalhes.'
  );
}

function addLegend(nodes: Node[]) {
  nodes.push({
    id: 'direct-legend',
    type: 'directFamilyLegendNode',
    data: {
      width: LEGEND_WIDTH,
      height: LEGEND_HEIGHT,
    },
    position: finitePosition(
      CENTRAL_X + CENTRAL_WIDTH / 2 - LEGEND_WIDTH / 2,
      CENTRAL_Y - LEGEND_HEIGHT - LEGEND_BOTTOM_GAP
    ),
    draggable: false,
    selectable: false,
  });
}

export function directFamilyDistributedLayout(
  graph: TreeLayoutParams,
  options: DirectFamilyLayoutOptions = {}
): TreeLayoutResult {
  const filters = options.filters || DEFAULT_DIRECT_RELATIVE_FILTERS;
  const personNodeById = new Map(graph.personNodes.map((node) => [node.id, node]));
  const pessoasById = new Map(graph.pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const index = buildRelationshipIndex(graph.relacionamentos);
  const centralPersonId = options.centralPersonId && personNodeById.has(options.centralPersonId)
    ? options.centralPersonId
    : graph.pessoas[0]?.id;

  if (!centralPersonId || !personNodeById.has(centralPersonId)) {
    return { nodes: [], edges: [] };
  }

  const centralPerson = pessoasById.get(centralPersonId);
  const sides = groupByPaternalMaternalSide(centralPersonId, index, pessoasById);
  const positionedNodes: Node[] = [];
  const positionedIds = new Set<string>();

  addTitle(positionedNodes, centralPerson?.nome_completo || '');
  addCentralPerson(centralPersonId, positionedNodes, positionedIds, personNodeById);

  const paternalGroups: GroupSpec[] = [
    { key: 'tataravos-paternos', label: 'Tataravós paternos', ids: filters.tataravos ? sides.paternal.greatGreatGrandparents : [], variant: 'greatGreatGrandparent', maxPerRow: 3, centerX: PATERNAL_CENTER_X, side: 'paternal', laneWidth: PATERNAL_GROUP_LANE_WIDTH },
    { key: 'bisavos-paternos', label: 'Bisavós paternos', ids: filters.bisavos ? sides.paternal.greatGrandparents : [], variant: 'greatGrandparent', maxPerRow: 3, centerX: PATERNAL_CENTER_X, side: 'paternal', laneWidth: PATERNAL_GROUP_LANE_WIDTH },
    { key: 'avos-paternos', label: 'Avós paternos', ids: filters.avos ? sides.paternal.grandparents : [], variant: 'grandparent', maxPerRow: 2, centerX: PATERNAL_CENTER_X, side: 'paternal', laneWidth: PATERNAL_GROUP_LANE_WIDTH },
    { key: 'tios-paternos', label: 'Tios paternos', ids: filters.tios ? sides.paternal.uncles : [], variant: 'uncleAunt', maxPerRow: 3, centerX: PATERNAL_CENTER_X, side: 'paternal', laneWidth: PATERNAL_GROUP_LANE_WIDTH },
    { key: 'primos-paternos', label: 'Primos paternos', ids: filters.primos ? sides.paternal.cousins : [], variant: 'cousin', maxPerRow: 3, centerX: PATERNAL_CENTER_X, side: 'paternal', laneWidth: PATERNAL_GROUP_LANE_WIDTH },
  ];

  const maternalGroups: GroupSpec[] = [
    { key: 'tataravos-maternos', label: 'Tataravós maternos', ids: filters.tataravos ? sides.maternal.greatGreatGrandparents : [], variant: 'greatGreatGrandparent', maxPerRow: 3, centerX: MATERNAL_CENTER_X, side: 'maternal', laneWidth: MATERNAL_GROUP_LANE_WIDTH },
    { key: 'bisavos-maternos', label: 'Bisavós maternos', ids: filters.bisavos ? sides.maternal.greatGrandparents : [], variant: 'greatGrandparent', maxPerRow: 3, centerX: MATERNAL_CENTER_X, side: 'maternal', laneWidth: MATERNAL_GROUP_LANE_WIDTH },
    { key: 'avos-maternos', label: 'Avós maternos', ids: filters.avos ? sides.maternal.grandparents : [], variant: 'grandparent', maxPerRow: 2, centerX: MATERNAL_CENTER_X, side: 'maternal', laneWidth: MATERNAL_GROUP_LANE_WIDTH },
    { key: 'tios-maternos', label: 'Tios maternos', ids: filters.tios ? sides.maternal.uncles : [], variant: 'uncleAunt', maxPerRow: 3, centerX: MATERNAL_CENTER_X, side: 'maternal', laneWidth: MATERNAL_GROUP_LANE_WIDTH },
    { key: 'primos-maternos', label: 'Primos maternos', ids: filters.primos ? sides.maternal.cousins : [], variant: 'cousin', maxPerRow: 3, centerX: MATERNAL_CENTER_X, side: 'maternal', laneWidth: MATERNAL_GROUP_LANE_WIDTH },
  ];

  placeGroupStack(paternalGroups, positionedNodes, positionedIds, personNodeById, index);
  placeGroupStack(maternalGroups, positionedNodes, positionedIds, personNodeById, index);

  const motherGroup: GroupSpec = {
    key: 'mae',
    label: 'MÃE',
    ids: sides.maternal.parent,
    variant: 'parent',
    maxPerRow: 1,
    centerX: MOTHER_GROUP_CENTER_X,
    laneWidth: CARD_WIDTH + GROUP_BOX_PADDING_X * 2,
  };
  const fatherGroup: GroupSpec = {
    key: 'pai',
    label: 'PAI',
    ids: sides.paternal.parent,
    variant: 'parent',
    maxPerRow: 1,
    centerX: FATHER_GROUP_CENTER_X,
    laneWidth: CARD_WIDTH + GROUP_BOX_PADDING_X * 2,
  };

  placeGroup(motherGroup, PARENT_GROUP_Y, positionedNodes, positionedIds, personNodeById, index);
  placeGroup(fatherGroup, PARENT_GROUP_Y, positionedNodes, positionedIds, personNodeById, index);

  const allSiblings = findSiblings(centralPersonId, index, pessoasById);
  const siblings = filters.irmaos ? allSiblings : [];
  const spouses = filters.conjuge ? sortPersonIds(Array.from(index.spousesByPerson.get(centralPersonId) || []), pessoasById) : [];
  const children = filters.filhos ? findChildren(centralPersonId, index, pessoasById) : [];
  const grandchildren = filters.netos ? sortPersonIds(children.flatMap((id) => findChildren(id, index, pessoasById)), pessoasById) : [];
  const nephews = filters.sobrinhos ? sortPersonIds(allSiblings.flatMap((id) => findChildren(id, index, pessoasById)), pessoasById) : [];
  const siblingGroup: GroupSpec = {
    key: 'irmaos',
    label: 'Irmãos',
    ids: siblings,
    variant: 'sibling',
    maxPerRow: 1,
    centerX: LOWER_LEFT_GROUP_CENTER_X,
    laneWidth: LOWER_LANE_WIDTH,
  };
  const nephewGroup: GroupSpec = {
    key: 'sobrinhos',
    label: 'Sobrinhos',
    ids: nephews,
    variant: 'nephewNiece',
    maxPerRow: 3,
    centerX: LOWER_LEFT_GROUP_CENTER_X,
    laneWidth: LOWER_LANE_WIDTH,
  };
  const spouseGroup: GroupSpec = {
    key: 'conjuge',
    label: 'Cônjuge',
    ids: spouses,
    variant: 'spouse',
    maxPerRow: 1,
    centerX: LOWER_RIGHT_GROUP_CENTER_X,
    laneWidth: LOWER_LANE_WIDTH,
  };
  const childrenGroup: GroupSpec = {
    key: 'filhos',
    label: 'Filhos',
    ids: children,
    variant: 'child',
    maxPerRow: 3,
    centerX: LOWER_RIGHT_GROUP_CENTER_X,
    laneWidth: LOWER_LANE_WIDTH,
  };
  const grandchildrenGroup: GroupSpec = {
    key: 'netos',
    label: 'Netos',
    ids: grandchildren,
    variant: 'grandchild',
    maxPerRow: 3,
    centerX: LOWER_RIGHT_GROUP_CENTER_X,
    laneWidth: LOWER_LANE_WIDTH,
  };
  const siblingsHeight = visibleGroupHeight(siblings, resolveGroupColumns(siblingGroup, siblings, index), index);
  const spouseHeight = visibleGroupHeight(spouses, resolveGroupColumns(spouseGroup, spouses, index), index);
  const childrenHeight = visibleGroupHeight(children, resolveGroupColumns(childrenGroup, children, index), index);
  const nephewsY = siblingsHeight > 0 ? LOWER_GROUP_Y + siblingsHeight + LOWER_GROUP_GAP : LOWER_GROUP_Y;
  const childrenY = spouseHeight > 0 ? LOWER_GROUP_Y + spouseHeight + LOWER_GROUP_GAP : LOWER_GROUP_Y;
  const grandchildrenY = childrenHeight > 0 ? childrenY + childrenHeight + LOWER_GROUP_GAP : childrenY;

  placeGroup(siblingGroup, LOWER_GROUP_Y, positionedNodes, positionedIds, personNodeById, index);
  placeGroup(nephewGroup, nephewsY, positionedNodes, positionedIds, personNodeById, index);
  placeGroup(spouseGroup, LOWER_GROUP_Y, positionedNodes, positionedIds, personNodeById, index);
  placeGroup(childrenGroup, childrenY, positionedNodes, positionedIds, personNodeById, index);
  placeGroup(grandchildrenGroup, grandchildrenY, positionedNodes, positionedIds, personNodeById, index);

  const groupBoundsByKey = new Map<string, GroupBoxBounds>();
  [
    'tataravos-paternos',
    'bisavos-paternos',
    'avos-paternos',
    'pai',
    'tios-paternos',
    'primos-paternos',
    'tataravos-maternos',
    'bisavos-maternos',
    'avos-maternos',
    'mae',
    'tios-maternos',
    'primos-maternos',
    'irmaos',
    'sobrinhos',
    'conjuge',
    'filhos',
  ].forEach((key) => {
    const bounds = getGroupBoxBounds(positionedNodes, key);
    if (!bounds) return;
    groupBoundsByKey.set(key, bounds);
    addGroupBoundaryAnchors(positionedNodes, positionedIds, key, bounds);
  });

  const fatherGroupBounds = groupBoundsByKey.get('pai');
  const motherGroupBounds = groupBoundsByKey.get('mae');
  const paternalUnclesGroupBounds = groupBoundsByKey.get('tios-paternos');
  const maternalUnclesGroupBounds = groupBoundsByKey.get('tios-maternos');
  const siblingsGroupBounds = groupBoundsByKey.get('irmaos');
  const spouseGroupBounds = groupBoundsByKey.get('conjuge');
  const centralBottomY = CENTRAL_Y + CENTRAL_HEIGHT;
  const lowerGroupTopY = Math.min(
    siblingsGroupBounds?.minY ?? Number.POSITIVE_INFINITY,
    spouseGroupBounds?.minY ?? Number.POSITIVE_INFINITY
  );
  const lowerConnectionElbowY = Number.isFinite(lowerGroupTopY)
    ? Math.min(centralBottomY + 54, lowerGroupTopY - 18)
    : centralBottomY + 54;

  if (fatherGroupBounds && motherGroupBounds) {
    const parentCoupleMidX = (fatherGroupBounds.maxX + motherGroupBounds.minX) / 2;
    const parentCoupleMidY = (fatherGroupBounds.centerY + motherGroupBounds.centerY) / 2;
    addAnchor(positionedNodes, positionedIds, 'direct-parent-couple-mid-anchor', parentCoupleMidX, parentCoupleMidY);
    addAnchor(positionedNodes, positionedIds, 'direct-central-top-anchor', VIEW_CENTER_X, CENTRAL_Y);
  } else if (fatherGroupBounds || motherGroupBounds) {
    const singleParentBounds = fatherGroupBounds || motherGroupBounds;
    if (singleParentBounds) {
      addAnchor(positionedNodes, positionedIds, 'direct-single-parent-bottom-anchor', singleParentBounds.centerX, singleParentBounds.maxY);
      addAnchor(positionedNodes, positionedIds, 'direct-central-top-anchor', VIEW_CENTER_X, CENTRAL_Y);
    }
  }

  if (siblingsGroupBounds || spouseGroupBounds) {
    addAnchor(positionedNodes, positionedIds, 'direct-center-bottom-anchor', VIEW_CENTER_X, centralBottomY);
  }

  if (siblingsGroupBounds) {
    addAnchor(positionedNodes, positionedIds, 'direct-siblings-group-top-anchor', siblingsGroupBounds.centerX, siblingsGroupBounds.minY);
  }

  if (spouseGroupBounds) {
    addAnchor(positionedNodes, positionedIds, 'direct-spouse-group-top-anchor', spouseGroupBounds.centerX, spouseGroupBounds.minY);
  }

  const { edges, addEdge } = createEdgeBuilder(positionedIds);

  if (fatherGroupBounds && motherGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-father-to-parent-mid',
      'direct-group-pai-right-anchor',
      'direct-parent-couple-mid-anchor',
      'directHorizontal',
      {
        sourceHandle: 'right',
        targetHandle: 'left',
      }
    );
    addDirectStructuralEdge(
      addEdge,
      'direct-parent-mid-to-mother',
      'direct-parent-couple-mid-anchor',
      'direct-group-mae-left-anchor',
      'directHorizontal',
      {
        sourceHandle: 'right',
        targetHandle: 'left',
      }
    );
    addDirectStructuralEdge(
      addEdge,
      'direct-parent-mid-to-central-top',
      'direct-parent-couple-mid-anchor',
      'direct-central-top-anchor',
      'directElbowFromCenter',
      {
        sourceHandle: 'bottom',
        targetHandle: 'top',
        elbowY: CENTRAL_Y - 32,
      }
    );
  } else if (fatherGroupBounds || motherGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-single-parent-to-central-top',
      'direct-single-parent-bottom-anchor',
      'direct-central-top-anchor',
      'directElbowFromCenter',
      {
        sourceHandle: 'bottom',
        targetHandle: 'top',
        elbowY: CENTRAL_Y - 32,
      }
    );
  }

  if (fatherGroupBounds && paternalUnclesGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-father-to-paternal-uncles',
      'direct-group-pai-left-anchor',
      'direct-group-tios-paternos-right-anchor',
      'directSideElbow',
      {
        sourceHandle: 'left',
        targetHandle: 'right',
        elbowX: (paternalUnclesGroupBounds.maxX + fatherGroupBounds.minX) / 2,
      }
    );
  }

  if (motherGroupBounds && maternalUnclesGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-mother-to-maternal-uncles',
      'direct-group-mae-right-anchor',
      'direct-group-tios-maternos-left-anchor',
      'directSideElbow',
      {
        sourceHandle: 'right',
        targetHandle: 'left',
        elbowX: (motherGroupBounds.maxX + maternalUnclesGroupBounds.minX) / 2,
      }
    );
  }

  if (siblingsGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-central-to-siblings-group',
      'direct-center-bottom-anchor',
      'direct-siblings-group-top-anchor',
      'directElbowFromCenter',
      {
        sourceHandle: 'bottom',
        targetHandle: 'top',
        elbowY: lowerConnectionElbowY,
      }
    );
  }

  if (spouseGroupBounds) {
    addDirectStructuralEdge(
      addEdge,
      'direct-central-to-spouse-group',
      'direct-center-bottom-anchor',
      'direct-spouse-group-top-anchor',
      'directElbowFromCenter',
      {
        sourceHandle: 'bottom',
        targetHandle: 'top',
        elbowY: lowerConnectionElbowY,
      }
    );
  }

  addConsecutiveGroupConnections(
    addEdge,
    ['tataravos-paternos', 'bisavos-paternos', 'avos-paternos', 'tios-paternos', 'primos-paternos'],
    groupBoundsByKey
  );
  addConsecutiveGroupConnections(
    addEdge,
    ['tataravos-maternos', 'bisavos-maternos', 'avos-maternos', 'tios-maternos', 'primos-maternos'],
    groupBoundsByKey
  );
  addConsecutiveGroupConnections(addEdge, ['irmaos', 'sobrinhos'], groupBoundsByKey);
  addConsecutiveGroupConnections(addEdge, ['conjuge', 'filhos'], groupBoundsByKey);

  addAncestorSpouseEdges(addEdge, sides.paternal.greatGreatGrandparents, positionedNodes, index);
  addAncestorSpouseEdges(addEdge, sides.maternal.greatGreatGrandparents, positionedNodes, index);
  addAncestorSpouseEdges(addEdge, sides.paternal.greatGrandparents, positionedNodes, index);
  addAncestorSpouseEdges(addEdge, sides.maternal.greatGrandparents, positionedNodes, index);
  addAncestorSpouseEdges(addEdge, sides.paternal.grandparents, positionedNodes, index);
  addAncestorSpouseEdges(addEdge, sides.maternal.grandparents, positionedNodes, index);

  return {
    nodes: positionedNodes,
    edges,
  };
}
