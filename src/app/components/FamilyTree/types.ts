import { Edge, Node } from 'reactflow';
import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../../types';

export interface EdgeFilters {
  conjugal: boolean;
  filiacao_sangue: boolean;
  filiacao_adotiva: boolean;
  irmaos: boolean;
}

export interface GenerationColumnMeta {
  level: number;
  label: string;
  x: number;
}

export interface MarriageNodeDetails {
  id?: string;
  marriageKey: string;
  person1Id: string;
  person2Id: string;
  person1?: Pessoa;
  person2?: Pessoa;
  relationship?: Relacionamento;
}

export interface PersonNodeContextActions {
  onView?: (pessoa: Pessoa) => void;
  onEdit?: (pessoa: Pessoa) => void;
  onAddConnection?: (pessoa: Pessoa) => void;
  onRemove?: (pessoa: Pessoa) => void;
}

export interface FamilyTreeBuildParams extends PersonNodeContextActions {
  pessoas: Pessoa[];
  relacionamentos: Relacionamento[];
  onPersonClick?: (pessoa: Pessoa) => void;
  onMarriageClick?: (details: MarriageNodeDetails) => void;
  selectedPersonId?: string;
  edgeFilters?: EdgeFilters;
}

export interface TreeLayoutParams {
  personNodes: Node[];
  marriageNodes: Node[];
  edges: Edge[];
  marriageMap: Map<string, string>;
  childrenByMarriage: Map<string, string[]>;
  pessoas: Pessoa[];
  childParentsMap: Map<string, Set<string>>;
}

export interface TreeGraphBuildResult extends TreeLayoutParams {
  nodes: Node[];
}

export interface TreeLayoutResult {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    generationColumns?: GenerationColumnMeta[];
  };
}

export interface LayoutConstants {
  NODE_WIDTH: number;
  NODE_HEIGHT: number;
  MARRIAGE_NODE_WIDTH: number;
  HORIZONTAL_GAP_BETWEEN_SPOUSES: number;
  HORIZONTAL_GAP_TO_CHILDREN: number;
  HORIZONTAL_GAP_BETWEEN_GENERATIONS: number;
  VERTICAL_GAP_IN_GENERATION_LAYOUT: number;
  INITIAL_X: number;
  INITIAL_Y: number;
}

export interface PlacementUnit {
  key: string;
  memberIds: string[];
  marriageNodeId?: string;
  primaryPersonId: string;
  parentKey: string;
  anchorY: number;
  blockHeight: number;
}

export interface FamilyBlock {
  key: string;
  memberIds: string[];
  marriageNodeId?: string;
  column: number;
  anchorKey: string;
  anchorY: number;
  sortValue: number;
}

export interface PersonNodeData extends PersonNodeContextActions {
  pessoa: Pessoa;
  onClick?: (pessoa: Pessoa) => void;
  isSelected?: boolean;
}

export interface MarriageNodeData {
  emoji?: string;
  details?: MarriageNodeDetails;
  onClickMarriage?: (details: MarriageNodeDetails) => void;
}

export const DEFAULT_EDGE_FILTERS: EdgeFilters = {
  conjugal: true,
  filiacao_sangue: true,
  filiacao_adotiva: true,
  irmaos: true,
};

export const TREE_CONSTANTS: LayoutConstants = {
  NODE_WIDTH: 280,
  NODE_HEIGHT: 120,
  MARRIAGE_NODE_WIDTH: 32,
  HORIZONTAL_GAP_BETWEEN_SPOUSES: 56,
  HORIZONTAL_GAP_TO_CHILDREN: 100,
  HORIZONTAL_GAP_BETWEEN_GENERATIONS: 760,
  VERTICAL_GAP_IN_GENERATION_LAYOUT: 64,
  INITIAL_X: 100,
  INITIAL_Y: 100,
};

export function isLeftSidePerson(pessoa?: Pessoa) {
  return (pessoa?.lado || 'esquerda') === 'esquerda';
}

