import { Pessoa, Relacionamento } from '../types';

export interface MemberTreeSummary {
  pessoaBase?: Pessoa;
  pais: Pessoa[];
  filhos: Pessoa[];
  irmaos: Pessoa[];
  conjuges: Pessoa[];
  ramoFamiliarIds: string[];
}

function uniqueById(items: Pessoa[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
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
    };
  }

  const pessoasMap = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
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

  const ramoFamiliarIds = uniqueById([
    ...(pessoaBase ? [pessoaBase] : []),
    ...pais,
    ...filhos,
    ...irmaos,
    ...conjuges,
  ]).map((item) => item.id);

  return {
    pessoaBase,
    pais: uniqueById(pais),
    filhos: uniqueById(filhos),
    irmaos: uniqueById(irmaos),
    conjuges: uniqueById(conjuges),
    ramoFamiliarIds,
  };
}
