export const FAMILY_TREE_COLORS = {
  CARD_BORDER_ALIVE: '#3b82f6',
  CARD_BORDER_DECEASED: '#8b5cf6',
  CARD_BORDER_PET: '#f59e0b',
  EDGE_SPOUSE: '#f97316',
  EDGE_CHILD: '#eab308',
  EDGE_SIBLING: '#eab308',
} as const;

export function hasDeathDate(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}
