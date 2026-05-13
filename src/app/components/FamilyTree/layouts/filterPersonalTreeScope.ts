import type { Node } from 'reactflow';
import type { MarriageNodeData, TreeLayoutParams } from '../types';

function getMarriageDetails(node: Node): MarriageNodeData['details'] | undefined {
  return node.data?.details;
}

export function filterGraphToPersonalScope(
  graph: TreeLayoutParams,
  visiblePersonIds: Set<string>
): TreeLayoutParams {
  const isPersonVisible = (personId: string | undefined) => Boolean(personId && visiblePersonIds.has(personId));
  const visiblePersonNodes = graph.personNodes.filter((node) => visiblePersonIds.has(node.id));
  const visibleNodeIds = new Set(visiblePersonNodes.map((node) => node.id));
  const visibleMarriageNodes = graph.marriageNodes.filter((node) => {
    const details = getMarriageDetails(node);
    return isPersonVisible(details?.person1Id) && isPersonVisible(details?.person2Id);
  });

  visibleMarriageNodes.forEach((node) => visibleNodeIds.add(node.id));

  const marriageNodeIds = new Set(visibleMarriageNodes.map((node) => node.id));
  const marriageMap = new Map<string, string>();
  graph.marriageMap.forEach((marriageNodeId, marriageKey) => {
    if (marriageNodeIds.has(marriageNodeId)) {
      marriageMap.set(marriageKey, marriageNodeId);
    }
  });

  const childrenByMarriage = new Map<string, string[]>();
  graph.childrenByMarriage.forEach((childIds, marriageNodeId) => {
    if (!marriageNodeIds.has(marriageNodeId)) return;

    const visibleChildren = childIds.filter((childId) => visiblePersonIds.has(childId));
    if (visibleChildren.length > 0) {
      childrenByMarriage.set(marriageNodeId, visibleChildren);
    }
  });

  const childParentsMap = new Map<string, Set<string>>();
  graph.childParentsMap.forEach((parentIds, childId) => {
    if (!visiblePersonIds.has(childId)) return;

    const visibleParentIds = Array.from(parentIds).filter((parentId) => visiblePersonIds.has(parentId));
    if (visibleParentIds.length > 0) {
      childParentsMap.set(childId, new Set(visibleParentIds));
    }
  });

  return {
    personNodes: visiblePersonNodes,
    marriageNodes: visibleMarriageNodes,
    edges: graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    marriageMap,
    childrenByMarriage,
    pessoas: graph.pessoas.filter((pessoa) => visiblePersonIds.has(pessoa.id)),
    relacionamentos: graph.relacionamentos.filter(
      (relacionamento) =>
        visiblePersonIds.has(relacionamento.pessoa_origem_id) &&
        visiblePersonIds.has(relacionamento.pessoa_destino_id)
    ),
    childParentsMap,
  };
}
