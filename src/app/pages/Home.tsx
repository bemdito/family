import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';

import { FamilyTree } from '../components/FamilyTree/FamilyTree';
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
  readDirectRelativeFilters,
  storeDirectRelativeFilters,
} from '../components/FamilyTree/utils/treePreferences';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Monitor,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Star,
  Bell,
  UserCircle2,
  LogIn,
  LogOut,
  Pencil,
  Sparkles,
  SlidersHorizontal,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const VIEW_MODE_OPTIONS: Array<{ value: TipoVisualizacaoArvore; label: string }> = [
  { value: 'familiares-diretos', label: 'Minha Árvore' },
  { value: 'lados', label: 'Cônjuges' },
  { value: 'geracoes', label: 'Genealogia' },
  { value: 'lista', label: 'Lista por Gerações' },
];

const AI_QUESTION_EXAMPLES = [
  'Quem são meus bisavós paternos?',
  'Quantas pessoas da família nasceram em Recife?',
  'Quais parentes moram em Porto Alegre?',
  'Monte um resumo da linha genealógica de Tulius.',
  'Quem são os descendentes de determinada pessoa?',
];

const AI_ENDPOINT = '/api/ai';

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
  const [treeLayoutRevision, setTreeLayoutRevision] = useState(0);
  const [legendOpen, setLegendOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<TipoVisualizacaoArvore>(() =>
    user ? 'familiares-diretos' : 'lados'
  );
  const [activeGeneration, setActiveGeneration] = useState(0);
  const [generationColumns, setGenerationColumns] = useState<GenerationColumnMeta[]>([]);
  const [directRelativeFilterState, setDirectRelativeFilterState] = useState<{
    userId?: string;
    filters: DirectRelativeFilters;
  }>(() => ({
    userId: user?.id,
    filters: readDirectRelativeFilters(user?.id),
  }));

  const [selectedMarriage, setSelectedMarriage] = useState<MarriageNodeDetails | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<Pessoa | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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
    setTreeLayoutRevision((revision) => revision + 1);

    const timers = [0, 120, 240].map((delay) =>
      window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        setTreeLayoutRevision((revision) => revision + 1);
      }, delay)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const savedViewMode = readStoredViewMode();
    const savedActiveGeneration = readStoredActiveGeneration();

    if (savedViewMode) {
      setViewMode(savedViewMode);
    }

    if (typeof savedActiveGeneration === 'number') {
      setActiveGeneration(savedActiveGeneration);
    }
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

  const navigateToPersonProfile = useCallback(
    (personId: string) => {
      const path = `/pessoa/${personId}`;
      navigate(path, { replace: false, flushSync: true });
    },
    [navigate]
  );

  const navigateFromHome = useCallback(
    (path: string) => {
      navigate(path, { replace: false, flushSync: true });
    },
    [navigate]
  );

  const handlePersonClick = useCallback(
    (pessoa: Pessoa) => {
      flushSync(() => {
        setSelectedPersonId(pessoa.id);
      });

      if (!isMobile) {
        navigateToPersonProfile(pessoa.id);
      }
    },
    [navigateToPersonProfile, isMobile]
  );

  const handleSearchSelect = useCallback(
    (pessoa: Pessoa) => {
      setSelectedPersonId(pessoa.id);
      setSearchTerm('');

      if (!isMobile) {
        navigateToPersonProfile(pessoa.id);
      }
    },
    [navigateToPersonProfile, isMobile]
  );

  const handlePersonView = useCallback(
    (pessoa: Pessoa) => {
      flushSync(() => {
        setSelectedPersonId(pessoa.id);
      });
      navigateToPersonProfile(pessoa.id);
    },
    [navigateToPersonProfile]
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

  const curiosities = useMemo(() => calculateCuriosities(pessoas, relacionamentos), [pessoas, relacionamentos]);

  const availableModes = useMemo<TipoVisualizacaoArvore[]>(
    () => (isMobile ? ['familiares-diretos', 'geracoes', 'lista'] : ['familiares-diretos', 'lados', 'geracoes', 'lista']),
    [isMobile]
  );

  const canNavigateGenerations = isMobile && viewMode === 'geracoes' && generationColumns.length > 0;
  const activeGenerationMeta = generationColumns.find((column) => column.level === activeGeneration);
  const maxGenerationIndex = generationColumns.length - 1;

  const directRelativeFilters = directRelativeFilterState.filters;
  const centralReferencePersonId = linkedPersonId || selectedPersonId;
  const linkedPerson = useMemo(
    () => pessoas.find((pessoa) => pessoa.id === linkedPersonId),
    [pessoas, linkedPersonId]
  );
  const fullDisplayName = (
    linkedPerson?.nome_completo ||
    profile?.nome_exibicao ||
    (user?.user_metadata?.nome_exibicao as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    ''
  ).trim();
  const displayName = getShortDisplayName(fullDisplayName);
  const avatarUrl =
    linkedPerson?.foto_principal_url ||
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const initials = getInitials(displayName || fullDisplayName);
  const directRelationCounts = useMemo(
    () => calculateDirectRelationCounts(pessoas, relacionamentos, centralReferencePersonId),
    [pessoas, relacionamentos, centralReferencePersonId]
  );

  const handleAskAi = useCallback(async () => {
    const question = aiQuestion.trim();
    if (!question || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiAnswer('');

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          context: buildAiTreeContext({
            pessoas,
            relacionamentos,
            stats,
            curiosities,
            centralPersonId: centralReferencePersonId,
            centralPersonName: fullDisplayName || displayName,
            directRelationCounts,
          }),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Não foi possível gerar a resposta agora.');
      }

      const answer = payload?.answer || payload?.data?.answer || payload?.response;

      if (!answer || typeof answer !== 'string') {
        throw new Error('A IA não retornou uma resposta válida.');
      }

      setAiAnswer(answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível gerar a resposta agora.';
      setAiError(message);
      toast.error(message);
    } finally {
      setAiLoading(false);
    }
  }, [
    aiLoading,
    aiQuestion,
    centralReferencePersonId,
    curiosities,
    directRelationCounts,
    displayName,
    fullDisplayName,
    pessoas,
    relacionamentos,
    stats,
  ]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-3 py-3 shadow-sm lg:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserMenu
              isLoggedIn={Boolean(user)}
              displayName={displayName}
              avatarUrl={avatarUrl}
              initials={initials}
              onLogin={() => navigateFromHome('/entrar')}
              onEditProfile={() => navigateFromHome('/minha-arvore')}
              onFavorites={() => navigateFromHome('/meus-favoritos')}
              onCalendar={() => navigateFromHome('/calendario-familiar')}
              onAdmin={() => navigateFromHome('/admin/login')}
              onSignOut={handleSignOut}
            />

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900 lg:text-xl">{displayName || 'Árvore Genealógica'}</h1>
              <p className="truncate text-xs text-gray-500 lg:text-sm">Árvore Genealógica</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
            <div className="w-[170px] shrink-0">
              <Select value={viewMode} onValueChange={(value) => handleViewModeChange(value as TipoVisualizacaoArvore)}>
                <SelectTrigger className="h-9 rounded-md border border-gray-300 bg-white px-3 shadow-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_MODE_OPTIONS.filter((option) => availableModes.includes(option.value)).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="h-9 shrink-0 gap-2 px-3"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden xl:inline">Curiosidades</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Fórum de Discussões"
              aria-label="Abrir Fórum de Discussões"
              onClick={() => navigateFromHome('/forum')}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 shrink-0 gap-2 px-3">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden xl:inline">Filtros</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-[75vh] w-[min(92vw,360px)] overflow-y-auto p-4">
                <FilterPanel
                  viewMode={viewMode}
                  personFilters={personFilters}
                  edgeFilters={edgeFilters}
                  directRelativeFilters={directRelativeFilters}
                  directRelationCounts={directRelationCounts}
                  showDirectRelativeFilters={isMobile || !sidebarOpen}
                  onTogglePerson={togglePersonFilter}
                  onToggleEdge={toggleFilter}
                  onToggleDirect={toggleDirectRelativeFilter}
                />
              </PopoverContent>
            </Popover>

            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setLegendOpen((prev) => !prev)}
                title={legendOpen ? 'Ocultar legenda' : 'Exibir legenda'}
              >
                {legendOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            )}

            <div className="flex min-w-[220px] flex-1 items-center gap-2 lg:max-w-sm xl:max-w-md">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-10"
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

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Notificações"
                aria-label="Abrir notificações"
                onClick={() => navigateFromHome('/notificacoes')}
              >
                <Bell className="w-4 h-4" />
              </Button>
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

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {!isMobile && (
          <aside
            className={[
              'flex h-full min-h-0 shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200',
              sidebarOpen ? 'w-80 p-4' : 'w-14 p-2',
            ].join(' ')}
          >
            <div className={sidebarOpen ? 'mb-4 flex h-9 items-center justify-between gap-3' : 'flex justify-center'}>
              {sidebarOpen && (
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs text-gray-600">
                    Use zoom, arraste a árvore
                  </p>
                  <p className="truncate text-xs text-gray-600">
                    e clique nas pessoas para abrir detalhes.
                  </p>
                </div>
              )}
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

            {sidebarOpen && (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {viewMode === 'familiares-diretos' && (
                  <DirectRelationKpiGrid
                    filters={directRelativeFilters}
                    counts={directRelationCounts}
                    onToggle={toggleDirectRelativeFilter}
                  />
                )}

                <LifeStatusKpiGrid
                  vivos={stats.pessoasVivas}
                  falecidos={stats.pessoasFalecidas}
                  filters={personFilters}
                  onToggle={togglePersonFilter}
                />
              </div>
            )}
          </aside>
        )}

        <section className="relative min-w-0 w-0 flex-1 overflow-hidden bg-gray-100">
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
              layoutRevision={treeLayoutRevision}
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

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-gray-100 pb-4">
            <DialogTitle className="flex items-center gap-2 px-6 pt-6">
              <Sparkles className="h-5 w-5" />
              Curiosidades
            </DialogTitle>
            <DialogDescription className="px-6">
              Faça perguntas sobre sua árvore genealógica.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-6">
            <div className="space-y-4">
              <section>
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Pergunte à IA</h2>
                <Textarea
                  value={aiQuestion}
                  onChange={(event) => {
                    setAiQuestion(event.target.value);
                    setAiError(null);
                  }}
                  placeholder="Digite sua pergunta..."
                  className="min-h-24 resize-none"
                />
                <p className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  A IA usa os dados carregados nesta árvore para responder. A chave da OpenAI fica somente no backend.
                </p>
                {aiError && (
                  <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {aiError}
                  </p>
                )}
                {aiAnswer && (
                  <div className="mt-2 max-h-[32vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-950">
                    {aiAnswer}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Curiosidades rápidas</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Vivos" value={stats.pessoasVivas} />
                  <Stat label="Falecidos" value={stats.pessoasFalecidas} />
                  <Stat label="Cidades atuais" value={stats.cidadesAtuais} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <CuriosityCard label="Mais velho" value={curiosities.oldest?.nome_completo || 'Sem data'} detail={formatYear(curiosities.oldest?.data_nascimento)} />
                  <CuriosityCard label="Mais novo" value={curiosities.youngest?.nome_completo || 'Sem data'} detail={formatYear(curiosities.youngest?.data_nascimento)} />
                  <CuriosityCard label="Mais filhos" value={curiosities.mostChildren?.name || 'Sem dados'} detail={`${curiosities.mostChildren?.count ?? 0} filhos`} />
                  <CuriosityCard label="Cidade com mais nascimentos" value={curiosities.topBirthCity?.city || 'Sem dados'} detail={`${curiosities.topBirthCity?.count ?? 0} pessoas`} />
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <CuriosityList title="Onde moram" items={curiosities.topCurrentCities.map(({ city, count }) => [city, count])} />
                <CuriosityList title="Onde nasceram" items={curiosities.topBirthCities.map(({ city, count }) => [city, count])} />
              </section>

              <section>
                <p className="mb-2 text-sm font-semibold text-gray-900">Sugestões de perguntas</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AI_QUESTION_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setAiQuestion(example);
                        setAiError(null);
                        setAiAnswer('');
                      }}
                      className="min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </section>
              </div>
            </div>

          <DialogFooter className="shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6">
            <Button onClick={handleAskAi} disabled={!aiQuestion.trim() || aiLoading}>
              {aiLoading ? 'Perguntando...' : 'Perguntar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function getShortDisplayName(name: string) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.includes('@')) return cleanName;

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return cleanName;

  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function UserMenu({
  isLoggedIn,
  displayName,
  avatarUrl,
  initials,
  onLogin,
  onEditProfile,
  onFavorites,
  onCalendar,
  onAdmin,
  onSignOut,
}: {
  isLoggedIn: boolean;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  onLogin: () => void;
  onEditProfile: () => void;
  onFavorites: () => void;
  onCalendar: () => void;
  onAdmin: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-12 shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-1.5 pr-2 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title={isLoggedIn ? displayName || 'Conta do usuário' : 'Login'}
          aria-label={isLoggedIn ? displayName || 'Conta do usuário' : 'Login'}
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-semibold text-white">
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
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Menu</span>
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-800">
              Conta
              <ChevronDown className="h-3 w-3 text-gray-500 transition group-data-[state=open]:rotate-180" />
            </span>
          </span>
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
            <DropdownMenuItem onClick={onFavorites}>
              <Star className="h-4 w-4" />
              Meus favoritos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCalendar}>
              <CalendarDays className="h-4 w-4" />
              Calendário familiar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAdmin}>
              <Settings className="h-4 w-4" />
              Painel administrativo
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

function FilterPanel({
  viewMode,
  personFilters,
  edgeFilters,
  directRelativeFilters,
  directRelationCounts,
  showDirectRelativeFilters,
  onTogglePerson,
  onToggleEdge,
  onToggleDirect,
}: {
  viewMode: TipoVisualizacaoArvore;
  personFilters: {
    vivos: boolean;
    falecidos: boolean;
    pets: boolean;
  };
  edgeFilters: {
    conjugal: boolean;
    filiacao_sangue: boolean;
    filiacao_adotiva: boolean;
    irmaos: boolean;
  };
  directRelativeFilters: DirectRelativeFilters;
  directRelationCounts: DirectRelationCounts;
  showDirectRelativeFilters: boolean;
  onTogglePerson: (key: 'vivos' | 'falecidos' | 'pets') => void;
  onToggleEdge: (key: 'conjugal' | 'filiacao_sangue' | 'filiacao_adotiva' | 'irmaos') => void;
  onToggleDirect: (key: DirectRelativeGroup) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Pessoas</h2>
        <div className="space-y-2">
          <FilterButton active={personFilters.vivos} onClick={() => onTogglePerson('vivos')}>
            Vivos
          </FilterButton>
          <FilterButton active={personFilters.falecidos} onClick={() => onTogglePerson('falecidos')}>
            Falecidos
          </FilterButton>
          <FilterButton active={personFilters.pets} onClick={() => onTogglePerson('pets')}>
            Pets
          </FilterButton>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Relações</h2>
        <div className="space-y-2">
          <FilterButton active={edgeFilters.conjugal} onClick={() => onToggleEdge('conjugal')}>
            Cônjuges
          </FilterButton>
          <FilterButton active={edgeFilters.filiacao_sangue} onClick={() => onToggleEdge('filiacao_sangue')}>
            Filiação de sangue
          </FilterButton>
          <FilterButton active={edgeFilters.filiacao_adotiva} onClick={() => onToggleEdge('filiacao_adotiva')}>
            Filiação adotiva
          </FilterButton>
          <FilterButton active={edgeFilters.irmaos} onClick={() => onToggleEdge('irmaos')}>
            Irmãos
          </FilterButton>
        </div>
      </div>

      {viewMode === 'familiares-diretos' && showDirectRelativeFilters && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Familiares Diretos</h2>
          <DirectRelativeFilterGrid
            filters={directRelativeFilters}
            counts={directRelationCounts}
            onToggle={onToggleDirect}
          />
        </div>
      )}
    </div>
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

function CuriosityCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}

function CuriosityList({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2">
        {items.length > 0 ? items.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
            <span className="truncate text-gray-600">{label}</span>
            <span className="font-semibold text-gray-900">{count}</span>
          </div>
        )) : (
          <p className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">Sem dados.</p>
        )}
      </div>
    </div>
  );
}

