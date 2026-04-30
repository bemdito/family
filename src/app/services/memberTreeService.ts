import { Pessoa, Relacionamento } from '../types';

export interface MemberTreeSummary {
  pessoaBase?: Pessoa;
  pais: Pessoa[];
  filhos: Pessoa[];
  irmaos: Pessoa[];
  conjuges: Pessoa[];
  ramoFamiliarIds: string[];
  ramoMaternoIds: string[];
  ramoPaternoIds: string[];
  familiaDiretaIds: string[];
}

function uniqueById(items: Pessoa[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function buildPeopleMap(pessoas: Pessoa[]) {
  return new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
}

function buildOutgoingMap(relacionamentos: Relacionamento[]) {
  const map = new Map<string, Relacionamento[]>();

  for (const rel of relacionamentos) {
    const list = map.get(rel.pessoa_origem_id) ?? [];
    list.push(rel);
    map.set(rel.pessoa_origem_id, list);
  }

  return map;
}

function collectDescendantsFrom(
  rootId: string | undefined,
  outgoingMap: Map<string, Relacionamento[]>
) {
  if (!rootId) return new Set<string>();

  const result = new Set<string>();
  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const outgoing = outgoingMap.get(current) ?? [];
    for (const rel of outgoing) {
      if (rel.tipo_relacionamento === 'filho') {
        result.add(rel.pessoa_destino_id);
        queue.push(rel.pessoa_destino_id);
      }
    }
  }

  return result;
}

function collectImmediateParents(
  pessoaId: string | undefined,
  outgoingMap: Map<string, Relacionamento[]>
) {
  let paiId: string | undefined;
  let maeId: string | undefined;

  if (!pessoaId) {
    return { paiId, maeId };
  }

  const outgoing = outgoingMap.get(pessoaId) ?? [];
  for (const rel of outgoing) {
    if (rel.tipo_relacionamento === 'pai') {
      paiId = rel.pessoa_destino_id;
    }
    if (rel.tipo_relacionamento === 'mae') {
      maeId = rel.pessoa_destino_id;
    }
  }

  return { paiId, maeId };
}

function collectDirectFamilyIds(
  pessoaId: string | undefined,
  pais: Pessoa[],
  filhos: Pessoa[],
  irmaos: Pessoa[],
  conjuges: Pessoa[]
) {
  const ids = new Set<string>();

  if (pessoaId) ids.add(pessoaId);
  for (const pessoa of pais) ids.add(pessoa.id);
  for (const pessoa of filhos) ids.add(pessoa.id);
  for (const pessoa of irmaos) ids.add(pessoa.id);
  for (const pessoa of conjuges) ids.add(pessoa.id);

  return ids;
}

export function buildMemberTreeSummary(
  pessoaId: string | undefined,
  pessoas: Pessoa[],
  relacionamentos: Relacionamento[]
): MemberTreeSummary {
  if (!pessoaId) {
    return {
      pais: [],
      filhos: [],
      irmaos: [],
      conjuges: [],
      ramoFamiliarIds: [],
      ramoMaternoIds: [],
      ramoPaternoIds: [],
      familiaDiretaIds: [],
    };
  }

  const pessoasMap = buildPeopleMap(pessoas);
  const outgoingMap = buildOutgoingMap(relacionamentos);

  const pessoaBase = pessoasMap.get(pessoaId);
  const pais: Pessoa[] = [];
  const filhos: Pessoa[] = [];
  const irmaos: Pessoa[] = [];
  const conjuges: Pessoa[] = [];

  for (const rel of relacionamentos) {
    if (rel.pessoa_origem_id === pessoaId) {
      const destino = pessoasMap.get(rel.pessoa_destino_id);
      if (!destino) continue;
      if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') pais.push(destino);
      if (rel.tipo_relacionamento === 'filho') filhos.push(destino);
      if (rel.tipo_relacionamento === 'irmao') irmaos.push(destino);
      if (rel.tipo_relacionamento === 'conjuge') conjuges.push(destino);
    }

    if (rel.pessoa_destino_id === pessoaId) {
      const origem = pessoasMap.get(rel.pessoa_origem_id);
      if (!origem) continue;
      if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') filhos.push(origem);
      if (rel.tipo_relacionamento === 'filho') pais.push(origem);
      if (rel.tipo_relacionamento === 'irmao') irmaos.push(origem);
      if (rel.tipo_relacionamento === 'conjuge') conjuges.push(origem);
    }
  }

  const paisUnicos = uniqueById(pais);
  const filhosUnicos = uniqueById(filhos);
  const irmaosUnicos = uniqueById(irmaos);
  const conjugesUnicos = uniqueById(conjuges);

  const familiaDiretaIds = Array.from(
    collectDirectFamilyIds(pessoaId, paisUnicos, filhosUnicos, irmaosUnicos, conjugesUnicos)
  );

  const { paiId, maeId } = collectImmediateParents(pessoaId, outgoingMap);

  const ramoPaterno = collectDescendantsFrom(paiId, outgoingMap);
  const ramoMaterno = collectDescendantsFrom(maeId, outgoingMap);

  if (paiId) ramoPaterno.add(paiId);
  if (maeId) ramoMaterno.add(maeId);
  ramoPaterno.add(pessoaId);
  ramoMaterno.add(pessoaId);

  const ramoFamiliarIds = Array.from(
    new Set([
      ...familiaDiretaIds,
      ...Array.from(ramoPaterno),
      ...Array.from(ramoMaterno),
    ])
  );

  return {
    pessoaBase,
    pais: paisUnicos,
    filhos: filhosUnicos,
    irmaos: irmaosUnicos,
    conjuges: conjugesUnicos,
    ramoFamiliarIds,
    ramoMaternoIds: Array.from(ramoMaterno),
    ramoPaternoIds: Array.from(ramoPaterno),
    familiaDiretaIds,
  };
}

export function filterPeopleByMemberScope(
  pessoas: Pessoa[],
  scope: 'toda_arvore' | 'familia_direta' | 'ramo_materno' | 'ramo_paterno',
  summary: MemberTreeSummary
) {
  if (scope === 'toda_arvore') return pessoas;

  let ids = new Set<string>();

  if (scope === 'familia_direta') {
    ids = new Set(summary.familiaDiretaIds);
  }

  if (scope === 'ramo_materno') {
    ids = new Set(summary.ramoMaternoIds);
  }

  if (scope === 'ramo_paterno') {
    ids = new Set(summary.ramoPaternoIds);
  }

  return pessoas.filter((pessoa) => ids.has(pessoa.id));
}

export function countPeopleInScope(
  scope: 'toda_arvore' | 'familia_direta' | 'ramo_materno' | 'ramo_paterno',
  summary: MemberTreeSummary,
  totalPessoas: number
) {
  if (scope === 'toda_arvore') return totalPessoas;
  if (scope === 'familia_direta') return summary.familiaDiretaIds.length;
  if (scope === 'ramo_materno') return summary.ramoMaternoIds.length;
  return summary.ramoPaternoIds.length;
}
