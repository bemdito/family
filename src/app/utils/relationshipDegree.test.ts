import { describe, expect, it } from 'vitest';
import type { Pessoa, Relacionamento, SubtipoRelacionamento, TipoRelacionamento } from '../types';
import {
  buildRelationshipGraph,
  calculateRelationshipDegree,
  findRelationshipPath,
  getRelationshipConfidence,
  normalizeRelationshipType,
} from './relationshipDegree';

function makePerson(id: string, nome = `Pessoa ${id}`): Pessoa {
  return {
    id,
    nome_completo: nome,
    humano_ou_pet: 'Humano',
  };
}

function makeRelationship(
  id: string,
  origemId: string,
  destinoId: string,
  tipo: TipoRelacionamento,
  overrides: Partial<Relacionamento> = {}
): Relacionamento {
  return {
    id,
    pessoa_origem_id: origemId,
    pessoa_destino_id: destinoId,
    tipo_relacionamento: tipo,
    subtipo_relacionamento: 'sangue',
    ativo: true,
    ...overrides,
  };
}

function calculate(params: {
  origin: string;
  target: string;
  people?: Pessoa[];
  relationships?: Relacionamento[];
  maxDepth?: number;
  includeInactiveSpouses?: boolean;
}) {
  return calculateRelationshipDegree({
    originPersonId: params.origin,
    targetPersonId: params.target,
    people: params.people ?? [],
    relationships: params.relationships ?? [],
    maxDepth: params.maxDepth,
    includeInactiveSpouses: params.includeInactiveSpouses,
  });
}

function people(...ids: string[]) {
  return ids.map((id) => makePerson(id, id));
}

function expectLabelToContain(label: string, expected: string) {
  expect(label.toLocaleLowerCase('pt-BR')).toContain(expected.toLocaleLowerCase('pt-BR'));
}