function getBirthValue(pessoa?: Pessoa | null) {
  if (!pessoa?.data_nascimento) return null;
  const value = Number(pessoa.data_nascimento);
  if (Number.isFinite(value)) return value;

  const year = String(pessoa.data_nascimento).match(/\d{4}/)?.[0];
  return year ? Number(year) : null;
}

function formatYear(value?: string | number | null) {
  if (!value) return undefined;
  const year = String(value).match(/\d{4}/)?.[0];
  return year || String(value);
}

function calculateCuriosities(pessoas: Pessoa[], relacionamentos: Relacionamento[]) {
  const humans = pessoas.filter((pessoa) => pessoa.humano_ou_pet === 'Humano');
  const withBirth = humans
    .map((pessoa) => ({ pessoa, birth: getBirthValue(pessoa) }))
    .filter((item): item is { pessoa: Pessoa; birth: number } => typeof item.birth === 'number');
  const sortedByBirth = [...withBirth].sort((a, b) => a.birth - b.birth);

  const currentCities = countBy(
    humans.filter((pessoa) => !hasDeathDate(pessoa.data_falecimento)).map((pessoa) => pessoa.local_atual)
  );
  const birthCities = countBy(humans.map((pessoa) => pessoa.local_nascimento));
  const childrenByParent = new Map<string, Set<string>>();

  const addChild = (parentId: string, childId: string) => {
    if (!parentId || !childId || parentId === childId) return;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, new Set());
    childrenByParent.get(parentId)!.add(childId);
  };

  relacionamentos.forEach((rel) => {
    if (rel.tipo_relacionamento === 'filho') {
      addChild(rel.pessoa_origem_id, rel.pessoa_destino_id);
      return;
    }

    if (rel.tipo_relacionamento === 'pai' || rel.tipo_relacionamento === 'mae') {
      addChild(rel.pessoa_destino_id, rel.pessoa_origem_id);
    }
  });

  const mostChildren = Array.from(childrenByParent.entries())
    .map(([personId, children]) => ({
      name: pessoas.find((pessoa) => pessoa.id === personId)?.nome_completo || 'Sem nome',
      count: children.size,
    }))
    .sort((a, b) => b.count - a.count)[0];

  return {
    oldest: sortedByBirth[0]?.pessoa,
    youngest: sortedByBirth[sortedByBirth.length - 1]?.pessoa,
    mostChildren,
    topCurrentCities: currentCities.slice(0, 5),
    topBirthCities: birthCities.slice(0, 5),
    topBirthCity: birthCities[0],
  };
}

