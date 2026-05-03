import { TipoVisualizacaoArvore } from '../../../types';
import {
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelativeFilters,
  DirectRelativeGroup,
} from '../types';

const STORAGE_KEYS = {
  viewMode: 'familyTree:viewMode',
  activeGeneration: 'familyTree:activeGeneration',
  desktopNoticeDismissed: 'familyTree:desktopNoticeDismissed',
};

export function readStoredViewMode(): TipoVisualizacaoArvore | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    if (value === 'familiares-diretos' || value === 'lados' || value === 'geracoes' || value === 'lista') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function readDirectRelativeFilters(userId?: string): DirectRelativeFilters {
  if (!userId) return DEFAULT_DIRECT_RELATIVE_FILTERS;

  try {
    const value = window.localStorage.getItem(`familyTree:directRelativeFilters:${userId}`);
    if (!value) return DEFAULT_DIRECT_RELATIVE_FILTERS;

    const parsed = JSON.parse(value) as Partial<Record<DirectRelativeGroup, unknown>>;
    return (Object.keys(DEFAULT_DIRECT_RELATIVE_FILTERS) as DirectRelativeGroup[]).reduce(
      (filters, key) => ({
        ...filters,
        [key]: typeof parsed[key] === 'boolean' ? parsed[key] : DEFAULT_DIRECT_RELATIVE_FILTERS[key],
      }),
      {} as DirectRelativeFilters
    );
  } catch {
    return DEFAULT_DIRECT_RELATIVE_FILTERS;
  }
}

export function storeDirectRelativeFilters(userId: string | undefined, value: DirectRelativeFilters) {
  if (!userId) return;

  try {
    window.localStorage.setItem(`familyTree:directRelativeFilters:${userId}`, JSON.stringify(value));
  } catch {
    // noop
  }
}

export function storeViewMode(value: TipoVisualizacaoArvore) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.viewMode, value);
  } catch {
    // noop
  }
}

export function readStoredActiveGeneration(): number | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.activeGeneration);
    if (value === null) return null;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function storeActiveGeneration(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.activeGeneration, String(value));
  } catch {
    // noop
  }
}

export function readDesktopNoticeDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.desktopNoticeDismissed) === 'true';
  } catch {
    return false;
  }
}

export function storeDesktopNoticeDismissed(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.desktopNoticeDismissed, String(value));
  } catch {
    // noop
  }
}

export function clearTreePreferences() {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // noop
  }
}

export { STORAGE_KEYS as TREE_PREFERENCE_KEYS };
