import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { migrarDados } from '../../services/dataService';
import { seedData } from '../../data/seed';
import { ArrowLeft, Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export function AdminMigrarDados() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<{ pessoas?: number; relacionamentos?: number } | null>(null);

  const handleMigrar = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Esta ação irá APAGAR todos os dados existentes no banco e carregar os dados do seed.\n\nDeseja continuar?')) {
      return;
    }

    setStatus('loading');
    setMessage('Migrando dados...');
    setStats(null);

    try {
      const result = await migrarDados(seedData);

      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Migração concluída com sucesso!');
        setStats(result.stats || null);
      } else {
        setStatus('error');
        setMessage(result.message || 'Erro ao migrar dados');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-gray-900">
              Migrar Dados para o Banco
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Migração de Dados
            </CardTitle>
            <CardDescription>
              Esta ferramenta irá carregar os 62 membros da família do arquivo seed para o banco de dados PostgreSQL do Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Antes de começar:</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Certifique-se de que executou o SQL do arquivo <code className="bg-blue-100 px-1 rounded">database-schema.sql</code> no Supabase SQL Editor</li>
                <li>Este processo irá <strong>apagar todos os dados existentes</strong> no banco</li>
                <li>Serão criados 62 membros da família com todos os relacionamentos</li>
                <li>Os relacionamentos de irmãos serão detectados automaticamente</li>
              </ol>
            </div>

            {/* Status da migração */}
            {status !== 'idle' && (
              <div className={`rounded-lg p-4 ${
                status === 'loading' ? 'bg-yellow-50 border border-yellow-200' :
                status === 'success' ? 'bg-green-50 border border-green-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {status === 'loading' && <Loader className="w-5 h-5 text-yellow-600 animate-spin flex-shrink-0 mt-0.5" />}
                  {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                  {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                  
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      status === 'loading' ? 'text-yellow-900' :
                      status === 'success' ? 'text-green-900' :
                      'text-red-900'
                    }`}>
                      {status === 'loading' && 'Migrando...'}
                      {status === 'success' && 'Sucesso!'}
                      {status === 'error' && 'Erro'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      status === 'loading' ? 'text-yellow-800' :
                      status === 'success' ? 'text-green-800' :
                      'text-red-800'
                    }`}>
                      {message}
                    </p>

                    {stats && status === 'success' && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-green-800">
                          ✅ <strong>{stats.pessoas}</strong> pessoas criadas
                        </p>
                        <p className="text-sm text-green-800">
                          ✅ <strong>{stats.relacionamentos}</strong> relacionamentos criados
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Informações sobre os dados */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Dados a serem migrados:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>{seedData.length}</strong> registros no seed</li>
                <li>• Pessoas e pets da família Limeira Souza</li>
                <li>• Relacionamentos de filiação (pai, mãe, filho)</li>
                <li>• Relacionamentos conjugais</li>
                <li>• Relacionamentos de irmãos (detectados automaticamente)</li>
              </ul>
            </div>

            {/* Botão de ação */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
              >
                Voltar
              </Button>
              <Button
                onClick={handleMigrar}
                disabled={status === 'loading'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {status === 'loading' ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Executar Migração
                  </>
                )}
              </Button>
            </div>

            {status === 'success' && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Ver Árvore Genealógica
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aviso importante */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ⚠️ AVISO IMPORTANTE
          </h3>
          <p className="text-sm text-red-800">
            Esta operação é <strong>irreversível</strong> e irá apagar todos os dados existentes.
            Certifique-se de ter um backup se necessário antes de executar.
            Em produção, implemente um sistema de backup automático.
          </p>
        </div>
      </main>
    </div>
  );
}
