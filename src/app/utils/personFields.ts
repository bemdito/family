import type { EditableOwnPersonPayload } from '../services/memberProfileService';
import { Pessoa } from '../types';
import { getZodiacSignFromBirthDate } from './zodiac';

export { getZodiacSignFromBirthDate };

export const SOCIAL_NETWORKS = ['LinkedIn', 'Facebook', 'Instagram', 'TikTok'] as const;

export type SocialProfileForm = {
  id: string;
  rede: string;
  perfil: string;
};

export const LOWERCASE_NAME_PARTS = new Set(['de', 'da', 'das', 'do', 'dos', 'e']);

export const PERSON_FIELD_LABELS = {
  nome_completo: 'Nome completo',
  data_nascimento: 'Data de nascimento',
  signo: 'Signo',
  local_nascimento: 'Local de nascimento',
  local_nascimento_exterior: 'Local de nascimento fora do Brasil',
  local_atual: 'Residência atual',
  foto_principal_url: 'Foto',
  minibio: 'Mini bio',
  curiosidades: 'Curiosidades',
  telefone: 'Telefone',
  endereco: 'Endereço',
  complemento: 'Complemento',
  rede_social: 'Rede social',
  instagram_usuario: 'Perfil da rede social',
  instagram_url: 'URL da rede social',
  permitir_exibir_instagram: 'Exibir rede social no perfil',
  permitir_mensagens_whatsapp: 'Permitir mensagens por WhatsApp',
  permitir_exibir_data_nascimento: 'Exibir data de nascimento',
  permitir_exibir_endereco: 'Exibir endereço',
  permitir_exibir_rede_social: 'Exibir rede social',
  permitir_exibir_telefone: 'Exibir telefone',
  data_falecimento: 'Data de falecimento',
  local_falecimento: 'Local de falecimento',
  local_falecimento_exterior: 'Local de falecimento fora do Brasil',
  falecido: 'Pessoa falecida',
  humano_ou_pet: 'Tipo',
  geracao_sociologica: 'Geração sociológica',
  lado: 'Lado',
} as const;

export type PersonFieldErrors = Partial<Record<keyof EditableOwnPersonPayload | 'complemento', string>>;

export const EDITABLE_OWN_PERSON_FIELDS: Array<keyof EditableOwnPersonPayload> = [
  'nome_completo',
  'data_nascimento',
  'local_nascimento',
  'local_nascimento_exterior',
  'local_atual',
  'falecido',
  'minibio',
  'curiosidades',
  'telefone',
  'endereco',
  'rede_social',
  'instagram_usuario',
  'instagram_url',
  'permitir_exibir_instagram',
  'permitir_mensagens_whatsapp',
  'permitir_exibir_data_nascimento',
  'permitir_exibir_endereco',
  'permitir_exibir_rede_social',
  'permitir_exibir_telefone',
];

export function buildEditablePersonFormState(pessoa?: Pessoa | null): EditableOwnPersonPayload {
  return {
    nome_completo: pessoa?.nome_completo ?? '',
    data_nascimento: pessoa?.data_nascimento ?? '',
    local_nascimento: pessoa?.local_nascimento ?? '',
    local_nascimento_exterior: pessoa?.local_nascimento_exterior ?? false,
    local_atual: pessoa?.local_atual ?? '',
    foto_principal_url: pessoa?.foto_principal_url ?? '',
    falecido: pessoa?.falecido ?? Boolean(pessoa?.data_falecimento || pessoa?.local_falecimento),
    minibio: pessoa?.minibio ?? '',
    curiosidades: pessoa?.curiosidades ?? '',
    telefone: pessoa?.telefone ?? '',
    endereco: pessoa?.endereco ?? '',
    rede_social: pessoa?.rede_social ?? '',
    instagram_usuario: pessoa?.instagram_usuario ?? '',
    instagram_url: pessoa?.instagram_url ?? '',
    permitir_exibir_instagram: pessoa?.permitir_exibir_instagram ?? pessoa?.permitir_exibir_rede_social ?? true,
    permitir_mensagens_whatsapp: pessoa?.permitir_mensagens_whatsapp ?? true,
    permitir_exibir_data_nascimento: pessoa?.permitir_exibir_data_nascimento ?? true,
    permitir_exibir_endereco: pessoa?.permitir_exibir_endereco ?? true,
    permitir_exibir_rede_social: pessoa?.permitir_exibir_rede_social ?? pessoa?.permitir_exibir_instagram ?? true,
    permitir_exibir_telefone: pessoa?.permitir_exibir_telefone ?? true,
  };
}

export function normalizeWord(word: string) {
  const lower = word.toLocaleLowerCase('pt-BR');
  if (LOWERCASE_NAME_PARTS.has(lower)) return lower;

  return lower
    .split('-')
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join('-');
}

