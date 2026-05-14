import { Pessoa, Relacionamento } from '../types';
import { isPersonDeceased } from './personFields';

export type CalendarEventCategory =
  | 'aniversarios'
  | 'casamento'
  | 'falecimento'
  | 'eventos_historicos'
  | 'confraternizacoes';

export type TipoEventoCalendario =
  | 'aniversario'
  | 'casamento'
  | 'falecimento'
  | 'evento_historico'
  | 'confraternizacao'
  | 'memoria';

export interface EventoCalendarioFamiliar {
  id: string;
  pessoaId: string;
  nome: string;
  tipo: TipoEventoCalendario;
  category: CalendarEventCategory;
  titulo: string;
  dia: number;
  mes: number;
  anoOriginal?: number;
  descricao: string;
  pessoa?: Pessoa;
  pessoas?: Pessoa[];
  link?: string;
}

export interface FaixaGeracao {
  nome: string;
  inicio: number;
  fim: number | null;
}

export const FAIXAS_GERACIONAIS: FaixaGeracao[] = [
  { nome: 'Geração Silenciosa', inicio: 1928, fim: 1945 },
  { nome: 'Baby Boomer', inicio: 1946, fim: 1964 },
  { nome: 'Geração X', inicio: 1965, fim: 1980 },
  { nome: 'Geração Y / Millennials', inicio: 1981, fim: 1996 },
  { nome: 'Geração Z', inicio: 1997, fim: 2012 },
  { nome: 'Geração Alpha', inicio: 2013, fim: null },
];

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function extrairAno(valor?: string | number): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;

  if (typeof valor === 'number') {
    return valor > 999 ? valor : undefined;
  }

  const texto = String(valor).trim();
  const match = texto.match(/(\d{4})/);
  if (!match) return undefined;

  const ano = Number(match[1]);
  return Number.isNaN(ano) ? undefined : ano;
}

export function parseFlexibleFamilyDate(valor?: string | number): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;

  if (valor instanceof Date && isValidDate(valor)) {
    return valor;
  }

  const texto = String(valor).trim();

  if (/^\d{4}$/.test(texto)) {
    const ano = Number(texto);
    const data = new Date(ano, 0, 1);
    return isValidDate(data) ? data : undefined;
  }

  const brMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const dia = Number(brMatch[1]);
    const mes = Number(brMatch[2]) - 1;
    const ano = Number(brMatch[3]);
    const data = new Date(ano, mes, dia);
    if (
      isValidDate(data) &&
      data.getFullYear() === ano &&
      data.getMonth() === mes &&
      data.getDate() === dia
    ) {
      return data;
    }
  }

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const ano = Number(isoMatch[1]);
    const mes = Number(isoMatch[2]) - 1;
    const dia = Number(isoMatch[3]);
    const data = new Date(ano, mes, dia);
    if (
      isValidDate(data) &&
      data.getFullYear() === ano &&
      data.getMonth() === mes &&
      data.getDate() === dia
    ) {
      return data;
    }
  }

  const data = new Date(texto);
  return isValidDate(data) ? data : undefined;
}

export function parseCompleteFamilyDate(valor?: string | number): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor === 'number') return undefined;

  const texto = String(valor).trim();
  if (/^\d{4}$/.test(texto)) return undefined;

  const brMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const dia = Number(brMatch[1]);
    const mes = Number(brMatch[2]) - 1;
    const ano = Number(brMatch[3]);
    const data = new Date(ano, mes, dia);
    if (
      isValidDate(data) &&
      data.getFullYear() === ano &&
      data.getMonth() === mes &&
      data.getDate() === dia
    ) {
      return data;
    }
    return undefined;
  }

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const ano = Number(isoMatch[1]);
    const mes = Number(isoMatch[2]) - 1;
    const dia = Number(isoMatch[3]);
    const data = new Date(ano, mes, dia);
    if (
      isValidDate(data) &&
      data.getFullYear() === ano &&
      data.getMonth() === mes &&
      data.getDate() === dia
    ) {
      return data;
    }
  }

  return undefined;
}

export function obterGeracaoPorAno(ano?: number): string | undefined {
  if (!ano) return undefined;

  const faixa = FAIXAS_GERACIONAIS.find((item) => ano >= item.inicio && (item.fim === null || ano <= item.fim));
  return faixa?.nome;
}

export function obterGeracaoDaPessoa(pessoa: Pessoa): string | undefined {
  const ano = extrairAno(pessoa.data_nascimento);
  return obterGeracaoPorAno(ano);
}

export function calcularIdadeOuTempoDecorrido(dataBase: Date, referencia = new Date()) {
  let anos = referencia.getFullYear() - dataBase.getFullYear();
  let meses = referencia.getMonth() - dataBase.getMonth();

  if (referencia.getDate() < dataBase.getDate()) {
    meses -= 1;
  }

  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  return { anos, meses };
}

export function formatarMemorial(dataFalecimento: Date, referencia = new Date()) {
  const { anos, meses } = calcularIdadeOuTempoDecorrido(dataFalecimento, referencia);

  if (anos <= 0) {
    if (meses <= 1) return 'há 1 mês';
    return `há ${meses} meses`;
  }

  if (meses <= 0) {
    return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
  }

  return anos === 1 ? `há 1 ano e ${meses} meses` : `há ${anos} anos e ${meses} meses`;
}

