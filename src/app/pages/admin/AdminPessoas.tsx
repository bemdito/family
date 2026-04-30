import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
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
  User
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function AdminPessoas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'humano' | 'pet'>('todos');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const pessoasFiltradas = (Array.isArray(pessoas) ? pessoas : [])
    .filter(p => {
      // Filtro de busca
      const matchSearch = p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.local_nascimento?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de tipo
      const matchType = filter === 'todos' || 
        (filter === 'humano' && p.humano_ou_pet === 'Humano') ||
        (filter === 'pet' && p.humano_ou_pet === 'Pet');
      
      return matchSearch && matchType;
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
              
              <div className="flex gap-2">
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
              </div>
            </div>
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
    </div>
  );
}