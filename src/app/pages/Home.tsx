import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';

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
import { obterTodasPessoas, obterTodosRelacionamentos, buscarPessoas } from '../services/dataService';
import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../types';
import { GenerationColumnMeta, MarriageNodeDetails } from '../components/FamilyTree/types';
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
} from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>();
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

      {isMobile && !desktopNoticeDismissed && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-amber-700 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Visualização adaptada para mobile</p>
                <p className="text-xs text-amber-800">
                  Para explorar a árvore completa com mais conforto, prefira o desktop.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissDesktopNotice}
              className="text-amber-700 hover:text-amber-900 transition-colors"
              aria-label="Fechar aviso"
            >
              <Monitor className="w-4 h-4 opacity-0 absolute" />
              <span className="sr-only">Fechar</span>
              ×
            </button>
          </div>
        </div>
      )}

      {canNavigateGenerations && (
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveGeneration((prev) => Math.max(prev - 1, 0))}
              disabled={activeGeneration <= 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                {activeGenerationMeta?.label || `Geração ${activeGeneration + 1}`}
              </p>
              <p className="text-xs text-gray-500">
                Coluna {activeGeneration + 1} de {generationColumns.length}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setActiveGeneration((prev) => Math.min(prev + 1, maxGenerationIndex))}
              disabled={activeGeneration >= maxGenerationIndex}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex relative overflow-hidden">
        {!isMobile && (
          <div
            className={`transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-lg overflow-y-auto ${
              sidebarOpen ? 'w-80' : 'w-0'
            }`}
          >
            {sidebarOpen && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Informações Gerais</h2>
                  <p className="text-sm text-gray-500">Estatísticas da família</p>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Visualização ativa</p>
                  <p className="mt-1 text-sm text-blue-900">
                    {viewMode === 'lados'
                      ? 'Modo legado organizado por lados.'
                      : 'Novo modo organizado por gerações.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">{stats.totalPessoas}</p>
                        <p className="text-sm text-blue-600">Total de membros</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700">{stats.pessoasVivas}</p>
                        <p className="text-sm text-green-600">Pessoas vivas</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-700">{stats.casados}</p>
                        <p className="text-sm text-purple-600">Pessoas casadas</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🐾</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-700">{stats.pets}</p>
                        <p className="text-sm text-amber-600">Pets da família</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-cyan-700">{stats.cidadesAtuais}</p>
                        <p className="text-sm text-cyan-600">Cidades atuais</p>
                      </div>
                    </div>
                  </div>
                </div>

                {stats.cidadesNascimento.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Principais cidades de nascimento
                    </h3>
                    <div className="space-y-2">
                      {stats.cidadesNascimento.map(([cidade, count]) => (
                        <div key={cidade} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 font-medium">{cidade}</span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Outros dados</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Pessoas falecidas:</span>
                      <span className="font-semibold text-gray-900">{stats.pessoasFalecidas}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 relative overflow-hidden h-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Carregando árvore genealógica...</p>
              </div>
            </div>
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
              viewMode={isMobile ? 'geracoes' : viewMode}
              activeGeneration={activeGeneration}
              isMobile={isMobile}
              onGenerationColumnsChange={setGenerationColumns}
            />
          )}
        </main>
      </div>

      <div
        className={[
          'absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm transition-all',
          isMobile ? 'bottom-4 left-4 right-4' : '',
        ].join(' ')}
        style={isMobile ? undefined : { bottom: '24px', left: sidebarOpen ? '344px' : '24px' }}
      >
        <div className="p-4">
          <button
            type="button"
            onClick={() => setLegendOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3"
          >
            <h3 className="font-semibold text-sm text-gray-900">Legenda e filtros</h3>
            {legendOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {legendOpen && (
            <>
              <div className="mt-4 mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Tipos de Linhas:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={edgeFilters.conjugal}
                      onChange={() => toggleFilter('conjugal')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="w-6 h-0.5 bg-emerald-500"></div>
                    <span className="text-xs text-gray-700">Relacionamento conjugal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={edgeFilters.filiacao_sangue}
                      onChange={() => toggleFilter('filiacao_sangue')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="w-6 h-1 border-t-2 border-dashed border-emerald-500"></div>
                    <span className="text-xs text-gray-700">Filiação (sangue)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={edgeFilters.filiacao_adotiva}
                      onChange={() => toggleFilter('filiacao_adotiva')}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="w-6 h-1 border-t-2 border-dashed border-purple-600"></div>
                    <span className="text-xs text-gray-700">Filiação (adotiva)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={edgeFilters.irmaos}
                      onChange={() => toggleFilter('irmaos')}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="w-6 h-1 border-t-2 border-dashed border-orange-500"></div>
                    <span className="text-xs text-gray-700">Irmãos</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Filtrar por tipo:</p>
                <div className="space-y-2">
                  <button
                    onClick={() => togglePersonFilter('vivos')}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                      personFilters.vivos
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-100 border-2 border-transparent opacity-50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md border-2 border-blue-500 bg-white"></div>
                    <span className="text-xs text-gray-700 font-medium">Pessoa viva</span>
                  </button>

                  <button
                    onClick={() => togglePersonFilter('falecidos')}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                      personFilters.falecidos
                        ? 'bg-purple-50 border-2 border-purple-500'
                        : 'bg-gray-100 border-2 border-transparent opacity-50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md border-2 border-purple-500 bg-white"></div>
                    <span className="text-xs text-gray-700 font-medium">Pessoa falecida</span>
                  </button>

                  <button
                    onClick={() => togglePersonFilter('pets')}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                      personFilters.pets
                        ? 'bg-yellow-50 border-2 border-yellow-500'
                        : 'bg-gray-100 border-2 border-transparent opacity-50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md border-2 border-yellow-500 bg-white"></div>
                    <span className="text-xs text-gray-700 font-medium">Pet</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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