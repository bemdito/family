import type { Pessoa } from '../../../types';

function getManualGenerationLevel(pessoa?: Pessoa) {
  const manualGeneration = pessoa?.manual_generation;

  if (
    typeof manualGeneration === 'number' &&
    Number.isInteger(manualGeneration) &&
    manualGeneration >= 1 &&
    manualGeneration <= 7
  ) {
    return manualGeneration - 1;
  }

  return undefined;
}

export function computeEffectiveGenerations(
  childParentsMap: Map<string, Set<string>>,
  personIds: string[],
  pessoas: Pessoa[]
) {
  const availablePersonIds = new Set(personIds);
  const pessoaById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (personId: string): number => {
    if (memo.has(personId)) return memo.get(personId)!;
    if (visiting.has(personId)) return 0;

    const manualLevel = getManualGenerationLevel(pessoaById.get(personId));
    if (manualLevel !== undefined) {
      memo.set(personId, manualLevel);
      return manualLevel;
    }

    visiting.add(personId);

    const parentIds = Array.from(childParentsMap.get(personId) || []).filter((parentId) =>
      availablePersonIds.has(parentId)
    );
    const calculatedGeneration =
      parentIds.length > 0
        ? Math.max(...parentIds.map((parentId) => visit(parentId))) + 1
        : 0;

    visiting.delete(personId);
    memo.set(personId, calculatedGeneration);
    return calculatedGeneration;
  };

  personIds.forEach((personId) => visit(personId));

  return memo;
}

export function getGenerationLabel(level: number) {
  return `Geração ${level + 1}`;
}