export function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(normalizeWord)
    .join(' ');
}

export function formatPersonName(value: string) {
  return titleCase(value);
}

export function hasFirstAndLastName(value: string) {
  const words = value.trim().split(/\s+/).filter((part) => part.length >= 2);
  return words.length >= 2;
}

export function maskBirthDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) {
    if (/^(17|18|19|20)\d{0,2}$/.test(digits)) return digits;
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeBirthDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  return maskBirthDate(trimmed);
}

export function validateBirthDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}$/.test(trimmed)) return undefined;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Use DD/MM/AAAA ou apenas AAAA.';

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31) return 'Dia deve estar entre 01 e 31.';
  if (month < 1 || month > 12) return 'Mês deve estar entre 01 e 12.';

  return undefined;
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function normalizeBrazilianLocation(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const cityStateMatch = trimmed.match(/^(.+?)(?:\s*\/\s*|\s*-\s*|\s*,\s*|\s+)([a-zA-Z]{2})$/);
  if (cityStateMatch) {
    return `${titleCase(cityStateMatch[1])}/${cityStateMatch[2].toLocaleUpperCase('pt-BR')}`;
  }

  const [rawCity, ...rest] = trimmed.split('/');
  if (!rest.length) return titleCase(rawCity);

  const city = titleCase(rawCity);
  const region = rest.join('/').trim();
  const normalizedRegion = /^[a-zA-Z]{2}$/.test(region) ? region.toLocaleUpperCase('pt-BR') : titleCase(region);
  return `${city}/${normalizedRegion}`;
}

export function normalizeInternationalLocation(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const match = trimmed.match(/^(.+?)\s*\(([^()]+)\)$/);
  if (!match) return titleCase(trimmed);

  const city = titleCase(match[1]);
  const country = titleCase(match[2]);
  return `${city} (${country})`;
}

export function normalizeLocationByMode(value: string, options?: { international?: boolean }) {
  return options?.international ? normalizeInternationalLocation(value) : normalizeBrazilianLocation(value);
}

export function normalizeLocation(value: string) {
  return normalizeBrazilianLocation(value);
}

export function validateBrazilianLocation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/\(.+\)/.test(trimmed)) {
    return 'Para locais no Brasil, use o formato Nome da Cidade/UF. Para exterior, marque a opção fora do Brasil.';
  }

  const slashParts = trimmed.split('/');
  if (slashParts.length !== 2 || !slashParts[0].trim() || !slashParts[1].trim()) {
    return 'Use o formato Nome da Cidade/UF. Exemplo: São José dos Pinhais/PR.';
  }

  const region = slashParts[1].trim();
  if (!/^[A-Z]{2}$/.test(region)) {
    return 'Use o formato Nome da Cidade/UF. Exemplo: São José dos Pinhais/PR.';
  }

  return undefined;
}

export function validateInternationalLocation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.includes('/')) {
    return 'Para locais fora do Brasil, use o formato Nome da Cidade (País). Exemplo: Dublin (Irlanda).';
  }

  const match = trimmed.match(/^(.+?)\s*\(([^()]*)\)$/);
  if (!match) {
    return 'Use o formato Nome da Cidade (País). Exemplo: Dublin (Irlanda).';
  }

  if (!match[1].trim()) {
    return 'Informe a cidade antes do país. Exemplo: Dublin (Irlanda).';
  }

  if (!match[2].trim()) {
    return 'Informe o país entre parênteses. Exemplo: Dublin (Irlanda).';
  }

  return undefined;
}

export function validateLocationByMode(value: string, options?: { international?: boolean }) {
  return options?.international ? validateInternationalLocation(value) : validateBrazilianLocation(value);
}

export function validateLocation(value: string) {
  return validateBrazilianLocation(value);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.find((part, index) => index > 0 && !LOWERCASE_NAME_PARTS.has(part.toLocaleLowerCase('pt-BR')))?.[0] ?? parts[1]?.[0] ?? '';
  return `${first}${second}`.toLocaleUpperCase('pt-BR') || 'EU';
}

export function getSocialPlaceholder(network?: string) {
  if (network === 'Instagram' || network === 'TikTok') return '@usuario';
  if (network === 'Facebook' || network === 'LinkedIn') return 'nome-do-perfil ou URL';
  return 'Selecione uma rede primeiro';
}

export function createSocialProfile(rede = '', perfil = ''): SocialProfileForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rede,
    perfil,
  };
}

export function buildSocialProfilesFromPerson(pessoa?: Pick<Pessoa, 'rede_social' | 'instagram_usuario'> | null) {
  return [
    createSocialProfile(
      String(pessoa?.rede_social ?? ''),
      String(pessoa?.instagram_usuario ?? ''),
    ),
  ];
}

