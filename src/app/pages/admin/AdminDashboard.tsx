import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { obterTodasPessoas, obterTodosRelacionamentos } from '../../services/dataService';
import { getActivityActionLabel, getActivitySummary, listRecentActivityLogs } from '../../services/activityLogService';
import { listPendingRelationshipChangeRequests } from '../../services/relationshipChangeRequestService';
import { ActivityLog } from '../../types';
import { isPersonDeceased } from '../../utils/personFields';
import {
  Users,
  Link2,
  Settings,
  Home,
  PlusCircle,
  BarChart3,
  Clock,
  GitPullRequest,
  ShieldCheck,
  Bell,
} from 'lucide-react';

type Pessoa = {
  id: string;
  nome_completo: string;
  local_nascimento?: string | null;
  humano_ou_pet?: 'Humano' | 'Pet' | string;
  data_falecimento?: string | null;
  local_falecimento?: string | null;
  falecido?: boolean | null;
};

type Relacionamento = {
  id: string;
  tipo_relacionamento?: string;
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState<ActivityLog[]>([]);
  const [pendingRelationshipRequests, setPendingRelationshipRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [pessoasData, relacionamentosData, atividadesData, pendingRequestsData] = await Promise.all([
          obterTodasPessoas(),
          obterTodosRelacionamentos(),
          listRecentActivityLogs(5),
          listPendingRelationshipChangeRequests({ limit: 1000 }),
        ]);

        setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
        setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);
        setAtividadesRecentes(Array.isArray(atividadesData) ? atividadesData : []);
        setPendingRelationshipRequests(Array.isArray(pendingRequestsData) ? pendingRequestsData.length : 0);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        setPessoas([]);
        setRelacionamentos([]);
        setAtividadesRecentes([]);
        setPendingRelationshipRequests(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const stats = {
    totalPessoas: pessoas.length,
    totalHumanos: pessoas.filter((p) => p.humano_ou_pet === 'Humano').length,
    totalPets: pessoas.filter((p) => p.humano_ou_pet === 'Pet').length,
    totalFalecidos: pessoas.filter((p) => isPersonDeceased(p)).length,
    totalRelacionamentos: relacionamentos.length,
    pendingRelationshipRequests,
    totalCasamentos: Math.floor(
      relacionamentos.filter((r) => r.tipo_relacionamento === 'conjuge').length / 2
    ),
  };

  const quickActions = [
    {
      title: 'Adicionar Pessoa',
      description: 'Cadastrar novo membro',
      icon: PlusCircle,
      onClick: () => navigate('/admin/pessoas/nova'),
      color: 'bg-blue-500',
    },
    {
      title: 'Ver Pessoas',
      description: 'Listar todos os membros',
      icon: Users,
      onClick: () => navigate('/admin/pessoas'),
      color: 'bg-emerald-500',
    },
    {
      title: 'Relacionamentos',
      description: 'Gerenciar vínculos',
      icon: Link2,
      onClick: () => navigate('/admin/relacionamentos'),
      color: 'bg-purple-500',
    },
    {
      title: 'Solicitações de vínculos',
      description: `${stats.pendingRelationshipRequests} pendente(s)`,
      icon: GitPullRequest,
      onClick: () => navigate('/admin/solicitacoes-vinculos'),
      color: 'bg-amber-600',
    },
    {
      title: 'Histórico',
      description: 'Ver atividades recentes',
      icon: Clock,
      onClick: () => navigate('/admin/atividades'),
      color: 'bg-slate-800',
    },
    {
      title: 'Notificações',
      description: 'Diagnóstico e envios',
      icon: Bell,
      onClick: () => navigate('/admin/notificacoes'),
      color: 'bg-blue-700',
    },
    {
      title: 'Integridade dos dados',
      description: 'Diagnóstico da base',
      icon: ShieldCheck,
      onClick: () => navigate('/admin/integridade'),
      color: 'bg-cyan-700',
    },
  ];

  const pessoasRecentes = pessoas.slice(0, 5);

  const formatActivityDate = (value?: string) => {
    if (!value) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>

            <div>
              <h1 className="font-bold text-xl text-gray-900">Painel Administrativo</h1>
              <p className="text-sm text-gray-500">Gestão da Árvore Genealógica</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Ver Árvore Pública
            </Button>

            <Button
              variant="ghost"
              onClick={handleSignOut}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Membros
              </CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPessoas}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalHumanos} humanos, {stats.totalPets} pets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Relacionamentos
              </CardTitle>
              <Link2 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalRelacionamentos}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalCasamentos} casamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Solicitações pendentes
              </CardTitle>
              <GitPullRequest className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.pendingRelationshipRequests}</div>
              <p className="text-xs text-gray-500 mt-1">Vínculos aguardando revisão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                In Memoriam
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalFalecidos}</div>
              <p className="text-xs text-gray-500 mt-1">Pessoas falecidas</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className="text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                type="button"
              >
                <div
                  className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pessoas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : pessoasRecentes.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma pessoa cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {pessoasRecentes.map((pessoa) => (
                    <div
                      key={pessoa.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/pessoa/${pessoa.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {pessoa.nome_completo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pessoa.local_nascimento || 'Local não informado'}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/pessoas/${pessoa.id}/editar`);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Atividades</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/atividades')}>
                Ver histórico completo
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : atividadesRecentes.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {atividadesRecentes.map((atividade) => (
                    <div key={atividade.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getActivityActionLabel(atividade.action)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {atividade.actor_display_name || 'Ator não identificado'} · {formatActivityDate(atividade.created_at)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-600">
                        {getActivitySummary(atividade)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