function countBy(values: Array<string | undefined | null>) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

function buildAiTreeContext({
  pessoas,
  relacionamentos,
  stats,
  curiosities,
  centralPersonId,
  centralPersonName,
  directRelationCounts,
}: {
  pessoas: Pessoa[];
  relacionamentos: Relacionamento[];
  stats: Record<string, unknown>;
  curiosities: ReturnType<typeof calculateCuriosities>;
  centralPersonId?: string;
  centralPersonName: string;
  directRelationCounts: DirectRelationCounts;
}) {
  return {
    pessoaCentral: {
      id: centralPersonId,
      nome: centralPersonName,
    },
    estatisticas: stats,
    filtrosFamiliaresDiretos: directRelationCounts,
    curiosidades: {
      maisVelho: curiosities.oldest
        ? {
            nome: curiosities.oldest.nome_completo,
            dataNascimento: curiosities.oldest.data_nascimento,
          }
        : null,
      maisNovo: curiosities.youngest
        ? {
            nome: curiosities.youngest.nome_completo,
            dataNascimento: curiosities.youngest.data_nascimento,
          }
        : null,
      maisFilhos: curiosities.mostChildren || null,
      principaisCidadesAtuais: curiosities.topCurrentCities,
      principaisCidadesNascimento: curiosities.topBirthCities,
    },
    pessoas: pessoas.slice(0, 700).map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.nome_completo,
      nascimento: pessoa.data_nascimento,
      falecimento: pessoa.data_falecimento,
      localNascimento: pessoa.local_nascimento,
      localFalecimento: pessoa.local_falecimento,
      localAtual: pessoa.local_atual,
      tipo: pessoa.humano_ou_pet,
      lado: pessoa.lado,
      bio: pessoa.minibio,
      curiosidades: pessoa.curiosidades,
    })),
    relacionamentos: relacionamentos.slice(0, 1200).map((rel) => ({
      origem: rel.pessoa_origem_id,
      destino: rel.pessoa_destino_id,
      tipo: rel.tipo_relacionamento,
      subtipo: rel.subtipo_relacionamento,
      ativo: rel.ativo,
      observacoes: rel.observacoes,
    })),
  };
}

