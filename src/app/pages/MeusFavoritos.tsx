import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Heart, Trash2, FileText, CalendarDays, User } from 'lucide-react';
import { FavoritoUsuario, Pessoa } from '../types';
import { listarFavoritos, removerFavorito } from '../services/userEngagementService';
import { obterTodasPessoas } from '../services/dataService';

const LABELS: Record<string, string> = {
  pessoa: 'Pessoa',
  arquivo: 'Arquivo',
  topico: 'Tópico',
  evento: 'Evento',
  pagina: 'Página',
  historia: 'História',
};

function resolverLinkFavorito(favorito: FavoritoUsuario) {
  if (favorito.tipo_conteudo === 'pessoa') return `/pessoa/${favorito.conteudo_id}`;
  if (favorito.tipo_conteudo === 'pagina') return favorito.conteudo_id;
  if (favorito.tipo_conteudo === 'evento') return '/calendario-familiar';
  return '/';
}

export function MeusFavoritos() {
  const [favoritos, setFavoritos] = useState<FavoritoUsuario[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [filtro, setFiltro] = useState<string>('todos');

  const recarregar = async () => {
    setFavoritos(listarFavoritos());
    const dados = await obterTodasPessoas();
    setPessoas(Array.isArray(dados) ? dados : []);
  };

  useEffect(() => {
    recarregar();
  }, []);

  const pessoasMap = useMemo(() => new Map(pessoas.map((pessoa) => [pessoa.id, pessoa])), [pessoas]);

  const favoritosFiltrados = useMemo(() => {
    if (filtro === 'todos') return favoritos;
    return favoritos.filter((item) => item.tipo_conteudo === filtro);
  }, [favoritos, filtro]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Favoritos</h1>
            <p className="text-sm text-gray-500">Perfis, páginas e conteúdos salvos para consultar depois</p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3">
          {['todos', 'pessoa', 'pagina', 'evento', 'arquivo', 'topico', 'historia'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFiltro(item)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                filtro === item
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {item === 'todos' ? 'Todos' : LABELS[item]}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favoritosFiltrados.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center text-gray-500">
              Nenhum favorito encontrado para este filtro.
            </div>
          ) : (
            favoritosFiltrados.map((favorito) => {
              const pessoa = favorito.tipo_conteudo === 'pessoa' ? pessoasMap.get(favorito.conteudo_id) : undefined;
              return (
                <div key={favorito.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-semibold mb-3">
                        <Heart className="w-3 h-3" />
                        {LABELS[favorito.tipo_conteudo]}
                      </span>
                      <h2 className="text-lg font-bold text-gray-900">
                        {favorito.titulo || pessoa?.nome_completo || 'Conteúdo salvo'}
                      </h2>
                      {pessoa?.local_nascimento && (
                        <p className="text-sm text-gray-500 mt-1">{pessoa.local_nascimento}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removerFavorito(favorito.id);
                        recarregar();
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      aria-label="Remover dos favoritos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    {favorito.tipo_conteudo === 'pessoa' && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Perfil individual da árvore</span>
                      </div>
                    )}
                    {favorito.tipo_conteudo === 'pagina' && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>Página salva para acesso rápido</span>
                      </div>
                    )}
                    {favorito.tipo_conteudo === 'evento' && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span>Evento ou data importante</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <Link
                      to={resolverLinkFavorito(favorito)}
                      className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                      Abrir conteúdo
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
