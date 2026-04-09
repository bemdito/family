import { Node } from 'reactflow';
import {
  TREE_CONSTANTS,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
  GenerationColumnMeta,
} from '../types';

function computeBaseGenerations(
  childParentsMap: Map<string, Set<string>>,
  personIds: string[]
) {
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (personId: string): number => {
    if (memo.has(personId)) return memo.get(personId)!;
    if (visiting.has(personId)) {
      return 0;
    }

    visiting.add(personId);

    const parentIds = Array.from(childParentsMap.get(personId) || []);
    let generation = 0;

    if (parentIds.length > 0) {
      generation = Math.max(...parentIds.map((parentId) => visit(parentId) + 1));
    }

    visiting.delete(personId);
    memo.set(personId, generation);
    return generation;
  };

  personIds.forEach((personId) => visit(personId));
  return memo;
}

function computeGenerations(
  childParentsMap: Map<string, Set<string>>,
  personIds: string[],
  marriageMap: Map<string, string>
) {
  const generations = computeBaseGenerations(childParentsMap, personIds);
  const maxIterations = Math.max(1, personIds.length * 4);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    marriageMap.forEach((_, marriageKey) => {
      const [person1Id, person2Id] = marriageKey.split('::');
      const gen1 = generations.get(person1Id) ?? 0;
      const gen2 = generations.get(person2Id) ?? 0;
      const alignedGen = Math.max(gen1, gen2);

      if (gen1 !== alignedGen) {
        generations.set(person1Id, alignedGen);
        changed = true;
      }

      if (gen2 !== alignedGen) {
        generations.set(person2Id, alignedGen);
        changed = true;
      }
    });

    childParentsMap.forEach((parentIds, childId) => {
      const parentGenerations = Array.from(parentIds).map((parentId) => generations.get(parentId) ?? 0);
      if (parentGenerations.length === 0) return;

      const desiredChildGen = Math.max(...parentGenerations) + 1;
      const currentChildGen = generations.get(childId) ?? 0;

      if (currentChildGen !== desiredChildGen) {
        generations.set(childId, desiredChildGen);
        changed = true;
      }
    });

    if (!changed) break;
  }

  const minGeneration = Math.min(...Array.from(generations.values()));
  if (Number.isFinite(minGeneration) && minGeneration !== 0) {
    generations.forEach((level, personId) => {
      generations.set(personId, level - minGeneration);
    });
  }

  return generations;
}

function normalizeName(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function generationColumnsLayout({
  personNodes,
  marriageNodes,
  edges,
  marriageMap,
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

  const generations = computeGenerations(
    childParentsMap,
    personNodes.map((node) => node.id),
    marriageMap
  );

  const comparePeople = (aId: string, bId: string) => {
    const pessoaA = pessoaById.get(aId);
    const pessoaB = pessoaById.get(bId);

    const aDate = getSortableBirthValue(pessoaA?.data_nascimento);
    const bDate = getSortableBirthValue(pessoaB?.data_nascimento);

    if (aDate !== bDate) return aDate - bDate;
    return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
  };

  // Geração visual desejada por pessoa.
  // Atenção: aqui o valor é 0-based:
  // Geração 1 = 0
  // Geração 2 = 1
  // Geração 3 = 2
  // Geração 5 = 4
  const generationOverrideByName = new Map<string, number>([
    [normalizeName('Amalia Tsangaropoulos'), 0],
    [normalizeName('Dimitri Tsangaropoulos'), 0],
    [normalizeName('Athanase Tsangaropoulos'), 1],
    [normalizeName('Charalambos Tsangaropoulos'), 2],
    [normalizeName('Ivanira'), 2],
    [normalizeName('Condilênia Maria Tsangaropulos Souza'), 4],
  ]);

  const getVisualGeneration = (personId: string) => {
    const pessoa = pessoaById.get(personId);
    const override = generationOverrideByName.get(normalizeName(pessoa?.nome_completo));

    if (typeof override === 'number') {
      return override;
    }

    return generations.get(personId) ?? 0;
  };

  const peopleByGeneration = new Map<number, string[]>();
  personNodes.forEach((node) => {
    const visualLevel = getVisualGeneration(node.id);

    if (!peopleByGeneration.has(visualLevel)) {
      peopleByGeneration.set(visualLevel, []);
    }

    peopleByGeneration.get(visualLevel)!.push(node.id);
  });

  const occupiedLevels = Array.from(peopleByGeneration.keys()).sort((a, b) => a - b);
  const maxOccupiedLevel = occupiedLevels.length > 0 ? Math.max(...occupiedLevels) : 0;

  const allLevels = Array.from({ length: maxOccupiedLevel + 1 }, (_, index) => index);

  const generationColumns: GenerationColumnMeta[] = allLevels.map((level) => ({
    level,
    label: `Geração ${level + 1}`,
    x: INITIAL_X + level * HORIZONTAL_GAP_BETWEEN_GENERATIONS,
  }));

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
    const currentX = INITIAL_X + level * HORIZONTAL_GAP_BETWEEN_GENERATIONS;
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

      const person1Level = getVisualGeneration(person1Id);
      const person2Level = getVisualGeneration(person2Id);

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
      if (edge.type !== 'orthogonalChild') return edge;

      const sourceNode = positionedNodes.find((node) => node.id === edge.source);
      const targetNode = positionedNodes.find((node) => node.id === edge.target);
      if (!sourceNode || !targetNode) return edge;

      const edgeKind = (edge.data as { kind?: string } | undefined)?.kind;

      if (edgeKind === 'siblings') {
        return edge;
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
      const targetLeftX = targetNode.position.x;

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