import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { AppLink as Link } from '../components/AppLink';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  obterPessoaPorId,
  obterRelacionamentosDaPessoa,
  obterRelacionamentosDetalhadosDaPessoa,
  obterTodasPessoas,
  obterTodosRelacionamentos,
} from '../services/dataService';
import {
  listarArquivosHistoricosDoRelacionamento,
  listarArquivosHistoricosPorPessoa,
} from '../services/arquivosHistoricosService';
import { listarEventosDaPessoa } from '../services/personEventsService';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import { listarTopicosForum } from '../services/forumService';
import { ArquivoHistorico, ForumTopico, Pessoa, PersonEvent, Relacionamento } from '../types';
import { 
  ArrowLeft, 
  Star, 
  Bell,
  MessageCircle,
  Plus
} from 'lucide-react';
import { PersonDataView } from '../components/person/PersonDataView';
import { PersonRelationshipsView } from '../components/person/PersonRelationshipsView';
import { RelationshipFinder } from '../components/person/RelationshipFinder';
import { PersonEventsList } from '../components/person/PersonEventsList';
import { useAuth } from '../contexts/AuthContext';
import { canEditPerson, getLinkedPessoaIdForUser, isAdminUser } from '../services/permissionService';
import { getCachedTreeData } from '../services/treeDataCache';
import { ForumEmptyState } from '../components/forum/ForumEmptyState';
import { PersonTimeline } from '../components/Timeline/PersonTimeline';
import { FavoriteButton } from '../components/favorites/FavoriteButton';
import { buildPersonTimeline } from '../utils/buildPersonTimeline';

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

