import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Check, Link2, Search, UserCircle2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { ensureMemberProfile, linkUserToPerson, listLinkablePeople } from '../services/memberProfileService';
import { Pessoa } from '../types';
import { toast } from 'sonner';

const RELACOES_SUGERIDAS = [
  'Sou esta pessoa',
  'Filho(a)',
  'Neto(a)',
  'Bisneto(a)',
  'Parente próximo',
  'Administrador da árvore',
];

export function VincularPerfil() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [relacao, setRelacao] = useState('Sou esta pessoa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (!user) return;
      setLoading(true);
      await ensureMemberProfile(user.id, {
        nome_exibicao: (user.user_metadata?.nome_exibicao as string | undefined) ?? user.email ?? null,
      });
      const { data, error } = await listLinkablePeople();
      setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      setPessoas(data);
    };

    carregar();
  }, [user]);

  const pessoasFiltradas = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return pessoas;
    return pessoas.filter((pessoa) => {
      const nome = pessoa.nome_completo.toLowerCase();
      const local = String(pessoa.local_nascimento ?? '').toLowerCase();
      return nome.includes(termo) || local.includes(termo);
    });
  }, [pessoas, search]);

  const selecionada = pessoas.find((item) => item.id === selectedPersonId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('É necessário estar autenticado para vincular um perfil.');
      return;
    }
    if (!selectedPersonId) {
      toast.error('Selecione uma pessoa da árvore para continuar.');
      return;
    }

    setSaving(true);
    const { error } = await linkUserToPerson({
      userId: user.id,
      pessoaId: selectedPersonId,
      relacaoComPerfil: relacao,
      principal: true,
    });
    setSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Perfil vinculado com sucesso.');
    navigate('/minha-arvore');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vincular meu perfil</h1>
            <p className="text-sm text-gray-500">Associe sua conta a uma pessoa já cadastrada na árvore genealógica</p>
          </div>

          <Link to="/minha-arvore" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-6">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar pessoa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite nome ou local de nascimento" className="pl-10" />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Carregando pessoas da árvore...</div>
            ) : pessoasFiltradas.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">Nenhuma pessoa encontrada.</div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100">
                {pessoasFiltradas.map((pessoa) => {
                  const active = pessoa.id === selectedPersonId;
                  return (
                    <button
                      key={pessoa.id}
                      type="button"
                      onClick={() => setSelectedPersonId(pessoa.id)}
                      className={`w-full text-left px-4 py-4 transition-colors ${active ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{pessoa.nome_completo}</p>
                          {pessoa.local_nascimento && <p className="text-xs text-gray-500 mt-1">{pessoa.local_nascimento}</p>}
                          {pessoa.data_nascimento && <p className="text-xs text-gray-400 mt-1">Nascimento: {String(pessoa.data_nascimento)}</p>}
                        </div>
                        {active && <Check className="w-4 h-4 text-blue-700 mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Confirmação do vínculo</h2>
              <p className="text-sm text-gray-500">Defina como sua conta se relaciona com o perfil selecionado</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Pessoa selecionada</label>
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 min-h-[76px]">
                {selecionada ? (
                  <>
                    <p className="font-semibold text-gray-900">{selecionada.nome_completo}</p>
                    {selecionada.local_nascimento && <p className="text-sm text-gray-500 mt-1">{selecionada.local_nascimento}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma pessoa selecionada ainda.</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Como esta conta se relaciona com o perfil?</label>
              <select
                value={relacao}
                onChange={(e) => setRelacao(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm text-gray-700"
              >
                {RELACOES_SUGERIDAS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={saving || !selectedPersonId}>
              <Link2 className="w-4 h-4 mr-2" />
              {saving ? 'Vinculando...' : 'Vincular conta a esta pessoa'}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Se a pessoa ainda não estiver cadastrada, cadastre primeiro no painel administrativo ou adicione o fluxo de solicitação de cadastro em uma próxima etapa.
          </div>
        </aside>
      </main>
    </div>
  );
}
