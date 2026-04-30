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
} from '../components/FamilyTree/utils/treePreferences';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  obterTodasPessoas,
  obterTodosRelacionamentos,
  buscarPessoas,
} from '../services/dataService';
import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../types';
import {
  GenerationColumnMeta,
  MarriageNodeDetails,
} from '../components/FamilyTree/types';
import { useAuth } from '../contexts/AuthContext';
import { getPrimaryLinkedPerson } from '../services/memberProfileService';
import {
  Search,
  Users,
  Home as HomeIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Heart,
  Activity,
  Monitor,
  CalendarDays,
  Star,
  Bell,
  UserCircle2,
  Focus,
  LogIn,
} from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>();
  const [linkedPersonId, setLinkedPersonId] = useState<string | undefined>();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [pessoasFiltradas, setPessoasFiltradas] = useState<Pessoa[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<TipoVisualizacaoArvore>('lados');
  const [activeGeneration, setActiveGeneration] = useState(0);
  const [generationColumns, setGenerationColumns] = useState<GenerationColumnMeta[]>([]);
  const [desktopNoticeDismissed, setDesktopNoticeDismissed] = useState(false);

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
    if (isMobile && viewMode !== 'geracoes') {
      setViewMode('geracoes');
      return;
    }

    storeViewMode(viewMode);
  }, [viewMode, isMobile]);

  useEffect(() => {
    storeActiveGeneration(activeGeneration);
  }, [activeGeneration]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [pessoasData, relacionamentosData] = await Promise.all([
          obterTodasPessoas(),
          obterTodosRelacionamentos(),
        ]);

        setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
        setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
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
      } catch (error) {
        console.error('Erro ao carregar vínculo do membro:', error);
        setLinkedPersonId(undefined);
      }
    };

    loadLinkedPerson();
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

  const pessoasVisiveis = useMemo(() => {
    return pessoas.filter((pessoa) => {
      if (pessoa.humano_ou_pet === 'Pet') {
        return personFilters.pets;
      }

      if (pessoa.data_falecimento) {
        return personFilters.falecidos;
      }

      return personFilters.vivos;
    });
  }, [pessoas, personFilters]);

  const stats = useMemo(() => {
    const pessoasVivas = pessoas.filter((p) => p.humano_ou_pet === 'Humano' && !p.data_falecimento);
    const pessoasFalecidas = pessoas.filter((p) => p.humano_ou_pet === 'Humano' && p.data_falecimento);
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
    () => (isMobile ? ['geracoes'] : ['lados', 'geracoes']),
    [isMobile]
  );

  const canNavigateGenerations = isMobile && viewMode === 'geracoes' && generationColumns.length > 0;
  const activeGenerationMeta = generationColumns.find((column) => column.level === activeGeneration);
  const maxGenerationIndex = generationColumns.length - 1;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>

            <div>
              <h1 className="font-bold text-xl text-gray-900">Árvore Genealógica</h1>
              <p className="text-sm text-gray-500">Família Limeira Souza</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex items-center gap-2 flex-wrap">
              <ViewModeToggle
                value={viewMode}
                onChange={handleViewModeChange}
                availableModes={availableModes}
              />

              {user ? (
                <Link to="/minha-arvore">
                  <Button variant="outline" size="icon" title="Minha área">
                    <UserCircle2 className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/entrar">
                  <Button variant="outline" size="icon" title="Entrar">
                    <LogIn className="w-4 h-4" />
                  </Button>
                </Link>
              )}

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

              <Link to="/notificacoes">
                <Button variant="outline" size="icon" title="Notificações">
                  <Bell className="w-4 h-4" />
                </Button>
              </Link>

              <Button variant="outline" size="icon" onClick={() => navigate('/')} title="Voltar para a árvore">
                <HomeIcon className="w-4 h-4" />
              </Button>

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

              {!isMobile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  title={sidebarOpen ? 'Ocultar painel lateral' : 'Exibir painel lateral'}
                >
                  {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              )}
            </div>

            <div className="relative w-full lg:w-80 max-w-full">
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
          </div>
        </div>
      </header>

      {/* resto do arquivo permanece igual ao atual, sem mudar a lógica da árvore */}
      {/* mantenha todo o conteúdo abaixo como já está no arquivo atual */}
    </div>
  );
}
