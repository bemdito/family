import React, { useState, useEffect } from 'react';
import { Pessoa, Relacionamento, TipoRelacionamento, SubtipoRelacionamento } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Plus,
  X,
  Search,
  Users,
  Heart,
  Baby,
  User,
  GitBranch
} from 'lucide-react';
import {
  adicionarRelacionamentoComInverso,
  atualizarRelacionamento,
  excluirRelacionamentoComInverso,
  excluirRelacionamentoPorPayloadComInverso,
  encontrarRelacionamentoInverso,
  obterTodasPessoas,
  obterTodosRelacionamentos,
} from '../services/dataService';
import {
  listarArquivosHistoricosDoRelacionamento,
  salvarArquivosHistoricosDoRelacionamento,
} from '../services/arquivosHistoricosService';
import { includesNormalizedText } from '../utils/searchText';
import {
  createEmptyMarriageDetails,
  MarriageDetailsEditor,
  MarriageDetailsForm,
  normalizeMarriageDetails,
} from './relationships/MarriageDetailsEditor';

interface RelacionamentoManagerProps {
  pessoaId: string;
  pessoaNome: string;
  relacionamentosIniciais: {
    pais: Pessoa[];
    maes: Pessoa[];
    conjuges: Pessoa[];
    filhos: Pessoa[];
    irmaos: Pessoa[];
  };
  onChange?: () => void;
}

type TipoRelacionamentoOption = 'pai' | 'mae' | 'conjuge' | 'filho' | 'irmao';

interface RelacionamentoComPessoa {
  id: string;
  tipo: TipoRelacionamento;
  subtipo?: SubtipoRelacionamento;
  pessoa: Pessoa;
  relacionamentoId?: string;
  relacionamento?: Relacionamento;
}

