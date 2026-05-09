import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Database, AlertCircle } from 'lucide-react';

export function AdminMigrarDados() {
  const navigate = useNavigate();
  const [confirmationText, setConfirmationText] = useState('');

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
              Migração destrutiva desativada no frontend. Execute apenas via rotina server-side/transacional em ambiente controlado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Antes de começar:</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Certifique-se de que as migrations atuais foram aplicadas no ambiente correto</li>
                <li>Qualquer carga destrutiva deve rodar fora do browser, com transação e backup validado</li>
                <li>Não execute deletes/inserts parciais a partir do frontend</li>
                <li>Use uma rotina server-side/RPC revisada para ambientes locais ou staging</li>
              </ol>
            </div>

            {/* Informações sobre os dados */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Estado da ferramenta:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Execução destrutiva client-side removida</li>
                <li>• Esta tela permanece apenas como aviso operacional</li>
                <li>• Uma nova rotina deve ser transacional e validar admin no servidor</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-red-900 mb-2">
                Confirmação desativada. A frase abaixo não libera execução pelo frontend.
              </label>
              <input
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                className="flex h-10 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                placeholder="MIGRAR DADOS"
              />
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
                disabled
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Database className="w-4 h-4 mr-2" />
                Migração desativada
              </Button>
            </div>
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