describe('calculateRelationshipDegree', () => {
  it('returns self relationship for the same person', () => {
    const result = calculate({ origin: 'a', target: 'a', people: people('a') });

    expect(result.found).toBe(true);
    expect(result.samePerson).toBe(true);
    expect(result.connectionKind).toBe('self');
    expect(result.distance).toBe(0);
  });

  it('returns a warning when origin person does not exist', () => {
    const result = calculate({ origin: 'missing', target: 'b', people: people('b') });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/Origem nao encontrada/i);
  });

  it('returns a warning when target person does not exist', () => {
    const result = calculate({ origin: 'a', target: 'missing', people: people('a') });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/Destino nao encontrado/i);
  });

  it('recognizes father relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'b', 'a', 'pai')],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'pai');
    expect(result.confidence).toBe('high');
  });

  it('recognizes mother relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'b', 'a', 'mae')],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'mae');
    expect(result.confidence).toBe('high');
  });

  it('recognizes child relationship through inverse parental edge', () => {
    const result = calculate({
      origin: 'b',
      target: 'a',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'b', 'a', 'pai')],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'filho');
    expect(result.confidence).toBe('high');
  });

  it('recognizes grandparent relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'c',
      people: people('a', 'b', 'c'),
      relationships: [
        makeRelationship('r1', 'b', 'a', 'pai'),
        makeRelationship('r2', 'c', 'b', 'mae'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'av');
    expect(result.distance).toBe(2);
    expect(result.confidence).toBe('high');
  });

  it('recognizes grandchild relationship', () => {
    const result = calculate({
      origin: 'c',
      target: 'a',
      people: people('a', 'b', 'c'),
      relationships: [
        makeRelationship('r1', 'b', 'a', 'pai'),
        makeRelationship('r2', 'c', 'b', 'mae'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'neto');
    expect(result.distance).toBe(2);
    expect(result.confidence).toBe('high');
  });

  it('recognizes explicit sibling relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'b', 'irmao')],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'irm');
    expect(result.confidence).toBe('high');
  });

  it('derives sibling relationship from a shared parent', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('p', 'a', 'b'),
      relationships: [
        makeRelationship('r1', 'a', 'p', 'pai'),
        makeRelationship('r2', 'b', 'p', 'pai'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'irm');
    expect(result.distance).toBe(1);
    expect(['high', 'medium']).toContain(result.confidence);
  });

  it('recognizes uncle/aunt relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'c',
      people: people('a', 'b', 'c'),
      relationships: [
        makeRelationship('r1', 'a', 'b', 'irmao'),
        makeRelationship('r2', 'c', 'b', 'mae'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'tio');
  });

  it('recognizes nephew/niece relationship', () => {
    const result = calculate({
      origin: 'c',
      target: 'a',
      people: people('a', 'b', 'c'),
      relationships: [
        makeRelationship('r1', 'a', 'b', 'irmao'),
        makeRelationship('r2', 'c', 'b', 'mae'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'sobrinho');
  });

  it('recognizes cousin relationship', () => {
    const result = calculate({
      origin: 'c',
      target: 'd',
      people: people('p', 'a', 'b', 'c', 'd'),
      relationships: [
        makeRelationship('r1', 'a', 'p', 'pai'),
        makeRelationship('r2', 'b', 'p', 'pai'),
        makeRelationship('r3', 'c', 'a', 'mae'),
        makeRelationship('r4', 'd', 'b', 'pai'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'primo');
  });

  it('recognizes active spouse relationship', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'b', 'conjuge', { subtipo_relacionamento: 'casamento' })],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'cônjuge');
    expect(result.connectionKind).toBe('conjugal');
  });

  it('ignores inactive spouse relationship by default', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'b', 'conjuge', { ativo: false })],
    });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/conjugal inativo/i);
  });

  it('includes inactive spouse relationship when configured', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'b', 'conjuge', { ativo: false })],
      includeInactiveSpouses: true,
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'ex-cônjuge');
    expect(result.confidence).toBe('low');
    expect(result.warnings.join(' ')).toMatch(/inativo/i);
  });

  it('returns none when no relationship path exists', () => {
    const result = calculate({ origin: 'a', target: 'b', people: people('a', 'b') });

    expect(result.found).toBe(false);
    expect(result.connectionKind).toBe('none');
    expect(result.confidence).toBe('none');
  });

  it('terminates on cyclic graph', () => {
    const result = calculate({
      origin: 'a',
      target: 'c',
      people: people('a', 'b', 'c'),
      relationships: [
        makeRelationship('r1', 'b', 'a', 'pai'),
        makeRelationship('r2', 'a', 'b', 'pai'),
        makeRelationship('r3', 'c', 'b', 'pai'),
      ],
    });

    expect(result.found).toBe(true);
    expect(result.distance).toBeLessThanOrEqual(2);
  });

  it('deduplicates duplicate relationships and warns', () => {
    const graph = buildRelationshipGraph(people('a', 'b'), [
      makeRelationship('r1', 'b', 'a', 'pai'),
      makeRelationship('r2', 'b', 'a', 'pai'),
    ]);

    const parentEdges = graph.edges.filter((edge) => edge.from === 'a' && edge.to === 'b' && edge.normalizedType === 'parent');
    expect(parentEdges).toHaveLength(1);
    expect(parentEdges[0].relationshipIds).toEqual(['r1', 'r2']);
    expect(graph.warnings.join(' ')).toMatch(/duplicado/i);
  });

  it('ignores self-edge relationship and warns', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'a', 'pai')],
    });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/autoaresta/i);
  });

  it('ignores relationship outside people scope and warns', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [makeRelationship('r1', 'a', 'missing', 'pai')],
    });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/pessoa inexistente/i);
  });

  it('respects maxDepth', () => {
    const result = calculate({
      origin: 'a',
      target: 'd',
      people: people('a', 'b', 'c', 'd'),
      relationships: [
        makeRelationship('r1', 'b', 'a', 'pai'),
        makeRelationship('r2', 'c', 'b', 'pai'),
        makeRelationship('r3', 'd', 'c', 'pai'),
      ],
      maxDepth: 2,
    });

    expect(result.found).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/profundidade maxima 2/i);
  });

  it('falls back to indirect relationship for unsupported mixed path', () => {
    const result = calculate({
      origin: 'a',
      target: 'd',
      people: people('a', 'b', 'c', 'd'),
      relationships: [
        makeRelationship('r1', 'a', 'b', 'conjuge', { subtipo_relacionamento: 'casamento' }),
        makeRelationship('r2', 'b', 'c', 'irmao'),
        makeRelationship('r3', 'd', 'c', 'pai'),
      ],
    });

    expect(result.found).toBe(true);
    expectLabelToContain(result.label, 'indireto');
    expect(['medium', 'low']).toContain(result.confidence);
  });

  it('preserves explicit adoptive relationship kind', () => {
    const result = calculate({
      origin: 'a',
      target: 'b',
      people: people('a', 'b'),
      relationships: [
        makeRelationship('r1', 'b', 'a', 'pai', {
          subtipo_relacionamento: 'adotivo' as SubtipoRelacionamento,
        }),
      ],
    });

    expect(result.found).toBe(true);
    expect(result.connectionKind).toBe('adoptive');
    expect(result.confidence).toBe('medium');
  });
});

