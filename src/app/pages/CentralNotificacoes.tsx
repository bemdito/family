import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import { NotificacaoUsuario, Pessoa } from '../types';
import {
  garantirNotificacoesIniciais,
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasComoLidas,
  removerNotificacao,
} from '../services/userEngagementService';
import { obterTodasPessoas } from '../services/dataService';

function formatarData(valor?: string) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CentralNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoUsuario[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');

  const recarregar = () => {
    setNotificacoes(listarNotificacoes());
  };

  useEffect(() => {
    const carregar = async () => {
      const dados = await obterTodasPessoas();
      const lista = Array.isArray(dados) ? dados : [];
      setPessoas(lista);
      garantirNotificacoesIniciais(lista);
      recarregar();
    };

    carregar();
  }, []);

  const notificacoesFiltradas = useMemo(() => {
    if (filtro === 'nao_lidas') return notificacoes.filter((item) => !item.lida);
    if (filtro === 'lidas') return notificacoes.filter((item) => item.lida);
    return notificacoes;
  }, [notificacoes, filtro]);

  const naoLidas = notificacoes.filter((item) => !item.lida).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Central de Notificações</h1>
            <p className="text-sm text-gray-500">Acompanhe aniversários, avisos e atualizações da família</p>
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              {naoLidas > 0 ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm text-gray-500">Não lidas</p>
              <p className="text-2xl font-bold text-gray-900">{naoLidas}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              ['todas', 'Todas'],
              ['nao_lidas', 'Não lidas'],
              ['lidas', 'Lidas'],
            ].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor as 'todas' | 'nao_lidas' | 'lidas')}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                  filtro === valor
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                marcarTodasComoLidas();
                recarregar();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar tudo como lido
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {notificacoesFiltradas.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center text-gray-500">
              Nenhuma notificação neste filtro.
            </div>
          ) : (
            notificacoesFiltradas.map((item) => (
              <article
                key={item.id}
                className={`bg-white border rounded-2xl shadow-sm p-5 ${
                  item.lida ? 'border-gray-200' : 'border-blue-200 ring-1 ring-blue-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          item.lida ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.lida ? 'Lida' : 'Nova'}
                      </span>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">{item.tipo}</span>
                    </div>

                    <h2 className="text-lg font-bold text-gray-900">{item.titulo}</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.mensagem}</p>
                    <p className="text-xs text-gray-400">{formatarData(item.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!item.lida && (
                      <button
                        type="button"
                        onClick={() => {
                          marcarNotificacaoComoLida(item.id);
                          recarregar();
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        aria-label="Marcar como lida"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        removerNotificacao(item.id);
                        recarregar();
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      aria-label="Remover notificação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {item.link && (
                  <div className="mt-4">
                    <Link
                      to={item.link}
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      Abrir conteúdo relacionado
                    </Link>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
