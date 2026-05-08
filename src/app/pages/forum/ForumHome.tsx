import React, { useEffect, useMemo, useState } from 'react';
import { AppLink as Link } from '../../components/AppLink';
import { ArrowLeft, MessageCircle, Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  listarCategoriasForum,
  listarTopicosForum,
  ForumTopicoFiltros,
} from '../../services/forumService';
import { ForumEmptyState } from '../../components/forum/ForumEmptyState';
import { ForumCategoria, ForumTopico, ForumTopicoStatus, ForumTopicoTipo } from '../../types';

const TIPO_LABELS: Record<ForumTopicoTipo, string> = {
  pergunta: 'Pergunta',
  discussao: 'Discussão',
  aviso: 'Aviso',
  memoria: 'Memória',
  ajuda: 'Ajuda',
};

const STATUS_LABELS: Record<ForumTopicoStatus, string> = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  oculto: 'Oculto',
};

function formatarData(valor?: string) {
  if (!valor) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(valor));
}

export function ForumHome() {
  const [categorias, setCategorias] = useState<ForumCategoria[]>([]);
  const [topicos, setTopicos] = useState<ForumTopico[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaId, setCategoriaId] = useState('todas');
  const [tipo, setTipo] = useState<'todos' | ForumTopicoTipo>('todos');
  const [status, setStatus] = useState<'todos' | ForumTopicoStatus>('todos');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let mounted = true;

    async function carregar() {
      setLoading(true);
      setErro('');
      const [categoriasData, topicosData] = await Promise.all([
        listarCategoriasForum(),
        listarTopicosForum({ limite: 30 }),
      ]);

      if (!mounted) return;
      setCategorias(categoriasData);
      setTopicos(topicosData);
      if (categoriasData.length === 0 && topicosData.length === 0) {
        setErro('Não foi possível carregar dados do fórum ou ainda não há conteúdo disponível.');
      }
      setLoading(false);
    }

    carregar();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(async () => {
      const filtros: ForumTopicoFiltros = { limite: 30 };
      if (busca.trim()) filtros.busca = busca.trim();
      if (categoriaId !== 'todas') filtros.categoriaId = categoriaId;
      if (tipo !== 'todos') filtros.tipo = tipo;
      if (status !== 'todos') filtros.status = status;

      const data = await listarTopicosForum(filtros);
      if (mounted) setTopicos(data);
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [busca, categoriaId, tipo, status]);

  const categoriasMap = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fórum da Família</h1>
            <p className="text-sm text-gray-500">
              Espaço para perguntas, histórias, documentos, memórias e ajuda com a árvore.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <Link
              to="/forum/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Criar tópico
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_160px]">
            <label className="relative block">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por termo"
                className="pl-9"
              />
            </label>

            <select
              value={categoriaId}
              onChange={(event) => setCategoriaId(event.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Filtrar por categoria"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>

            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as 'todos' | ForumTopicoTipo)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Filtrar por tipo"
            >
              <option value="todos">Todos os tipos</option>
              {Object.entries(TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'todos' | ForumTopicoStatus)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS_LABELS)
                .filter(([value]) => value !== 'oculto')
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </CardContent>
        </Card>

        {erro && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-800">{erro}</CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Categorias</h2>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => setCategoriaId(categoria.id)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  categoriaId === categoria.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{categoria.nome}</div>
                {categoria.descricao && <p className="mt-1 text-sm text-gray-500">{categoria.descricao}</p>}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Tópicos recentes</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setBusca('');
                setCategoriaId('todas');
                setTipo('todos');
                setStatus('todos');
              }}>
                Limpar filtros
              </Button>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">Carregando fórum...</CardContent>
              </Card>
            ) : topicos.length === 0 ? (
              <ForumEmptyState
                titulo="Nenhum tópico encontrado"
                descricao="Não encontramos discussões para a combinação atual de termo, categoria, tipo e status."
              />
            ) : (
              topicos.map((topico) => {
                const categoria = topico.categoria ?? categoriasMap.get(String(topico.categoria_id ?? ''));
                return (
                  <Link key={topico.id} to={`/forum/topico/${topico.id}`} className="block">
                    <Card className="hover:border-blue-200 hover:shadow-md transition">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {categoria?.nome && <span>{categoria.nome}</span>}
                          <span>{TIPO_LABELS[topico.tipo]}</span>
                          <span>{STATUS_LABELS[topico.status]}</span>
                          {topico.status === 'resolvido' && <span className="text-emerald-700">Resolvido</span>}
                          {topico.status === 'fechado' && <span className="text-gray-700">Fechado</span>}
                          {topico.fixado && <span className="text-blue-700">Fixado</span>}
                        </div>
                        <CardTitle className="text-lg leading-snug">{topico.titulo}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="line-clamp-2 text-sm text-gray-600">{topico.conteudo}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {topico.visualizacoes ?? 0} visualizações
                          </span>
                          <span>{formatarData(topico.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
