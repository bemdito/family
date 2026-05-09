import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { AppLink as Link } from '../components/AppLink';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { obterPessoaPorId, obterRelacionamentosDaPessoa, obterTodasPessoas } from '../services/dataService';
import { listarArquivosHistoricosPorPessoa } from '../services/arquivosHistoricosService';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import { alternarFavorito, conteudoEstaFavoritado } from '../services/userEngagementService';
import { listarTopicosForum } from '../services/forumService';
import { ForumTopico, Pessoa } from '../types';
import { 
  ArrowLeft, 
  Star, 
  Bell,
  MessageCircle,
  Plus,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { PersonAstrologyCard, PersonDataView, PersonHistoricalEventsCard } from '../components/person/PersonDataView';
import { PersonRelationshipsView } from '../components/person/PersonRelationshipsView';
import { useAuth } from '../contexts/AuthContext';
import { canEditPerson, getLinkedPessoaIdForUser, isAdminUser } from '../services/permissionService';
import { ForumEmptyState } from '../components/forum/ForumEmptyState';

type ProfileRelationships = {
  pais: Pessoa[];
  maes: Pessoa[];
  conjuges: Pessoa[];
  filhos: Pessoa[];
  irmaos: Pessoa[];
};

const EMPTY_RELATIONSHIPS: ProfileRelationships = {
  pais: [],
  maes: [],
  conjuges: [],
  filhos: [],
  irmaos: [],
};

function uniqueById(people: Pessoa[]) {
  return Array.from(new Map(people.map((person) => [person.id, person])).values());
}

function getKinshipResult(selectedId: string, currentPersonId: string, relationships: ProfileRelationships) {
  if (!selectedId) return '';
  if (selectedId === currentPersonId) return 'É a própria pessoa.';

  const parents = uniqueById([...relationships.pais, ...relationships.maes]);
  if (parents.some((person) => person.id === selectedId)) return 'Pai/Mãe';
  if (relationships.conjuges.some((person) => person.id === selectedId)) return 'Cônjuge';
  if (relationships.filhos.some((person) => person.id === selectedId)) return 'Filho(a)';
  if (relationships.irmaos.some((person) => person.id === selectedId)) return 'Irmão(ã)';

  return 'Parentesco ainda não identificado automaticamente.';
}

function RelationshipDiscoveryBox({
  currentPersonId,
  people,
  relationships,
}: {
  currentPersonId: string;
  people: Pessoa[];
  relationships: ProfileRelationships;
}) {
  const [selectedId, setSelectedId] = useState('');
  const result = getKinshipResult(selectedId, currentPersonId, relationships);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Descubra seu parentesco com...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)] md:items-center">
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione uma pessoa</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.nome_completo}
                </option>
              ))}
            </select>
            <div className="rounded-lg bg-white/80 p-3 text-sm text-gray-700">
              {result || 'O resultado aparece aqui após a seleção.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pessoa, setPessoa] = useState<Pessoa | undefined>();
  const [relacionamentos, setRelacionamentos] = useState<ProfileRelationships>(EMPTY_RELATIONSHIPS);
  const [loading, setLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [forumTopicos, setForumTopicos] = useState<ForumTopico[]>([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [favoritado, setFavoritado] = useState(false);
  const [linkedPessoaId, setLinkedPessoaId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allPeople, setAllPeople] = useState<Pessoa[]>([]);
  const canEdit = useMemo(
    () => canEditPerson({ currentUser: user, pessoaId: id, linkedPessoaId, isAdmin }),
    [id, linkedPessoaId, user, isAdmin],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug('[profile-navigation] PersonProfile route mounted/updated', {
      id,
      pathname: window.location.pathname,
    });
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadPerson() {
      if (!id) return;

      setLoading(true);
      setPessoa(undefined);
      setRelacionamentos(EMPTY_RELATIONSHIPS);
      setRelationshipsLoading(false);
      const pessoaData = await obterPessoaPorId(id);
      const arquivosHistoricos = pessoaData
        ? await listarArquivosHistoricosPorPessoa(pessoaData.id)
        : [];

      if (!mounted) return;

      setPessoa(pessoaData ? { ...pessoaData, arquivos_historicos: arquivosHistoricos } : undefined);
      setFavoritado(conteudoEstaFavoritado('pessoa', id));
      setLoading(false);
    }

    loadPerson();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadPermissionContext() {
      if (!user) {
        setLinkedPessoaId(null);
        setIsAdmin(false);
        return;
      }

      const [{ data }, adminResult] = await Promise.all([
        getLinkedPessoaIdForUser(user.id),
        isAdminUser(user),
      ]);

      if (mounted) {
        setLinkedPessoaId(data);
        setIsAdmin(adminResult.isAdmin);
      }
    }

    loadPermissionContext();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function loadRelationships() {
      if (!id || pessoa?.id !== id) return;

      setRelationshipsLoading(true);
      const rels = await obterRelacionamentosDaPessoa(id);

      if (!mounted) return;

      setRelacionamentos(rels);
      setRelationshipsLoading(false);
    }

    loadRelationships();

    return () => {
      mounted = false;
    };
  }, [id, pessoa]);

  useEffect(() => {
    let mounted = true;

    async function loadPeople() {
      try {
        const pessoas = await obterTodasPessoas();
        if (mounted) setAllPeople(pessoas);
      } catch (error) {
        console.error('Erro ao carregar pessoas para parentesco:', error);
        if (mounted) setAllPeople([]);
      }
    }

    loadPeople();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadForumDiscussions() {
      if (!id || !user) {
        setForumTopicos([]);
        setForumLoading(false);
        return;
      }

      setForumLoading(true);
      const topicos = await listarTopicosForum({ pessoaRelacionadaId: id, limite: 6 });

      if (!mounted) return;

      setForumTopicos(topicos);
      setForumLoading(false);
    }

    loadForumDiscussions();

    return () => {
      mounted = false;
    };
  }, [id, user]);

  if (!id) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Pessoa não encontrada</p>
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              Voltar para a árvore
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggleFavorite = () => {
    const resultado = alternarFavorito({
      tipo: 'pessoa',
      conteudoId: pessoa.id,
      titulo: pessoa.nome_completo,
    });

    setFavoritado(resultado.active);
    toast.success(resultado.active ? 'Pessoa adicionada aos favoritos' : 'Pessoa removida dos favoritos');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para árvore
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/meus-favoritos">
              <Button variant="outline">
                <Star className="w-4 h-4 mr-2" />
                Favoritos
              </Button>
            </Link>
            <Link to="/notificacoes">
              <Button variant="outline">
                <Bell className="w-4 h-4 mr-2" />
                Notificações
              </Button>
            </Link>
            <Button variant="outline" onClick={handleToggleFavorite}>
              <Star className={`w-4 h-4 mr-2 ${favoritado ? 'fill-current text-yellow-500' : ''}`} />
              {favoritado ? 'Salvo' : 'Salvar'}
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(isAdmin ? `/admin/pessoas/${id}` : '/meus-dados')}
              >
                Editar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto space-y-6 px-6 py-8">
        <PersonDataView pessoa={pessoa} />

        <PersonRelationshipsView relationships={relacionamentos} loading={relationshipsLoading} />

        <RelationshipDiscoveryBox
          currentPersonId={pessoa.id}
          people={allPeople.length > 0 ? allPeople : [pessoa]}
          relationships={relacionamentos}
        />

        <PersonAstrologyCard pessoa={pessoa} />

        <PersonHistoricalEventsCard pessoa={pessoa} />

          {user && (
            <section>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                        Discussões relacionadas
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Tópicos do fórum ligados a esta pessoa da árvore.
                      </p>
                    </div>

                    <Link to={`/forum/novo?pessoaId=${pessoa.id}`}>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Criar discussão sobre esta pessoa
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-5">
                    {forumLoading ? (
                      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Carregando discussões...</p>
                    ) : forumTopicos.length === 0 ? (
                      <ForumEmptyState
                        titulo="Nenhuma discussão relacionada"
                        descricao="Ainda não há tópicos do fórum vinculados a esta pessoa."
                        actionLabel="Criar discussão"
                        onAction={() => navigate(`/forum/novo?pessoaId=${pessoa.id}`)}
                      />
                    ) : (
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {forumTopicos.map((topico) => (
                          <Link
                            key={topico.id}
                            to={`/forum/topico/${topico.id}`}
                            className="block p-4 transition-colors hover:bg-gray-50"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">{topico.titulo}</h3>
                                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{topico.conteudo}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                {topico.status}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

        {pessoa.arquivos_historicos && pessoa.arquivos_historicos.length > 0 && (
          <ArquivosHistoricos
            arquivos={pessoa.arquivos_historicos}
            onChange={() => {}}
            readOnly={true}
          />
        )}
      </main>
    </div>
  );
}
