import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Filter,
  Link2,
  LogOut,
  Star,
  UserCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obterTodasPessoas, obterTodosRelacionamentos } from '../services/dataService';
import {
  buildMemberTreeSummary,
  countPeopleInScope,
  filterPeopleByMemberScope,
} from '../services/memberTreeService';
import { ensureMemberProfile, getPrimaryLinkedPerson, resolveFirstAccessLinkForUser } from '../services/memberProfileService';
import { Pessoa, Relacionamento } from '../types';
import { toast } from 'sonner';

type MemberScope = 'toda_arvore' | 'familia_direta' | 'ramo_materno' | 'ramo_paterno';

function PeopleList({ title, items }: { title: string; items: Pessoa[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/pessoa/${item.id}`}
              className="block rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
            >
              <p className="font-semibold text-gray-900 text-sm">{item.nome_completo}</p>
              {item.local_nascimento && (
                <p className="text-xs text-gray-500 mt-1">{item.local_nascimento}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MinhaArvore() {
  const { user, signOut } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedPersonId, setLinkedPersonId] = useState<string | undefined>();
  const [linkLoading, setLinkLoading] = useState(true);
  const [scope, setScope] = useState<MemberScope>('familia_direta');

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const [pessoasData, relacionamentosData] = await Promise.all([
        obterTodasPessoas(),
        obterTodosRelacionamentos(),
      ]);
      setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
      setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);
      setLoading(false);
    };

    carregar();
  }, []);

  useEffect(() => {
    const carregarVinculo = async () => {
      if (!user) {
        setLinkLoading(false);
        return;
      }

      setLinkLoading(true);
      await ensureMemberProfile(user.id, {
        nome_exibicao: (user.user_metadata?.nome_exibicao as string | undefined) ?? user.email ?? null,
      });
      await resolveFirstAccessLinkForUser(user);
      const { data, error } = await getPrimaryLinkedPerson(user.id);
      if (error) {
        toast.error(error);
      }
      setLinkedPersonId(data?.pessoa_id);
      setLinkLoading(false);
    };

    carregarVinculo();
  }, [user]);

  const pessoaBase = useMemo(() => {
    if (!linkedPersonId) return undefined;
    return pessoas.find((pessoa) => pessoa.id === linkedPersonId);
  }, [pessoas, linkedPersonId]);

  const resumo = useMemo(
    () => buildMemberTreeSummary(pessoaBase?.id, pessoas, relacionamentos),
    [pessoaBase, pessoas, relacionamentos]
  );

  const pessoasNoEscopo = useMemo(
    () => filterPeopleByMemberScope(pessoas, scope, resumo),
    [pessoas, scope, resumo]
  );

  const totalEscopo = useMemo(
    () => countPeopleInScope(scope, resumo, pessoas.length),
    [scope, resumo, pessoas.length]
  );

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada.');
  };

  const semVinculo = !linkLoading && !pessoaBase;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minha Árvore</h1>
            <p className="text-sm text-gray-500">Área inicial do membro autenticado</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" />
                Árvore geral
              </button>
            </Link>
            <Link to="/calendario-familiar">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <CalendarDays className="w-4 h-4" />
                Calendário
              </button>
            </Link>
            <Link to="/meus-favoritos">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Star className="w-4 h-4" />
                Favoritos
              </button>
            </Link>
            <Link to="/notificacoes">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Bell className="w-4 h-4" />
                Notificações
              </button>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {semVinculo && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-amber-950">
                Sua conta ainda não está vinculada a uma pessoa da árvore
              </h2>
              <p className="text-sm text-amber-900 mt-2">
                Para ativar a visualização personalizada da sua família direta, associe esta conta ao seu perfil dentro da árvore genealógica.
              </p>
            </div>
            <Link to="/vincular-perfil">
              <button className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700">
                <Link2 className="w-4 h-4" />
                Vincular meu perfil
              </button>
            </Link>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conta autenticada</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.user_metadata?.nome_exibicao || user?.email || 'Membro da família'}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Esta área mostra um resumo da sua família próxima com base no vínculo real da sua conta.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">Escopo atual</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">{totalEscopo}</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">Pais</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{resumo.pais.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Irmãos</p>
                <p className="text-2xl font-bold text-amber-900 mt-2">{resumo.irmaos.length}</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-700 font-semibold">Filhos</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">{resumo.filhos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pessoa base da sessão</h3>
            {loading || linkLoading ? (
              <p className="text-sm text-gray-500">Carregando dados...</p>
            ) : resumo.pessoaBase ? (
              <div className="space-y-3">
                <p className="text-xl font-bold text-gray-900">{resumo.pessoaBase.nome_completo}</p>
                {resumo.pessoaBase.local_nascimento && (
                  <p className="text-sm text-gray-500">{resumo.pessoaBase.local_nascimento}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/pessoa/${resumo.pessoaBase.id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Abrir perfil dessa pessoa
                  </Link>
                  <Link
                    to="/vincular-perfil"
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:underline"
                  >
                    Alterar vínculo
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Nenhuma pessoa vinculada à sua conta ainda.</p>
                <Link
                  to="/vincular-perfil"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  Vincular perfil agora
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Escopo da visualização</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              ['familia_direta', 'Família direta'],
              ['ramo_materno', 'Ramo materno'],
              ['ramo_paterno', 'Ramo paterno'],
              ['toda_arvore', 'Toda a árvore'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value as MemberScope)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  scope === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Este filtro já organiza a área do membro. O próximo passo será levar o mesmo escopo para a visualização gráfica da árvore.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <PeopleList title="Pais" items={resumo.pais} />
          <PeopleList title="Irmãos" items={resumo.irmaos} />
          <PeopleList title="Cônjuges" items={resumo.conjuges} />
          <PeopleList title="Filhos" items={resumo.filhos} />
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Pessoas no escopo selecionado</h3>
          </div>

          {pessoasNoEscopo.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma pessoa encontrada neste escopo.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pessoasNoEscopo.map((pessoa) => (
                <Link
                  key={pessoa.id}
                  to={`/pessoa/${pessoa.id}`}
                  className="block rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50"
                >
                  <p className="font-semibold text-gray-900 text-sm">{pessoa.nome_completo}</p>
                  {pessoa.local_nascimento && (
                    <p className="text-xs text-gray-500 mt-1">{pessoa.local_nascimento}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
