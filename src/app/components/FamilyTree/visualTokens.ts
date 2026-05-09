export const FAMILY_TREE_COLORS = {
  CARD_BORDER_ALIVE: '#3b82f6',
  CARD_BORDER_DECEASED: '#8b5cf6',
  CARD_BORDER_PET: '#f59e0b',
  EDGE_SPOUSE: '#f97316',
  EDGE_CHILD: '#eab308',
  EDGE_SIBLING: '#eab308',
} as const;

export const DIRECT_FAMILY_TOKENS = {
  CARD_WIDTH: 310,
  CARD_HEIGHT: 108,
  CENTRAL_WIDTH: 620,
  CENTRAL_HEIGHT: 680,
  AVATAR_SIZE: 66,
  CENTRAL_AVATAR_SIZE: 320,
  EDGE_STROKE: '#64748b',
  EDGE_STROKE_WIDTH: 1.6,
  EDGE_OPACITY: 0.72,
  SPOUSE_EDGE_STROKE_WIDTH: 1.6,
  DESKTOP_ZOOM: 0.9,
  MOBILE_ZOOM: 0.34,
} as const;

export const DIRECT_RELATION_STYLES = {
  central: {
    label: 'Pessoa central',
    background: '#ffffff',
    border: '#475569',
    color: '#111827',
    muted: '#4b5563',
  },
  parent: {
    label: 'Pais, irmãos e filhos',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    border: '#38bdf8',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  sibling: {
    label: 'Irmãos',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    border: '#38bdf8',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  child: {
    label: 'Filhos',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    border: '#38bdf8',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  spouse: {
    label: 'Cônjuge',
    background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    border: '#fda4af',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  grandparent: {
    label: 'Avós',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    border: '#a78bfa',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  greatGrandparent: {
    label: 'Bisavós',
    background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
    border: '#fdba74',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  greatGreatGrandparent: {
    label: 'Tataravós e tios',
    background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    border: '#fca5a5',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  uncleAunt: {
    label: 'Tios',
    background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    border: '#fca5a5',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  cousin: {
    label: 'Primos',
    background: 'linear-gradient(135deg, #fde047 0%, #facc15 100%)',
    border: '#fef08a',
    color: '#1f2937',
    muted: '#374151',
  },
  nephewNiece: {
    label: 'Sobrinhos e netos',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: '#86efac',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
  grandchild: {
    label: 'Netos',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: '#86efac',
    color: '#ffffff',
    muted: 'rgba(255,255,255,0.82)',
  },
} as const;

export const DIRECT_RELATION_PET_STYLE = {
  label: 'Pets',
  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  border: '#fde68a',
  color: '#ffffff',
  muted: 'rgba(255,255,255,0.82)',
} as const;

export function hasDeathDate(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}
