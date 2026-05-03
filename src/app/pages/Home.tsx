import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';

import { FamilyTree } from '../components/FamilyTree/FamilyTree';
import { ViewModeToggle } from '../components/FamilyTree/ViewModeToggle';
import { ViewMarriageModal } from '../components/FamilyTree/modals/ViewMarriageModal';
import {
  AddConnectionModal,
  type AddConnectionPayload,
} from '../components/FamilyTree/modals/AddConnectionModal';
import { useIsMobile } from '../components/FamilyTree/hooks/useIsMobile';
import {
  readStoredViewMode,
  storeViewMode,
  readStoredActiveGeneration,
  storeActiveGeneration,
  readDesktopNoticeDismissed,
  storeDesktopNoticeDismissed,
  readDirectRelativeFilters,
  storeDirectRelativeFilters,
} from '../components/FamilyTree/utils/treePreferences';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  atualizarGeracaoManualPessoa,
  obterTodasPessoas,
  obterTodosRelacionamentos,
  buscarPessoas,
} from '../services/dataService';
import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../types';
import {
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelativeFilters,
  DirectRelativeGroup,
  GenerationColumnMeta,
  MarriageNodeDetails,
} from '../components/FamilyTree/types';
import { FAMILY_TREE_COLORS, hasDeathDate } from '../components/FamilyTree/visualTokens';
import { useAuth } from '../contexts/AuthContext';
import { getMemberProfile, getPrimaryLinkedPerson, MemberProfile } from '../services/memberProfileService';
import {
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Monitor,
  CalendarDays,
  Star,
  Bell,
  UserCircle2,
  Focus,
  LogIn,
  LogOut,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

export function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>();
  const [linkedPersonId, setLinkedPersonId] = useState<string | undefined>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [pessoasFiltradas, setPessoasFiltradas] = useState<Pessoa[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<TipoVisualizacaoArvore>(() =>
    user ? 'familiares-diretos' : 'lados'
  );
  const [activeGeneration, setActiveGeneration] = useState(0);
  const [generationColumns, setGenerationColumns] = useState<GenerationColumnMeta[]>([]);
  const [desktopNoticeDismissed, setDesktopNoticeDismissed] = useState(false);
  const [directRelativeFilterState, setDirectRelativeFilterState] = useState<{
    userId?: string;
    filters: DirectRelativeFilters;
  }>(() => ({
    userId: user?.id,
    filters: readDirectRelativeFilters(user?.id),
  }));

  const [selectedMarriage, setSelectedMarriage] = useState<MarriageNodeDetails | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<Pessoa | null>(null);

  const [edgeFilters, setEdgeFilters] = useState({
    conjugal: true,
    filiacao_sangue: true,
    filiacao_adotiva: true,
    irmaos: true,
  });

  const [personFilters, setPersonFilters] = useState({
    vivos: true,
    falecidos: true,
    pets: true,
  });

  useEffect(() => {
    setSidebarOpen((prev) => (isMobile ? false : prev));
    setLegendOpen((prev) => (isMobile ? false : prev));
  }, [isMobile]);

  useEffect(() => {
    const savedViewMode = readStoredViewMode();
    const savedActiveGeneration = readStoredActiveGeneration();
    const savedDesktopNoticeDismissed = readDesktopNoticeDismissed();

    if (savedViewMode) {
      setViewMode(savedViewMode);
    }

    if (typeof savedActiveGeneration === 'number') {
      setActiveGeneration(savedActiveGeneration);
    }

    setDesktopNoticeDismissed(savedDesktopNoticeDismissed);
  }, []);

  useEffect(() => {
    setDirectRelativeFilterState({
      userId: user?.id,
      filters: readDirectRelativeFilters(user?.id),
    });
  }, [user?.id]);

  useEffect(() => {
    if (!directRelativeFilterState.userId || directRelativeFilterState.userId !== user?.id) return;

    storeDirectRelativeFilters(directRelativeFilterState.userId, directRelativeFilterState.filters);
  }, [user?.id, directRelativeFilterState]);

  useEffect(() => {
    if (isMobile && viewMode === 'lados') {
      setViewMode('geracoes');
      return;
    }

    if (!user && viewMode === 'familiares-diretos') {
      setViewMode(isMobile ? 'geracoes' : 'lados');
      return;
    }

    storeViewMode(viewMode);
  }, [viewMode, isMobile, user]);

  useEffect(() => {
    storeActiveGeneration(activeGeneration);
  }, [activeGeneration]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [pessoasResult, relacionamentosResult] = await Promise.allSettled([
          obterTodasPessoas(),
          obterTodosRelacionamentos(),
        ]);

        const pessoasData = pessoasResult.status === 'fulfilled' && Array.isArray(pessoasResult.value)
          ? pessoasResult.value
          : [];
        const relacionamentosData = relacionamentosResult.status === 'fulfilled' && Array.isArray(relacionamentosResult.value)
          ? relacionamentosResult.value
          : [];

        setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
        setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);

        const errors = [
          pessoasResult.status === 'rejected' ? pessoasResult.reason : null,
          relacionamentosResult.status === 'rejected' ? relacionamentosResult.reason : null,
        ].filter(Boolean);

        if (errors.length > 0) {
          const message = errors
            .map((error) => error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados.')
            .join('\n');
          setLoadError(message);
          return;
        }

        if (pessoasData.length === 0) {
          setLoadError('Tabela sem dados: pessoas não retornou registros.');
          return;
        }

        if (relacionamentosData.length === 0) {
          console.warn('[Supabase] Tabela sem dados: relacionamentos não retornou registros.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados.';
        console.error('Erro ao carregar dados da árvore:', error);
        setLoadError(message);
        setPessoas([]);
        setRelacionamentos([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadLinkedPerson = async () => {
      if (!user) {
        setLinkedPersonId(undefined);
        return;
      }

      try {
        const { data } = await getPrimaryLinkedPerson(user.id);
        setLinkedPersonId(data?.pessoa_id);
        if (data?.pessoa_id) {
          setSelectedPersonId(data.pessoa_id);
          setViewMode('familiares-diretos');
        }
      } catch (error) {
        console.error('Erro ao carregar vínculo do membro:', error);
        setLinkedPersonId(undefined);
      }
    };

    loadLinkedPerson();
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const { data, error } = await getMemberProfile(user.id);
        if (error) {
          console.error('Erro ao carregar perfil do usuário:', error);
        }
        setProfile(data);
      } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error);
        setProfile(null);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setPessoasFiltradas([]);
        return;
      }

      try {
        const resultados = await buscarPessoas(searchTerm);
        setPessoasFiltradas(Array.isArray(resultados) ? resultados : []);
      } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
        setPessoasFiltradas([]);
      }
    };

    const timeoutId = window.setTimeout(() => {
      performSearch();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!isMobile || generationColumns.length === 0) return;

    const maxIndex = generationColumns.length - 1;
    setActiveGeneration((prev) => Math.min(Math.max(prev, 0), maxIndex));
  }, [isMobile, generationColumns]);

  const handleViewModeChange = useCallback((nextMode: TipoVisualizacaoArvore) => {
    setViewMode(nextMode);
  }, []);

  const handlePersonClick = useCallback(
    (pessoa: Pessoa) => {
      setSelectedPersonId(pessoa.id);

      if (!isMobile) {
        navigate(`/pessoa/${pessoa.id}`);
      }
    },
    [navigate, isMobile]
  );

  const handleSearchSelect = useCallback(
    (pessoa: Pessoa) => {
      setSelectedPersonId(pessoa.id);
      setSearchTerm('');

      if (!isMobile) {
        navigate(`/pessoa/${pessoa.id}`);
      }
    },
    [navigate, isMobile]
  );

  const handlePersonView = useCallback(
    (pessoa: Pessoa) => {
      setSelectedPersonId(pessoa.id);
      navigate(`/pessoa/${pessoa.id}`);
    },
    [navigate]
  );

  const handlePersonEdit = useCallback((pessoa: Pessoa) => {
    setSelectedPersonId(pessoa.id);
    console.info('Editar pessoa:', pessoa);
  }, []);

  const handlePersonAddConnection = useCallback((pessoa: Pessoa) => {
    setConnectionTarget(pessoa);
  }, []);

  const handlePersonRemove = useCallback((pessoa: Pessoa) => {
    setSelectedPersonId(pessoa.id);
    console.info('Remover pessoa:', pessoa);
  }, []);

  const handleMarriageClick = useCallback((details: MarriageNodeDetails) => {
    setSelectedMarriage(details);
  }, []);

  const handleDismissDesktopNotice = useCallback(() => {
    setDesktopNoticeDismissed(true);
    storeDesktopNoticeDismissed(true);
  }, []);

  const handleAddConnectionSubmit = useCallback((payload: AddConnectionPayload) => {
    console.info('Salvar conexão:', payload);
    setConnectionTarget(null);
  }, []);

  const handlePersonGenerationChange = useCallback(async (personId: string, generation: number) => {
    const nextGeneration = Math.min(7, Math.max(1, generation));
    const previousPessoa = pessoas.find((pessoa) => pessoa.id === personId);

    if (!previousPessoa) {
      return;
    }

    setPessoas((prevPessoas) =>
      prevPessoas.map((pessoa) =>
        pessoa.id === personId
          ? { ...pessoa, manual_generation: nextGeneration }
          : pessoa
      )
    );

    try {
      await atualizarGeracaoManualPessoa(personId, nextGeneration);
      toast.success(`Geração atualizada para Geração ${nextGeneration}.`);
    } catch (error) {
      setPessoas((prevPessoas) =>
        prevPessoas.map((pessoa) =>
          pessoa.id === personId
            ? previousPessoa
            : pessoa
        )
      );
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar geração manual.');
    }
  }, [pessoas]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success('Sessão encerrada.');
    navigate('/');
  }, [navigate, signOut]);

  const toggleFilter = useCallback((filterKey: keyof typeof edgeFilters) => {
    setEdgeFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  const togglePersonFilter = useCallback((filterKey: keyof typeof personFilters) => {
    setPersonFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  const toggleDirectRelativeFilter = useCallback((filterKey: DirectRelativeGroup) => {
    setDirectRelativeFilterState((prev) => ({
      userId: user?.id,
      filters: {
        ...prev.filters,
        [filterKey]: !prev.filters[filterKey],
      },
    }));
  }, [user?.id]);

  const pessoasVisiveis = useMemo(() => {
    return pessoas.filter((pessoa) => {
      if (viewMode === 'familiares-diretos' && linkedPersonId && pessoa.id === linkedPersonId) {
        return true;
      }

      if (pessoa.humano_ou_pet === 'Pet') {
        return personFilters.pets;
      }

      if (hasDeathDate(pessoa.data_falecimento)) {
        return personFilters.falecidos;
      }

      return personFilters.vivos;
    });
  }, [pessoas, personFilters, linkedPersonId, viewMode]);

  const stats = useMemo(() => {
    const pessoasVivas = pessoas.filter((p) => p.humano_ou_pet === 'Humano' && !hasDeathDate(p.data_falecimento));
    const pessoasFalecidas = pessoas.filter((p) => p.humano_ou_pet === 'Humano' && hasDeathDate(p.data_falecimento));
    const pets = pessoas.filter((p) => p.humano_ou_pet === 'Pet');

    const pessoasComConjuge = new Set<string>();
    relacionamentos
      .filter((r) => r.tipo_relacionamento === 'conjuge')
      .forEach((r) => {
        if (r.pessoa_origem_id) pessoasComConjuge.add(r.pessoa_origem_id);
        if (r.pessoa_destino_id) pessoasComConjuge.add(r.pessoa_destino_id);
      });

    const cidadesNascimento = new Map<string, number>();
    pessoas.forEach((p) => {
      if (p.local_nascimento && p.humano_ou_pet === 'Humano') {
        const count = cidadesNascimento.get(p.local_nascimento) || 0;
        cidadesNascimento.set(p.local_nascimento, count + 1);
      }
    });

    const cidadesAtuais = new Set<string>();
    pessoasVivas.forEach((p) => {
      if (p.local_atual) {
        cidadesAtuais.add(p.local_atual);
      }
    });

    const topCidadesNascimento = Array.from(cidadesNascimento.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalPessoas: pessoas.length,
      pessoasVivas: pessoasVivas.length,
      pessoasFalecidas: pessoasFalecidas.length,
      pets: pets.length,
      casados: pessoasComConjuge.size,
      cidadesNascimento: topCidadesNascimento,
      cidadesAtuais: cidadesAtuais.size,
    };
  }, [pessoas, relacionamentos]);

  const availableModes = useMemo<TipoVisualizacaoArvore[]>(
    () => (isMobile ? ['familiares-diretos', 'geracoes', 'lista'] : ['familiares-diretos', 'lados', 'geracoes', 'lista']),
    [isMobile]
  );

  const canNavigateGenerations = isMobile && viewMode === 'geracoes' && generationColumns.length > 0;
  const activeGenerationMeta = generationColumns.find((column) => column.level === activeGeneration);
  const maxGenerationIndex = generationColumns.length - 1;

  const displayName = (
    profile?.nome_exibicao ||
    (user?.user_metadata?.nome_exibicao as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    ''
  ).trim();
  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    null;
  const initials = getInitials(displayName);
  const directRelativeFilters = directRelativeFilterState.filters;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <UserMenu
              isLoggedIn={Boolean(user)}
              displayName={displayName}
              avatarUrl={avatarUrl}
              initials={initials}
              onLogin={() => navigate('/entrar')}
              onEditProfile={() => navigate('/minha-arvore')}
              onSignOut={handleSignOut}
            />

            <div>
              <h1 className="font-bold text-xl text-gray-900">Árvore Genealógica</h1>
              <p className="text-sm text-gray-500">Família Barros Souza</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex items-center gap-2 flex-wrap">
              <ViewModeToggle
                value={viewMode}
                onChange={handleViewModeChange}
                availableModes={availableModes}
              />

              {user && linkedPersonId && (
                <Button
                  variant="outline"
                  size="icon"
                  title="Centralizar em mim"
                  onClick={() => setSelectedPersonId(linkedPersonId)}
                >
                  <Focus className="w-4 h-4" />
                </Button>
              )}

              <Link to="/calendario-familiar">
                <Button variant="outline" size="icon" title="Calendário familiar">
                  <CalendarDays className="w-4 h-4" />
                </Button>
              </Link>

              <Link to="/meus-favoritos">
                <Button variant="outline" size="icon" title="Meus favoritos">
                  <Star className="w-4 h-4" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/admin/login')}
                title="Painel Administrativo"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {isMobile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLegendOpen((prev) => !prev)}
                  title={legendOpen ? 'Ocultar legenda' : 'Exibir legenda'}
                >
                  {legendOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              )}
            </div>

            <div className="flex w-full max-w-full items-center gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-80 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />

                {searchTerm && pessoasFiltradas.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                    {pessoasFiltradas.map((pessoa) => (
                      <button
                        key={pessoa.id}
                        onClick={() => handleSearchSelect(pessoa)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <p className="font-medium text-sm text-gray-900">{pessoa.nome_completo}</p>
                        {pessoa.local_nascimento && (
                          <p className="text-xs text-gray-500 mt-1">📍 {pessoa.local_nascimento}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link to="/notificacoes" className="shrink-0">
                <Button variant="outline" size="icon" title="Notificações">
                  <Bell className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {canNavigateGenerations && (
        <div className="border-b border-gray-200 bg-white px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveGeneration((prev) => Math.max(prev - 1, 0))}
              disabled={activeGeneration <= 0}
              title="Geração anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold text-gray-900">
                {activeGenerationMeta?.label || `Geração ${activeGeneration + 1}`}
              </p>
              <p className="text-xs text-gray-500">
                {activeGeneration + 1} de {maxGenerationIndex + 1}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveGeneration((prev) => Math.min(prev + 1, maxGenerationIndex))}
              disabled={activeGeneration >= maxGenerationIndex}
              title="Próxima geração"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isMobile && legendOpen && (
        <section className="border-b border-gray-200 bg-white px-4 py-3">
          <FamilyTreeLegend compact />
        </section>
      )}

      {isMobile && viewMode === 'familiares-diretos' && (
        <section className="border-b border-gray-200 bg-white px-4 py-3">
          <DirectRelativeFilterGrid
            filters={directRelativeFilters}
            onToggle={toggleDirectRelativeFilter}
            compact
          />
        </section>
      )}

      <main className="flex min-h-0 flex-1">
        {!isMobile && (
          <aside
            className={[
              'shrink-0 overflow-y-auto border-r border-gray-200 bg-white transition-[width] duration-200',
              sidebarOpen ? 'w-80 p-4' : 'w-14 p-2',
            ].join(' ')}
          >
            <div className={sidebarOpen ? 'mb-4 flex items-center justify-between gap-3' : 'flex justify-center'}>
              {sidebarOpen && <span aria-hidden="true" />}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen((prev) => !prev)}
                title={sidebarOpen ? 'Ocultar painel lateral' : 'Exibir painel lateral'}
                aria-label={sidebarOpen ? 'Ocultar painel lateral' : 'Exibir painel lateral'}
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>

            {sidebarOpen && !desktopNoticeDismissed && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-950">Visualização interativa</p>
                    <p className="mt-1 text-xs text-blue-800">
                      Use zoom, arraste a árvore e clique nas pessoas para abrir detalhes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissDesktopNotice}
                    className="text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            {sidebarOpen && (
              <div className="space-y-4">
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Resumo</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Pessoas" value={stats.totalPessoas} />
                    <Stat label="Vivos" value={stats.pessoasVivas} />
                    <Stat label="Falecidos" value={stats.pessoasFalecidas} />
                    <Stat label="Pets" value={stats.pets} />
                    <Stat label="Cônjuges" value={stats.casados} />
                    <Stat label="Cidades" value={stats.cidadesAtuais} />
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Pessoas</h2>
                  <div className="space-y-2">
                    <FilterButton active={personFilters.vivos} onClick={() => togglePersonFilter('vivos')}>
                      Vivos
                    </FilterButton>
                    <FilterButton active={personFilters.falecidos} onClick={() => togglePersonFilter('falecidos')}>
                      Falecidos
                    </FilterButton>
                    <FilterButton active={personFilters.pets} onClick={() => togglePersonFilter('pets')}>
                      Pets
                    </FilterButton>
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Relações</h2>
                  <div className="space-y-2">
                    <FilterButton active={edgeFilters.conjugal} onClick={() => toggleFilter('conjugal')}>
                      Cônjuges
                    </FilterButton>
                    <FilterButton active={edgeFilters.filiacao_sangue} onClick={() => toggleFilter('filiacao_sangue')}>
                      Filiação de sangue
                    </FilterButton>
                    <FilterButton active={edgeFilters.filiacao_adotiva} onClick={() => toggleFilter('filiacao_adotiva')}>
                      Filiação adotiva
                    </FilterButton>
                    <FilterButton active={edgeFilters.irmaos} onClick={() => toggleFilter('irmaos')}>
                      Irmãos
                    </FilterButton>
                  </div>
                </section>

                {viewMode === 'familiares-diretos' && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">Familiares Diretos</h2>
                    <DirectRelativeFilterGrid
                      filters={directRelativeFilters}
                      onToggle={toggleDirectRelativeFilter}
                    />
                  </section>
                )}

                <FamilyTreeLegend />

                {stats.cidadesNascimento.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">Cidades de residência atual</h2>
                    <div className="space-y-2">
                      {stats.cidadesNascimento.map(([cidade, total]) => (
                        <div key={cidade} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-gray-600">{cidade}</span>
                          <span className="font-semibold text-gray-900">{total}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </aside>
        )}

        <section className="relative min-w-0 flex-1 bg-gray-100">
          {isLoading ? (
            <StateMessage
              title="Carregando árvore"
              message="Buscando pessoas e relacionamentos no Supabase."
            />
          ) : loadError ? (
            <StateMessage
              title="Erro ao carregar a árvore"
              message={loadError}
              tone="error"
            />
          ) : pessoas.length === 0 ? (
            <StateMessage
              title="Nenhuma pessoa encontrada"
              message="A tabela pessoas não retornou registros para renderizar a árvore."
            />
          ) : (
            <FamilyTree
              pessoas={pessoasVisiveis}
              relacionamentos={relacionamentos}
              onPersonClick={handlePersonClick}
              onPersonView={handlePersonView}
              onPersonEdit={handlePersonEdit}
              onPersonAddConnection={handlePersonAddConnection}
              onPersonRemove={handlePersonRemove}
              onMarriageClick={handleMarriageClick}
              selectedPersonId={selectedPersonId}
              edgeFilters={edgeFilters}
              directRelativeFilters={directRelativeFilters}
              centralPersonId={linkedPersonId}
              viewMode={viewMode}
              activeGeneration={activeGeneration}
              isMobile={isMobile}
              onGenerationColumnsChange={setGenerationColumns}
              onPersonGenerationChange={handlePersonGenerationChange}
            />
          )}
        </section>
      </main>

      <ViewMarriageModal
        open={!!selectedMarriage}
        marriage={selectedMarriage}
        onClose={() => setSelectedMarriage(null)}
      />

      <AddConnectionModal
        open={!!connectionTarget}
        sourcePerson={connectionTarget}
        pessoas={pessoas}
        onClose={() => setConnectionTarget(null)}
        onSubmit={handleAddConnectionSubmit}
      />
    </div>
  );
}

function getInitials(displayName: string) {
  const cleanName = displayName.trim();
  if (!cleanName) return '';

  const parts = cleanName.includes('@')
    ? cleanName.split('@')[0].split(/[._\-\s]+/)
    : cleanName.split(/\s+/);

  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function UserMenu({
  isLoggedIn,
  displayName,
  avatarUrl,
  initials,
  onLogin,
  onEditProfile,
  onSignOut,
}: {
  isLoggedIn: boolean;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  onLogin: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title={isLoggedIn ? displayName || 'Conta do usuário' : 'Login'}
          aria-label={isLoggedIn ? displayName || 'Conta do usuário' : 'Login'}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || 'Usuário'}
              className="h-full w-full object-cover"
            />
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            <UserCircle2 className="h-6 w-6" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {!isLoggedIn ? (
          <DropdownMenuItem onClick={onLogin}>
            <LogIn className="h-4 w-4" />
            Login
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onEditProfile}>
              <Pencil className="h-4 w-4" />
              Editar Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} variant="destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
        active
          ? 'border-blue-200 bg-blue-50 text-blue-900'
          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
      ].join(' ')}
    >
      <span>{children}</span>
      <span className={active ? 'text-blue-700' : 'text-gray-400'}>{active ? 'Ativo' : 'Oculto'}</span>
    </button>
  );
}

const DIRECT_RELATIVE_FILTER_OPTIONS: Array<{
  key: DirectRelativeGroup;
  label: string;
}> = [
  { key: 'pais', label: 'Pais' },
  { key: 'avos', label: 'Avós' },
  { key: 'bisavos', label: 'Bisavós' },
  { key: 'tataravos', label: 'Tataravós' },
  { key: 'conjuge', label: 'Cônjuge' },
  { key: 'filhos', label: 'Filhos' },
  { key: 'netos', label: 'Netos' },
  { key: 'irmaos', label: 'Irmãos' },
  { key: 'tios', label: 'Tios' },
  { key: 'primos', label: 'Primos' },
];

function DirectRelativeFilterGrid({
  filters,
  onToggle,
  compact = false,
}: {
  filters: DirectRelativeFilters;
  onToggle: (key: DirectRelativeGroup) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-5' : 'space-y-2'}>
      {DIRECT_RELATIVE_FILTER_OPTIONS.map((option) => (
        <FilterButton
          key={option.key}
          active={filters[option.key]}
          onClick={() => onToggle(option.key)}
        >
          {option.label}
        </FilterButton>
      ))}
    </div>
  );
}

function FamilyTreeLegend({ compact = false }: { compact?: boolean }) {
  const items = [
    {
      label: 'Pessoas vivas',
      sample: (
        <span
          className="h-5 w-9 rounded-md border-2 bg-white"
          style={{ borderColor: FAMILY_TREE_COLORS.CARD_BORDER_ALIVE }}
        />
      ),
    },
    {
      label: 'Pessoas falecidas',
      sample: (
        <span
          className="h-5 w-9 rounded-md border-2 bg-white"
          style={{ borderColor: FAMILY_TREE_COLORS.CARD_BORDER_DECEASED }}
        />
      ),
    },
    {
      label: 'Relacionamento conjugal',
      sample: <LegendLine color={FAMILY_TREE_COLORS.EDGE_SPOUSE} />,
    },
    {
      label: 'Filhos do relacionamento',
      sample: <LegendLine color={FAMILY_TREE_COLORS.EDGE_CHILD} />,
    },
    {
      label: 'Relação de irmãos',
      sample: <LegendLine color={FAMILY_TREE_COLORS.EDGE_SIBLING} dashed />,
    },
  ];

  return (
    <section className={compact ? '' : 'rounded-lg border border-gray-200 bg-gray-50 p-3'}>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Legenda</h2>
      <div className={compact ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-2'}>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex w-12 shrink-0 items-center justify-center">{item.sample}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LegendLine({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <span
      className="block h-0 w-10 border-t-2"
      style={{
        borderColor: color,
        borderStyle: dashed ? 'dashed' : 'solid',
      }}
    />
  );
}

function StateMessage({
  title,
  message,
  tone = 'neutral',
}: {
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className="flex h-full min-h-[500px] items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div
          className={[
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700',
          ].join(' ')}
        >
          <Monitor className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
