import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AppLink as Link } from '../components/AppLink';
import { ChevronLeft, ChevronRight, ArrowLeft, Gift, Heart, CalendarSync, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { obterTodasPessoas } from '../services/dataService';
import { Pessoa } from '../types';
import { criarEventosDoCalendario, EventoCalendarioFamiliar } from '../utils/familyDates';
import { useAuth } from '../contexts/AuthContext';
import {
  desconectarGoogleCalendar,
  iniciarConexaoGoogleCalendar,
  obterStatusGoogleCalendar,
  sincronizarGoogleCalendar,
  GoogleCalendarStatus,
} from '../services/googleCalendarService';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function construirGradeMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const totalDias = ultimoDia.getDate();
  const inicioSemana = primeiroDia.getDay();

  const grade: Array<number | null> = [];

  for (let i = 0; i < inicioSemana; i += 1) {
    grade.push(null);
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    grade.push(dia);
  }

  while (grade.length % 7 !== 0) {
    grade.push(null);
  }

  return grade;
}

function agruparPorDia(eventos: EventoCalendarioFamiliar[]) {
  const mapa = new Map<number, EventoCalendarioFamiliar[]>();

  for (const evento of eventos) {
    const lista = mapa.get(evento.dia) ?? [];
    lista.push(evento);
    mapa.set(evento.dia, lista);
  }

  return mapa;
}

