import { Edge, MarkerType, Node } from 'reactflow';
import {
  FamilyTreeBuildParams,
  TreeGraphBuildResult,
  DEFAULT_EDGE_FILTERS,
  TREE_CONSTANTS,
  getSortableBirthValue,
  MarriageNodeDetails,
} from './types';

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
    (r) => r.tipo_relacionamento === 'pai' || r.tipo_relacionamento === 'mae'
  );

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
    const childId = rel.pessoa_origem_id;
    const parentId = rel.pessoa_destino_id;

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
        sourceHandle: 'bottom',
        target: marriageNodeId,
        targetHandle: 'top',
        type: 'straight',
        animated: false,
        style: {
          stroke: '#10b981',
          strokeWidth: 3,
        },
      });

      edges.push({
        id: `edge-conjugal-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'bottom',
        target: parent2Id,
        targetHandle: 'top',
        type: 'straight',
        animated: false,
        style: {
          stroke: '#10b981',
          strokeWidth: 3,
        },
      });
    });
  }

  childrenByMarriage.forEach((childrenIds, marriageNodeId) => {
    if (!nodeIdsSet.has(marriageNodeId)) return;

    childrenIds.forEach((childId) => {
      if (!nodeIdsSet.has(childId)) return;

      const filiacaoRel = filiacaoRels.find((r) => r.pessoa_origem_id === childId);
      const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

      if (isAdoptive && !filters.filiacao_adotiva) return;
      if (!isAdoptive && !filters.filiacao_sangue) return;

      edges.push({
        id: `edge-filiacao-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'right',
        target: childId,
        targetHandle: 'left-target',
        type: 'orthogonalChild',
        animated: false,
        data: { kind: 'child' },
        style: {
          stroke: isAdoptive ? '#9333ea' : '#10b981',
          strokeWidth: 2,
          strokeDasharray: '5,5',
        },
      });
    });
  });

  if (filters.irmaos) {
    const processedSiblingGroups = new Set<string>();

    childrenByMarriage.forEach((childrenIds) => {
      if (childrenIds.length < 2) return;

      const groupId = [...childrenIds].sort().join('::');
      if (processedSiblingGroups.has(groupId)) return;
      processedSiblingGroups.add(groupId);

      const siblingsWithDates = childrenIds
        .map((childId) => {
          const pessoa = pessoaById.get(childId);
          return {
            id: childId,
            sortableBirth: getSortableBirthValue(pessoa?.data_nascimento),
            nome: pessoa?.nome_completo || '',
          };
        })
        .sort((a, b) => {
          if (a.sortableBirth !== b.sortableBirth) {
            return a.sortableBirth - b.sortableBirth;
          }
          return a.nome.localeCompare(b.nome);
        });

      for (let i = 0; i < siblingsWithDates.length - 1; i++) {
        const sibling1 = siblingsWithDates[i].id;
        const sibling2 = siblingsWithDates[i + 1].id;

        if (!nodeIdsSet.has(sibling1) || !nodeIdsSet.has(sibling2)) continue;

        edges.push({
          id: `edge-siblings-${edgeIdCounter++}`,
          source: sibling1,
          sourceHandle: 'bottom',
          target: sibling2,
          targetHandle: 'top',
          type: 'orthogonalChild',
          animated: false,
          data: {
            kind: 'siblings',
            nodeWidth: TREE_CONSTANTS.NODE_WIDTH,
            nodeHeight: TREE_CONSTANTS.NODE_HEIGHT,
            attachGap: 16,
            attachYOffset: 42,
          },
          style: {
            stroke: '#f59e0b',
            strokeWidth: 2,
            strokeDasharray: '5,5',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#f59e0b',
          },
        });
      }
    });
  }

  childParentsMap.forEach((parentIds, childId) => {
    if (parentIds.size === 1) {
      const parentId = Array.from(parentIds)[0];

      if (!nodeIdsSet.has(childId) || !nodeIdsSet.has(parentId)) return;

      const filiacaoRel = filiacaoRels.find(
        (r) => r.pessoa_origem_id === childId && r.pessoa_destino_id === parentId
      );
      const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

      if (isAdoptive && !filters.filiacao_adotiva) return;
      if (!isAdoptive && !filters.filiacao_sangue) return;

      edges.push({
        id: `edge-filiacao-single-${edgeIdCounter++}`,
        source: parentId,
        sourceHandle: 'bottom',
        target: childId,
        targetHandle: 'left-target',
        type: 'orthogonalChild',
        animated: false,
        data: {
          kind: 'singleParentChild',
          offset: 28,
        },
        style: {
          stroke: isAdoptive ? '#9333ea' : '#10b981',
          strokeWidth: 2,
          strokeDasharray: '5,5',
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

        const filiacaoRel = filiacaoRels.find(
          (r) => r.pessoa_origem_id === childId && r.pessoa_destino_id === parentId
        );
        const isAdoptive = filiacaoRel?.subtipo_relacionamento === 'adotivo';

        if (isAdoptive && !filters.filiacao_adotiva) return;
        if (!isAdoptive && !filters.filiacao_sangue) return;

        edges.push({
          id: `edge-filiacao-unmarried-${edgeIdCounter++}`,
          source: parentId,
          sourceHandle: 'bottom',
          target: childId,
          targetHandle: 'top',
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: isAdoptive ? '#f59e0b' : '#6b7280',
            strokeWidth: 2,
            strokeDasharray: isAdoptive ? '5,5' : '0',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isAdoptive ? '#f59e0b' : '#6b7280',
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
        sourceHandle: 'bottom',
        target: marriageNodeId,
        targetHandle: 'top',
        type: 'straight',
        animated: false,
        style: {
          stroke: '#10b981',
          strokeWidth: 3,
        },
      });

      edges.push({
        id: `edge-conjugal-childless-2-${edgeIdCounter++}`,
        source: marriageNodeId,
        sourceHandle: 'bottom',
        target: parent2Id,
        targetHandle: 'top',
        type: 'straight',
        animated: false,
        style: {
          stroke: '#10b981',
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
    childParentsMap,
  };
}