export function hasDeathDate(value?: string | number | null) {
  return Boolean(String(value ?? '').trim());
}

function createDeathAnniversaryTitle(pessoa: Pessoa, falecimento: Date, referenceYear: number) {
  const anos = referenceYear - falecimento.getFullYear();

  if (anos >= 1) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} de falecimento de ${pessoa.nome_completo}`;
  }

  return `Falecimento de ${pessoa.nome_completo}`;
}

export function getCalendarCategory(event: Pick<EventoCalendarioFamiliar, 'tipo' | 'category'>): CalendarEventCategory {
  if (event.category) return event.category;

  switch (event.tipo) {
    case 'aniversario':
      return 'aniversarios';
    case 'casamento':
      return 'casamento';
    case 'falecimento':
    case 'memoria':
      return 'falecimento';
    case 'evento_historico':
      return 'eventos_historicos';
    case 'confraternizacao':
      return 'confraternizacoes';
    default:
      return 'eventos_historicos';
  }
}

export function criarEventosDoCalendario(
  pessoas: Pessoa[],
  relacionamentos: Relacionamento[] = [],
  referenceYear = new Date().getFullYear()
): EventoCalendarioFamiliar[] {
  const eventos: EventoCalendarioFamiliar[] = [];
  const pessoasById = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));

  for (const pessoa of pessoas) {
    const nascimento = parseFlexibleFamilyDate(pessoa.data_nascimento);
    if (nascimento && !isPersonDeceased(pessoa)) {
      const idade = calcularIdadeOuTempoDecorrido(nascimento).anos;
      eventos.push({
        id: `${pessoa.id}-aniversario`,
        pessoaId: pessoa.id,
        nome: pessoa.nome_completo,
        tipo: 'aniversario',
        category: 'aniversarios',
        titulo: `Aniversário de ${pessoa.nome_completo}`,
        dia: nascimento.getDate(),
        mes: nascimento.getMonth(),
        anoOriginal: nascimento.getFullYear(),
        descricao: Number.isFinite(idade) ? `${idade + 1} anos no próximo aniversário` : 'Aniversário',
        pessoa,
        pessoas: [pessoa],
        link: `/pessoa/${pessoa.id}`,
      });
    }

    const falecimento = parseFlexibleFamilyDate(pessoa.data_falecimento);
    if (falecimento) {
      const anosFalecimento = referenceYear - falecimento.getFullYear();
      const titulo = anosFalecimento >= 1
        ? createDeathAnniversaryTitle(pessoa, falecimento, referenceYear)
        : `Memória de ${pessoa.nome_completo}`;

      eventos.push({
        id: `${pessoa.id}-falecimento`,
        pessoaId: pessoa.id,
        nome: pessoa.nome_completo,
        tipo: 'falecimento',
        category: 'falecimento',
        titulo,
        dia: falecimento.getDate(),
        mes: falecimento.getMonth(),
        anoOriginal: falecimento.getFullYear(),
        descricao: `Data de memória familiar de ${pessoa.nome_completo}.`,
        pessoa,
        pessoas: [pessoa],
        link: `/pessoa/${pessoa.id}`,
      });
    }
  }

  const casamentoKeys = new Set<string>();

  for (const relacionamento of relacionamentos) {
    if (relacionamento.tipo_relacionamento !== 'conjuge' || !relacionamento.data_casamento) {
      continue;
    }

    const dataCasamento = parseFlexibleFamilyDate(relacionamento.data_casamento);
    if (!dataCasamento) continue;

    const pairIds = [relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id].filter(Boolean).sort();
    if (pairIds.length < 2) continue;

    const key = pairIds.join('-');
    if (casamentoKeys.has(key)) continue;
    casamentoKeys.add(key);

    const pessoaA = pessoasById.get(pairIds[0]);
    const pessoaB = pessoasById.get(pairIds[1]);
    if (!pessoaA || !pessoaB) continue;

    const pessoaFalecida = isPersonDeceased(pessoaA) || isPersonDeceased(pessoaB);
    const nomes = `${pessoaA.nome_completo} e ${pessoaB.nome_completo}`;

    eventos.push({
      id: `${key}-casamento`,
      pessoaId: pessoaA.id,
      nome: nomes,
      tipo: 'casamento',
      category: 'casamento',
      titulo: pessoaFalecida ? `Data de casamento de ${nomes}` : `Aniversário de casamento de ${nomes}`,
      dia: dataCasamento.getDate(),
      mes: dataCasamento.getMonth(),
      anoOriginal: dataCasamento.getFullYear(),
      descricao: dataCasamento.getFullYear()
        ? `${referenceYear - dataCasamento.getFullYear()} anos desde o casamento`
        : 'Data de casamento',
      pessoa: pessoaA,
      pessoas: [pessoaA, pessoaB],
      link: `/pessoa/${pessoaA.id}`,
    });
  }

  return eventos.sort((a, b) => {
    if (a.mes !== b.mes) return a.mes - b.mes;
    if (a.dia !== b.dia) return a.dia - b.dia;
    return a.nome.localeCompare(b.nome);
  });
}
