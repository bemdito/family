import { Pessoa } from '../types';
import { getPersonZodiacSign, isPersonDeceased } from './personFields';
export { buildWhatsAppUrl } from './whatsapp';

export function getYearFromDate(value?: string | number) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;

  const yearOnly = text.match(/^\d{4}$/);
  if (yearOnly) return Number(text);

  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return Number(brDate[3]);

  const isoDate = text.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoDate) return Number(isoDate[1]);

  const anyYear = text.match(/\b(18|19|20)\d{2}\b/);
  return anyYear ? Number(anyYear[0]) : undefined;
}

function parseDate(value?: string | number) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;

  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return new Date(Number(brDate[3]), Number(brDate[2]) - 1, Number(brDate[1]));

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));

  return undefined;
}

export function calculateAgeAtDeath(birthDate?: string | number, deathDate?: string | number) {
  const birth = parseDate(birthDate);
  const death = parseDate(deathDate);
  if (!birth || !death) return undefined;

  let age = death.getFullYear() - birth.getFullYear();
  const deathBeforeBirthday =
    death.getMonth() < birth.getMonth() ||
    (death.getMonth() === birth.getMonth() && death.getDate() < birth.getDate());

  if (deathBeforeBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}

export function getRelationshipSubtitle(person: Pessoa) {
  const birthYear = getYearFromDate(person.data_nascimento);
  const deathYear = getYearFromDate(person.data_falecimento);
  const birthPlace = person.local_nascimento;
  const deathPlace = person.local_falecimento;

  if (isPersonDeceased(person)) {
    const age = calculateAgeAtDeath(person.data_nascimento, person.data_falecimento);
    const parts: string[] = [];

    if (age !== undefined && deathYear) parts.push(`Falecimento aos ${age} anos em ${deathYear}`);
    else if (deathYear) parts.push(`Falecimento em ${deathYear}`);
    else parts.push('Falecido(a)');

    if (deathPlace) parts.push(deathPlace);
    return parts.join(' · ');
  }

  if (birthYear && birthPlace) return `Nascido em ${birthPlace} em ${birthYear}`;
  if (birthYear) return `Nascido em ${birthYear}`;
  if (birthPlace) return `Nascido em ${birthPlace}`;
  return 'Perfil familiar';
}

function ensureHttps(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function cleanInstagramUser(value: string) {
  return value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
}

export function getSocialLink(pessoa: Pessoa) {
  const url = pessoa.instagram_url?.trim();
  if (url) {
    const href = ensureHttps(url);
    return { href, label: href.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '') };
  }

  const instagramUser = pessoa.instagram_usuario?.trim();
  if (instagramUser) {
    const user = cleanInstagramUser(instagramUser);
    return { href: `https://instagram.com/${user}`, label: `@${user}` };
  }

  const social = pessoa.rede_social?.trim();
  if (!social) return undefined;
  if (['Facebook', 'Instagram', 'LinkedIn', 'TikTok'].includes(social)) return undefined;

  if (/^https?:\/\//i.test(social) || social.includes('.')) {
    const href = ensureHttps(social);
    return { href, label: href.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '') };
  }

  const user = cleanInstagramUser(social);
  return { href: `https://instagram.com/${user}`, label: `@${user}` };
}

export function isBirthDate(value: Pessoa['data_nascimento'], day: number, month: number, year: number) {
  const text = String(value ?? '').trim();
  const paddedDay = String(day).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');
  return text === `${paddedDay}/${paddedMonth}/${year}` || text.startsWith(`${year}-${paddedMonth}-${paddedDay}`);
}

export function shouldShowAquariusFallback(pessoa: Pessoa) {
  return isBirthDate(pessoa.data_nascimento, 23, 1, 1989) || getPersonZodiacSign(pessoa) === 'Aquário';
}