function DirectRelationKpiGrid({
  filters,
  counts,
  onToggle,
}: {
  filters: DirectRelativeFilters;
  counts: DirectRelationCounts;
  onToggle: (key: DirectRelativeGroup) => void;
}) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Filtros</h2>
      <p className="mb-2 text-xs leading-snug text-gray-500">
        Clique nos cards abaixo para exibir ou ocultar grupos de parentes.
      </p>
      <DirectRelativeFilterGrid
        filters={filters}
        counts={counts}
        onToggle={onToggle}
        excludedKeys={['pais']}
      />
    </section>
  );
}

function LifeStatusKpiGrid({
  vivos,
  falecidos,
  filters,
  onToggle,
}: {
  vivos: number;
  falecidos: number;
  filters: {
    vivos: boolean;
    falecidos: boolean;
  };
  onToggle: (key: 'vivos' | 'falecidos') => void;
}) {
  const items = [
    {
      key: 'vivos' as const,
      label: 'Vivos',
      value: vivos,
      className: 'border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
    },
    {
      key: 'falecidos' as const,
      label: 'Falecidos',
      value: falecidos,
      className: 'border-slate-300 bg-gradient-to-br from-slate-500 to-slate-700 text-white',
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const active = filters[item.key];

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(item.key)}
              className={[
                'min-h-[54px] rounded-lg border p-2 text-left shadow-sm transition',
                item.className,
                active ? 'opacity-100' : 'grayscale opacity-45',
                'hover:-translate-y-0.5 hover:shadow-md',
              ].join(' ')}
              title={active ? `Ocultar ${item.label}` : `Mostrar ${item.label}`}
            >
              <span className="block text-xs font-semibold">{item.label}</span>
              <span className="mt-1 block text-xl font-bold leading-none">{item.value}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type DirectRelationCounts = Record<DirectRelativeGroup, number>;

function uniqueIds(ids: Array<string | undefined | null>, centralPersonId?: string) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id) && id !== centralPersonId)));
}

