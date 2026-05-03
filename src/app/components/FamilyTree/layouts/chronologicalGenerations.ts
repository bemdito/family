import type { Pessoa } from '../../../types';

export interface ChronologicalGenerationRange {
  key: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  period: string;
  description: string;
}

export const CHRONOLOGICAL_GENERATION_RANGES: ChronologicalGenerationRange[] = [
  {
    key: 'lost-generation',
    name: 'Geração Perdida',
    startYear: 1883,
    endYear: 1900,
    period: '1883–1900',
    description: 'Adultos jovens durante a Primeira Guerra Mundial.',
  },
  {
    key: 'greatest-generation',
    name: 'Geração Grandiosa / Greatest Generation',
    startYear: 1901,
    endYear: 1927,
    period: '1901–1927',
    description: 'Cresceram em meio à Grande Depressão e participaram da Segunda Guerra Mundial.',
  },
  {
    key: 'silent-generation',
    name: 'Geração Silenciosa',
    startYear: 1928,
    endYear: 1945,
    period: '1928–1945',
    description: 'Infância ou juventude marcada pela guerra e pelo pós-guerra.',
  },
  {
    key: 'baby-boomers',
    name: 'Baby Boomers',
    startYear: 1946,
    endYear: 1964,
    period: '1946–1964',
    description: 'Nascidos no aumento de natalidade após a Segunda Guerra Mundial.',
  },
  {
    key: 'generation-x',
    name: 'Geração X',
    startYear: 1965,
    endYear: 1980,
    period: '1965–1980',
    description: 'Cresceram durante mudanças sociais, avanço da TV, cultura pop e início da computação pessoal.',
  },
  {
    key: 'millennials',
    name: 'Millennials / Geração Y',
    startYear: 1981,
    endYear: 1996,
    period: '1981–1996',
    description: 'Chegaram à vida adulta com internet, globalização e redes sociais.',
  },
  {
    key: 'generation-z',
    name: 'Geração Z',
    startYear: 1997,
    endYear: 2012,
    period: '1997–2012',
    description: 'Primeiros nativos digitais em escala ampla; cresceram com smartphones e redes sociais.',
  },
  {
    key: 'generation-alpha',
    name: 'Geração Alpha',
    startYear: 2013,
    endYear: 2025,
    period: '2013–2025',
    description: 'Crianças da era da inteligência artificial, telas, assistentes digitais e ensino mais tecnológico.',
  },
  {
    key: 'without-date',
    name: 'Sem data',
    startYear: null,
    endYear: null,
    period: 'Sem data',
    description: 'Pessoas sem data de nascimento ou com data inválida.',
  },
];

export function parseBirthYear(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1000 && value <= 9999 ? value : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) {
    return Number(yearOnly[1]);
  }

  const brDate = text.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
  if (brDate) {
    return Number(brDate[1]);
  }

  const isoDate = text.match(/^(\d{4})-\d{1,2}-\d{1,2}$/);
  if (isoDate) {
    return Number(isoDate[1]);
  }

  return null;
}

export function getChronologicalGenerationRange(pessoa: Pessoa) {
  const year = parseBirthYear(pessoa.data_nascimento);

  if (year === null) {
    return CHRONOLOGICAL_GENERATION_RANGES[CHRONOLOGICAL_GENERATION_RANGES.length - 1];
  }

  return (
    CHRONOLOGICAL_GENERATION_RANGES.find((range) => {
      if (range.startYear === null || range.endYear === null) return false;
      return year >= range.startYear && year <= range.endYear;
    }) || CHRONOLOGICAL_GENERATION_RANGES[CHRONOLOGICAL_GENERATION_RANGES.length - 1]
  );
}
