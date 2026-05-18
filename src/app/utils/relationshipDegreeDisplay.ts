import type { Pessoa } from '../types';
import type {
  RelationshipConfidence,
  RelationshipDegreeResult,
  RelationshipGraphEdge,
} from './relationshipDegree';

const WARNING_MATCHERS: Array<[RegExp, string]> = [
  [/conjugal inativo .*ignorado|conjugais inativos foram ignorados/i, 'Vínculos conjugais inativos foram ignorados no cálculo.'],
  [/Caminho usa relacionamento conjugal inativo/i, 'O caminho usa vínculo conjugal inativo.'],
  [/pessoa inexistente/i, 'Alguns relacionamentos apontam para pessoas fora do conjunto visível.'],
  [/autoaresta/i, 'Relacionamentos inconsistentes foram ignorados.'],
  [/duplicado/i, 'Relacionamentos duplicados foram consolidados.'],
  [/Origem nao encontrada|Destino nao encontrado/i, 'Dados insuficientes para uma das pessoas selecionadas.'],
  [/Nenhum caminho encontrado|profundidade maxima/i, 'Pode haver dados incompletos de relacionamento.'],
  [/classificacao especifica/i, 'O caminho foi encontrado, mas a classificação específica ainda pode ser refinada.'],
  [/Irmandade derivada/i, 'Irmandade derivada por parental compartilhado.'],
];

const GLOBAL_WARNING_WHEN_FOUND_MATCHERS = [
  /conjugal inativo .*ignorado|conjugais inativos foram ignorados/i,
  /pessoa inexistente/i,
  /autoaresta/i,
  /duplicado/i,
];

function getPersonName(peopleById: Map<string, Pessoa>, personId: string) {
  return peopleById.get(personId)?.nome_completo?.trim() || 'Pessoa';
}

function getStepLabel(edge: RelationshipGraphEdge) {
  if (edge.normalizedType === 'parent') {
    if (edge.type === 'pai') return 'pai';
    if (edge.type === 'mae') return 'mae';
    return 'pai/mãe';
  }

  if (edge.normalizedType === 'child') return 'filho(a)';
  if (edge.normalizedType === 'sibling') return 'irmão(ã)';
  return edge.active ? 'cônjuge' : 'ex-cônjuge';
}

export function getRelationshipConfidenceLabel(confidence: RelationshipConfidence) {
  const labels: Record<RelationshipConfidence, string> = {
    high: 'alta',
    medium: 'média',
    low: 'baixa',
    unknown: 'desconhecida',
    none: 'nenhuma',
  };

  return labels[confidence];
}

export function formatRelationshipPersonPath(result: RelationshipDegreeResult, people: Pessoa[]) {
  if (!result.found && result.path.length === 0) return '';

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const pathIds = [result.originPersonId, ...result.path.map((step) => step.to)];

  return pathIds.map((personId) => getPersonName(peopleById, personId)).join(' → ');
}

export function formatRelationshipStepPath(result: RelationshipDegreeResult) {
  return result.path.map((step) => getStepLabel(step.edge)).join(' → ');
}

export function getFriendlyRelationshipWarnings(result: RelationshipDegreeResult) {
  const warnings = new Set<string>();

  result.warnings.forEach((warning) => {
    if (result.found && GLOBAL_WARNING_WHEN_FOUND_MATCHERS.some((pattern) => pattern.test(warning))) {
      return;
    }

    const match = WARNING_MATCHERS.find(([pattern]) => pattern.test(warning));
    if (match) {
      warnings.add(match[1]);
    }
  });

  return Array.from(warnings);
}

function humanizeRelationshipDescription(description: string) {
  return description
    .replace(/ e mae de /g, ' é mãe de ')
    .replace(/ e pai de /g, ' é pai de ')
    .replace(/ e pai\/mãe de /g, ' é pai/mãe de ')
    .replace(/ e filho\(a\) de /g, ' é filho(a) de ')
    .replace(/ e irmão\(ã\) de /g, ' é irmão(ã) de ')
    .replace(/ e cônjuge de /g, ' é cônjuge de ')
    .replace(/ e ex-cônjuge de /g, ' é ex-cônjuge de ')
    .replace(/ e avô\/avó de /g, ' é avô/avó de ')
    .replace(/ e neto\(a\) de /g, ' é neto(a) de ')
    .replace(/ e tio\(a\) de /g, ' é tio(a) de ')
    .replace(/ e sobrinho\(a\) de /g, ' é sobrinho(a) de ')
    .replace(/ e primo\(a\) de /g, ' é primo(a) de ')
    .replace(/\bHa\b/g, 'Há')
    .replace(/\bNao\b/g, 'Não')
    .replace(/\bvinculo\b/g, 'vínculo')
    .replace(/\bVinculo\b/g, 'Vínculo')
    .replace(/\bclassificacao\b/g, 'classificação')
    .replace(/\bespecifica\b/g, 'específica')
    .replace(/\bversao\b/g, 'versão');
}

export function getRelationshipResultMessage(result: RelationshipDegreeResult) {
  if (result.found) return humanizeRelationshipDescription(result.description);

  if (result.confidence === 'unknown') {
    return 'Dados insuficientes para calcular o vínculo com segurança.';
  }

  return 'Nenhum vínculo familiar foi encontrado com os dados disponíveis.';
}

export function getRelationshipMetricLabels(result: RelationshipDegreeResult) {
  const labels = [`Conexões: ${result.distance}`];

  if (typeof result.degree === 'number') {
    labels.push(`Grau: ${result.degree}`);
  }

  labels.push(`Confiança: ${getRelationshipConfidenceLabel(result.confidence)}`);

  return labels;
}
