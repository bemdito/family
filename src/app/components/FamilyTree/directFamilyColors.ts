export const DIRECT_FAMILY_RELATION_COLORS = {
  tataravos: {
    background: '#B91C1C',
    solid: '#B91C1C',
    label: 'Tataravós',
  },
  bisavos: {
    background: '#C2410C',
    solid: '#C2410C',
    label: 'Bisavós',
  },
  avos: {
    background: '#A16207',
    solid: '#A16207',
    label: 'Avós',
  },
  pais: {
    background: '#15803D',
    solid: '#15803D',
    label: 'Pais',
  },
  tios: {
    background: '#15803D',
    solid: '#15803D',
    label: 'Tios',
  },
  primos: {
    background: '#1D4ED8',
    solid: '#1D4ED8',
    label: 'Primos',
  },
  central: {
    background: '#FFFFFF',
    solid: '#FFFFFF',
    label: 'Usuário Principal',
  },
  irmaos: {
    background: '#4338CA',
    solid: '#4338CA',
    label: 'Irmãos',
  },
  sobrinhos: {
    background: '#7E22CE',
    solid: '#7E22CE',
    label: 'Sobrinhos',
  },
  netos: {
    background: '#581C87',
    solid: '#581C87',
    label: 'Netos',
  },
  conjuge: {
    background: '#A21CAF',
    solid: '#A21CAF',
    label: 'Cônjuge',
  },
  filhos: {
    background: '#1D4ED8',
    solid: '#1D4ED8',
    label: 'Filhos',
  },
} as const;

export const DIRECT_FAMILY_STATUS_BORDER_COLORS = {
  alive: '#22C55E',
  deceased: '#CBD5E1',
} as const;

export const DIRECT_FAMILY_LEGEND_BACKGROUNDS = [
  DIRECT_FAMILY_RELATION_COLORS.tataravos,
  DIRECT_FAMILY_RELATION_COLORS.bisavos,
  DIRECT_FAMILY_RELATION_COLORS.avos,
  {
    ...DIRECT_FAMILY_RELATION_COLORS.tios,
    label: 'Tios, Pai e Mãe',
  },
  DIRECT_FAMILY_RELATION_COLORS.primos,
  DIRECT_FAMILY_RELATION_COLORS.central,
  DIRECT_FAMILY_RELATION_COLORS.irmaos,
  DIRECT_FAMILY_RELATION_COLORS.sobrinhos,
  DIRECT_FAMILY_RELATION_COLORS.netos,
  DIRECT_FAMILY_RELATION_COLORS.conjuge,
  DIRECT_FAMILY_RELATION_COLORS.filhos,
] as const;
