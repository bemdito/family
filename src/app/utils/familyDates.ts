import { Pessoa } from '../types';

export type TipoEventoCalendario = 'aniversario' | 'memoria';

export interface EventoCalendarioFamiliar {
  id: string;
  pessoaId: string;
  nome: string;
  tipo: TipoEventoCalendario;
  dia: number;
  mes: number;
  anoOriginal?: number;
  descricao: string;
  pessoa: Pessoa;
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

export function criarEventosDoCalendario(pessoas: Pessoa[]): EventoCalendarioFamiliar[] {
  const eventos: EventoCalendarioFamiliar[] = [];

  for (const pessoa of pessoas) {
    const nascimento = parseFlexibleFamilyDate(pessoa.data_nascimento);
    if (nascimento) {
      const idade = calcularIdadeOuTempoDecorrido(nascimento).anos;
      eventos.push({
        id: `${pessoa.id}-aniversario`,
        pessoaId: pessoa.id,
        nome: pessoa.nome_completo,
        tipo: 'aniversario',
        dia: nascimento.getDate(),
        mes: nascimento.getMonth(),
        anoOriginal: nascimento.getFullYear(),
        descricao: Number.isFinite(idade) ? `${idade + 1} anos no próximo aniversário` : 'Aniversário',
        pessoa,
      });
    }

    const falecimento = parseFlexibleFamilyDate(pessoa.data_falecimento);
    if (falecimento) {
      eventos.push({
        id: `${pessoa.id}-memoria`,
        pessoaId: pessoa.id,
        nome: pessoa.nome_completo,
        tipo: 'memoria',
        dia: falecimento.getDate(),
        mes: falecimento.getMonth(),
        anoOriginal: falecimento.getFullYear(),
        descricao: formatarMemorial(falecimento),
        pessoa,
      });
    }
  }

  return eventos.sort((a, b) => {
    if (a.mes !== b.mes) return a.mes - b.mes;
    if (a.dia !== b.dia) return a.dia - b.dia;
    return a.nome.localeCompare(b.nome);
  });
}
