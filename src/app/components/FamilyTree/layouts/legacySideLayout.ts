import { Edge, Node } from 'reactflow';
import { Pessoa } from '../../types';
import {
  TREE_CONSTANTS,
  TreeLayoutParams,
  TreeLayoutResult,
  isLeftSidePerson,
  isRightSidePerson,
  getStablePersonComparator,
} from '../types';

export function legacySideLayout({
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
    HORIZONTAL_GAP_BETWEEN_SPOUSES,
    HORIZONTAL_GAP_TO_CHILDREN,
    HORIZONTAL_GAP_BETWEEN_GENERATIONS,
    INITIAL_X,
    INITIAL_Y,
  } = TREE_CONSTANTS;

  const parentColumnRightOffsetFromMarriage =
    NODE_WIDTH + HORIZONTAL_GAP_BETWEEN_SPOUSES / 2 + MARRIAGE_NODE_WIDTH / 2;

  const parentToChildrenMap = new Map<string, string[]>();

  childParentsMap.forEach((parentIds, childId) => {
    parentIds.forEach((parentId) => {
      if (!parentToChildrenMap.has(parentId)) {
        parentToChildrenMap.set(parentId, []);
      }
      parentToChildrenMap.get(parentId)!.push(childId);
    });
  });

  const generations = new Map<string, number>();
  const visiting = new Set<string>();

  function setGeneration(personId: string, level: number) {
    const current = generations.get(personId);
    if (current === undefined || level > current) {
      generations.set(personId, level);
    }
  }

  function calculateGeneration(personId: string, level: number = 0) {
    if (visiting.has(personId)) return;
    visiting.add(personId);

    setGeneration(personId, level);

    const children = parentToChildrenMap.get(personId) || [];
    children.forEach((childId) => {
      calculateGeneration(childId, level + 1);
    });

    visiting.delete(personId);
  }

  const allChildren = new Set<string>();
  childParentsMap.forEach((_, childId) => allChildren.add(childId));

  const availablePersonIds = new Set(personNodes.map((n) => n.id));

  personNodes.forEach((node) => {
    if (!allChildren.has(node.id)) {
      calculateGeneration(node.id, 0);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;

    childParentsMap.forEach((parentIds, childId) => {
      const childGen = generations.get(childId) ?? 0;
      let maxParentGen = -1;

      parentIds.forEach((parentId) => {
        const parentGen = generations.get(parentId);
        if (parentGen !== undefined) {
          maxParentGen = Math.max(maxParentGen, parentGen);
        }
      });

      if (maxParentGen >= 0) {
        const desiredChildGen = maxParentGen + 1;
        if (childGen < desiredChildGen) {
          generations.set(childId, desiredChildGen);
          changed = true;
        }
      }
    });
  }

  const getPessoaById = (id: string) => pessoas.find((p) => p.id === id);

  const comparePeople = getStablePersonComparator(pessoas, childParentsMap, undefined, marriageMap, marriageNodes);

  const getCoupleDisplayOrder = (person1Id: string, person2Id: string): [string, string] => {
    const pessoa1 = getPessoaById(person1Id);
    const pessoa2 = getPessoaById(person2Id);

    const person1IsLeft = isLeftSidePerson(pessoa1);
    const person2IsLeft = isLeftSidePerson(pessoa2);

    const person1IsRight = isRightSidePerson(pessoa1);
    const person2IsRight = isRightSidePerson(pessoa2);

    if (person1IsLeft && !person2IsLeft) return [person1Id, person2Id];
    if (person2IsLeft && !person1IsLeft) return [person2Id, person1Id];

    if (person1IsRight && !person2IsRight) return [person2Id, person1Id];
    if (person2IsRight && !person1IsRight) return [person1Id, person2Id];

    const orderedIds = [person1Id, person2Id].sort((a, b) => comparePeople(a, b));
    return [orderedIds[0], orderedIds[1]];
  };

  marriageMap.forEach((_, marriageKey) => {
    const [person1Id, person2Id] = marriageKey.split('::');
    const gen1 = generations.get(person1Id);
    const gen2 = generations.get(person2Id);

    if (gen1 !== undefined && gen2 !== undefined && gen1 !== gen2) {
      const maxGen = Math.max(gen1, gen2);
      generations.set(person1Id, maxGen);
      generations.set(person2Id, maxGen);
    }
  });

  let changedAfterSpouseAlignment = true;

  while (changedAfterSpouseAlignment) {
    changedAfterSpouseAlignment = false;

    childParentsMap.forEach((parentIds, childId) => {
      let maxParentGen = -1;

      parentIds.forEach((parentId) => {
        const parentGen = generations.get(parentId);
        if (parentGen !== undefined) {
          maxParentGen = Math.max(maxParentGen, parentGen);
        }
      });

      if (maxParentGen >= 0) {
        const desiredChildGen = maxParentGen + 1;
        const currentChildGen = generations.get(childId) ?? 0;

        if (currentChildGen < desiredChildGen) {
          generations.set(childId, desiredChildGen);
          changedAfterSpouseAlignment = true;
        }
      }
    });
  }

  const peopleByGeneration = new Map<number, string[]>();

  generations.forEach((level, personId) => {
    if (!availablePersonIds.has(personId)) return;
    if (!peopleByGeneration.has(level)) {
      peopleByGeneration.set(level, []);
    }
    peopleByGeneration.get(level)!.push(personId);
  });

  const positionedNodes: Node[] = [];
  const sortedLevels = Array.from(peopleByGeneration.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const peopleInLevel = [...(peopleByGeneration.get(level) || [])];

    const getParentKey = (personId: string) => {
      const parentIds = Array.from(childParentsMap.get(personId) || []).sort();
      return parentIds.join('::');
    };

    const getParentAnchorY = (personId: string) => {
      const parentIds = Array.from(childParentsMap.get(personId) || []).sort();
      if (parentIds.length === 0) return Number.POSITIVE_INFINITY;

      if (parentIds.length === 2) {
        const marriageKey = parentIds.join('::');
        const marriageNodeId = marriageMap.get(marriageKey);
        const marriageNode = marriageNodeId
          ? positionedNodes.find((node) => node.id === marriageNodeId)
          : undefined;

        if (marriageNode) {
          return marriageNode.position.y + MARRIAGE_NODE_WIDTH / 2;
        }
      }

      const parentCenters = parentIds
        .map((parentId) => {
          const parentNode = positionedNodes.find((node) => node.id === parentId);
          if (!parentNode) return undefined;
          return parentNode.position.y + NODE_HEIGHT / 2;
        })
        .filter((y): y is number => typeof y === 'number');

      if (parentCenters.length === 0) return Number.POSITIVE_INFINITY;
      return Math.min(...parentCenters);
    };

    peopleInLevel.sort(comparePeople);

    const currentX = INITIAL_X + level * HORIZONTAL_GAP_BETWEEN_GENERATIONS;
    let currentY = INITIAL_Y;

    const processedInLevel = new Set<string>();
    const placementUnits: Array<{
      key: string;
      memberIds: string[];
      marriageNodeId?: string;
      primaryPersonId: string;
      parentKey: string;
      anchorY: number;
      blockHeight: number;
    }> = [];

    marriageMap.forEach((marriageNodeId, marriageKey) => {
      const [parent1Id, parent2Id] = marriageKey.split('::');

      if (!peopleInLevel.includes(parent1Id) || !peopleInLevel.includes(parent2Id)) {
        return;
      }

      const [leftPersonId, rightPersonId] = getCoupleDisplayOrder(parent1Id, parent2Id);

      placementUnits.push({
        key: `couple-${marriageKey}`,
        memberIds: [leftPersonId, rightPersonId],
        marriageNodeId,
        primaryPersonId: leftPersonId,
        parentKey: getParentKey(leftPersonId),
        anchorY: getParentAnchorY(leftPersonId),
        blockHeight: NODE_HEIGHT,
      });

      processedInLevel.add(parent1Id);
      processedInLevel.add(parent2Id);
    });

    peopleInLevel.forEach((personId) => {
      if (processedInLevel.has(personId)) return;

      placementUnits.push({
        key: `single-${personId}`,
        memberIds: [personId],
        primaryPersonId: personId,
        parentKey: getParentKey(personId),
        anchorY: getParentAnchorY(personId),
        blockHeight: NODE_HEIGHT,
      });
    });

    placementUnits.sort((unitA, unitB) => {
      if (unitA.anchorY !== unitB.anchorY) {
        return unitA.anchorY - unitB.anchorY;
      }

      if (unitA.parentKey !== unitB.parentKey) {
        return unitA.parentKey.localeCompare(unitB.parentKey);
      }

      return comparePeople(unitA.primaryPersonId, unitB.primaryPersonId);
    });

    const unitGroups: typeof placementUnits[] = [];

    placementUnits.forEach((unit) => {
      const lastGroup = unitGroups[unitGroups.length - 1];
      if (lastGroup && unit.parentKey && unit.parentKey === lastGroup[0].parentKey) {
        lastGroup.push(unit);
        return;
      }

      unitGroups.push([unit]);
    });

    unitGroups.forEach((group) => {
      const groupAnchorY = group[0].anchorY;
      const groupHeight = group.reduce((total, unit, index) => {
        return total + unit.blockHeight + (index > 0 ? HORIZONTAL_GAP_TO_CHILDREN : 0);
      }, 0);

      const hasFiniteAnchor = Number.isFinite(groupAnchorY);
      const desiredGroupStartY = hasFiniteAnchor
        ? Math.max(INITIAL_Y, groupAnchorY - groupHeight / 2)
        : currentY;

      currentY = Math.max(currentY, desiredGroupStartY);

      group.forEach((unit, unitIndex) => {
        const unitStartY = currentY;

        if (unit.memberIds.length === 2) {
          const [leftPersonId, rightPersonId] = unit.memberIds;
          const leftNode = personNodes.find((n) => n.id === leftPersonId);
          const rightNode = personNodes.find((n) => n.id === rightPersonId);

          const leftX = currentX;
          const marriageX =
            currentX + NODE_WIDTH + HORIZONTAL_GAP_BETWEEN_SPOUSES / 2 - MARRIAGE_NODE_WIDTH / 2;
          const rightX =
            currentX + NODE_WIDTH + HORIZONTAL_GAP_BETWEEN_SPOUSES + MARRIAGE_NODE_WIDTH;

          if (leftNode) {
            leftNode.position = { x: leftX, y: unitStartY };
            positionedNodes.push(leftNode);
          }

          if (unit.marriageNodeId) {
            const marriageNode = marriageNodes.find((n) => n.id === unit.marriageNodeId);
            if (marriageNode) {
              marriageNode.position = {
                x: marriageX,
                y: unitStartY + NODE_HEIGHT / 2 - MARRIAGE_NODE_WIDTH / 2,
              };
              positionedNodes.push(marriageNode);
            }
          }

          if (rightNode) {
            rightNode.position = {
              x: rightX,
              y: unitStartY,
            };
            positionedNodes.push(rightNode);
          }
        } else {
          const personId = unit.memberIds[0];
          const personNode = personNodes.find((n) => n.id === personId);
          if (personNode) {
            personNode.position = { x: currentX, y: unitStartY };
            positionedNodes.push(personNode);
          }
        }

        currentY += unit.blockHeight;
        if (unitIndex < group.length - 1) {
          currentY += HORIZONTAL_GAP_TO_CHILDREN;
        }
      });

      currentY += HORIZONTAL_GAP_TO_CHILDREN;
    });
  });

  const positionedIds = new Set(positionedNodes.map((n) => n.id));

  const validEdges = edges
    .filter((edge) => positionedIds.has(edge.source) && positionedIds.has(edge.target))
    .map((edge) => {
      if (edge.type !== 'orthogonalChild') {
        return edge;
      }

      const sourceNode = positionedNodes.find((node) => node.id === edge.source);
      const targetNode = positionedNodes.find((node) => node.id === edge.target);

      if (!sourceNode || !targetNode) {
        return edge;
      }

      const parentColumnRightX = sourceNode.position.x + parentColumnRightOffsetFromMarriage;
      const childColumnLeftX = targetNode.position.x;

      const edgeKind = (edge.data as { kind?: string } | undefined)?.kind;
      const isMarriageToChild =
        sourceNode.type === 'marriageNode' &&
        edgeKind !== 'siblings' &&
        edgeKind !== 'singleParentChild';

      const isSingleParentChild = edgeKind === 'singleParentChild';
      const singleParentSourceX = sourceNode.position.x + NODE_WIDTH / 2;

      const corridorX = isMarriageToChild
        ? childColumnLeftX - 72
        : isSingleParentChild
          ? singleParentSourceX + (childColumnLeftX - singleParentSourceX) / 2
          : (parentColumnRightX + childColumnLeftX) / 2;

      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          corridorX,
        },
      };
    });

  return {
    nodes: positionedNodes,
    edges: validEdges,
    metadata: {},
  };
}