import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { obterTodasPessoas, deletarPessoa } from '../../services/dataService';
import { Pessoa } from '../../types';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Home,
  Dog,
  User,
  SlidersHorizontal
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { includesNormalizedText } from '../../utils/searchText';
import { isPersonDeceased } from '../../utils/personFields';

type AdvancedFilters = {
  status: Array<'vivos' | 'falecidos'>;
  foto: Array<'com_foto' | 'sem_foto'>;
  geracao: Array<'1' | '2' | '3' | '4' | '5' | '6' | '7' | 'sem_manual'>;
  dadosIncompletos: Array<'sem_data_nascimento' | 'sem_local_nascimento' | 'sem_local_atual'>;
  contato: Array<'com_telefone' | 'sem_telefone' | 'com_rede_social' | 'sem_rede_social'>;
};

type AdvancedFilterKey = keyof AdvancedFilters;
type AdvancedFilterValue<TKey extends AdvancedFilterKey> = AdvancedFilters[TKey][number];

const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  status: [],
  foto: [],
  geracao: [],
  dadosIncompletos: [],
  contato: [],
};

const ADVANCED_FILTER_GROUPS: Array<{
  key: AdvancedFilterKey;
  title: string;
  options: Array<{ value: AdvancedFilters[AdvancedFilterKey][number]; label: string }>;
}> = [
  {
    key: 'status',
    title: 'Status',
    options: [
      { value: 'vivos', label: 'Vivos' },
      { value: 'falecidos', label: 'Falecidos' },
    ],
  },
  {
    key: 'foto',
    title: 'Foto',
    options: [
      { value: 'com_foto', label: 'Com foto' },
      { value: 'sem_foto', label: 'Sem foto' },
    ],
  },
  {
    key: 'geracao',
    title: 'Geração',
    options: [
      { value: '1', label: 'Geração 1' },
      { value: '2', label: 'Geração 2' },
      { value: '3', label: 'Geração 3' },
      { value: '4', label: 'Geração 4' },
      { value: '5', label: 'Geração 5' },
      { value: '6', label: 'Geração 6' },
      { value: '7', label: 'Geração 7' },
      { value: 'sem_manual', label: 'Sem geração manual' },
    ],
  },
  {
    key: 'dadosIncompletos',
    title: 'Dados incompletos',
    options: [
      { value: 'sem_data_nascimento', label: 'Sem data de nascimento' },
      { value: 'sem_local_nascimento', label: 'Sem local de nascimento' },
      { value: 'sem_local_atual', label: 'Sem local atual' },
    ],
  },
  {
    key: 'contato',
    title: 'Contato',
    options: [
      { value: 'com_telefone', label: 'Com telefone' },
      { value: 'sem_telefone', label: 'Sem telefone' },
      { value: 'com_rede_social', label: 'Com rede social/site' },
      { value: 'sem_rede_social', label: 'Sem rede social/site' },
    ],
  },
];

function countAdvancedFilters(filters: AdvancedFilters) {
  return Object.values(filters).reduce((total, values) => total + values.length, 0);
}

function cloneAdvancedFilters(filters: AdvancedFilters): AdvancedFilters {
  return {
    status: [...filters.status],
    foto: [...filters.foto],
    geracao: [...filters.geracao],
    dadosIncompletos: [...filters.dadosIncompletos],
    contato: [...filters.contato],
  };
}

function hasValue(value?: string | number | null) {
  return String(value ?? '').trim().length > 0;
}

function matchesAny<T extends string>(selected: T[], predicate: (value: T) => boolean) {
  return selected.length === 0 || selected.some(predicate);
}

function matchesAdvancedFilters(pessoa: Pessoa, filters: AdvancedFilters) {
  const isFalecido = isPersonDeceased(pessoa);
  const hasPhoto = hasValue(pessoa.foto_principal_url);
  const generation = typeof pessoa.manual_generation === 'number' ? String(pessoa.manual_generation) : '';
  const hasTelefone = hasValue(pessoa.telefone);
  const hasRedeSocial = hasValue(pessoa.rede_social) || hasValue(pessoa.instagram_usuario) || hasValue(pessoa.instagram_url);

  return (
    matchesAny(filters.status, (status) => status === 'falecidos' ? isFalecido : !isFalecido) &&
    matchesAny(filters.foto, (foto) => foto === 'com_foto' ? hasPhoto : !hasPhoto) &&
    matchesAny(filters.geracao, (selectedGeneration) => (
      selectedGeneration === 'sem_manual'
        ? !hasValue(pessoa.manual_generation)
        : generation === selectedGeneration
    )) &&
    matchesAny(filters.dadosIncompletos, (field) => {
      if (field === 'sem_data_nascimento') return !hasValue(pessoa.data_nascimento);
      if (field === 'sem_local_nascimento') return !hasValue(pessoa.local_nascimento);
      return !hasValue(pessoa.local_atual);
    }) &&
    matchesAny(filters.contato, (contactFilter) => {
      if (contactFilter === 'com_telefone') return hasTelefone;
      if (contactFilter === 'sem_telefone') return !hasTelefone;
      if (contactFilter === 'com_rede_social') return hasRedeSocial;
      return !hasRedeSocial;
    })
  );
}

