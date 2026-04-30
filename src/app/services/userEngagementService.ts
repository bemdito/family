import { FavoritoUsuario, NotificacaoUsuario, Pessoa, TipoConteudoFavorito } from '../types';

const FAVORITES_KEY = 'arvorefamilia:favorites';
const NOTIFICATIONS_KEY = 'arvorefamilia:notifications';
const DEFAULT_USER_ID = 'demo-user';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentDemoUserId() {
  return DEFAULT_USER_ID;
}

export function listarFavoritos(userId = DEFAULT_USER_ID): FavoritoUsuario[] {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  return favoritos
    .filter((item) => item.user_id === userId)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
}

export function favoritarConteudo(params: {
  tipo: TipoConteudoFavorito;
  conteudoId: string;
  titulo?: string;
  userId?: string;
}) {
  const userId = params.userId ?? DEFAULT_USER_ID;
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);

  const existente = favoritos.find(
    (item) =>
      item.user_id === userId &&
      item.tipo_conteudo === params.tipo &&
      item.conteudo_id === params.conteudoId
  );

  if (existente) {
    return existente;
  }

  const novo: FavoritoUsuario = {
    id: createId('fav'),
    user_id: userId,
    tipo_conteudo: params.tipo,
    conteudo_id: params.conteudoId,
    titulo: params.titulo,
    created_at: new Date().toISOString(),
  };

  favoritos.push(novo);
  writeJson(FAVORITES_KEY, favoritos);
  return novo;
}

export function removerFavorito(favoritoId: string, userId = DEFAULT_USER_ID) {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  const proximo = favoritos.filter((item) => !(item.id === favoritoId && item.user_id === userId));
  writeJson(FAVORITES_KEY, proximo);
}

export function conteudoEstaFavoritado(tipo: TipoConteudoFavorito, conteudoId: string, userId = DEFAULT_USER_ID) {
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  return favoritos.some(
    (item) => item.user_id === userId && item.tipo_conteudo === tipo && item.conteudo_id === conteudoId
  );
}

export function alternarFavorito(params: {
  tipo: TipoConteudoFavorito;
  conteudoId: string;
  titulo?: string;
  userId?: string;
}) {
  const userId = params.userId ?? DEFAULT_USER_ID;
  const favoritos = readJson<FavoritoUsuario[]>(FAVORITES_KEY, []);
  const existente = favoritos.find(
    (item) =>
      item.user_id === userId &&
      item.tipo_conteudo === params.tipo &&
      item.conteudo_id === params.conteudoId
  );

  if (existente) {
    removerFavorito(existente.id, userId);
    return { active: false };
  }

  favoritarConteudo(params);
  return { active: true };
}

export function listarNotificacoes(userId = DEFAULT_USER_ID): NotificacaoUsuario[] {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  return notificacoes
    .filter((item) => item.user_id === userId)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
}

export function criarNotificacao(params: Omit<NotificacaoUsuario, 'id' | 'user_id' | 'created_at' | 'lida'> & { userId?: string }) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const nova: NotificacaoUsuario = {
    id: createId('notif'),
    user_id: params.userId ?? DEFAULT_USER_ID,
    titulo: params.titulo,
    mensagem: params.mensagem,
    tipo: params.tipo,
    canal: params.canal,
    link: params.link,
    lida: false,
    created_at: new Date().toISOString(),
  };

  notificacoes.push(nova);
  writeJson(NOTIFICATIONS_KEY, notificacoes);
  return nova;
}

export function marcarNotificacaoComoLida(notificacaoId: string, userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const atualizadas = notificacoes.map((item) => {
    if (item.id === notificacaoId && item.user_id === userId) {
      return { ...item, lida: true };
    }
    return item;
  });
  writeJson(NOTIFICATIONS_KEY, atualizadas);
}

export function marcarTodasComoLidas(userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const atualizadas = notificacoes.map((item) =>
    item.user_id === userId ? { ...item, lida: true } : item
  );
  writeJson(NOTIFICATIONS_KEY, atualizadas);
}

export function removerNotificacao(notificacaoId: string, userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const proxima = notificacoes.filter((item) => !(item.id === notificacaoId && item.user_id === userId));
  writeJson(NOTIFICATIONS_KEY, proxima);
}

export function garantirNotificacoesIniciais(pessoas: Pessoa[], userId = DEFAULT_USER_ID) {
  const notificacoes = readJson<NotificacaoUsuario[]>(NOTIFICATIONS_KEY, []);
  const existentesDoUsuario = notificacoes.filter((item) => item.user_id === userId);
  if (existentesDoUsuario.length > 0) return;

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const aniversariantesMes = pessoas.filter((pessoa) => {
    const valor = String(pessoa.data_nascimento ?? '');
    if (!valor) return false;
    const br = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (br) return Number(br[2]) === mesAtual;
    if (iso) return Number(iso[2]) === mesAtual;
    return false;
  });

  const seeds: NotificacaoUsuario[] = [
    {
      id: createId('notif'),
      user_id: userId,
      titulo: 'Bem-vindo à central de notificações',
      mensagem: 'Aqui você acompanhará aniversários, datas de memória, eventos e avisos da família.',
      tipo: 'notificacao',
      canal: 'interna',
      lida: false,
      created_at: new Date().toISOString(),
    },
    {
      id: createId('notif'),
      user_id: userId,
      titulo: 'Aniversariantes do mês',
      mensagem: `Há ${aniversariantesMes.length} pessoa(s) com aniversário neste mês cadastradas na árvore.`,
      tipo: 'aniversario',
      canal: 'interna',
      link: '/calendario-familiar',
      lida: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ];

  writeJson(NOTIFICATIONS_KEY, [...notificacoes, ...seeds]);
}