export function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pessoa, setPessoa] = useState<Pessoa | undefined>();
  const [relacionamentos, setRelacionamentos] = useState<ProfileRelationships>(EMPTY_RELATIONSHIPS);
  const [loading, setLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [forumTopicos, setForumTopicos] = useState<ForumTopico[]>([]);
  const [personEvents, setPersonEvents] = useState<PersonEvent[]>([]);
  const [rawRelationships, setRawRelationships] = useState<Relacionamento[]>([]);
  const [relationshipHistoricalFiles, setRelationshipHistoricalFiles] = useState<ArquivoHistorico[]>([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [linkedPessoaId, setLinkedPessoaId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allPeople, setAllPeople] = useState<Pessoa[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relacionamento[]>([]);
  const [relationshipDegreeContextComplete, setRelationshipDegreeContextComplete] = useState(false);
  const canEdit = useMemo(
    () => canEditPerson({ currentUser: user, pessoaId: id, linkedPessoaId, isAdmin }),
    [id, linkedPessoaId, user, isAdmin],
  );
  const timelineItems = useMemo(() => {
    if (!pessoa) return [];

    return buildPersonTimeline({
      pessoa,
      relacionamentos: rawRelationships,
      pessoas: allPeople.length > 0 ? allPeople : [pessoa],
      filhos: relacionamentos.filhos,
      arquivosHistoricosPessoa: pessoa.arquivos_historicos ?? [],
      arquivosHistoricosRelacionamentos: relationshipHistoricalFiles,
      eventosPessoais: personEvents,
    });
  }, [allPeople, pessoa, personEvents, rawRelationships, relationshipHistoricalFiles, relacionamentos.filhos]);

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
      setPersonEvents([]);
      setRelacionamentos(EMPTY_RELATIONSHIPS);
      setRawRelationships([]);
      setRelationshipHistoricalFiles([]);
      setRelationshipsLoading(false);
      const pessoaData = await obterPessoaPorId(id);
      const [arquivosHistoricos, eventosDaPessoa] = pessoaData
        ? await Promise.all([
          listarArquivosHistoricosPorPessoa(pessoaData.id),
          listarEventosDaPessoa(pessoaData.id),
        ])
        : [[], []];

      if (!mounted) return;

      setPessoa(pessoaData ? { ...pessoaData, arquivos_historicos: arquivosHistoricos } : undefined);
      setPersonEvents(eventosDaPessoa);
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
      try {
        const [rels, detailedRelationships] = await Promise.all([
          obterRelacionamentosDaPessoa(id),
          obterRelacionamentosDetalhadosDaPessoa(id),
        ]);
        let relationshipFiles: ArquivoHistorico[] = [];

        const uniqueConjugalRelationshipIds = Array.from(
          new Set(
            detailedRelationships
              .filter((rel) => rel.tipo_relacionamento === 'conjuge')
              .map((rel) => rel.id)
              .filter(Boolean)
          )
        );

        const filesByRelationship = await Promise.all(
          uniqueConjugalRelationshipIds.map(async (relationshipId) => {
            try {
              return await listarArquivosHistoricosDoRelacionamento(relationshipId);
            } catch (error) {
              console.warn('Não foi possível carregar arquivos históricos de um relacionamento da timeline.', error);
              return [];
            }
          })
        );

        relationshipFiles = filesByRelationship.flat();

        if (!mounted) return;

        setRelacionamentos(rels);
        setRawRelationships(detailedRelationships);
        setRelationshipHistoricalFiles(relationshipFiles);
      } catch (error) {
        console.warn('Não foi possível carregar relacionamentos para o perfil.', error);
        if (mounted) {
          setRelacionamentos(EMPTY_RELATIONSHIPS);
          setRawRelationships([]);
          setRelationshipHistoricalFiles([]);
        }
      } finally {
        if (mounted) setRelationshipsLoading(false);
      }
    }

    loadRelationships();

    return () => {
      mounted = false;
    };
  }, [id, pessoa]);

  useEffect(() => {
    let mounted = true;

    async function loadRelationshipDegreeContext() {
      try {
        const cachedTreeData = getCachedTreeData();

        if (cachedTreeData) {
          if (mounted) {
            setAllPeople(cachedTreeData.pessoas);
            setAllRelationships(cachedTreeData.relacionamentos);
            setRelationshipDegreeContextComplete(true);
          }
          return;
        }

        const [pessoasResult, relacionamentosResult] = await Promise.allSettled([
          obterTodasPessoas(),
          obterTodosRelacionamentos(),
        ]);

        if (!mounted) return;

        setAllPeople(pessoasResult.status === 'fulfilled' ? pessoasResult.value : []);
        setAllRelationships(relacionamentosResult.status === 'fulfilled' ? relacionamentosResult.value : []);
        setRelationshipDegreeContextComplete(relacionamentosResult.status === 'fulfilled');
      } catch (error) {
        console.error('Erro ao carregar contexto para parentesco:', error);
        if (mounted) {
          setAllPeople([]);
          setAllRelationships([]);
          setRelationshipDegreeContextComplete(false);
        }
      }
    }

    loadRelationshipDegreeContext();

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

  const relationshipFinderRelationships = relationshipDegreeContextComplete ? allRelationships : rawRelationships;
  const relationshipFinderScopeNotice = relationshipDegreeContextComplete
    ? undefined
    : 'O cálculo usará apenas os vínculos já carregados nesta tela enquanto a base completa visível não estiver disponível.';

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
            <FavoriteButton
              entityType="person"
              entityId={pessoa.id}
              label={pessoa.nome_completo}
              description="Perfil individual da árvore familiar"
              href={`/pessoa/${pessoa.id}`}
              metadata={{ source: 'person_profile' }}
            />
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

        <RelationshipFinder
          pessoaBase={pessoa}
          pessoas={allPeople.length > 0 ? allPeople : [pessoa]}
          relacionamentos={relationshipFinderRelationships}
          dataScopeNotice={relationshipFinderScopeNotice}
        />

        <PersonTimeline items={timelineItems} isAdmin={isAdmin} />

        <PersonEventsList eventos={personEvents} />

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
            pessoaId={pessoa.id}
            readOnly={true}
          />
        )}
      </main>
    </div>
  );
}