function calculateDirectRelationCounts(
  pessoas: Pessoa[],
  relacionamentos: Relacionamento[],
  centralPersonId?: string
): DirectRelationCounts {
  const emptyCounts: DirectRelationCounts = {
    pais: 0,
    avos: 0,
    bisavos: 0,
    tataravos: 0,
    conjuge: 0,
    filhos: 0,
    netos: 0,
    irmaos: 0,
    sobrinhos: 0,
    tios: 0,
    primos: 0,
  };

  if (!centralPersonId || pessoas.length === 0) return emptyCounts;

  const personIds = new Set(pessoas.map((pessoa) => pessoa.id));
  if (!personIds.has(centralPersonId)) return emptyCounts;

  const parentsByChild = new Map<string, Set<string>>();
  const childrenByParent = new Map<string, Set<string>>();
  const siblingsByPerson = new Map<string, Set<string>>();
  const spousesByPerson = new Map<string, Set<string>>();

  const addToSet = (map: Map<string, Set<string>>, key: string, value: string) => {
    if (!key || !value || key === value || !personIds.has(key) || !personIds.has(value)) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  };

  const addParentChild = (parentId: string, childId: string) => {
    addToSet(parentsByChild, childId, parentId);
    addToSet(childrenByParent, parentId, childId);
  };

  relacionamentos.forEach((relacionamento) => {
    if (relacionamento.tipo_relacionamento === 'conjuge') {
      addToSet(spousesByPerson, relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id);
      addToSet(spousesByPerson, relacionamento.pessoa_destino_id, relacionamento.pessoa_origem_id);
      return;
    }

    if (relacionamento.tipo_relacionamento === 'irmao') {
      addToSet(siblingsByPerson, relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id);
      addToSet(siblingsByPerson, relacionamento.pessoa_destino_id, relacionamento.pessoa_origem_id);
      return;
    }

    if (relacionamento.tipo_relacionamento === 'filho') {
      addParentChild(relacionamento.pessoa_origem_id, relacionamento.pessoa_destino_id);
      return;
    }

    if (relacionamento.tipo_relacionamento === 'pai' || relacionamento.tipo_relacionamento === 'mae') {
      addParentChild(relacionamento.pessoa_destino_id, relacionamento.pessoa_origem_id);
    }
  });

  const getParents = (id: string) => Array.from(parentsByChild.get(id) || []);
  const getChildren = (id: string) => Array.from(childrenByParent.get(id) || []);
  const getSiblings = (id: string) => {
    const sharedParentSiblings = getParents(id).flatMap(getChildren);
    const explicitSiblings = Array.from(siblingsByPerson.get(id) || []);
    return uniqueIds([...sharedParentSiblings, ...explicitSiblings], id);
  };

  const parents = uniqueIds(getParents(centralPersonId), centralPersonId);
  const grandparents = uniqueIds(parents.flatMap(getParents), centralPersonId);
  const greatGrandparents = uniqueIds(grandparents.flatMap(getParents), centralPersonId);
  const greatGreatGrandparents = uniqueIds(greatGrandparents.flatMap(getParents), centralPersonId);
  const siblings = uniqueIds(getSiblings(centralPersonId), centralPersonId);
  const uncles = uniqueIds(
    parents.flatMap((parentId) => getSiblings(parentId).filter((id) => !parents.includes(id))),
    centralPersonId
  );
  const cousins = uniqueIds(uncles.flatMap(getChildren), centralPersonId);
  const nephews = uniqueIds(siblings.flatMap(getChildren), centralPersonId);
  const spouses = uniqueIds(Array.from(spousesByPerson.get(centralPersonId) || []), centralPersonId);
  const children = uniqueIds(getChildren(centralPersonId), centralPersonId);
  const grandchildren = uniqueIds(children.flatMap(getChildren), centralPersonId);

  return {
    pais: parents.length,
    avos: grandparents.length,
    bisavos: greatGrandparents.length,
    tataravos: greatGreatGrandparents.length,
    conjuge: spouses.length,
    filhos: children.length,
    netos: grandchildren.length,
    irmaos: siblings.length,
    sobrinhos: nephews.length,
    tios: uncles.length,
    primos: cousins.length,
  };
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
  className: string;
}> = [
  { key: 'pais', label: 'Pais', className: 'border-blue-300 bg-gradient-to-br from-blue-500 to-blue-700 text-white' },
  { key: 'avos', label: 'Avós', className: 'border-violet-300 bg-gradient-to-br from-violet-500 to-violet-700 text-white' },
  { key: 'bisavos', label: 'Bisavós', className: 'border-orange-300 bg-gradient-to-br from-orange-400 to-orange-600 text-white' },
  { key: 'tataravos', label: 'Tataravós', className: 'border-red-300 bg-gradient-to-br from-red-400 to-red-600 text-white' },
  { key: 'conjuge', label: 'Cônjuge', className: 'border-fuchsia-300 bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-white' },
  { key: 'filhos', label: 'Filhos', className: 'border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white' },
  { key: 'netos', label: 'Netos', className: 'border-green-300 bg-gradient-to-br from-green-500 to-green-700 text-white' },
  { key: 'irmaos', label: 'Irmãos', className: 'border-sky-300 bg-gradient-to-br from-sky-500 to-sky-700 text-white' },
  { key: 'sobrinhos', label: 'Sobrinhos', className: 'border-lime-300 bg-gradient-to-br from-lime-500 to-lime-700 text-white' },
  { key: 'tios', label: 'Tios', className: 'border-rose-300 bg-gradient-to-br from-rose-500 to-rose-700 text-white' },
  { key: 'primos', label: 'Primos', className: 'border-yellow-200 bg-gradient-to-br from-yellow-300 to-yellow-400 text-gray-900' },
];

