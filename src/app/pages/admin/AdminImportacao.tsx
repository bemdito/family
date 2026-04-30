import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { importarDadosFamilia } from '../../services/dataService';
import { DadosImportacao } from '../../types';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileJson } from 'lucide-react';

export function AdminImportacao() {
  const navigate = useNavigate();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    pessoas: number;
    relacionamentos: number;
    erros: string[];
  } | null>(null);

  const handleImportar = async () => {
    setLoading(true);
    setResultado(null);
    
    try {
      const dados: DadosImportacao[] = JSON.parse(jsonInput);
      const result = await importarDadosFamilia(dados);
      
      setResultado({
        sucesso: result.sucesso || false,
        pessoas: result.pessoas?.length || 0,
        relacionamentos: result.relacionamentos?.length || 0,
        erros: result.erros || []
      });
    } catch (error) {
      setResultado({
        sucesso: false,
        pessoas: 0,
        relacionamentos: 0,
        erros: [`Erro ao processar JSON: ${error.message}`]
      });
    } finally {
      setLoading(false);
    }
  };

  const exampleData = `[
  {
    "Nome completo": "João da Silva",
    "Data de nascimento": 1980,
    "Local de Nascimento": "São Paulo/SP",
    "Pai": "José da Silva",
    "Mãe": "Maria da Silva",
    "Cônjuge": "Ana Santos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  }
]`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-gray-900">Importar Dados</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Como Importar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600">
                Cole um array JSON com os dados das pessoas seguindo o formato abaixo. 
                O sistema criará automaticamente os relacionamentos baseado nos nomes.
              </p>
              
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">Campos disponíveis:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Nome completo</strong>: Nome da pessoa (obrigatório)</li>
                <li><strong>Data de nascimento</strong>: Ano ou data completa</li>
                <li><strong>Local de Nascimento</strong>: Cidade/Estado</li>
                <li><strong>Data de falecimento</strong>: Ano ou data</li>
                <li><strong>Local de falecimento</strong>: Cidade/Estado</li>
                <li><strong>Pai</strong>: Nome completo do pai</li>
                <li><strong>Mãe</strong>: Nome completo da mãe</li>
                <li><strong>Cônjuge</strong>: Nome completo do cônjuge</li>
                <li><strong>Filho (a) de (de sangue; adotivo</strong>: "Sangue" ou "Adotivo"</li>
                <li><strong>Humano ou pet</strong>: "Humano" ou "Pet"</li>
              </ul>
            </div>

            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs">
                {exampleData}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Import Form */}
        <Card>
          <CardHeader>
            <CardTitle>Cole o JSON para Importar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={15}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
              placeholder="Cole o JSON aqui..."
            />
            
            <div className="flex gap-3">
              <Button onClick={handleImportar} disabled={!jsonInput.trim() || loading}>
                <Upload className="w-4 h-4 mr-2" />
                {loading ? 'Importando...' : 'Importar Dados'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setJsonInput(exampleData)}
                disabled={loading}
              >
                Usar Exemplo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setJsonInput('');
                  setResultado(null);
                }}
                disabled={loading}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.sucesso ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Importação Concluída
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Erro na Importação
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultado.sucesso && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✅ <strong>{resultado.pessoas}</strong> pessoas importadas
                    </p>
                    <p className="text-sm text-green-800">
                      ✅ <strong>{resultado.relacionamentos}</strong> relacionamentos criados
                    </p>
                  </div>

                  <Button onClick={() => navigate('/admin/pessoas')}>
                    Ver Pessoas Importadas
                  </Button>
                </div>
              )}

              {resultado.erros.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">Avisos e Erros:</h4>
                  <ul className="space-y-1">
                    {resultado.erros.map((erro, index) => (
                      <li key={index} className="text-sm text-amber-800">
                        • {erro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Dicas Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ Os nomes devem ser exatamente iguais para criar relacionamentos</li>
              <li>✓ Nomes provisórios (ex: "Mulher de João") são aceitos</li>
              <li>✓ Campos vazios são permitidos e podem ser preenchidos depois</li>
              <li>✓ A importação não sobrescreve dados existentes</li>
              <li>✓ Relacionamentos duplicados são automaticamente evitados</li>
              <li>✓ Use "Sangue" ou "Adotivo" para especificar o tipo de filiação</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}