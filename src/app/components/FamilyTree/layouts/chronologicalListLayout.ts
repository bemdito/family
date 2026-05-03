import { Node } from 'reactflow';
import {
  TREE_CONSTANTS,
  TreeLayoutParams,
  TreeLayoutResult,
  getSortableBirthValue,
  GenerationColumnMeta,
} from '../types';
import {
  CHRONOLOGICAL_GENERATION_RANGES,
  getChronologicalGenerationRange,
  parseBirthYear,
} from './chronologicalGenerations';

export function chronologicalListLayout({
  personNodes,
  pessoas,
}: TreeLayoutParams): TreeLayoutResult {
  const { NODE_WIDTH, NODE_HEIGHT, INITIAL_X, INITIAL_Y } = TREE_CONSTANTS;
  const COLUMN_GAP = 128;
  const CARD_VERTICAL_GAP = 28;
  const HEADER_HEIGHT = 148;
  const CARD_START_Y = INITIAL_Y + HEADER_HEIGHT;

  const pessoaById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const personNodeById = new Map(personNodes.map((node) => [node.id, node]));

  const peopleByRangeKey = new Map<string, string[]>();
  CHRONOLOGICAL_GENERATION_RANGES.forEach((range) => peopleByRangeKey.set(range.key, []));

  personNodes.forEach((node) => {
    const pessoa = pessoaById.get(node.id);
    if (!pessoa) return;

    const range = getChronologicalGenerationRange(pessoa);
    peopleByRangeKey.get(range.key)?.push(node.id);
  });

  const comparePeople = (personAId: string, personBId: string, sortByDate: boolean) => {
    const pessoaA = pessoaById.get(personAId);
    const pessoaB = pessoaById.get(personBId);
    const nameComparison = (pessoaA?.nome_completo || '').localeCompare(pessoaB?.nome_completo || '');

    if (!sortByDate) {
      return nameComparison;
    }

    const birthYearA = parseBirthYear(pessoaA?.data_nascimento);
    const birthYearB = parseBirthYear(pessoaB?.data_nascimento);

    if (birthYearA !== null && birthYearB !== null) {
      const dateA = getSortableBirthValue(pessoaA?.data_nascimento);
      const dateB = getSortableBirthValue(pessoaB?.data_nascimento);

      if (dateA !== dateB) {
        return dateA - dateB;
      }
    }

    if (birthYearA !== null && birthYearB === null) return -1;
    if (birthYearA === null && birthYearB !== null) return 1;

    return nameComparison;
  };

  const positionedNodes: Node[] = [];
  const generationColumns: GenerationColumnMeta[] = [];

  CHRONOLOGICAL_GENERATION_RANGES.forEach((range, index) => {
    const x = INITIAL_X + index * (NODE_WIDTH + COLUMN_GAP);

    generationColumns.push({
      level: index,
      label: range.name,
      period: range.period,
      description: range.description,
      x,
    });

    positionedNodes.push({
      id: `generation-header-lista-${range.key}`,
      type: 'generationHeaderNode',
      data: {
        label: range.name,
        period: range.period,
        description: range.description,
        generation: index,
      },
      position: { x, y: Math.max(0, INITIAL_Y - 72) },
      draggable: false,
      selectable: false,
      connectable: false,
    });

    const peopleInRange = [...(peopleByRangeKey.get(range.key) || [])].sort((personAId, personBId) =>
      comparePeople(personAId, personBId, range.key !== 'without-date')
    );

    peopleInRange.forEach((personId, personIndex) => {
      const node = personNodeById.get(personId);
      if (!node) return;

      node.position = {
        x,
        y: CARD_START_Y + personIndex * (NODE_HEIGHT + CARD_VERTICAL_GAP),
      };
      positionedNodes.push(node);
    });
  });

  return {
    nodes: positionedNodes,
    edges: [],
    metadata: {
      generationColumns,
    },
  };
}
