import { Edge, Node } from 'reactflow';
import { Relacionamento } from '../../types';
import {
  FamilyTreeBuildParams,
  TreeGraphBuildResult,
  DEFAULT_EDGE_FILTERS,
  getSortableBirthValue,
  MarriageNodeDetails,
} from './types';
import { FAMILY_TREE_COLORS } from './visualTokens';

export function buildTreeGraph({
  pessoas,
  relacionamentos,
  onPersonClick,
  onMarriageClick,
  onView,
  onEdit,
  onAddConnection,
  onRemove,
  selectedPersonId,
  edgeFilters,
}: FamilyTreeBuildParams): TreeGraphBuildResult {
  const filters = edgeFilters || DEFAULT_EDGE_FILTERS;

  const pessoaById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const conjugalRels = relacionamentos.filter((r) => r.tipo_relacionamento === 'conjuge');
  const filiacaoRels = relacionamentos.filter(
    (r) =>
      r.tipo_relacionamento === 'pai' ||
      r.tipo_relacionamento === 'mae' ||
      r.tipo_relacionamento === 'filho'
  );

  const getParentChildIds = (rel: Relacionamento) => {
    if (rel.tipo_relacionamento === 'filho') {
      return {
        childId: rel.pessoa_destino_id,
        parentId: rel.pessoa_origem_id,
      };
    }

    return {
      childId: rel.pessoa_origem_id,
      parentId: rel.pessoa_destino_id,
    };
  };

  const findFiliacaoRelationship = (childId: string, parentId?: string) =>
    filiacaoRels.find((rel) => {
      const ids = getParentChildIds(rel);
      return ids.childId === childId && (!parentId || ids.parentId === parentId);
    });

  const personNodes: Node[] = pessoas.map((pessoa) => ({
    id: pessoa.id,
    type: 'personNode',
    data: {
      pessoa,
      onClick: onPersonClick,
      onView,
      onEdit,
      onAddConnection,
      onRemove,
      isSelected: pessoa.id === selectedPersonId,
    },
    position: { x: 0, y: 0 },
  }));

  const childParentsMap = new Map<string, Set<string>>();

  filiacaoRels.forEach((rel) => {
    const { childId, parentId } = getParentChildIds(rel);

    if (!childId || !parentId) return;

    if (!childParentsMap.has(childId)) {
      childParentsMap.set(childId, new Set());
    }

    childParentsMap.get(childId)!.add(parentId);
  });

  const findConjugalRelationship = (parent1Id: string, parent2Id: string) =>
    conjugalRels.find(
      (rel) =>
        (rel.pessoa_origem_id === parent1Id && rel.pessoa_destino_id === parent2Id) ||
        (rel.pessoa_origem_id === parent2Id && rel.pessoa_destino_id === parent1Id)
    );

  const createMarriageDetails = (parent1Id: string, parent2Id: string): MarriageNodeDetails => {
    const relationship = findConjugalRelationship(parent1Id, parent2Id);

    return {
      id: relationship?.id,
      marriageKey: `${parent1Id}::${parent2Id}`,
      person1Id: parent1Id,
      person2Id: parent2Id,
      person1: pessoaById.get(parent1Id),
      person2: pessoaById.get(parent2Id),
      relationship,
    };
  };

  const marriageNodes: Node[] = [];
  const marriageMap = new Map<string, string>();
  const childrenByMarriage = new Map<string, string[]>();

  childParentsMap.forEach((parentIds, childId) => {
    if (parentIds.size !== 2) return;

    const [parent1Id, parent2Id] = Array.from(parentIds).sort();

    const parent1Exists = pessoaById.has(parent1Id);
    const parent2Exists = pessoaById.has(parent2Id);
    if (!parent1Exists || !parent2Exists) return;

    const hasConjugalRelationship = !!findConjugalRelationship(parent1Id, parent2Id);
    if (!hasConjugalRelationship) return;

    const marriageKey = `${parent1Id}::${parent2Id}`;

    if (!marriageMap.has(marriageKey)) {
      const marriageNodeId = `marriage-${marriageKey}`;
      const details = createMarriageDetails(parent1Id, parent2Id);

      marriageMap.set(marriageKey, marriageNodeId);

      marriageNodes.push({
        id: marriageNodeId,
        type: 'marriageNode',
        data: {
          emoji: '💑',
          details,
          onClickMarriage: onMarriageClick,
        },
        position: { x: 0, y: 0 },
      });

      childrenByMarriage.set(marriageNodeId, []);
    }

    const marriageNodeId = marriageMap.get(marriageKey)!;
    const children = childrenByMarriage.get(marriageNodeId)!;

    if (!children.includes(childId)) {
      children.push(childId);
    }
  });

  const sortPersonIdsByBirth = (personIds: string[]) =>
    [...personIds].sort((personAId, personBId) => {
      const pessoaA = pessoaById.get(personAId);
      const pessoaB = pessoaById.get(personBId);
      const birthA = getSortableBirthValue(pessoaA?.data_nascimento);
      const birthB = getSortableBirthValue(pessoaB?.data_nascimento);

      if (birthA !== birthB) {
        return birthA - birthB;
      }

      return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
    });

  childrenByMarriage.forEach((childrenIds, marriageNodeId) => {
    childrenByMarriage.set(marriageNodeId, sortPersonIdsByBirth(childrenIds));
  });

  const edges: Edge[] = [];
  let edgeIdCounter = 0;
  const nodeIdsSet = new Set<string>([...personNodes, ...marriageNodes].map((n) => n.id));

  if (filters.conjugal) {
    marriageMap.forEach((marriageNodeId, marriageKey) => {
      const [parent1Id, parent2Id] = marriageKey.split('::');

      if (!nodeIdsSet.has(parent1Id) || !nodeIdsSet.has(parent2Id) || !nodeIdsSet.has(marriageNodeId)) {
        return;
      }

      edges.push({
        id: `edge-conjugal-${edgeIdCounter++}`,
        source: parent1Id,
        sourceHandle: 'spouse-right',
        target: marriageNodeId,
        targetHandle: 'left',
        type: 'spouseEdge',
        animated: false,
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_SPOUSE,
          strokeWidth: 3,
        },
      });

      edges.push({
        id: `edge-conjugal-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'right',
        target: parent2Id,
        targetHandle: 'spouse-left',
        type: 'spouseEdge',
        animated: false,
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_SPOUSE,
          strokeWidth: 3,
        },
      });
    });
  }

  childrenByMarriage.forEach((childrenIds, marriageNodeId) => {
    if (!nodeIdsSet.has(marriageNodeId)) return;

    childrenIds.forEach((childId) => {
      if (!nodeIdsSet.has(childId)) return;

      const filiacaoRel = findFiliacaoRelationship(childId);
      const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

      if (isAdoptive && !filters.filiacao_adotiva) return;
      if (!isAdoptive && !filters.filiacao_sangue) return;

      edges.push({
        id: `edge-filiacao-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'family-center',
        target: childId,
        targetHandle: 'child-left',
        type: 'childEdge',
        animated: false,
        data: { kind: 'familyChild' },
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_CHILD,
          strokeWidth: 2,
        },
      });
    });
  });

  if (filters.irmaos) {
    const processedSiblingGroups = new Set<string>();
    const childrenBySharedParent = new Map<string, string[]>();

    childrenByMarriage.forEach((childrenIds) => {
      childrenIds.forEach((childId) => {
        const parentIds = Array.from(childParentsMap.get(childId) || []).sort();
        parentIds.forEach((parentId) => {
          if (!childrenBySharedParent.has(parentId)) {
            childrenBySharedParent.set(parentId, []);
          }

          const group = childrenBySharedParent.get(parentId)!;
          if (!group.includes(childId)) {
            group.push(childId);
          }
        });
      });
    });

    childParentsMap.forEach((parentIds, childId) => {
      parentIds.forEach((parentId) => {
        if (!childrenBySharedParent.has(parentId)) {
          childrenBySharedParent.set(parentId, []);
        }

        const group = childrenBySharedParent.get(parentId)!;
        if (!group.includes(childId)) {
          group.push(childId);
        }
      });
    });

    childrenBySharedParent.forEach((childrenIds) => {
      if (childrenIds.length < 2) return;

      const siblingsWithDates = sortPersonIdsByBirth(childrenIds);
      const groupId = siblingsWithDates.join('::');
      if (processedSiblingGroups.has(groupId)) return;
      processedSiblingGroups.add(groupId);

      for (let i = 0; i < siblingsWithDates.length - 1; i++) {
        const sibling1 = siblingsWithDates[i];
        const sibling2 = siblingsWithDates[i + 1];

        if (!nodeIdsSet.has(sibling1) || !nodeIdsSet.has(sibling2)) continue;

        edges.push({
          id: `edge-siblings-${edgeIdCounter++}`,
          source: sibling1,
          sourceHandle: 'sibling-left',
          target: sibling2,
          targetHandle: 'sibling-left',
          type: 'siblingEdge',
          animated: false,
          data: {
            kind: 'siblings',
            attachGap: 16,
          },
          style: {
            stroke: FAMILY_TREE_COLORS.EDGE_SIBLING,
            strokeWidth: 2,
            strokeDasharray: '5,5',
          },
        });
      }
    });
  }

  childParentsMap.forEach((parentIds, childId) => {
    if (parentIds.size === 1) {
      const parentId = Array.from(parentIds)[0];

      if (!nodeIdsSet.has(childId) || !nodeIdsSet.has(parentId)) return;

      const filiacaoRel = findFiliacaoRelationship(childId, parentId);
      const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

      if (isAdoptive && !filters.filiacao_adotiva) return;
      if (!isAdoptive && !filters.filiacao_sangue) return;

      edges.push({
        id: `edge-filiacao-single-${edgeIdCounter++}`,
        source: parentId,
        sourceHandle: 'child-right',
        target: childId,
        targetHandle: 'child-left',
        type: 'childEdge',
        animated: false,
        data: {
          kind: 'singleParentChild',
          offset: 28,
        },
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_CHILD,
          strokeWidth: 2,
        },
      });

      return;
    }

    if (parentIds.size === 2) {
      const [parent1Id, parent2Id] = Array.from(parentIds).sort();
      const marriageKey = `${parent1Id}::${parent2Id}`;

      if (marriageMap.has(marriageKey)) return;

      parentIds.forEach((parentId) => {
        if (!nodeIdsSet.has(childId) || !nodeIdsSet.has(parentId)) return;

        const filiacaoRel = findFiliacaoRelationship(childId, parentId);
        const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

        if (isAdoptive && !filters.filiacao_adotiva) return;
        if (!isAdoptive && !filters.filiacao_sangue) return;

        edges.push({
          id: `edge-filiacao-unmarried-${edgeIdCounter++}`,
          source: parentId,
          sourceHandle: 'child-right',
          target: childId,
          targetHandle: 'child-left',
          type: 'childEdge',
          animated: false,
          data: {
            kind: 'singleParentChild',
            offset: 36,
          },
          style: {
            stroke: FAMILY_TREE_COLORS.EDGE_CHILD,
            strokeWidth: 2,
          },
          label: isAdoptive ? 'Adotivo' : '',
          labelStyle: { fill: '#6b7280', fontWeight: 600, fontSize: 12 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
        });
      });
    }
  });

  if (filters.conjugal) {
    conjugalRels.forEach((conjugalRel) => {
      const person1Id = conjugalRel.pessoa_origem_id;
      const person2Id = conjugalRel.pessoa_destino_id;

      if (!person1Id || !person2Id) return;

      const [parent1Id, parent2Id] = [person1Id, person2Id].sort();
      const marriageKey = `${parent1Id}::${parent2Id}`;

      if (marriageMap.has(marriageKey)) return;
      if (!nodeIdsSet.has(person1Id) || !nodeIdsSet.has(person2Id)) return;

      const marriageNodeId = `marriage-${marriageKey}`;
      const details = createMarriageDetails(parent1Id, parent2Id);

      marriageMap.set(marriageKey, marriageNodeId);

      marriageNodes.push({
        id: marriageNodeId,
        type: 'marriageNode',
        data: {
          emoji: '💑',
          details,
          onClickMarriage: onMarriageClick,
        },
        position: { x: 0, y: 0 },
      });

      nodeIdsSet.add(marriageNodeId);

      edges.push({
        id: `edge-conjugal-childless-1-${edgeIdCounter++}`,
        source: parent1Id,
        sourceHandle: 'spouse-right',
        target: marriageNodeId,
        targetHandle: 'left',
        type: 'spouseEdge',
        animated: false,
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_SPOUSE,
          strokeWidth: 3,
        },
      });

      edges.push({
        id: `edge-conjugal-childless-2-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'right',
        target: parent2Id,
        targetHandle: 'spouse-left',
        type: 'spouseEdge',
        animated: false,
        style: {
          stroke: FAMILY_TREE_COLORS.EDGE_SPOUSE,
          strokeWidth: 3,
        },
      });
    });
  }

  const nodes = [...personNodes, ...marriageNodes];

  return {
    nodes,
    personNodes,
    marriageNodes,
    edges,
    marriageMap,
    childrenByMarriage,
    pessoas,
    relacionamentos,
    childParentsMap,
  };
}