export function RelacionamentoManager({
  pessoaId,
  pessoaNome,
  relacionamentosIniciais,
  onChange
}: RelacionamentoManagerProps) {
  const [relacionamentos, setRelacionamentos] = useState<RelacionamentoComPessoa[]>([]);
  const [todasPessoas, setTodasPessoas] = useState<Pessoa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelacionamentoOption>('pai');
  const [subtipoSelecionado, setSubtipoSelecionado] = useState<SubtipoRelacionamento>('sangue');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentGender, setParentGender] = useState<'pai' | 'mae'>('pai');
  const [conjugalForm, setConjugalForm] = useState<MarriageDetailsForm>(() => createEmptyMarriageDetails());
  const [marriageDetailsByRelationshipId, setMarriageDetailsByRelationshipId] = useState<Record<string, MarriageDetailsForm>>({});
  const [savingMarriageId, setSavingMarriageId] = useState<string | null>(null);

  useEffect(() => {
    loadPessoas();
    loadRelacionamentos();
  }, [relacionamentosIniciais, pessoaId]);

  const loadPessoas = async () => {
    const pessoas = await obterTodasPessoas();
    setTodasPessoas(pessoas.filter(p => p.id !== pessoaId));
  };

  const findRelationshipBetween = (
    relacionamentos: Relacionamento[],
    relatedId: string,
    acceptedType: TipoRelacionamento,
  ) => relacionamentos.find((rel) => (
    rel.tipo_relacionamento === acceptedType &&
    (
      (rel.pessoa_origem_id === pessoaId && rel.pessoa_destino_id === relatedId) ||
      (rel.pessoa_origem_id === relatedId && rel.pessoa_destino_id === pessoaId)
    )
  ));

  const buildMarriageDetails = async (rel?: Relacionamento): Promise<MarriageDetailsForm> => {
    if (!rel?.id) return createEmptyMarriageDetails();

    const arquivos = await listarArquivosHistoricosDoRelacionamento(rel.id).catch(() => []);
    return normalizeMarriageDetails({
      data_casamento: String(rel.data_casamento ?? ''),
      local_casamento: String(rel.local_casamento ?? ''),
      ativo: rel.ativo ?? true,
      data_separacao: String(rel.data_separacao ?? ''),
      local_separacao: String(rel.local_separacao ?? ''),
      observacoes: String(rel.observacoes ?? ''),
      arquivos_historicos: arquivos,
    });
  };

  const loadRelacionamentos = async () => {
    const allRelacionamentos = await obterTodosRelacionamentos();
    const rels: RelacionamentoComPessoa[] = [];
    const nextMarriageDetails: Record<string, MarriageDetailsForm> = {};

    relacionamentosIniciais.pais.forEach(p => {
      const relacionamento = findRelationshipBetween(allRelacionamentos, p.id, 'pai');
      rels.push({ id: `pai-${p.id}`, tipo: 'pai', pessoa: p, subtipo: relacionamento?.subtipo_relacionamento ?? 'sangue', relacionamentoId: relacionamento?.id, relacionamento });
    });

    relacionamentosIniciais.maes.forEach(p => {
      const relacionamento = findRelationshipBetween(allRelacionamentos, p.id, 'mae');
      rels.push({ id: `mae-${p.id}`, tipo: 'mae', pessoa: p, subtipo: relacionamento?.subtipo_relacionamento ?? 'sangue', relacionamentoId: relacionamento?.id, relacionamento });
    });

    for (const p of relacionamentosIniciais.conjuges) {
      const relacionamento = findRelationshipBetween(allRelacionamentos, p.id, 'conjuge');
      rels.push({ id: `conjuge-${p.id}`, tipo: 'conjuge', pessoa: p, subtipo: relacionamento?.subtipo_relacionamento ?? 'casamento', relacionamentoId: relacionamento?.id, relacionamento });
      if (relacionamento?.id) {
        nextMarriageDetails[relacionamento.id] = await buildMarriageDetails(relacionamento);
      }
    }

    relacionamentosIniciais.filhos.forEach(p => {
      const relacionamento = findRelationshipBetween(allRelacionamentos, p.id, 'filho');
      rels.push({ id: `filho-${p.id}`, tipo: 'filho', pessoa: p, subtipo: relacionamento?.subtipo_relacionamento ?? 'sangue', relacionamentoId: relacionamento?.id, relacionamento });
    });

    relacionamentosIniciais.irmaos.forEach(p => {
      const relacionamento = findRelationshipBetween(allRelacionamentos, p.id, 'irmao');
      rels.push({ id: `irmao-${p.id}`, tipo: 'irmao', pessoa: p, subtipo: relacionamento?.subtipo_relacionamento ?? 'sangue', relacionamentoId: relacionamento?.id, relacionamento });
    });

    setRelacionamentos(rels);
    setMarriageDetailsByRelationshipId(nextMarriageDetails);
  };

  const handleAdicionarRelacionamento = async (pessoaSelecionada: Pessoa) => {
    if (!pessoaSelecionada) return;

    setLoading(true);
    try {
      const rel1 = await adicionarRelacionamentoComInverso({
        pessoa_origem_id: pessoaId,
        pessoa_destino_id: pessoaSelecionada.id,
        tipo_relacionamento: tipoSelecionado as TipoRelacionamento,
        subtipo_relacionamento: subtipoSelecionado,
        ativo: tipoSelecionado === 'conjuge' ? conjugalForm.ativo : true,
        data_casamento: tipoSelecionado === 'conjuge' ? conjugalForm.data_casamento.trim() || undefined : undefined,
        local_casamento: tipoSelecionado === 'conjuge' ? conjugalForm.local_casamento.trim() || undefined : undefined,
        data_separacao: tipoSelecionado === 'conjuge' ? conjugalForm.data_separacao || undefined : undefined,
        local_separacao: tipoSelecionado === 'conjuge' ? conjugalForm.local_separacao.trim() || undefined : undefined,
        observacoes: tipoSelecionado === 'conjuge' ? conjugalForm.observacoes.trim() || undefined : undefined,
      }, { inverseTipoForFilho: parentGender });

      if (!rel1) {
        throw new Error('Falha ao criar relacionamento principal');
      }

      setRelacionamentos(prev => [
        ...prev,
        {
          id: `${tipoSelecionado}-${pessoaSelecionada.id}`,
          tipo: tipoSelecionado as TipoRelacionamento,
          subtipo: subtipoSelecionado,
          pessoa: pessoaSelecionada,
          relacionamentoId: rel1.id,
          relacionamento: rel1,
        },
      ]);

      setShowAddDialog(false);
      setSearchTerm('');
      if (tipoSelecionado === 'conjuge') {
        setMarriageDetailsByRelationshipId((current) => ({
          ...current,
          [rel1.id]: normalizeMarriageDetails(conjugalForm),
        }));
      }
      setConjugalForm(createEmptyMarriageDetails());
      onChange?.();
    } catch (error) {
      console.error('Erro ao adicionar relacionamento:', error);
      alert(`Erro ao adicionar relacionamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarriageDetailsChange = (relacionamentoId: string, details: MarriageDetailsForm) => {
    setMarriageDetailsByRelationshipId((current) => ({
      ...current,
      [relacionamentoId]: normalizeMarriageDetails(details),
    }));
  };

  const handleSalvarMarriageDetails = async (rel: RelacionamentoComPessoa) => {
    if (!rel.relacionamentoId || !rel.relacionamento) return;

    const details = normalizeMarriageDetails(marriageDetailsByRelationshipId[rel.relacionamentoId]);
    setSavingMarriageId(rel.relacionamentoId);

    try {
      const payload: Partial<Relacionamento> = {
        data_casamento: details.data_casamento.trim() || null,
        local_casamento: details.local_casamento.trim() || null,
        ativo: details.ativo,
        data_separacao: details.data_separacao.trim() || null,
        local_separacao: details.local_separacao.trim() || null,
        observacoes: details.observacoes.trim() || null,
      };

      const updated = await atualizarRelacionamento(rel.relacionamentoId, payload);
      const inverse = await encontrarRelacionamentoInverso(rel.relacionamento);
      if (inverse) {
        await atualizarRelacionamento(inverse.id, payload);
      }

      if (updated) {
        await salvarArquivosHistoricosDoRelacionamento(rel.relacionamentoId, details.arquivos_historicos ?? []);
      }

      await loadRelacionamentos();
      onChange?.();
    } catch (error) {
      console.error('Erro ao salvar dados conjugais:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar dados conjugais');
    } finally {
      setSavingMarriageId(null);
    }
  };

  const handleRemoverRelacionamento = async (rel: RelacionamentoComPessoa) => {
    if (!confirm(`Remover ${getTipoLabel(rel.tipo)} "${rel.pessoa.nome_completo}"?`)) return;

    setLoading(true);
    try {
      if (rel.relacionamentoId) {
        await excluirRelacionamentoComInverso(rel.relacionamentoId);
      } else {
        await excluirRelacionamentoPorPayloadComInverso({
          pessoa_origem_id: pessoaId,
          pessoa_destino_id: rel.pessoa.id,
          tipo_relacionamento: rel.tipo,
          subtipo_relacionamento: rel.subtipo,
        });
      }

      setRelacionamentos(prev => prev.filter(r => !(r.tipo === rel.tipo && r.pessoa.id === rel.pessoa.id)));
      onChange?.();
    } catch (error) {
      console.error('Erro ao remover relacionamento:', error);
      alert('Erro ao remover relacionamento');
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: TipoRelacionamento) => {
    const labels = {
      pai: 'Pai',
      mae: 'Mãe',
      conjuge: 'Cônjuge',
      filho: 'Filho(a)',
      irmao: 'Irmão(ã)',
    };
    return labels[tipo] || tipo;
  };

  const getTipoIcon = (tipo: TipoRelacionamento) => {
    const icons = {
      pai: User,
      mae: User,
      conjuge: Heart,
      filho: Baby,
      irmao: GitBranch,
    };
    const Icon = icons[tipo] || Users;
    return <Icon className="w-4 h-4" />;
  };

  const pessoasFiltradas = todasPessoas.filter(p => {
    const jaRelacionadoMesmoTipo = relacionamentos.some(
      r => r.pessoa.id === p.id && r.tipo === (tipoSelecionado as TipoRelacionamento)
    );
    if (jaRelacionadoMesmoTipo) return false;

    return includesNormalizedText(p.nome_completo, searchTerm);
  });

  const relacionamentosPorTipo = {
    pai: relacionamentos.filter(r => r.tipo === 'pai'),
    mae: relacionamentos.filter(r => r.tipo === 'mae'),
    conjuge: relacionamentos.filter(r => r.tipo === 'conjuge'),
    filho: relacionamentos.filter(r => r.tipo === 'filho'),
    irmao: relacionamentos.filter(r => r.tipo === 'irmao'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Relacionamentos
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddDialog(!showAddDialog)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddDialog && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-900">Adicionar Relacionamento</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={tipoSelecionado}
                  onChange={(e) => {
                    const nextTipo = e.target.value as TipoRelacionamentoOption;
                    setTipoSelecionado(nextTipo);
                    setSubtipoSelecionado(nextTipo === 'conjuge' ? 'casamento' : 'sangue');
                    if (nextTipo !== 'conjuge') {
                      setConjugalForm(createEmptyMarriageDetails());
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="pai">Pai</option>
                  <option value="mae">Mãe</option>
                  <option value="conjuge">Cônjuge</option>
                  <option value="filho">Filho(a)</option>
                  <option value="irmao">Irmão(ã)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtipo
                </label>
                <select
                  value={subtipoSelecionado}
                  onChange={(e) => setSubtipoSelecionado(e.target.value as SubtipoRelacionamento)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {tipoSelecionado === 'conjuge' ? (
                    <>
                      <option value="casamento">Casamento</option>
                      <option value="uniao">União Estável</option>
                      <option value="separado">Separado</option>
                    </>
                  ) : (
                    <>
                      <option value="sangue">Sangue</option>
                      <option value="adotivo">Adotivo</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {tipoSelecionado === 'filho' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {pessoaNome} é:
                </label>
                <select
                  value={parentGender}
                  onChange={(e) => setParentGender(e.target.value as 'pai' | 'mae')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="pai">Pai</option>
                  <option value="mae">Mãe</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecione se {pessoaNome} é pai ou mãe desta pessoa
                </p>
              </div>
            )}

            {tipoSelecionado === 'conjuge' && (
              <MarriageDetailsEditor
                value={conjugalForm}
                onChange={setConjugalForm}
                isAdmin
                allowHistoricalFiles
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Pessoa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome..."
                  className="pl-10"
                />
              </div>
            </div>

            {searchTerm && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white">
                {pessoasFiltradas.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Nenhuma pessoa encontrada
                  </div>
                ) : (
                  <div className="divide-y">
                    {pessoasFiltradas.map(pessoa => (
                      <button
                        key={pessoa.id}
                        type="button"
                        onClick={() => handleAdicionarRelacionamento(pessoa)}
                        disabled={loading}
                        className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                      >
                        {pessoa.foto_principal_url ? (
                          <img
                            src={pessoa.foto_principal_url}
                            alt={pessoa.nome_completo}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{pessoa.nome_completo}</p>
                          {pessoa.data_nascimento && (
                            <p className="text-xs text-gray-500">{pessoa.data_nascimento}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(relacionamentosPorTipo).map(([tipo, rels]) =>
            rels.length > 0 ? (
              <div key={tipo}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  {getTipoIcon(tipo as TipoRelacionamento)}
                  {getTipoLabel(tipo as TipoRelacionamento)} ({rels.length})
                </h4>
                <div className="space-y-2">
                  {rels.map(rel => (
                    <div
                      key={rel.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {rel.pessoa.foto_principal_url ? (
                          <img
                            src={rel.pessoa.foto_principal_url}
                            alt={rel.pessoa.nome_completo}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{rel.pessoa.nome_completo}</p>
                          {rel.subtipo && (
                            <p className="text-xs text-gray-500 capitalize">{rel.subtipo}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverRelacionamento(rel)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {rel.tipo === 'conjuge' && rel.relacionamentoId && (
                        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                          <MarriageDetailsEditor
                            value={marriageDetailsByRelationshipId[rel.relacionamentoId] ?? createEmptyMarriageDetails()}
                            onChange={(details) => handleMarriageDetailsChange(rel.relacionamentoId!, details)}
                            relacionamentoId={rel.relacionamentoId}
                            isAdmin
                            allowHistoricalFiles
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSalvarMarriageDetails(rel)}
                              disabled={savingMarriageId === rel.relacionamentoId}
                            >
                              {savingMarriageId === rel.relacionamentoId ? 'Salvando...' : 'Salvar dados do casamento'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>

        {relacionamentos.length === 0 && !showAddDialog && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhum relacionamento cadastrado</p>
            <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