export function isRightSidePerson(pessoa?: Pessoa) {
  return (pessoa?.lado || 'esquerda') === 'direita';
}

export function getBirthYear(value?: string | number | null): number {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;

  const text = String(value).trim();
  if (!text) return Number.POSITIVE_INFINITY;

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) return Number(yearOnly[1]);

  const yearAtEnd = text.match(/(\d{4})$/);
  if (yearAtEnd) return Number(yearAtEnd[1]);

  return Number.POSITIVE_INFINITY;
}

export function getSortableBirthValue(value?: string | number | null): number {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;

  const text = String(value).trim();
  if (!text) return Number.POSITIVE_INFINITY;

  const fullDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullDate) {
    const [, day, month, year] = fullDate;
    return Number(`${year}${month}${day}`);
  }

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) {
    return Number(`${yearOnly[1]}0000`);
  }

  const yearAtEnd = text.match(/(\d{4})$/);
  if (yearAtEnd) {
    return Number(`${yearAtEnd[1]}9999`);
  }

  return Number.POSITIVE_INFINITY;
}

export function getStablePersonComparator(
  pessoas: Pessoa[],
  childParentsMap?: Map<string, Set<string>>,
  positionedNodes?: Node[],
  marriageMap?: Map<string, string>,
  marriageNodes?: Node[],
  constants: LayoutConstants = TREE_CONSTANTS
) {
  return (personAId: string, personBId: string) => {
    const getParentKey = (personId: string) => {
      const parentIds = Array.from(childParentsMap?.get(personId) || []).sort();
      return parentIds.join('::');
    };

    const getParentAnchorY = (personId: string) => {
      const parentIds = Array.from(childParentsMap?.get(personId) || []).sort();
      if (parentIds.length === 0) return Number.POSITIVE_INFINITY;

      if (parentIds.length === 2 && marriageMap && marriageNodes) {
        const marriageKey = parentIds.join('::');
        const marriageNodeId = marriageMap.get(marriageKey);
        const marriageNode = marriageNodeId
          ? (positionedNodes || marriageNodes).find((node) => node.id === marriageNodeId)
          : undefined;

        if (marriageNode) {
          return marriageNode.position.y + constants.MARRIAGE_NODE_WIDTH / 2;
        }
      }

      if (positionedNodes) {
        const parentCenters = parentIds
          .map((parentId) => {
            const parentNode = positionedNodes.find((node) => node.id === parentId);
            if (!parentNode) return undefined;
            return parentNode.position.y + constants.NODE_HEIGHT / 2;
          })
          .filter((y): y is number => typeof y === 'number');

        if (parentCenters.length > 0) {
          return Math.min(...parentCenters);
        }
      }

      return Number.POSITIVE_INFINITY;
    };

    const parentKeyA = getParentKey(personAId);
    const parentKeyB = getParentKey(personBId);

    const anchorYA = getParentAnchorY(personAId);
    const anchorYB = getParentAnchorY(personBId);

    if (anchorYA !== anchorYB) {
      return anchorYA - anchorYB;
    }

    if (parentKeyA !== parentKeyB) {
      return parentKeyA.localeCompare(parentKeyB);
    }

    const pessoaA = pessoas.find((p) => p.id === personAId);
    const pessoaB = pessoas.find((p) => p.id === personBId);

    const sortableBirthA = getSortableBirthValue(pessoaA?.data_nascimento);
    const sortableBirthB = getSortableBirthValue(pessoaB?.data_nascimento);

    if (sortableBirthA !== sortableBirthB) {
      return sortableBirthA - sortableBirthB;
    }

    const birthYearA = getBirthYear(pessoaA?.data_nascimento);
    const birthYearB = getBirthYear(pessoaB?.data_nascimento);

    if (birthYearA !== birthYearB) {
      return birthYearA - birthYearB;
    }

    return (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');
  };
}

export function getDefaultViewMode(): TipoVisualizacaoArvore {
  return 'lados';
}