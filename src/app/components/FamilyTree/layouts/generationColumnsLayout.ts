import { Node } from 'reactflow';
import {
  TREE_CONSTANTS,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
  GenerationColumnMeta,
} from '../types';
import {
  computeEffectiveGenerations,
  getGenerationLabel,
} from './generationUtils';

export function generationColumnsLayout({
  personNodes,
  marriageNodes,
  edges,
  marriageMap,
  childrenByMarriage,
  pessoas,
  childParentsMap,
}: TreeLayoutParams): TreeLayoutResult {
  const {
    NODE_WIDTH,
    NODE_HEIGHT,
    MARRIAGE_NODE_WIDTH,
    HORIZONTAL_GAP_BETWEEN_GENERATIONS,
    INITIAL_X,
    INITIAL_Y,
  } = TREE_CONSTANTS;

  const SPOUSE_VERTICAL_GAP = 72;
  const BLOCK_VERTICAL_GAP = 80;
  const SINGLE_PARENT_CHILD_GAP = 140;
  const HEADER_OFFSET_Y = 72;

  const personMap = new Map(personNodes.map((node) => [node.id, node]));
  const marriageNodeMap = new Map(marriageNodes.map((node) => [node.id, node]));
  const pessoaById = new Map(pessoas.map((p) => [p.id, p]));

  const generations = computeEffectiveGenerations(
    childParentsMap,
    personNodes.map((node) => node.id),
    pessoas
  );

  const comparePeople = (aId: string, bId: string) => {
    const pessoaA = pessoaById.get(aId);
    const pessoaB = pessoaById.get(bId);

    const aDate = getSortableBirthValue(pessoaA?.data_nascimento);
    const bDate = getSortableBirthValue(pessoaB?.data_nascimento);

    if (aDate !== bDate) return aDate - bDate;
    return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
  };

  const peopleByGeneration = new Map<number, string[]>();
  personNodes.forEach((node) => {
    const visualLevel = generations.get(node.id) ?? 0;

    if (!peopleByGeneration.has(visualLevel)) {
      peopleByGeneration.set(visualLevel, []);
    }

    peopleByGeneration.get(visualLevel)!.push(node.id);
  });

  const occupiedLevels = Array.from(peopleByGeneration.keys()).sort((a, b) => a - b);
  const minOccupiedLevel = occupiedLevels.length > 0 ? Math.min(...occupiedLevels) : 0;
  const maxOccupiedLevel = occupiedLevels.length > 0 ? Math.max(...occupiedLevels) : 0;

  const allLevels = Array.from(
    { length: maxOccupiedLevel - minOccupiedLevel + 1 },
    (_, index) => minOccupiedLevel + index
  );

  const generationColumns: GenerationColumnMeta[] = allLevels.map((level) => ({
    level,
    label: getGenerationLabel(level),
    x: INITIAL_X + (level - minOccupiedLevel) * HORIZONTAL_GAP_BETWEEN_GENERATIONS,
  }));

  const getColumnX = (level: number) =>
    INITIAL_X + (level - minOccupiedLevel) * HORIZONTAL_GAP_BETWEEN_GENERATIONS;

  const positionedNodes: Node[] = [];
  const positionedNodeIds = new Set<string>();

  const headerNodes: Node[] = generationColumns.map((column) => ({
    id: `generation-header-${column.level}`,
    type: 'generationHeaderNode',
    data: {
      label: column.label,
      generation: column.level,
    },
    position: {
      x: column.x,
      y: Math.max(0, INITIAL_Y - HEADER_OFFSET_Y),
    },
    draggable: false,
    selectable: false,
    connectable: false,
  }));

  headerNodes.forEach((node) => {
    positionedNodes.push(node);
    positionedNodeIds.add(node.id);
  });

  const getParentIds = (personId: string) => Array.from(childParentsMap.get(personId) || []).sort();

  const getAnchorY = (personId: string) => {
    const parentIds = getParentIds(personId);
    if (parentIds.length === 0) return Number.POSITIVE_INFINITY;

    if (parentIds.length === 2) {
      const marriageNodeId = marriageMap.get(parentIds.join('::'));
      if (marriageNodeId) {
        const marriageNode = positionedNodes.find((node) => node.id === marriageNodeId);
        if (marriageNode) {
          return marriageNode.position.y + MARRIAGE_NODE_WIDTH / 2;
        }
      }
    }

    const parentCenters = parentIds
      .map((parentId) => positionedNodes.find((node) => node.id === parentId))
      .filter((node): node is Node => Boolean(node))
      .map((node) => node.position.y + NODE_HEIGHT / 2);

    if (parentCenters.length === 0) return Number.POSITIVE_INFINITY;
    return Math.min(...parentCenters);
  };

  occupiedLevels.forEach((level) => {
    const currentX = getColumnX(level);
    const peopleInLevel = [...(peopleByGeneration.get(level) || [])].sort(comparePeople);

    const blocks: Array<{
      memberIds: string[];
      marriageNodeId?: string;
      anchorY: number;
      sortId: string;
    }> = [];

    const processed = new Set<string>();

    marriageMap.forEach((marriageNodeId, marriageKey) => {
      const [person1Id, person2Id] = marriageKey.split('::');

      const person1Level = generations.get(person1Id) ?? 0;
      const person2Level = generations.get(person2Id) ?? 0;

      if (person1Level !== level || person2Level !== level) return;

      if (!peopleInLevel.includes(person1Id) || !peopleInLevel.includes(person2Id)) return;

      const ordered = [person1Id, person2Id].sort(comparePeople);
      blocks.push({
        memberIds: ordered,
        marriageNodeId,
        anchorY: getAnchorY(ordered[0]),
        sortId: ordered[0],
      });

      processed.add(person1Id);
      processed.add(person2Id);
    });

    peopleInLevel.forEach((personId) => {
      if (processed.has(personId)) return;

      blocks.push({
        memberIds: [personId],
        anchorY: getAnchorY(personId),
        sortId: personId,
      });
    });

    blocks.sort((a, b) => {
      const aFinite = Number.isFinite(a.anchorY);
      const bFinite = Number.isFinite(b.anchorY);

      if (aFinite && bFinite && a.anchorY !== b.anchorY) {
        return a.anchorY - b.anchorY;
      }

      if (aFinite !== bFinite) {
        return aFinite ? -1 : 1;
      }

      return comparePeople(a.sortId, b.sortId);
    });

    let currentY = INITIAL_Y;

    blocks.forEach((block) => {
      const desiredY = Number.isFinite(block.anchorY)
        ? Math.max(INITIAL_Y, block.anchorY - NODE_HEIGHT / 2)
        : currentY;

      currentY = Math.max(currentY, desiredY);

      if (block.memberIds.length === 2) {
        const [topPersonId, bottomPersonId] = block.memberIds;
        const topNode = personMap.get(topPersonId);
        const bottomNode = personMap.get(bottomPersonId);
        const marriageNode = block.marriageNodeId
          ? marriageNodeMap.get(block.marriageNodeId)
          : undefined;

        const topY = currentY;
        const bottomY = topY + NODE_HEIGHT + SPOUSE_VERTICAL_GAP;
        const marriageY = topY + NODE_HEIGHT + SPOUSE_VERTICAL_GAP / 2 - MARRIAGE_NODE_WIDTH / 2;
        const marriageX = currentX + NODE_WIDTH / 2 - MARRIAGE_NODE_WIDTH / 2;

        if (topNode) {
          topNode.position = { x: currentX, y: topY };
          positionedNodes.push(topNode);
          positionedNodeIds.add(topNode.id);
        }

        if (marriageNode) {
          marriageNode.position = { x: marriageX, y: marriageY };
          positionedNodes.push(marriageNode);
          positionedNodeIds.add(marriageNode.id);
        }

        if (bottomNode) {
          bottomNode.position = { x: currentX, y: bottomY };
          positionedNodes.push(bottomNode);
          positionedNodeIds.add(bottomNode.id);
        }

        currentY = bottomY + NODE_HEIGHT + BLOCK_VERTICAL_GAP;
        return;
      }

      const node = personMap.get(block.memberIds[0]);
      if (node) {
        node.position = { x: currentX, y: currentY };
        positionedNodes.push(node);
        positionedNodeIds.add(node.id);
      }

      currentY += NODE_HEIGHT + BLOCK_VERTICAL_GAP;
    });
  });

  const validEdges = edges
    .filter((edge) => positionedNodeIds.has(edge.source) && positionedNodeIds.has(edge.target))
    .map((edge) => {
      if (!['orthogonalChild', 'childEdge', 'siblingEdge'].includes(edge.type || '')) return edge;

      const sourceNode = positionedNodes.find((node) => node.id === edge.source);
      const targetNode = positionedNodes.find((node) => node.id === edge.target);
      if (!sourceNode || !targetNode) return edge;

      const edgeKind = (edge.data as { kind?: string } | undefined)?.kind;

      if (edgeKind === 'siblings') {
        return {
          ...edge,
          data: {
            ...(edge.data || {}),
            corridorX: Math.min(sourceNode.position.x, targetNode.position.x) - 40,
          },
        };
      }

      if (edgeKind === 'singleParentChild') {
        const sourceCenterX = sourceNode.position.x + NODE_WIDTH / 2;
        const sourceBottomY = sourceNode.position.y + NODE_HEIGHT;
        const targetLeftX = targetNode.position.x;

        return {
          ...edge,
          data: {
            ...(edge.data || {}),
            kind: 'singleParentChild',
            corridorX: sourceCenterX + (targetLeftX - sourceCenterX) / 2,
            corridorY: sourceBottomY + SINGLE_PARENT_CHILD_GAP / 3,
          },
        };
      }

      const sourceCenterX =
        sourceNode.position.x +
        (sourceNode.type === 'marriageNode' ? MARRIAGE_NODE_WIDTH / 2 : NODE_WIDTH / 2);
      const sourceCenterY =
        sourceNode.position.y +
        (sourceNode.type === 'marriageNode' ? MARRIAGE_NODE_WIDTH / 2 : NODE_HEIGHT / 2);
      const targetLeftX = targetNode.position.x;
      const targetCenterY = targetNode.position.y + NODE_HEIGHT / 2;

      if (sourceNode.type === 'marriageNode') {
        const childIds = childrenByMarriage.get(sourceNode.id) || [targetNode.id];
        const childCenterYs = childIds
          .map((childId) => positionedNodes.find((node) => node.id === childId))
          .filter((node): node is Node => Boolean(node))
          .map((node) => node.position.y + NODE_HEIGHT / 2);
        const trunkX = targetLeftX - 72;

        return {
          ...edge,
          type: 'childEdge',
          data: {
            ...(edge.data || {}),
            kind: 'familyChild',
            startX: sourceCenterX,
            startY: sourceCenterY,
            trunkX,
            trunkMinY: Math.min(sourceCenterY, targetCenterY, ...childCenterYs),
            trunkMaxY: Math.max(sourceCenterY, targetCenterY, ...childCenterYs),
          },
        };
      }

      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          kind: 'generationChild',
          corridorX: sourceCenterX + (targetLeftX - sourceCenterX) / 2,
        },
      };
    });

  return {
    nodes: positionedNodes,
    edges: validEdges,
    metadata: {
      generationColumns,
    },
  };
}