function DirectRelativeFilterGrid({
  filters,
  counts,
  onToggle,
  excludedKeys = [],
  compact = false,
}: {
  filters: DirectRelativeFilters;
  counts: DirectRelationCounts;
  onToggle: (key: DirectRelativeGroup) => void;
  excludedKeys?: DirectRelativeGroup[];
  compact?: boolean;
}) {
  const excludedKeySet = new Set(excludedKeys);

  return (
    <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-5' : 'grid grid-cols-2 gap-2'}>
      {DIRECT_RELATIVE_FILTER_OPTIONS.filter((option) => !excludedKeySet.has(option.key)).map((option) => {
        const active = filters[option.key];
        const count = counts[option.key];
        const disabled = count === 0;

        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(option.key)}
            className={[
              'min-h-[54px] rounded-lg border p-2 text-left shadow-sm transition',
              option.className,
              active ? 'opacity-100' : 'grayscale opacity-45',
              disabled ? 'cursor-not-allowed opacity-35' : 'hover:-translate-y-0.5 hover:shadow-md',
            ].join(' ')}
            title={active ? `Ocultar ${option.label}` : `Mostrar ${option.label}`}
          >
            <span className="block text-xs font-semibold">{option.label}</span>
            <span className="mt-1 block text-xl font-bold leading-none">{count}</span>
          </button>
        );
      })}
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
      {!compact && <h2 className="mb-3 text-sm font-semibold text-gray-900">Legenda</h2>}
      <div className={compact ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'space-y-2'}>
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] text-gray-600">
            <span className="flex w-10 shrink-0 items-center justify-center">{item.sample}</span>
            <span className="truncate">{item.label}</span>
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