export function CalendarioFamiliar() {
  const hoje = new Date();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dataAtual, setDataAtual] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ conectado: false });
  const [incluirAniversarios, setIncluirAniversarios] = useState(true);
  const [incluirMemorias, setIncluirMemorias] = useState(true);
  const [ultimoResultadoSync, setUltimoResultadoSync] = useState<{
    totalCriados?: number;
    totalAtualizados?: number;
    totalIgnorados?: number;
  } | null>(null);
  const [mostrarAniversarios, setMostrarAniversarios] = useState(true);
  const [mostrarMemoria, setMostrarMemoria] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const dados = await obterTodasPessoas();
      setPessoas(Array.isArray(dados) ? dados : []);
      setLoading(false);
    };

    carregar();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function carregarStatusGoogle() {
      if (!user) {
        setGoogleStatus({ conectado: false });
        return;
      }

      const status = await obterStatusGoogleCalendar(user.id);
      if (mounted) setGoogleStatus(status);
    }

    carregarStatusGoogle();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const status = searchParams.get('google_calendar');

    if (status === 'connected') {
      setGoogleStatus((current) => ({ ...current, conectado: true }));
      toast.success('Google Agenda conectado.');
      if (user) {
        obterStatusGoogleCalendar(user.id).then(setGoogleStatus);
      }
    }

    if (status === 'error') {
      toast.error('Não foi possível conectar o Google Agenda. Tente novamente.');
    }

    if (status) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('google_calendar');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user]);

  async function conectarGoogleCalendar() {
    if (!user) {
      toast.error('Entre na sua conta para conectar o Google Agenda.');
      return;
    }

    setGoogleLoading(true);
    const { error } = await iniciarConexaoGoogleCalendar();
    if (error) {
      toast.error(error);
      setGoogleLoading(false);
    }
  }

  async function sincronizarEventosGoogle() {
    if (!user) {
      toast.error('Entre na sua conta para sincronizar eventos.');
      return;
    }

    setGoogleLoading(true);
    const { data, error } = await sincronizarGoogleCalendar({
      incluirAniversarios,
      incluirMemorias,
    });
    setGoogleLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    setUltimoResultadoSync({
      totalCriados: data?.totalCriados ?? 0,
      totalAtualizados: data?.totalAtualizados ?? 0,
      totalIgnorados: data?.totalIgnorados ?? 0,
    });
    setGoogleStatus(await obterStatusGoogleCalendar(user.id));
    toast.success(`Sincronização concluída: ${data?.totalCriados ?? 0} criado(s), ${data?.totalAtualizados ?? 0} atualizado(s).`);
  }

  async function desconectarGoogle() {
    if (!window.confirm('Deseja desconectar o Google Agenda deste usuário?')) return;

    setGoogleLoading(true);
    const { error } = await desconectarGoogleCalendar();
    setGoogleLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    setGoogleStatus({ conectado: false });
    setUltimoResultadoSync(null);
    toast.success('Google Agenda desconectado.');
  }

  const eventos = useMemo(() => criarEventosDoCalendario(pessoas), [pessoas]);

  const eventosDoMes = useMemo(() => {
    return eventos.filter((evento) => {
      if (evento.mes !== dataAtual.getMonth()) return false;
      if (evento.tipo === 'aniversario' && !mostrarAniversarios) return false;
      if (evento.tipo === 'memoria' && !mostrarMemoria) return false;
      return true;
    });
  }, [eventos, dataAtual, mostrarAniversarios, mostrarMemoria]);

  const eventosPorDia = useMemo(() => agruparPorDia(eventosDoMes), [eventosDoMes]);
  const grade = useMemo(() => construirGradeMes(dataAtual.getFullYear(), dataAtual.getMonth()), [dataAtual]);

  const aniversariantesMes = eventosDoMes.filter((evento) => evento.tipo === 'aniversario');
  const memoriasMes = eventosDoMes.filter((evento) => evento.tipo === 'memoria');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendário Familiar</h1>
            <p className="text-sm text-gray-500">Aniversários e datas de memória da árvore genealógica</p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a árvore
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1))}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Mês exibido</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {MESES[dataAtual.getMonth()]} de {dataAtual.getFullYear()}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1))}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mostrarAniversarios}
                  onChange={() => setMostrarAniversarios((prev) => !prev)}
                />
                Aniversários
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mostrarMemoria}
                  onChange={() => setMostrarMemoria((prev) => !prev)}
                />
                Datas de memória
              </label>
            </div>
          </div>
        </section>

        {user && (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <CalendarSync className="h-5 w-5 text-blue-600" />
                Google Agenda
              </h2>
              {googleStatus.conectado ? (
                <div className="mt-1 space-y-1 text-sm text-gray-600">
                  <p className="font-medium text-emerald-700">Google Agenda conectado</p>
                  {googleStatus.google_account_email && <p>Conta: {googleStatus.google_account_email}</p>}
                  <p>
                    Última sincronização:{' '}
                    {googleStatus.last_sync_at
                      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(googleStatus.last_sync_at))
                      : 'ainda não sincronizado'}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Conecte sua conta Google para receber aniversários e datas de memória no Google Agenda.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {googleStatus.conectado && (
                <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 sm:flex-row sm:items-center">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={incluirAniversarios}
                      onChange={() => setIncluirAniversarios((value) => !value)}
                    />
                    Sincronizar aniversários
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={incluirMemorias}
                      onChange={() => setIncluirMemorias((value) => !value)}
                    />
                    Sincronizar datas de memória
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
              {!googleStatus.conectado && (
              <button
                type="button"
                onClick={conectarGoogleCalendar}
                disabled={googleLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
              >
                <CalendarSync className="h-4 w-4" />
                Conectar Google Agenda
              </button>
              )}

              {googleStatus.conectado && (
              <>
              <button
                type="button"
                onClick={sincronizarEventosGoogle}
                disabled={googleLoading || (!incluirAniversarios && !incluirMemorias)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <CalendarSync className="h-4 w-4" />
                {googleLoading ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>

              <button
                type="button"
                onClick={desconectarGoogle}
                disabled={googleLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Desconectar
              </button>
              </>
              )}
              </div>
            </div>
          </div>

          {ultimoResultadoSync && (
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                Criados: <strong>{ultimoResultadoSync.totalCriados ?? 0}</strong>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
                Atualizados: <strong>{ultimoResultadoSync.totalAtualizados ?? 0}</strong>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
                Ignorados: <strong>{ultimoResultadoSync.totalIgnorados ?? 0}</strong>
              </div>
            </div>
          )}
        </section>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DIAS_SEMANA.map((diaSemana) => (
                <div key={diaSemana} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {diaSemana}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando calendário...</div>
            ) : (
              <div className="grid grid-cols-7">
                {grade.map((dia, index) => {
                  const eventosDia = dia ? eventosPorDia.get(dia) ?? [] : [];
                  const isHoje =
                    dia === hoje.getDate() &&
                    dataAtual.getMonth() === hoje.getMonth() &&
                    dataAtual.getFullYear() === hoje.getFullYear();

                  return (
                    <div
                      key={`${dia ?? 'vazio'}-${index}`}
                      className="min-h-[132px] border-b border-r border-gray-200 p-2 align-top"
                    >
                      {dia ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                                isHoje ? 'bg-blue-600 text-white' : 'text-gray-900'
                              }`}
                            >
                              {dia}
                            </span>
                            {eventosDia.length > 0 && (
                              <span className="text-[10px] font-semibold text-gray-500">{eventosDia.length} item(ns)</span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {eventosDia.slice(0, 3).map((evento) => (
                              <Link
                                key={evento.id}
                                to={`/pessoa/${evento.pessoaId}`}
                                className={`block rounded-lg border px-2 py-1.5 text-[11px] leading-tight transition-colors ${
                                  evento.tipo === 'aniversario'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                    : 'border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100'
                                }`}
                              >
                                <div className="flex items-center gap-1 font-semibold mb-1">
                                  {evento.tipo === 'aniversario' ? <Gift className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                                  <span>{evento.nome}</span>
                                </div>
                                <p>{evento.descricao}</p>
                              </Link>
                            ))}

                            {eventosDia.length > 3 && (
                              <div className="text-[11px] font-medium text-gray-500 px-1">
                                +{eventosDia.length - 3} item(ns)
                              </div>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo do mês</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <span>Aniversários</span>
                  <strong className="text-emerald-700">{aniversariantesMes.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-purple-50 px-4 py-3">
                  <span>Datas de memória</span>
                  <strong className="text-purple-700">{memoriasMes.length}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Aniversariantes</h3>
              <div className="space-y-3">
                {aniversariantesMes.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum aniversário neste mês com os filtros atuais.</p>
                ) : (
                  aniversariantesMes.map((evento) => (
                    <Link
                      key={evento.id}
                      to={`/pessoa/${evento.pessoaId}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{evento.nome}</p>
                        <p className="text-xs text-gray-500">Dia {evento.dia}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-700">{evento.descricao}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Datas de memória</h3>
              <div className="space-y-3">
                {memoriasMes.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma data de memória neste mês com os filtros atuais.</p>
                ) : (
                  memoriasMes.map((evento) => (
                    <Link
                      key={evento.id}
                      to={`/pessoa/${evento.pessoaId}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{evento.nome}</p>
                        <p className="text-xs text-gray-500">Dia {evento.dia}</p>
                      </div>
                      <span className="text-xs font-medium text-purple-700">{evento.descricao}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
