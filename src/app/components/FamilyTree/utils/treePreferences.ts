import { TipoVisualizacaoArvore } from '../../../types';

const STORAGE_KEYS = {
  viewMode: 'familyTree:viewMode',
  activeGeneration: 'familyTree:activeGeneration',
  desktopNoticeDismissed: 'familyTree:desktopNoticeDismissed',
};

export function readStoredViewMode(): TipoVisualizacaoArvore | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    if (value === 'lados' || value === 'geracoes' || value === 'lista') {
      return value;
    }
    return null;
  } catch {
    return null;
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
