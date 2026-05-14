export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function includesNormalizedText(value: unknown, search: unknown) {
  const normalizedSearch = normalizeSearchText(search);
  if (!normalizedSearch) return true;

  return normalizeSearchText(value).includes(normalizedSearch);
}