export function AdminPessoas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'humano' | 'pet'>('todos');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeAdvancedFilterCount = countAdvancedFilters(advancedFilters);

  useEffect(() => {
    loadPessoas();
  }, []);

  const loadPessoas = async () => {
    setLoading(true);
    const data = await obterTodasPessoas();
    // Garantir que sempre seja um array
    setPessoas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const success = await deletarPessoa(deleteId);
    
    if (success) {
      await loadPessoas();
      setDeleteId(null);
    } else {
      alert('Erro ao deletar pessoa. Tente novamente.');
    }
    setIsDeleting(false);
  };

  const openFilters = () => {
    setDraftAdvancedFilters(cloneAdvancedFilters(advancedFilters));
    setFiltersOpen(true);
  };

  const toggleDraftFilter = <TKey extends AdvancedFilterKey>(
    key: TKey,
    value: AdvancedFilterValue<TKey>,
    checked: boolean
  ) => {
    setDraftAdvancedFilters((current) => {
      const currentValues = current[key] as Array<AdvancedFilterValue<TKey>>;
      const nextValues = checked
        ? Array.from(new Set([...currentValues, value]))
        : currentValues.filter((currentValue) => currentValue !== value);

      return {
        ...current,
        [key]: nextValues,
      };
    });
  };

  const clearAdvancedFilters = () => {
    const emptyFilters = cloneAdvancedFilters(EMPTY_ADVANCED_FILTERS);
    setDraftAdvancedFilters(emptyFilters);
    setAdvancedFilters(emptyFilters);
  };

  const applyAdvancedFilters = () => {
    setAdvancedFilters(cloneAdvancedFilters(draftAdvancedFilters));
    setFiltersOpen(false);
  };

  const pessoasFiltradas = (Array.isArray(pessoas) ? pessoas : [])
    .filter(p => {
      // Filtro de busca
      const matchSearch =
        includesNormalizedText(p.nome_completo, searchTerm) ||
        includesNormalizedText(p.local_nascimento, searchTerm) ||
        includesNormalizedText(p.local_atual, searchTerm) ||
        includesNormalizedText(p.local_falecimento, searchTerm);
      
      // Filtro de tipo
      const matchType = filter === 'todos' || 
        (filter === 'humano' && p.humano_ou_pet === 'Humano') ||
        (filter === 'pet' && p.humano_ou_pet === 'Pet');
      
      return matchSearch && matchType && matchesAdvancedFilters(p, advancedFilters);
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-gray-900">Gerenciar Pessoas</h1>
          </div>
          
          <Button onClick={() => navigate('/admin/pessoas/nova')}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pessoa
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === 'todos' ? 'default' : 'outline'}
                  onClick={() => setFilter('todos')}
                >
                  Todos ({pessoas.length})
                </Button>
                <Button
                  variant={filter === 'humano' ? 'default' : 'outline'}
                  onClick={() => setFilter('humano')}
                >
                  Humanos ({pessoas.filter(p => p.humano_ou_pet === 'Humano').length})
                </Button>
                <Button
                  variant={filter === 'pet' ? 'default' : 'outline'}
                  onClick={() => setFilter('pet')}
                >
                  Pets ({pessoas.filter(p => p.humano_ou_pet === 'Pet').length})
                </Button>
                <Button variant="outline" onClick={openFilters}>
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                  {activeAdvancedFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {activeAdvancedFilterCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            {activeAdvancedFilterCount > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <span>{activeAdvancedFilterCount} filtro(s) avançado(s) ativo(s).</span>
                <Button variant="ghost" size="sm" onClick={clearAdvancedFilters} className="h-8 text-blue-800 hover:bg-blue-100">
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* People List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {pessoasFiltradas.length} {pessoasFiltradas.length === 1 ? 'Pessoa' : 'Pessoas'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pessoasFiltradas.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma pessoa encontrada
                </p>
              ) : (
                pessoasFiltradas.map((pessoa) => (
                  <div
                    key={pessoa.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        pessoa.humano_ou_pet === 'Pet' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        {pessoa.humano_ou_pet === 'Pet' ? (
                          <Dog className="w-5 h-5 text-amber-700" />
                        ) : (
                          <User className="w-5 h-5 text-blue-700" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{pessoa.nome_completo}</h3>
                        <p className="text-sm text-gray-500">
                          {pessoa.data_nascimento && `Nascimento: ${pessoa.data_nascimento}`}
                          {pessoa.local_nascimento && ` • ${pessoa.local_nascimento}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/pessoas/${pessoa.id}/editar`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(pessoa.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir pessoa"
        description={`Tem certeza que deseja excluir "${pessoas.find(p => p.id === deleteId)?.nome_completo}"? Esta ação não pode ser desfeita e todos os relacionamentos desta pessoa também serão removidos.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        variant="danger"
        loading={isDeleting}
      />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
            <DialogDescription>
              Refine a lista de pessoas sem fazer novas consultas ao banco.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {ADVANCED_FILTER_GROUPS.map((group) => (
              <section key={group.key} className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
                <div className="mt-3 space-y-3">
                  {group.options.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 text-sm text-gray-700">
                      <Checkbox
                        checked={draftAdvancedFilters[group.key].includes(option.value as never)}
                        onCheckedChange={(checked) => {
                          toggleDraftFilter(
                            group.key,
                            option.value as never,
                            checked === true
                          );
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={clearAdvancedFilters}>
              Limpar filtros
            </Button>
            <Button onClick={applyAdvancedFilters}>
              Aplicar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
