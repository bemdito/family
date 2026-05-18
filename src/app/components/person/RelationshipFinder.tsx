import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Pessoa, Relacionamento } from '../../types';
import { calculateRelationshipDegree } from '../../utils/relationshipDegree';
import {
  formatRelationshipPersonPath,
  formatRelationshipStepPath,
  getFriendlyRelationshipWarnings,
  getRelationshipMetricLabels,
  getRelationshipResultMessage,
} from '../../utils/relationshipDegreeDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type RelationshipFinderProps = {
  pessoaBase: Pessoa;
  pessoas: Pessoa[];
  relacionamentos?: Relacionamento[];
  dataScopeNotice?: string;
};

export function RelationshipFinder({
  pessoaBase,
  pessoas,
  relacionamentos = [],
  dataScopeNotice,
}: RelationshipFinderProps) {
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [includeInactiveSpouses, setIncludeInactiveSpouses] = useState(false);

  const pessoasDisponiveis = useMemo(
    () =>
      pessoas
        .filter((pessoa) => pessoa.id !== pessoaBase.id)
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)),
    [pessoas, pessoaBase.id]
  );

  const resultado = useMemo(() => {
    if (!selectedPersonId) return null;

    return calculateRelationshipDegree({
      originPersonId: pessoaBase.id,
      targetPersonId: selectedPersonId,
      people: pessoas,
      relationships: relacionamentos,
      includeInactiveSpouses,
    });
  }, [includeInactiveSpouses, pessoaBase.id, pessoas, relacionamentos, selectedPersonId]);

  const pathText = resultado ? formatRelationshipPersonPath(resultado, pessoas) : '';
  const relationText = resultado ? formatRelationshipStepPath(resultado) : '';
  const friendlyWarnings = resultado ? getFriendlyRelationshipWarnings(resultado) : [];
  const metricLabels = resultado ? getRelationshipMetricLabels(resultado) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Descubra seu parentesco com...
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Select
                value={selectedPersonId}
                onValueChange={setSelectedPersonId}
                disabled={pessoasDisponiveis.length === 0}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione uma pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {pessoasDisponiveis.map((pessoa) => (
                    <SelectItem key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-start gap-2 rounded-md border border-blue-100 bg-white/70 px-3 py-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={includeInactiveSpouses}
                  onChange={(event) => setIncludeInactiveSpouses(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Incluir ex-cônjuges/separações no cálculo</span>
              </label>

              {dataScopeNotice && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {dataScopeNotice}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-white/80 p-3 text-sm text-gray-700">
              {resultado ? (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">
                    {resultado.found ? resultado.label : 'Sem vínculo encontrado'}
                  </p>

                  <p>{getRelationshipResultMessage(resultado)}</p>

                  <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-3">
                    {metricLabels.map((metric) => (
                      <span key={metric}>{metric}</span>
                    ))}
                  </div>

                  {pathText && (
                    <p className="text-xs text-gray-500">
                      Caminho: {pathText}
                    </p>
                  )}

                  {relationText && (
                    <p className="text-xs text-gray-400">
                      Relações: {relationText}
                    </p>
                  )}

                  {friendlyWarnings.length > 0 && (
                    <ul className="space-y-1 text-xs text-amber-700">
                      {friendlyWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : pessoasDisponiveis.length === 0 ? (
                'Dados insuficientes para comparar com outra pessoa.'
              ) : (
                'O resultado aparece aqui após a seleção.'
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