describe('relationshipDegree helpers', () => {
  it('normalizes relationship types', () => {
    expect(normalizeRelationshipType('pai')).toBe('child');
    expect(normalizeRelationshipType('mae')).toBe('child');
    expect(normalizeRelationshipType('filho')).toBe('parent');
    expect(normalizeRelationshipType('irmao')).toBe('sibling');
    expect(normalizeRelationshipType('conjuge')).toBe('spouse');
  });

  it('builds graph with direct, inverse, deduplicated and scoped edges', () => {
    const graph = buildRelationshipGraph(people('a', 'b', 'c'), [
      makeRelationship('r1', 'b', 'a', 'pai'),
      makeRelationship('r2', 'b', 'a', 'pai'),
      makeRelationship('r3', 'b', 'c', 'conjuge'),
      makeRelationship('r4', 'a', 'a', 'pai'),
      makeRelationship('r5', 'a', 'missing', 'pai'),
    ]);

    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.some((edge) => edge.from === 'a' && edge.to === 'b' && edge.normalizedType === 'parent')).toBe(true);
    expect(graph.edges.some((edge) => edge.from === 'b' && edge.to === 'a' && edge.normalizedType === 'child')).toBe(true);
    expect(graph.edges.some((edge) => edge.from === 'a' && edge.to === 'a')).toBe(false);
    expect(graph.warnings.join(' ')).toMatch(/duplicado/i);
    expect(graph.warnings.join(' ')).toMatch(/autoaresta/i);
    expect(graph.warnings.join(' ')).toMatch(/pessoa inexistente/i);
  });

  it('finds direct and two-step paths and returns null when absent or too deep', () => {
    const graph = buildRelationshipGraph(people('a', 'b', 'c', 'x'), [
      makeRelationship('r1', 'b', 'a', 'pai'),
      makeRelationship('r2', 'c', 'b', 'pai'),
    ]);

    expect(findRelationshipPath(graph, 'a', 'b')).toHaveLength(1);
    expect(findRelationshipPath(graph, 'a', 'c')).toHaveLength(2);
    expect(findRelationshipPath(graph, 'a', 'x')).toBeNull();
    expect(findRelationshipPath(graph, 'a', 'c', { maxDepth: 1 })).toBeNull();
  });

  it('classifies relationship confidence', () => {
    const parentalGraph = buildRelationshipGraph(people('a', 'b'), [makeRelationship('r1', 'b', 'a', 'pai')]);
    const conjugalGraph = buildRelationshipGraph(people('a', 'b'), [makeRelationship('r2', 'a', 'b', 'conjuge')]);
    const indirectGraph = buildRelationshipGraph(people('a', 'b', 'c', 'd', 'e', 'f'), [
      makeRelationship('r1', 'b', 'a', 'pai'),
      makeRelationship('r2', 'c', 'b', 'pai'),
      makeRelationship('r3', 'd', 'c', 'pai'),
      makeRelationship('r4', 'e', 'd', 'pai'),
      makeRelationship('r5', 'f', 'e', 'pai'),
    ]);

    expect(getRelationshipConfidence(findRelationshipPath(parentalGraph, 'a', 'b'))).toBe('high');
    expect(getRelationshipConfidence(findRelationshipPath(conjugalGraph, 'a', 'b'))).toBe('medium');
    expect(getRelationshipConfidence(findRelationshipPath(indirectGraph, 'a', 'f'))).toBe('low');
    expect(getRelationshipConfidence(null)).toBe('none');
  });
});
