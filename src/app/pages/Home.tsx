import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router';

import { FamilyTree, type FamilyTreeActions } from '../components/FamilyTree/FamilyTree';
import { ViewMarriageModal } from '../components/FamilyTree/modals/ViewMarriageModal';
import {
  AddConnectionModal,
  type AddConnectionPayload,
} from '../components/FamilyTree/modals/AddConnectionModal';
import { useIsMobile } from '../components/FamilyTree/hooks/useIsMobile';
import {
  readDirectRelativeFilters,
  storeDirectRelativeFilters,
  migrateLegacyTreeViewPreferences,
} from '../components/FamilyTree/utils/treePreferences';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
  obterTodasPessoas,
  obterTodosRelacionamentos,
  buscarPessoas,
} from '../services/dataService';
import {
  getCachedTreeData,
  setCachedTreeData,
  subscribeTreeDataChanged,
} from '../services/treeDataCache';
import { Pessoa, Relacionamento } from '../types';
import {
  DEFAULT_GENEALOGY_FILTERS,
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelativeFilters,
  DirectRelativeGroup,
  GenealogyFilterKey,
  GenealogyFilters,
  MarriageNodeDetails,
} from '../components/FamilyTree/types';
import { TreeViewMode } from '../components/FamilyTree/ViewModeToggle';
import { FAMILY_TREE_COLORS, hasDeathDate } from '../components/FamilyTree/visualTokens';
import {
  DIRECT_FAMILY_CARD_TEXT_COLORS,
  DIRECT_FAMILY_LEGEND_BACKGROUNDS,
  DIRECT_FAMILY_RELATION_COLORS,
  DIRECT_FAMILY_STATUS_BORDER_COLORS,
} from '../components/FamilyTree/directFamilyColors';
import { useAuth } from '../contexts/AuthContext';
import { getMemberProfile, getPrimaryLinkedPerson, MemberProfile } from '../services/memberProfileService';
import { isAdminUser } from '../services/permissionService';
import { listarNotificacoes, listarNotificacoesSupabase } from '../services/userEngagementService';
import { descobrirParentesco } from '../services/relationshipResolverService';
import {
  getInsightByType,
  obterInsightsGeradosPessoa,
  PersonGeneratedInsight,
} from '../services/personInsightsService';
import { getPersonZodiacSign } from '../utils/personFields';
import {
  Search,
  Lightbulb,
  Bot,
  Network,
  Monitor,
  Settings,
  CircleEllipsis,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  FileDown,
  ImageDown,
  Printer,
  Star,
  Bell,
  UserCircle2,
  Home as HomeIcon,
  LogIn,
  LogOut,
  Pencil,
  Sparkles,
  MessageCircle,
  UserSearch,
} from 'lucide-react';
import { toast } from 'sonner';

const AI_QUESTION_EXAMPLES = [
  'Quem são meus bisavós paternos?',
  'Quantas pessoas da família nasceram em Recife?',
  'Quais parentes moram em Porto Alegre?',
  'Monte um resumo da linha genealógica de uma pessoa.',
];
const AI_QUESTION_PLACEHOLDER = `Pergunte, por exemplo:\n${AI_QUESTION_EXAMPLES.join('\n')}`;

const AI_ENDPOINT = '/api/ai';

const CURIOSITY_TOPIC_OPTIONS = [
  'Dados e Contato',
  'Biografia',
  'Curiosidades',
  'Fatos Históricos do Dia de Nascimento',
  'O que diz a Astrologia',
  'Árvore Genealógica',
] as const;

