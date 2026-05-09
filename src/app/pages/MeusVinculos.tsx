import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Heart, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import {
  listarArquivosHistoricosPorPessoa,
  substituirArquivosHistoricosDaPessoa,
} from '../services/arquivosHistoricosService';
import { obterRelacionamentosDaPessoa } from '../services/dataService';
import {
  confirmOwnLinkedPersonData,
  getPrimaryLinkedPersonWithPessoa,
  resolveFirstAccessLinkForUser,
  UserPersonLinkRecord,
} from '../services/memberProfileService';
import { ArquivoHistorico, Pessoa } from '../types';

type RelationshipGroups = {
  pais: Pessoa[];
  maes: Pessoa[];
  conjuges: Pessoa[];
  filhos: Pessoa[];
  irmaos: Pessoa[];
};

const EMPTY_GROUPS: RelationshipGroups = {
  pais: [],
  maes: [],
  conjuges: [],
  filhos: [],
  irmaos: [],
};

function uniquePeople(people: Pessoa[]) {
  return Array.from(new Map(people.map((person) => [person.id, person])).values());
}

function RelationSection({
  title,
  emptyLabel,
  people,
  typeLabel,
}: {
  title: string;
  emptyLabel: string;
  people: Pessoa[];
  typeLabel: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          já cadastrado
        </span>
      </div>

      {people.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <div key={person.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{person.nome_completo}</p>
              <p className="text-xs text-gray-500">{typeLabel}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MeusVinculos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [link, setLink] = useState<(UserPersonLinkRecord & { pessoa: Pessoa | null }) | null>(null);
  const [relationships, setRelationships] = useState<RelationshipGroups>(EMPTY_GROUPS);
  const [archives, setArchives] = useState<ArquivoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const pessoa = link?.pessoa;

  async function reloadRelationships(pessoaId: string) {
    const nextRelationships = await obterRelacionamentosDaPessoa(pessoaId);
    setRelationships(nextRelationships);
  }

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user) return;

      setLoading(true);
      await resolveFirstAccessLinkForUser(user);
      const { data, error } = await getPrimaryLinkedPersonWithPessoa(user.id);

      if (!mounted) return;

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      setLink(data);

      if (data?.pessoa?.id) {
        const nextArchives = await listarArquivosHistoricosPorPessoa(data.pessoa.id);
        if (mounted) setArchives(nextArchives);
        await reloadRelationships(data.pessoa.id);
      }

      if (mounted) setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleFinish = async () => {
    if (!link?.id || !pessoa?.id) {
      toast.error('Não foi possível localizar seu vínculo com a árvore.');
      return;
    }

    setFinishing(true);

    try {
      await substituirArquivosHistoricosDaPessoa(pessoa.id, archives);
    } catch (error) {
      setFinishing(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar arquivos históricos.');
      return;
    }

    const { error: confirmError } = await confirmOwnLinkedPersonData(link.id);
    setFinishing(false);

    if (confirmError) {
      toast.error(confirmError);
      return;
    }

    toast.success('Vínculos confirmados.');
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Carregando seus vínculos...</p>
        </div>
      </div>
    );
  }

  if (!link || !pessoa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Sua conta ainda não está vinculada a uma pessoa da árvore.</p>
            <Button className="mt-4" onClick={() => navigate('/entrar')}>
              Ir para autenticação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parents = uniquePeople([...relationships.pais, ...relationships.maes]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Confirmar vínculos familiares</h1>
          <p className="mt-1 text-sm text-gray-500">Revise seus relacionamentos e arquivos antes de acessar a árvore.</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relacionamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <RelationSection title="Pais" emptyLabel="Nenhum pai/mãe cadastrado" people={parents} typeLabel="Pai/Mãe" />
              <RelationSection title="Filhos" emptyLabel="Nenhum filho cadastrado" people={uniquePeople(relationships.filhos)} typeLabel="Filho(a)" />
              <RelationSection title="Cônjuge" emptyLabel="Nenhum cônjuge cadastrado" people={uniquePeople(relationships.conjuges)} typeLabel="Cônjuge" />
              <RelationSection title="Irmãos" emptyLabel="Nenhum irmão cadastrado" people={uniquePeople(relationships.irmaos)} typeLabel="Irmão(ã)" />
            </CardContent>
          </Card>

          <div>
            <ArquivosHistoricos arquivos={archives} onChange={setArchives} />
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{pessoa.nome_completo}</h2>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Confirmação</p>
            <p className="mt-1">Ao concluir, seus dados ficam marcados como confirmados e a árvore principal é liberada.</p>
          </div>

          <Button className="mt-5 w-full" onClick={handleFinish} disabled={finishing}>
            {finishing ? (
              'Finalizando...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Confirmar e acessar árvore
              </>
            )}
          </Button>
        </aside>
      </main>
    </div>
  );
}
