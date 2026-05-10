import { Pessoa } from '../../../types';
import { hasDeathDate } from '../visualTokens';

export function extractYear(value?: string | number | null) {
  if (value === null || value === undefined) return undefined;

  const text = String(value).trim();
  if (!text) return undefined;

  return text.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/)?.[1];
}

export function formatDateBR(value?: string | number | null) {
  if (value === null || value === undefined) return undefined;

  const text = String(value).trim();
  if (!text) return undefined;

  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  return text;
}

export function normalizeBirthPlace(value?: string | null) {
  if (!value) return undefined;

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

export function getPersonCardSecondaryText(pessoa: Pick<Pessoa, 'data_nascimento' | 'data_falecimento' | 'local_nascimento'>) {
  const birthYear = extractYear(pessoa.data_nascimento);
  const deathYear = extractYear(pessoa.data_falecimento);

  if (hasDeathDate(pessoa.data_falecimento)) {
    if (birthYear && deathYear) return `* ${birthYear} - ✝ ${deathYear}`;
    if (deathYear) return `* ✝ ${deathYear}`;
    if (birthYear) return `* ${birthYear}`;
  }

  const birthPlace = normalizeBirthPlace(pessoa.local_nascimento);
  const birthDate = formatDateBR(pessoa.data_nascimento);

  if (birthPlace && birthDate) return `* ${birthPlace}, ${birthDate}`;
  if (birthPlace) return `* ${birthPlace}`;
  if (birthDate) return `* ${birthDate}`;

  return undefined;
}