type CuriosityTopic = typeof CURIOSITY_TOPIC_OPTIONS[number];
type CuriosidadesTab = 'voce-sabia' | 'descubra' | 'pergunte-ia' | 'conexao';
type SidebarPanel = 'filters' | 'legend' | 'info';

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPersonId = searchParams.get('pessoa')?.trim() || undefined;
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>();
  const [linkedPersonId, setLinkedPersonId] = useState<string | undefined>();
  const [treeFocusPersonId, setTreeFocusPersonId] = useState<string | undefined>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>(() => getCachedTreeData()?.pessoas ?? []);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>(() => getCachedTreeData()?.relacionamentos ?? []);
  const [pessoasFiltradas, setPessoasFiltradas] = useState<Pessoa[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [treeLayoutRevision, setTreeLayoutRevision] = useState(0);
  const [treeViewMode, setTreeViewMode] = useState<TreeViewMode>('minha-arvore');
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('filters');
  const [legendOpen, setLegendOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(() => !getCachedTreeData());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

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
  const [selectedCuriosityPersonId, setSelectedCuriosityPersonId] = useState<string>('');
  const [selectedCuriosityTopics, setSelectedCuriosityTopics] = useState<CuriosityTopic[]>([]);
  const [activeCuriosityTab, setActiveCuriosityTab] = useState<CuriosidadesTab>('voce-sabia');
  const [discoverSubmitted, setDiscoverSubmitted] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverInsights, setDiscoverInsights] = useState<PersonGeneratedInsight[]>([]);
  const [connectionPersonOneId, setConnectionPersonOneId] = useState<string>('');
  const [connectionPersonTwoId, setConnectionPersonTwoId] = useState<string>('');
  const [connectionResult, setConnectionResult] = useState<{
    nome?: string;
    descricao?: string;
    descricaoContextual?: string;
    caminho?: string;
    relacoes?: string;
  } | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const familyTreeRef = useRef<FamilyTreeActions | null>(null);
  const treeDataLoadTokenRef = useRef(0);

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

  const [genealogyFilters, setGenealogyFilters] = useState<GenealogyFilters>(DEFAULT_GENEALOGY_FILTERS);

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
    migrateLegacyTreeViewPreferences();
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

  const loadTreeData = useCallback(async (options: { force?: boolean } = {}) => {
    const loadToken = treeDataLoadTokenRef.current + 1;
    treeDataLoadTokenRef.current = loadToken;
    const cachedTreeData = getCachedTreeData();
    if (!options.force && cachedTreeData) {
      setPessoas(cachedTreeData.pessoas);
      setRelacionamentos(cachedTreeData.relacionamentos);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

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

      if (treeDataLoadTokenRef.current !== loadToken) return;

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

      const nextPessoas = Array.isArray(pessoasData) ? pessoasData : [];
      const nextRelacionamentos = Array.isArray(relacionamentosData) ? relacionamentosData : [];

      setCachedTreeData({
        pessoas: nextPessoas,
        relacionamentos: nextRelacionamentos,
      });

      setPessoas(nextPessoas);
      setRelacionamentos(nextRelacionamentos);

      if (relacionamentosData.length === 0) {
        console.warn('[Supabase] Tabela sem dados: relacionamentos não retornou registros.');
      }
    } catch (error) {
      if (treeDataLoadTokenRef.current !== loadToken) return;
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados.';
      console.error('Erro ao carregar dados da árvore:', error);
      setLoadError(message);
      setPessoas([]);
      setRelacionamentos([]);
    } finally {
      if (treeDataLoadTokenRef.current === loadToken) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const runLoad = (options?: { force?: boolean }) => {
      if (!active) return;
      void loadTreeData(options);
    };

    runLoad();
    const unsubscribe = subscribeTreeDataChanged(() => runLoad({ force: true }));

    return () => {
      active = false;
      treeDataLoadTokenRef.current += 1;
      unsubscribe();
    };
  }, [loadTreeData]);

  useEffect(() => {
    const loadLinkedPerson = async () => {
      if (!user) {
        setLinkedPersonId(undefined);
        return;
      }

      try {
        const { data } = await getPrimaryLinkedPerson(user.id);
        setLinkedPersonId(data?.pessoa_id);
        if (data?.pessoa_id && !queryPersonId) {
          setSelectedPersonId(data.pessoa_id);
        }
      } catch (error) {
        console.error('Erro ao carregar vínculo do membro:', error);
        setLinkedPersonId(undefined);
      }
    };

    loadLinkedPerson();
  }, [queryPersonId, user?.id]);

  useEffect(() => {
    if (!queryPersonId || pessoas.length === 0) return;

    const queryPersonExists = pessoas.some((pessoa) => pessoa.id === queryPersonId);

    if (!queryPersonExists) {
      setTreeFocusPersonId(undefined);
      setSelectedPersonId(linkedPersonId || pessoas[0]?.id);
      navigate('/', { replace: true });
      return;
    }

    setTreeFocusPersonId(queryPersonId);
    setSelectedPersonId(queryPersonId);
  }, [linkedPersonId, navigate, pessoas, queryPersonId]);

  useEffect(() => {
    if (selectedCuriosityPersonId || pessoas.length === 0) return;

    const defaultPersonId = linkedPersonId || selectedPersonId || pessoas[0]?.id;
    if (defaultPersonId) {
      setSelectedCuriosityPersonId(defaultPersonId);
    }
  }, [linkedPersonId, pessoas, selectedCuriosityPersonId, selectedPersonId]);

  useEffect(() => {
    if (connectionPersonOneId || pessoas.length === 0) return;

    const defaultPersonId = linkedPersonId || selectedPersonId || pessoas[0]?.id;
    if (defaultPersonId) {
      setConnectionPersonOneId(defaultPersonId);
    }
  }, [connectionPersonOneId, linkedPersonId, pessoas, selectedPersonId]);

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
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(false);

      try {
        const { isAdmin: nextIsAdmin, error } = await isAdminUser(user);
        if (error) {
          console.error('Erro ao verificar permissão administrativa:', error);
        }
        if (!cancelled) {
          setIsAdmin(nextIsAdmin);
        }
      } catch (error) {
        console.error('Erro ao verificar permissão administrativa:', error);
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };

    loadAdminStatus();

    return () => {
      cancelled = true;
    };
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
    if (!searchExpanded) return;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 160);

    return () => window.clearTimeout(focusTimer);
  }, [searchExpanded]);

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
      setPessoasFiltradas([]);
      setSearchExpanded(false);

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

  const toggleGenealogyFilter = useCallback((filterKey: GenealogyFilterKey) => {
    setGenealogyFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  const centralReferencePersonId = treeFocusPersonId || linkedPersonId || selectedPersonId || pessoas[0]?.id;
  const centralReferencePerson = useMemo(
    () => pessoas.find((pessoa) => pessoa.id === centralReferencePersonId),
    [centralReferencePersonId, pessoas]
  );

  const handleOpenPersonTree = useCallback((personId: string) => {
    setTreeFocusPersonId(personId);
    setSelectedPersonId(personId);
    setAiDialogOpen(false);
    if (isMobile) {
      setSidebarOpen(false);
      setLegendOpen(false);
    }
    navigate(`/?pessoa=${encodeURIComponent(personId)}`, { replace: false });

    window.setTimeout(() => {
      setTreeLayoutRevision((revision) => revision + 1);
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }, [isMobile, navigate]);

  const pessoasVisiveis = useMemo(() => {
    return pessoas.filter((pessoa) => {
      if (centralReferencePersonId && pessoa.id === centralReferencePersonId) {
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
  }, [centralReferencePersonId, pessoas, personFilters]);

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

  const directRelativeFilters = directRelativeFilterState.filters;
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
  const accountFirstName = getFirstName(fullDisplayName);
  const avatarUrl =
    linkedPerson?.foto_principal_url ||
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const initials = getInitials(displayName || fullDisplayName);

  useEffect(() => {
    let cancelled = false;

    async function loadNotificationCount() {
      if (!user) {
        setNotificationCount(0);
        return;
      }

      try {
        const notificacoes = await listarNotificacoesSupabase(user.id);
        if (!cancelled) {
          setNotificationCount(notificacoes.filter((notificacao) => !notificacao.lida).length);
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(listarNotificacoes(user.id).filter((notificacao) => !notificacao.lida).length);
        }
      }
    }

    loadNotificationCount();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const directRelationCounts = useMemo(
    () => calculateDirectRelationCounts(pessoas, relacionamentos, centralReferencePersonId),
    [pessoas, relacionamentos, centralReferencePersonId]
  );
  const sidebarPanelContent = (
    <>
      {activeSidebarPanel === 'filters' && (
        <div className="space-y-4">
          {treeViewMode === 'genealogia' || treeViewMode === 'visao-completa' ? (
            <GenealogyFilterGrid
              filters={genealogyFilters}
              onToggle={toggleGenealogyFilter}
            />
          ) : (
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

      {activeSidebarPanel === 'legend' && <FamilyTreeLegend compact={isMobile} />}

      {activeSidebarPanel === 'info' && (
        <SidebarInfoPanel
          onSavePdf={() => familyTreeRef.current?.savePdf()}
          onSaveImage={() => familyTreeRef.current?.saveImage()}
          onPrint={() => familyTreeRef.current?.print()}
          onWhatsApp={() => toast.info('Envio por WhatsApp será implementado em breve.')}
        />
      )}
    </>
  );
  const selectedCuriosityPerson = useMemo(
    () => pessoas.find((pessoa) => pessoa.id === selectedCuriosityPersonId),
    [pessoas, selectedCuriosityPersonId]
  );
  const discoverAstrologyInsight = useMemo(
    () => getInsightByType(discoverInsights, 'astrology'),
    [discoverInsights]
  );
  const discoverHistoricalInsight = useMemo(
    () => getInsightByType(discoverInsights, 'historical_events'),
    [discoverInsights]
  );
  const canAskAi = Boolean(!aiAnswer && (aiQuestion.trim() || (selectedCuriosityPerson && selectedCuriosityTopics.length > 0)));
  const toggleCuriosityTopic = useCallback((topic: CuriosityTopic) => {
    setSelectedCuriosityTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic]
    );
    setDiscoverSubmitted(false);
    setDiscoverResultsEmpty();
  }, []);

  function setDiscoverResultsEmpty() {
    setDiscoverError(null);
    setDiscoverInsights([]);
  }

  function handleBackToDiscoverForm() {
    setDiscoverSubmitted(false);
    setDiscoverError(null);
  }

  const handleAdvanceCuriosityPrompt = useCallback(async () => {
    if (!selectedCuriosityPerson || selectedCuriosityTopics.length === 0) return;

    setDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverInsights([]);
    setDiscoverSubmitted(true);

    try {
      const insightsResult = selectedCuriosityTopics.some((topic) =>
        topic === 'Fatos Históricos do Dia de Nascimento' || topic === 'O que diz a Astrologia'
      )
        ? await obterInsightsGeradosPessoa(selectedCuriosityPerson.id)
        : [];
      setDiscoverInsights(insightsResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar as informações selecionadas.';
      setDiscoverError(message);
    } finally {
      setDiscoverLoading(false);
    }
  }, [selectedCuriosityPerson, selectedCuriosityTopics]);

  const handleAskAi = useCallback(async () => {
    const manualQuestion = aiQuestion.trim();
    if ((!manualQuestion && (!selectedCuriosityPerson || selectedCuriosityTopics.length === 0)) || aiLoading) return;

    const curiosityInstruction = selectedCuriosityPerson && selectedCuriosityTopics.length > 0
      ? [
          `Pessoa selecionada: ${selectedCuriosityPerson.nome_completo}.`,
          `Tópicos desejados: ${selectedCuriosityTopics.join(', ')}.`,
        ].join('\n')
      : '';
    const question = manualQuestion || 'Fale sobre a pessoa selecionada considerando os tópicos marcados.';
    const message = [question, curiosityInstruction].filter(Boolean).join('\n\n');

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: buildAiTreeContext({
            pessoas,
            relacionamentos,
            stats,
            curiosities,
            centralPersonId: centralReferencePersonId,
            centralPersonName: centralReferencePerson?.nome_completo || fullDisplayName || displayName,
            directRelationCounts,
            selectedCuriosityPerson,
            selectedCuriosityTopics,
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

      setAiAnswer(answer || 'Não encontrei uma resposta para essa pergunta.');
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
    centralReferencePerson,
    curiosities,
    directRelationCounts,
    displayName,
    fullDisplayName,
    pessoas,
    relacionamentos,
    selectedCuriosityPerson,
    selectedCuriosityTopics,
    stats,
  ]);

  function handleNewAiQuestion() {
    setAiQuestion('');
    setAiAnswer('');
    setAiError(null);
  }

  const handleDiscoverConnection = useCallback(async () => {
    if (!connectionPersonOneId || !connectionPersonTwoId || connectionLoading) return;

    if (connectionPersonOneId === connectionPersonTwoId) {
      setConnectionResult(null);
      setConnectionError('Selecione duas pessoas diferentes.');
      return;
    }

    setConnectionLoading(true);
    setConnectionError(null);
    setConnectionResult(null);

    try {
      const resultado = await descobrirParentesco(connectionPersonOneId, connectionPersonTwoId);
      setConnectionResult({
        nome: resultado.nome,
        descricao: resultado.descricao,
        descricaoContextual: resultado.descricaoContextual,
        caminho: resultado.caminhoPessoas.map((pessoa) => pessoa.nome).join(' → '),
        relacoes: resultado.caminhoRelacoes.join(' → '),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível descobrir a conexão agora.';
      setConnectionError(message);
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionLoading, connectionPersonOneId, connectionPersonTwoId]);

  const curiosityTabs = useMemo(
    () => [
      { id: 'voce-sabia' as const, label: 'Você Sabia?', icon: Lightbulb },
      { id: 'descubra' as const, label: 'Descubra mais sobre...', icon: Search },
      { id: 'pergunte-ia' as const, label: 'Pergunte à IA', icon: Bot },
      { id: 'conexao' as const, label: 'Qual a minha conexão com alguém?', icon: Network },
    ],
    []
  );
  const isSearchExpanded = searchExpanded;
  const currentTreeViewLabel =
    treeViewMode === 'genealogia'
      ? 'Genealogia'
      : treeViewMode === 'visao-completa'
        ? 'Visão Completa'
        : 'Minha Árvore';
  const headerActionTextClassName = isSearchExpanded ? 'hidden' : 'hidden xl:inline-flex';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-3 py-3 shadow-sm lg:px-5">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-4">
          <div className="flex min-w-fit items-center gap-3 justify-self-start">
            <div className="min-w-0">
              <h1 className="whitespace-normal text-lg font-bold leading-tight text-gray-900 sm:whitespace-nowrap lg:text-xl">
                Família Barros Souza
              </h1>
              <p className="text-xs text-gray-500 lg:text-sm">{currentTreeViewLabel}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:flex-nowrap lg:justify-center">
            <Select value={treeViewMode} onValueChange={(value) => setTreeViewMode(value as TreeViewMode)}>
              <SelectTrigger
                className="h-9 w-auto min-w-[168px] shrink-0 gap-2 border-blue-300 bg-blue-50 px-3 text-sm font-semibold text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 focus:ring-2 focus:ring-blue-200 sm:min-w-[210px]"
                aria-label="Mude a Visualização"
                title="Mude a Visualização"
              >
                <Network className="h-4 w-4 shrink-0 text-blue-700" />
                <span>Mude a Visualização</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minha-arvore">Minha Árvore</SelectItem>
                <SelectItem value="genealogia">Genealogia</SelectItem>
                <SelectItem value="visao-completa">Visão Completa</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="h-9 shrink-0 gap-2 px-3"
              title="Curiosidades"
              aria-label="Abrir Curiosidades"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              <span className={headerActionTextClassName}>Curiosidades</span>
            </Button>

            <Button
              variant="outline"
              className="h-9 shrink-0 gap-2 px-3"
              title="Fórum de Discussões"
              aria-label="Abrir Fórum de Discussões"
              onClick={() => navigateFromHome('/forum')}
            >
              <MessageCircle className="h-4 w-4" />
              <span className={headerActionTextClassName}>Fórum</span>
            </Button>

            <Button
              variant="outline"
              className="h-9 shrink-0 gap-2 px-3"
              title="Calendário familiar"
              aria-label="Abrir Calendário familiar"
              onClick={() => navigateFromHome('/calendario-familiar')}
            >
              <CalendarDays className="h-4 w-4" />
              <span className={headerActionTextClassName}>Calendário</span>
            </Button>

            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setLegendOpen((prev) => !prev)}
                title={legendOpen ? 'Ocultar painel' : 'Exibir painel'}
              >
                {legendOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="pointer-events-none relative flex min-w-0 flex-row-reverse items-center">
              <Button
                variant="outline"
                size="icon"
                className="pointer-events-auto relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white"
                title="Buscar por nome ou local"
                aria-label={searchExpanded ? 'Busca expandida' : 'Abrir busca'}
                onClick={() => setSearchExpanded(true)}
              >
                <Search className="pointer-events-none h-4 w-4" />
              </Button>

              <div
                className={[
                  'pointer-events-auto relative z-10 overflow-visible transition-all duration-300 ease-out',
                  searchExpanded ? 'w-[min(68vw,320px)] opacity-100' : 'w-0 opacity-0',
                ].join(' ')}
              >
                <div className="pr-2">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por nome ou local..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        if (!searchTerm.trim()) {
                          setSearchExpanded(false);
                        }
                      }, 120);
                    }}
                    className="h-10"
                    tabIndex={searchExpanded ? 0 : -1}
                  />

                  {searchExpanded && searchTerm && pessoasFiltradas.length > 0 && (
                    <div className="absolute left-0 right-2 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {pessoasFiltradas.map((pessoa) => (
                        <button
                          key={pessoa.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSearchSelect(pessoa)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                        >
                          <p className="text-sm font-medium text-gray-900">{pessoa.nome_completo}</p>
                          {pessoa.local_nascimento && (
                            <p className="mt-1 text-xs text-gray-500">📍 {pessoa.local_nascimento}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <UserMenu
              isLoggedIn={Boolean(user)}
              displayName={displayName}
              firstName={accountFirstName}
              avatarUrl={avatarUrl}
              initials={initials}
              notificationCount={notificationCount}
              isAdmin={isAdmin}
              onLogin={() => navigateFromHome('/entrar')}
              onHome={() => navigateFromHome('/')}
              onCuriosities={() => setAiDialogOpen(true)}
              onForum={() => navigateFromHome('/forum')}
              onEditProfile={() => navigateFromHome('/minha-arvore')}
              onFavorites={() => navigateFromHome('/meus-favoritos')}
              onCalendar={() => navigateFromHome('/calendario-familiar')}
              onNotifications={() => navigateFromHome('/notificacoes')}
              onAdmin={() => navigateFromHome('/admin')}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {isMobile && legendOpen && (
        <section className="border-b border-gray-200 bg-white px-4 py-3">
          <SidebarPanelTabs
            activePanel={activeSidebarPanel}
            onChange={setActiveSidebarPanel}
          />
          <div className="mt-3">{sidebarPanelContent}</div>
        </section>
      )}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {!isMobile && (
          <aside
            className={[
              'flex h-full min-h-0 shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200',
              sidebarOpen ? 'w-80 p-4' : 'w-14 p-2',
            ].join(' ')}
          >
            {sidebarOpen && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SidebarPanelTabs
                      activePanel={activeSidebarPanel}
                      onChange={setActiveSidebarPanel}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 bg-white shadow-sm"
                    onClick={() => setSidebarOpen(false)}
                    title="Recolher painel lateral"
                    aria-label="Recolher painel lateral"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {sidebarPanelContent}
                </div>
              </div>
            )}
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 bg-white shadow-sm"
                onClick={() => setSidebarOpen(true)}
                title="Expandir painel lateral"
                aria-label="Expandir painel lateral"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
              ref={familyTreeRef}
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
              centralPersonId={centralReferencePersonId}
              isMobile={isMobile}
              layoutRevision={treeLayoutRevision}
              viewMode={treeViewMode}
              genealogyFilters={genealogyFilters}
            />
          )}
        </section>
      </main>

      <ViewMarriageModal
        open={!!selectedMarriage}
        marriage={selectedMarriage}
        isAdmin={isAdmin}
        onClose={() => setSelectedMarriage(null)}
      />

      <AddConnectionModal
        open={!!connectionTarget}
        sourcePerson={connectionTarget}
        pessoas={pessoas}
        isAdmin={isAdmin}
        onClose={() => setConnectionTarget(null)}
        onSubmit={handleAddConnectionSubmit}
      />

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-gray-100 pb-4">
            <DialogTitle className="flex items-center gap-2 px-6 pt-6">
              <Sparkles className="h-5 w-5" />
              Curiosidades
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] sm:px-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {curiosityTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeCuriosityTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCuriosityTab(tab.id)}
                      className={`flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center shadow-sm transition ${
                        active
                          ? 'border-2 border-blue-500 bg-blue-50 text-blue-900'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-9 w-9 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold leading-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {activeCuriosityTab === 'voce-sabia' && (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Você Sabia?</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Veja curiosidades rápidas sobre a família, datas, lugares e conexões da árvore.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Stat label="Pessoas cadastradas" value={stats.totalPessoas} />
                      <Stat label="Vivos" value={stats.pessoasVivas} />
                      <Stat label="Falecidos" value={stats.pessoasFalecidas} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CuriosityCard label="Mais velho" value={curiosities.oldest?.nome_completo || 'Sem data'} detail={formatYear(curiosities.oldest?.data_nascimento)} />
                      <CuriosityCard label="Mais novo" value={curiosities.youngest?.nome_completo || 'Sem data'} detail={formatYear(curiosities.youngest?.data_nascimento)} />
                      <CuriosityCard label="Mais filhos" value={curiosities.mostChildren?.name || 'Sem dados'} detail={`${curiosities.mostChildren?.count ?? 0} filhos`} />
                      <CuriosityCard label="Cidade com mais nascimentos" value={curiosities.topBirthCity?.city || 'Sem dados'} detail={`${curiosities.topBirthCity?.count ?? 0} pessoas`} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CuriosityList title="Onde moram" items={curiosities.topCurrentCities} />
                      <CuriosityList title="Onde nasceram" items={curiosities.topBirthCities} />
                    </div>
                  </section>
                )}

                {activeCuriosityTab === 'descubra' && (
                  <section className="space-y-4">
                    {!discoverSubmitted ? (
                      <>
                        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                          <UserSearch className="h-5 w-5 text-blue-600" />
                          Descubra mais sobre...
                        </h2>
                        <Select
                          value={selectedCuriosityPersonId}
                          onValueChange={(value) => {
                            setSelectedCuriosityPersonId(value);
                            setDiscoverSubmitted(false);
                            setDiscoverResultsEmpty();
                          }}
                        >
                          <SelectTrigger className="h-12 rounded-lg border border-slate-500 bg-slate-100 px-4 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                            <SelectValue placeholder="Selecione uma pessoa" />
                          </SelectTrigger>
                          <SelectContent>
                            {pessoas.map((pessoa) => (
                              <SelectItem key={pessoa.id} value={pessoa.id}>
                                {pessoa.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {CURIOSITY_TOPIC_OPTIONS.map((topic) => {
                            const checked = selectedCuriosityTopics.includes(topic);

                            return (
                              <label
                                key={topic}
                                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                  checked
                                    ? 'border-blue-200 bg-blue-50 text-blue-900'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCuriosityTopic(topic)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{topic}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={discoverSubmitted ? handleBackToDiscoverForm : handleAdvanceCuriosityPrompt}
                            disabled={!discoverSubmitted && (!selectedCuriosityPerson || selectedCuriosityTopics.length === 0 || discoverLoading)}
                            className="w-full bg-white sm:w-auto"
                          >
                            {discoverLoading ? 'Carregando...' : discoverSubmitted ? 'Voltar' : 'Avançar'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {selectedCuriosityPerson?.nome_completo || 'Pessoa selecionada'}
                            </h3>
                            <p className="text-sm text-slate-500">
                              Informações selecionadas sobre esta pessoa.
                            </p>
                          </div>
                        </div>

                        {discoverLoading && (
                          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Carregando informações selecionadas...
                          </p>
                        )}

                        {discoverError && (
                          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {discoverError}
                          </p>
                        )}

                        {!discoverLoading && selectedCuriosityPerson && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {selectedCuriosityTopics.includes('Dados e Contato') && (
                              <DiscoverResultCard title="Dados e Contato">
                                <ContactInfo pessoa={selectedCuriosityPerson} />
                              </DiscoverResultCard>
                            )}

                            {selectedCuriosityTopics.includes('Biografia') && (
                              <DiscoverResultCard title="Biografia">
                                <div className="space-y-2">
                                  {selectedCuriosityPerson.minibio ? (
                                    <p>{selectedCuriosityPerson.minibio}</p>
                                  ) : (
                                    <p>Esta pessoa ainda não possui biografia cadastrada.</p>
                                  )}
                                </div>
                              </DiscoverResultCard>
                            )}

                            {selectedCuriosityTopics.includes('Curiosidades') && (
                              <DiscoverResultCard title="Curiosidades">
                                <div className="space-y-2">
                                  {selectedCuriosityPerson.curiosidades && (
                                    <p>{selectedCuriosityPerson.curiosidades}</p>
                                  )}
                                  {!selectedCuriosityPerson.curiosidades && (
                                    <p>Esta pessoa ainda não possui curiosidades cadastradas.</p>
                                  )}
                                </div>
                              </DiscoverResultCard>
                            )}

                            {selectedCuriosityTopics.includes('Fatos Históricos do Dia de Nascimento') && (
                              <DiscoverResultCard title="Fatos Históricos do Dia do Nascimento">
                                {discoverHistoricalInsight?.conteudo ? (
                                  <div className="space-y-2">
                                    <p className="font-semibold text-slate-900">{discoverHistoricalInsight.conteudo.title}</p>
                                    {discoverHistoricalInsight.conteudo.main_event && <p>{discoverHistoricalInsight.conteudo.main_event}</p>}
                                    <p className="font-semibold text-slate-800">
                                      {discoverHistoricalInsight.conteudo.period_title || 'O que estava acontecendo na época'}
                                    </p>
                                    {Array.isArray(discoverHistoricalInsight.conteudo.brazil?.body) && (
                                      <div>
                                        <p className="font-medium text-slate-800">{discoverHistoricalInsight.conteudo.brazil?.title || 'Brasil'}</p>
                                        {discoverHistoricalInsight.conteudo.brazil.body.map((item: string, index: number) => (
                                          <p key={`brazil-${index}`}>{item}</p>
                                        ))}
                                      </div>
                                    )}
                                    {Array.isArray(discoverHistoricalInsight.conteudo.world?.body) && (
                                      <div>
                                        <p className="font-medium text-slate-800">{discoverHistoricalInsight.conteudo.world?.title || 'Mundo'}</p>
                                        {discoverHistoricalInsight.conteudo.world.body.map((item: string, index: number) => (
                                          <p key={`world-${index}`}>{item}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p>Os acontecimentos históricos ainda não foram gerados para esta pessoa.</p>
                                )}
                              </DiscoverResultCard>
                            )}

                            {selectedCuriosityTopics.includes('O que diz a Astrologia') && (
                              <DiscoverResultCard title="O que diz a astrologia">
                                {selectedCuriosityPerson.permitir_exibir_data_nascimento === false ? (
                                  <p>Esta informação está oculta pelas preferências de privacidade.</p>
                                ) : discoverAstrologyInsight?.conteudo?.body ? (
                                  <p>{discoverAstrologyInsight.conteudo.body}</p>
                                ) : (
                                  <p>O texto de astrologia ainda não foi gerado para esta pessoa.</p>
                                )}
                              </DiscoverResultCard>
                            )}

                            {selectedCuriosityTopics.includes('Árvore Genealógica') && (
                              <DiscoverResultCard title="Árvore Genealógica">
                                <div className="space-y-3">
                                  <p>
                                    Abrir a árvore genealógica de {selectedCuriosityPerson.nome_completo} como pessoa central.
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full bg-white sm:w-auto"
                                    onClick={() => {
                                      handleOpenPersonTree(selectedCuriosityPerson.id);
                                    }}
                                  >
                                    Abrir árvore
                                  </Button>
                                </div>
                              </DiscoverResultCard>
                            )}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackToDiscoverForm}
                            className="w-full bg-white sm:w-auto"
                          >
                            Voltar
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeCuriosityTab === 'pergunte-ia' && (
                  <section>
                    <h2 className="mb-2 text-base font-semibold text-gray-900">Pergunte à IA</h2>
                    {!aiAnswer ? (
                      <Textarea
                        value={aiQuestion}
                        onChange={(event) => {
                          setAiQuestion(event.target.value);
                          setAiError(null);
                        }}
                        placeholder={AI_QUESTION_PLACEHOLDER}
                        className="min-h-[170px] w-full resize-y rounded-lg border border-slate-400 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <div className="min-h-[170px] w-full whitespace-pre-line rounded-lg border border-slate-500 bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-inner">
                        {aiAnswer}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col justify-end gap-2 sm:flex-row">
                      {aiAnswer && (
                        <Button type="button" variant="outline" onClick={handleNewAiQuestion} className="w-full bg-white sm:w-auto">
                          Nova pergunta
                        </Button>
                      )}
                      {!aiAnswer && (
                        <Button onClick={handleAskAi} disabled={!canAskAi || aiLoading} className="w-full sm:w-auto">
                          {aiLoading ? 'Perguntando...' : 'Perguntar'}
                        </Button>
                      )}
                    </div>
                    {aiError && (
                      <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {aiError}
                      </p>
                    )}
                  </section>
                )}

                {activeCuriosityTab === 'conexao' && (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Qual a minha conexão com alguém?</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Escolha duas pessoas da árvore para descobrir o parentesco e o caminho familiar entre elas.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select value={connectionPersonOneId} onValueChange={setConnectionPersonOneId}>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Pessoa 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {pessoas.map((pessoa) => (
                            <SelectItem key={pessoa.id} value={pessoa.id}>
                              {pessoa.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={connectionPersonTwoId} onValueChange={setConnectionPersonTwoId}>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Pessoa 2" />
                        </SelectTrigger>
                        <SelectContent>
                          {pessoas.map((pessoa) => (
                            <SelectItem key={pessoa.id} value={pessoa.id}>
                              {pessoa.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleDiscoverConnection}
                        disabled={!connectionPersonOneId || !connectionPersonTwoId || connectionLoading}
                        className="w-full sm:w-auto"
                      >
                        {connectionLoading ? 'Calculando...' : 'Descobrir conexão'}
                      </Button>
                    </div>
                    {connectionError && (
                      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {connectionError}
                      </p>
                    )}
                    {connectionResult && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">{connectionResult.nome || 'Conexão encontrada'}</p>
                        {connectionResult.descricao && <p className="mt-2">{connectionResult.descricao}</p>}
                        {connectionResult.descricaoContextual && (
                          <p className="mt-2 text-gray-600">{connectionResult.descricaoContextual}</p>
                        )}
                        {connectionResult.caminho && (
                          <p className="mt-3 text-xs text-gray-500">Caminho: {connectionResult.caminho}</p>
                        )}
                        {connectionResult.relacoes && (
                          <p className="mt-1 text-xs text-gray-400">Relações: {connectionResult.relacoes}</p>
                        )}
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiscoverResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
      <h4 className="mb-3 text-base font-bold text-slate-900">{title}</h4>
      {children}
    </article>
  );
}

function ContactInfo({ pessoa }: { pessoa: Pessoa }) {
  const canShowBirthDate = pessoa.permitir_exibir_data_nascimento !== false;
  const ageLabel = canShowBirthDate ? getCurrentAgeLabel(pessoa.data_nascimento) : undefined;
  const zodiacSign = canShowBirthDate ? getPersonZodiacSign(pessoa) : undefined;
  const contactItems = [
    ['Nome completo', pessoa.nome_completo],
    canShowBirthDate
      ? ['Nascimento', pessoa.data_nascimento ? String(pessoa.data_nascimento) : undefined]
      : null,
    pessoa.local_nascimento
      ? ['Local de nascimento', pessoa.local_nascimento]
      : null,
    pessoa.local_atual
      ? ['Local atual', pessoa.local_atual]
      : null,
    pessoa.data_falecimento
      ? ['Data de falecimento', String(pessoa.data_falecimento)]
      : null,
    pessoa.local_falecimento
      ? ['Local de falecimento', pessoa.local_falecimento]
      : null,
    canShowBirthDate && ageLabel
      ? ['Idade', ageLabel]
      : null,
    canShowBirthDate && zodiacSign
      ? ['Signo', zodiacSign]
      : null,
    pessoa.permitir_exibir_telefone === true || pessoa.permitir_mensagens_whatsapp === true
      ? ['Telefone', pessoa.telefone]
      : null,
    pessoa.permitir_exibir_rede_social === true || pessoa.permitir_exibir_instagram === true
      ? ['Redes sociais', pessoa.rede_social || pessoa.instagram_usuario || pessoa.instagram_url]
      : null,
    pessoa.permitir_exibir_endereco === true
      ? ['Endereço', pessoa.endereco]
      : null,
  ].filter((item): item is [string, string] => Boolean(item?.[1]));

  if (contactItems.length <= 1) {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">{pessoa.nome_completo}</p>
        <p>Esta pessoa não disponibilizou dados ou contatos para visualização.</p>
      </div>
    );
  }

  return (
    <dl className="space-y-2">
      {contactItems.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
          <dd className="text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function getCurrentAgeLabel(value?: string | number | null) {
  const birthDate = parseSimpleBirthDate(value);
  if (!birthDate || !Number.isFinite(birthDate.year)) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.year;

  if (birthDate.hasFullDate && birthDate.month && birthDate.day) {
    const hasHadBirthday =
      today.getMonth() + 1 > birthDate.month ||
      (today.getMonth() + 1 === birthDate.month && today.getDate() >= birthDate.day);
    if (!hasHadBirthday) age -= 1;
  }

  if (age < 0 || age > 130) return undefined;
  return birthDate.hasFullDate ? `${age} anos` : `aprox. ${age} anos`;
}

function parseSimpleBirthDate(value?: string | number | null) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return {
      day: Number(day),
      month: Number(month),
      year: Number(year),
      hasFullDate: true,
    };
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return {
      day: Number(day),
      month: Number(month),
      year: Number(year),
      hasFullDate: true,
    };
  }

  const year = text.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/)?.[1];
  if (!year) return null;

  return {
    year: Number(year),
    hasFullDate: false,
  };
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

function getFirstName(value?: string | null) {
  const clean = value?.trim();
  if (!clean) return 'Conta';

  const beforeEmail = clean.includes('@') ? clean.split('@')[0] : clean;
  return beforeEmail.split(/\s+/)[0] || 'Conta';
}

function UserMenu({
  isLoggedIn,
  displayName,
  firstName,
  avatarUrl,
  initials,
  notificationCount,
  isAdmin,
  onLogin,
  onHome,
  onCuriosities,
  onForum,
  onEditProfile,
  onFavorites,
  onCalendar,
  onNotifications,
  onAdmin,
  onSignOut,
}: {
  isLoggedIn: boolean;
  displayName: string;
  firstName: string;
  avatarUrl: string | null;
  initials: string;
  notificationCount: number;
  isAdmin: boolean;
  onLogin: () => void;
  onHome: () => void;
  onCuriosities: () => void;
  onForum: () => void;
  onEditProfile: () => void;
  onFavorites: () => void;
  onCalendar: () => void;
  onNotifications: () => void;
  onAdmin: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative flex min-h-12 min-w-[154px] shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title={isLoggedIn ? firstName || displayName || 'Conta do usuário' : 'Login'}
          aria-label={isLoggedIn ? `Menu de ${firstName || displayName || 'usuário'}` : 'Login'}
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
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
          <span className="min-w-0 flex-1 leading-none">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">MENU</span>
            <span className="mt-1 block whitespace-nowrap text-sm font-semibold text-gray-800">
              {isLoggedIn ? firstName : 'Login'}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {!isLoggedIn ? (
          <DropdownMenuItem onClick={onLogin}>
            <LogIn className="h-4 w-4" />
            Login
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onHome}>
              <HomeIcon className="h-4 w-4" />
              Página Inicial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCuriosities}>
              <Sparkles className="h-4 w-4" />
              Curiosidades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onForum}>
              <MessageCircle className="h-4 w-4" />
              Fórum
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFavorites}>
              <Star className="h-4 w-4" />
              Meus favoritos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCalendar}>
              <CalendarDays className="h-4 w-4" />
              Calendário familiar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNotifications}>
              <Bell className="h-4 w-4" />
              Notificações
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={onAdmin}>
                <Settings className="h-4 w-4" />
                Painel administrativo
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEditProfile} className="py-1 text-xs text-gray-600">
              <Pencil className="h-3.5 w-3.5" />
              Atualizar Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNotifications} className="py-1 text-xs text-gray-600">
              <Bell className="h-3.5 w-3.5" />
              Editar Notificações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut} variant="destructive" className="py-1 text-xs">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SIDEBAR_PANEL_OPTIONS: Array<{ key: SidebarPanel; label: string }> = [
  { key: 'filters', label: 'Filtros' },
  { key: 'legend', label: 'Legendas' },
  { key: 'info', label: 'Informações' },
];

function SidebarPanelTabs({
  activePanel,
  onChange,
}: {
  activePanel: SidebarPanel;
  onChange: (panel: SidebarPanel) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      {SIDEBAR_PANEL_OPTIONS.map((option) => {
        const active = activePanel === option.key;

        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            aria-label={option.key === 'info' ? 'Informações' : undefined}
            title={option.key === 'info' ? 'Informações' : undefined}
            onClick={() => onChange(option.key)}
            className={[
              'flex min-h-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors',
              active
                ? 'bg-white text-gray-950 shadow-sm'
                : 'text-gray-500 hover:bg-white/70 hover:text-gray-800',
            ].join(' ')}
          >
            {option.key === 'info' ? <CircleEllipsis className="h-4 w-4" /> : option.label}
          </button>
        );
      })}
    </div>
  );
}

function SidebarInfoPanel({
  onSavePdf,
  onSaveImage,
  onPrint,
  onWhatsApp,
}: {
  onSavePdf: () => void;
  onSaveImage: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Informações da árvore</h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Ações para exportar ou compartilhar a visualização atual da árvore.
        </p>
      </div>

      <div className="space-y-2">
        <SidebarActionButton icon={FileDown} label="Salvar como PDF" onClick={onSavePdf} />
        <SidebarActionButton icon={ImageDown} label="Salvar como Imagem" onClick={onSaveImage} />
        <SidebarActionButton icon={Printer} label="Imprimir" onClick={onPrint} />
        <SidebarActionButton icon={MessageCircle} label="Enviar WhatsApp" onClick={onWhatsApp} />
      </div>
    </section>
  );
}

function SidebarActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-500" />
      <span>{label}</span>
    </button>
  );
}

function FilterPanel({
  personFilters,
  edgeFilters,
  directRelativeFilters,
  directRelationCounts,
  showDirectRelativeFilters,
  onTogglePerson,
  onToggleEdge,
  onToggleDirect,
}: {
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

      {showDirectRelativeFilters && (
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

type CityCuriosity = {
  city: string;
  count: number;
  people: string[];
};

function CuriosityList({ title, items }: { title: string; items: CityCuriosity[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2">
        {items.length > 0 ? items.map((item) => (
          <div
            key={item.city}
            className="group relative flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            title={`${item.city}\n${item.people.join('\n')}`}
          >
            <span className="truncate text-gray-600">{item.city}</span>
            <span className="font-semibold text-gray-900">{item.count}</span>
            <div className="pointer-events-none absolute left-3 right-3 top-[calc(100%+0.35rem)] z-20 hidden rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg group-hover:block">
              <p className="font-semibold text-gray-900">{item.city}</p>
              <p className="mt-1 text-gray-500">Pessoas:</p>
              <ul className="mt-1 space-y-1">
                {item.people.slice(0, 10).map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
              {item.people.length > 10 && (
                <p className="mt-2 font-medium text-gray-600">+ {item.people.length - 10} pessoas</p>
              )}
            </div>
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

  const currentCities = countCityPeople(
    humans.filter((pessoa) => !hasDeathDate(pessoa.data_falecimento)),
    (pessoa) => pessoa.local_atual
  );
  const birthCities = countCityPeople(humans, (pessoa) => pessoa.local_nascimento);
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

function countCityPeople(people: Pessoa[], getLocation: (pessoa: Pessoa) => string | undefined | null): CityCuriosity[] {
  const counts = new Map<string, string[]>();
  people.forEach((pessoa) => {
    const normalized = getLocation(pessoa)?.trim();
    if (!normalized) return;
    const names = counts.get(normalized) || [];
    counts.set(normalized, [...names, pessoa.nome_completo]);
  });

  return Array.from(counts.entries())
    .map(([city, people]) => ({ city, count: people.length, people: people.sort((a, b) => a.localeCompare(b)) }))
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
  selectedCuriosityPerson,
  selectedCuriosityTopics,
}: {
  pessoas: Pessoa[];
  relacionamentos: Relacionamento[];
  stats: Record<string, unknown>;
  curiosities: ReturnType<typeof calculateCuriosities>;
  centralPersonId?: string;
  centralPersonName: string;
  directRelationCounts: DirectRelationCounts;
  selectedCuriosityPerson?: Pessoa;
  selectedCuriosityTopics: CuriosityTopic[];
}) {
  return {
    pessoaCentral: {
      id: centralPersonId,
      nome: centralPersonName,
    },
    consultaCuriosidades: {
      pessoaSelecionada: selectedCuriosityPerson
        ? {
            id: selectedCuriosityPerson.id,
            nome: selectedCuriosityPerson.nome_completo,
            nascimento: selectedCuriosityPerson.data_nascimento,
            falecimento: selectedCuriosityPerson.data_falecimento,
            localNascimento: selectedCuriosityPerson.local_nascimento,
            localAtual: selectedCuriosityPerson.local_atual,
            telefone: selectedCuriosityPerson.telefone,
            redeSocial: selectedCuriosityPerson.instagram_usuario || selectedCuriosityPerson.instagram_url || selectedCuriosityPerson.rede_social,
            bio: selectedCuriosityPerson.minibio,
            curiosidades: selectedCuriosityPerson.curiosidades,
          }
        : null,
      topicosDesejados: selectedCuriosityTopics,
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

const GENEALOGY_FILTER_OPTIONS: Array<{
  key: GenealogyFilterKey;
  label: string;
  colorKey: keyof typeof DIRECT_FAMILY_RELATION_COLORS;
}> = [
  { key: 'generation1', label: 'Geração 1', colorKey: 'tataravos' },
  { key: 'generation2', label: 'Geração 2', colorKey: 'bisavos' },
  { key: 'generation3Family', label: 'Geração 3 - Familiares', colorKey: 'avos' },
  { key: 'generation3Spouses', label: 'Geração 3 - Cônjuges', colorKey: 'tios' },
  { key: 'generation4Family', label: 'Geração 4 - Familiares', colorKey: 'primos' },
  { key: 'generation4Spouses', label: 'Geração 4 - Cônjuges', colorKey: 'conjuge' },
  { key: 'generation5Family', label: 'Geração 5 - Familiares', colorKey: 'irmaos' },
  { key: 'generation5Spouses', label: 'Geração 5 - Cônjuges', colorKey: 'sobrinhos' },
  { key: 'generation6', label: 'Geração 6', colorKey: 'filhos' },
];

function GenealogyFilterGrid({
  filters,
  onToggle,
}: {
  filters: GenealogyFilters;
  onToggle: (key: GenealogyFilterKey) => void;
}) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Filtros</h2>
      <p className="mb-2 text-xs leading-snug text-gray-500">
        Clique nos cards abaixo para exibir ou ocultar gerações na genealogia.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {GENEALOGY_FILTER_OPTIONS.map((option) => {
          const active = filters[option.key];
          const color = DIRECT_FAMILY_RELATION_COLORS[option.colorKey];

          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.key)}
              className={[
                'min-h-[54px] rounded-lg border p-2 text-left shadow-sm transition',
                active ? 'opacity-100' : 'grayscale opacity-45',
                'hover:-translate-y-0.5 hover:shadow-md',
              ].join(' ')}
              style={{
                background: color.background,
                borderColor: color.solid,
                color: DIRECT_FAMILY_CARD_TEXT_COLORS.primary,
              }}
              title={active ? `Ocultar ${option.label}` : `Mostrar ${option.label}`}
            >
              <span className="block text-xs font-semibold leading-snug">{option.label}</span>
              <span className="mt-1 block text-[11px] font-medium leading-none">
                {active ? 'Ativo' : 'Oculto'}
              </span>
            </button>
          );
        })}
      </div>
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
  const directStatusFilterCardColors = {
    vivos: {
      background: '#F8FAFC',
      color: '#334155',
      border: '#CBD5E1',
    },
    falecidos: {
      background: '#F8FAFC',
      color: '#334155',
      border: '#CBD5E1',
    },
  } as const;

  const items = [
    {
      key: 'vivos' as const,
      label: 'Vivos',
      value: vivos,
      ...directStatusFilterCardColors.vivos,
    },
    {
      key: 'falecidos' as const,
      label: 'Falecidos',
      value: falecidos,
      ...directStatusFilterCardColors.falecidos,
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
                active ? 'opacity-100' : 'grayscale opacity-45',
                'hover:-translate-y-0.5 hover:shadow-md',
              ].join(' ')}
              style={{
                backgroundColor: item.background,
                borderColor: item.border,
                color: item.color,
              }}
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
  colorKey: keyof typeof DIRECT_FAMILY_RELATION_COLORS;
}> = [
  { key: 'tataravos', label: 'Tataravós', colorKey: 'tataravos' },
  { key: 'bisavos', label: 'Bisavós', colorKey: 'bisavos' },
  { key: 'avos', label: 'Avós', colorKey: 'avos' },
  { key: 'tios', label: 'Tios', colorKey: 'tios' },
  { key: 'pais', label: 'Pai e Mãe', colorKey: 'pais' },
  { key: 'primos', label: 'Primos', colorKey: 'primos' },
  { key: 'conjuge', label: 'Cônjuge', colorKey: 'conjuge' },
  { key: 'irmaos', label: 'Irmãos', colorKey: 'irmaos' },
  { key: 'filhos', label: 'Filhos', colorKey: 'filhos' },
  { key: 'sobrinhos', label: 'Sobrinhos', colorKey: 'sobrinhos' },
  { key: 'netos', label: 'Netos', colorKey: 'netos' },
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
        const color = DIRECT_FAMILY_RELATION_COLORS[option.colorKey];

        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(option.key)}
            className={[
              'min-h-[54px] rounded-lg border p-2 text-left shadow-sm transition',
              active ? 'opacity-100' : 'grayscale opacity-45',
              disabled ? 'cursor-not-allowed opacity-35' : 'hover:-translate-y-0.5 hover:shadow-md',
            ].join(' ')}
            style={{
              background: color.background,
              borderColor: color.solid,
              color: DIRECT_FAMILY_CARD_TEXT_COLORS.primary,
            }}
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
  const borderItems = [
    {
      label: 'Pessoas vivas',
      sample: (
        <span
          className="h-5 w-10 rounded-md bg-white"
          style={{ border: `3px solid ${DIRECT_FAMILY_STATUS_BORDER_COLORS.alive}` }}
        />
      ),
    },
    {
      label: 'Pessoas falecidas',
      sample: (
        <span
          className="h-5 w-10 rounded-md bg-white"
          style={{ border: `3px solid ${DIRECT_FAMILY_STATUS_BORDER_COLORS.deceased}` }}
        />
      ),
    },
  ];

  const lineItems = [
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

  const backgroundItems = DIRECT_FAMILY_LEGEND_BACKGROUNDS;

  return (
    <section className={compact ? '' : 'rounded-lg border border-gray-200 bg-gray-50 p-3'}>
      {!compact && <h2 className="mb-3 text-sm font-semibold text-gray-900">Legendas</h2>}
      <div className={compact ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'space-y-2'}>
        {!compact && (
          <p className="text-[11px] font-semibold uppercase tracking-normal text-gray-500">Bordas dos cards</p>
        )}
        {borderItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] text-gray-600">
            <span className="flex w-10 shrink-0 items-center justify-center">{item.sample}</span>
            <span className="truncate">{item.label}</span>
          </div>
        ))}
        {!compact && (
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-normal text-gray-500">Linhas</p>
        )}
        {lineItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2 text-[11px] text-gray-600">
            <span className="flex w-10 shrink-0 items-center justify-center">{item.sample}</span>
            <span className="truncate">{item.label}</span>
          </div>
        ))}
        {!compact && (
          <>
            <p className="pt-2 text-[11px] font-semibold uppercase tracking-normal text-gray-500">Fundos dos cards</p>
            <div className="grid grid-cols-2 gap-1.5">
              {backgroundItems.map((item) => (
                <div key={item.label} className="flex min-w-0 items-center gap-1.5 text-[11px] text-gray-600">
                  <span
                    className="h-4 w-7 shrink-0 rounded border"
                    style={{
                      background: item.background,
                      borderColor: item.solid,
                    }}
                  />
                  <span className="leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
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
