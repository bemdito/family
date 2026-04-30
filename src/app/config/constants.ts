// Configurações globais do sistema

export const APP_CONFIG = {
  name: 'Árvore Genealógica',
  familyName: 'Família Limeira Souza',
  version: '1.0.0',
  
  // Autenticação mock
  mockAuth: {
    email: 'admin@familia.com',
    password: 'admin123'
  },
  
  // Configurações da árvore
  tree: {
    nodeWidth: 280,
    nodeHeight: 120,
    nodeSpacing: 80,
    rankSpacing: 120,
    defaultZoom: 0.8,
    minZoom: 0.1,
    maxZoom: 2
  },
  
  // Cores
  colors: {
    humanAlive: '#3b82f6', // blue
    humanDeceased: '#9ca3af', // gray
    pet: '#fbbf24', // amber
    marriage: '#10b981', // emerald/green
    bloodRelation: '#6b7280', // gray
    adoptiveRelation: '#f59e0b' // amber
  }
};

export const ROUTES = {
  home: '/',
  personProfile: (id: string) => `/pessoa/${id}`,
  admin: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    pessoas: '/admin/pessoas',
    pessoaNova: '/admin/pessoas/nova',
    pessoaEditar: (id: string) => `/admin/pessoas/${id}/editar`,
    relacionamentos: '/admin/relacionamentos',
    importacao: '/admin/importacao'
  }
};
