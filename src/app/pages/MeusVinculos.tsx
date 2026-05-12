import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Heart, Plus, Save, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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

type RelationshipGroupKey = 'pais' | 'filhos' | 'conjuges' | 'irmaos';

type AddRelativeForm = {
  nome_completo: string;
  data_nascimento: string;
  local_nascimento: string;
};

type AddDialogState = {
  group: RelationshipGroupKey;
  title: string;
} | null;

type MarriageDetails = Record<string, { data_casamento: string; local_casamento: string }>;

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

function createLocalPerson(form: AddRelativeForm): Pessoa {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nome_completo: form.nome_completo.trim(),
    data_nascimento: form.data_nascimento.trim() || undefined,
    local_nascimento: form.local_nascimento.trim() || undefined,
    humano_ou_pet: 'Humano',
  };
}

function RelationSection({
  title,
  emptyLabel,
  people,
  addLabel,
  onAdd,
  onRemove,
  children,
}: {
  title: string;
  emptyLabel: string;
  people: Pessoa[];
  addLabel: string;
  onAdd: () => void;
  onRemove: (personId: string) => void;
  children?: (person: Pessoa) => React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={onAdd} aria-label={addLabel}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {people.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <div key={person.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm font-medium text-gray-900">{person.nome_completo}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-red-700 hover:bg-red-50"
                  onClick={() => onRemove(person.id)}
                  aria-label={`Remover ${person.nome_completo}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {children?.(person)}
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
  const [marriageDetails, setMarriageDetails] = useState<MarriageDetails>({});
  const [addDialog, setAddDialog] = useState<AddDialogState>(null);
  const [addForm, setAddForm] = useState<AddRelativeForm>({
    nome_completo: '',
    data_nascimento: '',
    local_nascimento: '',
  });
  const [hasLocalRelationshipChanges, setHasLocalRelationshipChanges] = useState(false);
  const [archives, setArchives] = useState<ArquivoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const pessoa = link?.pessoa;

  async function reloadRelationships(pessoaId: string) {
    const nextRelationships = await obterRelacionamentosDaPessoa(pessoaId);
    setRelationships(nextRelationships);
    setMarriageDetails((current) => {
      const next = { ...current };
      uniquePeople(nextRelationships.conjuges).forEach((person) => {
        next[person.id] = next[person.id] ?? { data_casamento: '', local_casamento: '' };
      });
      return next;
    });
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

  const openAddDialog = (group: RelationshipGroupKey, title: string) => {
    setAddDialog({ group, title });
    setAddForm({ nome_completo: '', data_nascimento: '', local_nascimento: '' });
  };

  const closeAddDialog = () => {
    setAddDialog(null);
    setAddForm({ nome_completo: '', data_nascimento: '', local_nascimento: '' });
  };

  const addRelative = () => {
    if (!addDialog) return;
    if (!addForm.nome_completo.trim()) {
      toast.error('Informe o nome completo do familiar.');
      return;
    }

    const person = createLocalPerson(addForm);

    // TODO: persistir a nova pessoa e o vínculo em Supabase quando o fluxo de revisão tiver backend definitivo.
    setRelationships((current) => ({
      ...current,
      [addDialog.group]: uniquePeople([...current[addDialog.group], person]),
    }));

    if (addDialog.group === 'conjuges') {
      setMarriageDetails((current) => ({
        ...current,
        [person.id]: { data_casamento: '', local_casamento: '' },
      }));
    }

    setHasLocalRelationshipChanges(true);
    closeAddDialog();
  };

  const removeRelative = (group: RelationshipGroupKey, personId: string) => {
    // TODO: persistir remoção de vínculo em Supabase quando a revisão de relacionamentos for definitiva.
    if (group === 'pais') {
      setRelationships((current) => ({
        ...current,
        pais: current.pais.filter((person) => person.id !== personId),
        maes: current.maes.filter((person) => person.id !== personId),
      }));
    } else {
      setRelationships((current) => ({
        ...current,
        [group]: current[group].filter((person) => person.id !== personId),
      }));
    }

    if (group === 'conjuges') {
      setMarriageDetails((current) => {
        const next = { ...current };
        delete next[personId];
        return next;
      });
    }

    setHasLocalRelationshipChanges(true);
  };

  const updateMarriageDetail = (
    spouseId: string,
    field: 'data_casamento' | 'local_casamento',
    value: string,
  ) => {
    // TODO: persistir data_casamento/local_casamento no relacionamento de cônjuge quando houver escrita nessa revisão.
    setMarriageDetails((current) => ({
      ...current,
      [spouseId]: {
        data_casamento: current[spouseId]?.data_casamento ?? '',
        local_casamento: current[spouseId]?.local_casamento ?? '',
        [field]: value,
      },
    }));
    setHasLocalRelationshipChanges(true);
  };

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

    if (hasLocalRelationshipChanges) {
      toast.info('Correções registradas para revisão. A persistência definitiva será implementada em seguida.');
    } else {
      toast.success('Vínculos confirmados.');
    }
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
              <RelationSection
                title="Pais"
                emptyLabel="Nenhum pai/mãe cadastrado"
                people={parents}
                addLabel="Adicionar pai ou mãe"
                onAdd={() => openAddDialog('pais', 'Adicionar pai ou mãe')}
                onRemove={(personId) => removeRelative('pais', personId)}
              />
              <RelationSection
                title="Filhos"
                emptyLabel="Nenhum filho cadastrado"
                people={uniquePeople(relationships.filhos)}
                addLabel="Adicionar filho"
                onAdd={() => openAddDialog('filhos', 'Adicionar filho')}
                onRemove={(personId) => removeRelative('filhos', personId)}
              />
              <RelationSection
                title="Cônjuge"
                emptyLabel="Nenhum cônjuge cadastrado"
                people={uniquePeople(relationships.conjuges)}
                addLabel="Adicionar cônjuge"
                onAdd={() => openAddDialog('conjuges', 'Adicionar cônjuge')}
                onRemove={(personId) => removeRelative('conjuges', personId)}
              >
                {(person) => (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Data de casamento</Label>
                      <Input
                        value={marriageDetails[person.id]?.data_casamento ?? ''}
                        onChange={(event) => updateMarriageDetail(person.id, 'data_casamento', event.target.value)}
                        placeholder="DD/MM/AAAA ou AAAA"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Local de casamento</Label>
                      <Input
                        value={marriageDetails[person.id]?.local_casamento ?? ''}
                        onChange={(event) => updateMarriageDetail(person.id, 'local_casamento', event.target.value)}
                        placeholder="Cidade/UF"
                        className="bg-white"
                      />
                    </div>
                  </div>
                )}
              </RelationSection>
              <RelationSection
                title="Irmãos"
                emptyLabel="Nenhum irmão cadastrado"
                people={uniquePeople(relationships.irmaos)}
                addLabel="Adicionar irmão"
                onAdd={() => openAddDialog('irmaos', 'Adicionar irmão')}
                onRemove={(personId) => removeRelative('irmaos', personId)}
              />
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

      <Dialog open={Boolean(addDialog)} onOpenChange={(open) => (!open ? closeAddDialog() : undefined)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{addDialog?.title ?? 'Adicionar familiar'}</DialogTitle>
            <DialogDescription>
              Esta correção ficará registrada localmente nesta revisão até a persistência definitiva ser implementada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="relative-name">Nome completo</Label>
              <Input
                id="relative-name"
                value={addForm.nome_completo}
                onChange={(event) => setAddForm((current) => ({ ...current, nome_completo: event.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relative-birth-date">Data de nascimento opcional</Label>
              <Input
                id="relative-birth-date"
                value={addForm.data_nascimento}
                onChange={(event) => setAddForm((current) => ({ ...current, data_nascimento: event.target.value }))}
                placeholder="DD/MM/AAAA ou AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relative-birth-place">Local de nascimento opcional</Label>
              <Input
                id="relative-birth-place"
                value={addForm.local_nascimento}
                onChange={(event) => setAddForm((current) => ({ ...current, local_nascimento: event.target.value }))}
                placeholder="Cidade/UF"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAddDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={addRelative}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