export function syncFirstSocialProfileToPersonFields<T extends { rede_social?: string; instagram_usuario?: string }>(
  form: T,
  profiles: SocialProfileForm[],
): T {
  const firstProfile = profiles[0] ?? createSocialProfile();

  return {
    ...form,
    rede_social: firstProfile.rede,
    instagram_usuario: firstProfile.perfil,
  };
}

export function isPersonDeceased(pessoa?: Pick<Pessoa, 'falecido' | 'data_falecimento' | 'local_falecimento'> | null) {
  return Boolean(
    pessoa?.falecido ||
    String(pessoa?.data_falecimento ?? '').trim() ||
    String(pessoa?.local_falecimento ?? '').trim()
  );
}

export function cleanPersonPayload(form: EditableOwnPersonPayload): EditableOwnPersonPayload {
  const hasDeathInfo = Boolean(
    String((form as Record<string, unknown>).data_falecimento ?? '').trim() ||
    String((form as Record<string, unknown>).local_falecimento ?? '').trim()
  );
  const normalizedForm: EditableOwnPersonPayload = {
    ...form,
    nome_completo: formatPersonName(String(form.nome_completo ?? '')),
    data_nascimento: normalizeBirthDate(String(form.data_nascimento ?? '')),
    local_nascimento: normalizeLocationByMode(String(form.local_nascimento ?? ''), {
      international: form.local_nascimento_exterior === true,
    }),
    local_atual: normalizeLocation(String(form.local_atual ?? '')),
    telefone: formatPhone(String(form.telefone ?? '')),
    falecido: form.falecido === true || hasDeathInfo,
    permitir_exibir_instagram: form.permitir_exibir_rede_social !== false && form.permitir_exibir_instagram !== false,
    permitir_mensagens_whatsapp: form.permitir_mensagens_whatsapp !== false,
    permitir_exibir_data_nascimento: form.permitir_exibir_data_nascimento ?? true,
    permitir_exibir_endereco: form.permitir_exibir_endereco !== false,
    permitir_exibir_rede_social: form.permitir_exibir_rede_social !== false && form.permitir_exibir_instagram !== false,
    permitir_exibir_telefone: form.permitir_exibir_telefone !== false,
  };

  return EDITABLE_OWN_PERSON_FIELDS.reduce<EditableOwnPersonPayload>((payload, field) => {
    const value = normalizedForm[field];

    if (field === 'rede_social' && !value) {
      (payload as Record<string, unknown>)[field] = '';
      return payload;
    }

    if (typeof value === 'string') {
      (payload as Record<string, unknown>)[field] = normalizedForm[field]?.toString().trim() ?? '';
      return payload;
    }

    (payload as Record<string, unknown>)[field] = normalizedForm[field];
    return payload;
  }, {});
}

export function validateEditablePersonForm(form: EditableOwnPersonPayload): PersonFieldErrors {
  const nextErrors: PersonFieldErrors = {};
  const normalizedName = formatPersonName(String(form.nome_completo ?? ''));
  const normalizedBirthDate = normalizeBirthDate(String(form.data_nascimento ?? ''));
  const normalizedBirthLocation = normalizeLocationByMode(String(form.local_nascimento ?? ''), {
    international: form.local_nascimento_exterior === true,
  });
  const normalizedCurrentLocation = normalizeLocation(String(form.local_atual ?? ''));

  if (!hasFirstAndLastName(normalizedName)) {
    nextErrors.nome_completo = 'Informe pelo menos nome e sobrenome, com duas letras ou mais.';
  }

  const birthDateError = validateBirthDate(normalizedBirthDate);
  if (birthDateError) nextErrors.data_nascimento = birthDateError;

  const birthLocationError = validateLocationByMode(normalizedBirthLocation, {
    international: form.local_nascimento_exterior === true,
  });
  if (birthLocationError) nextErrors.local_nascimento = birthLocationError;

  const currentLocationError = validateLocation(normalizedCurrentLocation);
  if (currentLocationError) nextErrors.local_atual = currentLocationError;

  const socialNetwork = String(form.rede_social ?? '').trim();
  const socialProfile = String(form.instagram_usuario ?? '').trim();

  if (socialNetwork && !socialProfile) {
    nextErrors.instagram_usuario = 'Informe o perfil para exibir a rede social.';
  }

  if (socialProfile && !socialNetwork) {
    nextErrors.rede_social = 'Selecione uma rede social para exibir no perfil.';
  }

  return nextErrors;
}

export function getPersonZodiacSign(pessoa?: Pessoa | null) {
  return getZodiacSignFromBirthDate(pessoa?.data_nascimento);
}
