import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Link2, 
  Home,
  Settings,
  RefreshCw,
  Heart,
  Baby,
  UserMinus,
  GitBranch
} from 'lucide-react';

interface DiagnosticoData {
  resumo: {
    totalPessoas: number;
    totalRelacionamentos: number;
    pessoasComConjuge: number;
    pessoasComPai: number;
    pessoasComMae: number;
    pessoasComFilhos: number;
    pessoasComIrmaos: number;
    relacionamentosPorTipo: {
      conjuge: number;
      pai: number;
      mae: number;
      filho: number;
      irmao: number;
    };
    pessoasSemRelacionamentos: Array<{ id: string; nome: string }>;
    relacionamentosInvalidos: Array<any>;
  };
  exemplos: Array<{
    id: string;
    nome: string;
    relacionamentos: Array<{
      tipo: string;
      subtipo: string;
      comQuem: string;
      direcao: string;
    }>;
  }>;
  avisos: string[];
}

export function AdminDiagnostico() {
  const navigate = useNavigate();
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDiagnostico = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-055bf375/diagnostico`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar diagnóstico: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDiagnostico(result.diagnostico);
      } else {
        setError(result.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao carregar diagnóstico:', err);
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDiagnostico();
  }, []);

  const getAvisoIcon = (aviso: string) => {
    if (aviso.includes('✅')) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (aviso.includes('⚠️')) return <AlertCircle className="w-5 h-5 text-amber-600" />;
    if (aviso.includes('❌')) return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertCircle className="w-5 h-5 text-gray-600" />;
  };

  const getAvisoColor = (aviso: string) => {
    if (aviso.includes('✅')) return 'bg-green-50 border-green-200 text-green-800';
    if (aviso.includes('⚠️')) return 'bg-amber-50 border-amber-200 text-amber-800';
    if (aviso.includes('❌')) return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Diagnóstico do Banco de Dados</h1>
              <p className="text-sm text-gray-500">Análise de integridade e relacionamentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={carregarDiagnostico}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && !diagnostico && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Carregando diagnóstico...</span>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Erro ao carregar diagnóstico</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {diagnostico && (
          <>
            {/* Avisos */}
            <div className="mb-6 space-y-3">
              {diagnostico.avisos.map((aviso, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${getAvisoColor(aviso)}`}
                >
                  {getAvisoIcon(aviso)}
                  <p className="text-sm font-medium">{aviso}</p>
                </div>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total de Pessoas
                  </CardTitle>
                  <Users className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {diagnostico.resumo.totalPessoas}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cadastradas no banco</p>
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
                    {diagnostico.resumo.totalRelacionamentos}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Vínculos cadastrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Com Cônjuge
                  </CardTitle>
                  <Heart className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {diagnostico.resumo.pessoasComConjuge}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {diagnostico.resumo.relacionamentosPorTipo.conjuge} conexões
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Com Filhos
                  </CardTitle>
                  <Baby className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {diagnostico.resumo.pessoasComFilhos}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {diagnostico.resumo.relacionamentosPorTipo.filho} conexões
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Relacionamentos por Tipo */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Relacionamentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <Heart className="w-6 h-6 text-pink-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {diagnostico.resumo.relacionamentosPorTipo.conjuge}
                    </p>
                    <p className="text-xs text-gray-600">Cônjuges</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <UserMinus className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {diagnostico.resumo.relacionamentosPorTipo.pai}
                    </p>
                    <p className="text-xs text-gray-600">Pais</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <UserMinus className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {diagnostico.resumo.relacionamentosPorTipo.mae}
                    </p>
                    <p className="text-xs text-gray-600">Mães</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Baby className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {diagnostico.resumo.relacionamentosPorTipo.filho}
                    </p>
                    <p className="text-xs text-gray-600">Filhos</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <GitBranch className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {diagnostico.resumo.relacionamentosPorTipo.irmao}
                    </p>
                    <p className="text-xs text-gray-600">Irmãos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pessoas sem Relacionamentos */}
            {diagnostico.resumo.pessoasSemRelacionamentos.length > 0 && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="w-5 h-5" />
                    Pessoas sem Relacionamentos ({diagnostico.resumo.pessoasSemRelacionamentos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {diagnostico.resumo.pessoasSemRelacionamentos.map((pessoa) => (
                      <div
                        key={pessoa.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <p className="text-sm font-medium text-gray-900">{pessoa.nome}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/pessoas/${pessoa.id}/editar`)}
                        >
                          Adicionar Relacionamentos
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Relacionamentos Inválidos */}
            {diagnostico.resumo.relacionamentosInvalidos.length > 0 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <XCircle className="w-5 h-5" />
                    Relacionamentos Inválidos ({diagnostico.resumo.relacionamentosInvalidos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700 mb-4">
                    Estes relacionamentos apontam para IDs de pessoas que não existem no banco de dados.
                  </p>
                  <div className="space-y-2">
                    {diagnostico.resumo.relacionamentosInvalidos.map((rel, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg text-sm"
                      >
                        <p className="font-medium text-gray-900">
                          Tipo: {rel.tipo} | ID: {rel.id}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Origem: {rel.origem} {!rel.origem_existe && <span className="text-red-600">(não existe)</span>}
                          {' → '}
                          Destino: {rel.destino} {!rel.destino_existe && <span className="text-red-600">(não existe)</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exemplos de Pessoas */}
            <Card>
              <CardHeader>
                <CardTitle>Exemplos de Pessoas e seus Relacionamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {diagnostico.exemplos.map((exemplo) => (
                    <div key={exemplo.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <h3 className="font-semibold text-gray-900 mb-3">{exemplo.nome}</h3>
                      {exemplo.relacionamentos.length > 0 ? (
                        <div className="space-y-2">
                          {exemplo.relacionamentos.map((rel, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded"
                            >
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {rel.tipo}
                              </span>
                              <span className="flex-1 text-gray-700">
                                {rel.comQuem || 'Pessoa desconhecida'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {rel.direcao === 'saída' ? '→' : '←'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Sem relacionamentos cadastrados</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}