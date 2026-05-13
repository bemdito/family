import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  atualizarRelacionamento,
  obterTodosRelacionamentos,
  obterTodasPessoas,
  excluirRelacionamentoComInverso,
} from '../../services/dataService';
import { Relacionamento, Pessoa, SubtipoRelacionamento } from '../../types';
import { ArrowLeft, Edit3, Plus, Save, Trash2, Heart, Users as UsersIcon, X } from 'lucide-react';

type MarriageEditForm = {
  subtipo_relacionamento: SubtipoRelacionamento;
  ativo: boolean;
  data_separacao: string;
  local_separacao: string;
  observacoes: string;
};

function hasDeathDate(value?: number | string | null) {
  return Boolean(value && String(value).trim());
}

function getMarriageStatus(rel: Relacionamento, pessoa1?: Pessoa, pessoa2?: Pessoa) {
  if (rel.subtipo_relacionamento === 'separado' || rel.data_separacao) {
    return 'Separado';
  }

  if (rel.ativo === false) {
    return 'Inativo';
  }

  if (hasDeathDate(pessoa1?.data_falecimento) || hasDeathDate(pessoa2?.data_falecimento)) {
    return 'Viuvez';
  }

  return 'Ativo';
}

function formatDateLabel(value?: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function AdminRelacionamentos() {
  const navigate = useNavigate();
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [pessoasMap, setPessoasMap] = useState<Map<string, Pessoa>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingMarriageId, setEditingMarriageId] = useState<string | null>(null);
  const [savingMarriageId, setSavingMarriageId] = useState<string | null>(null);
  const [marriageForm, setMarriageForm] = useState<MarriageEditForm>({
    subtipo_relacionamento: 'casamento',
    ativo: true,
    data_separacao: '',
    local_separacao: '',
    observacoes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const relsData = await obterTodosRelacionamentos();
    setRelacionamentos(Array.isArray(relsData) ? relsData : []);

    const pessoas = await obterTodasPessoas();
    const map = new Map<string, Pessoa>();
    if (Array.isArray(pessoas)) {
      pessoas.forEach((p) => map.set(p.id, p));
    }
    setPessoasMap(map);

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este relacionamento?')) {
      const success = await excluirRelacionamentoComInverso(id);
      if (success) {
        await loadData();
      } else {
        alert('Erro ao excluir relacionamento');
      }
    }
  };

  const startMarriageEdit = (rel: Relacionamento) => {
    setEditingMarriageId(rel.id);
    setMarriageForm({
      subtipo_relacionamento: rel.subtipo_relacionamento ?? 'casamento',
      ativo: rel.ativo ?? true,
      data_separacao: rel.data_separacao ?? '',
      local_separacao: rel.local_separacao ?? '',
      observacoes: rel.observacoes ?? '',
    });
  };

  const cancelMarriageEdit = () => {
    setEditingMarriageId(null);
    setMarriageForm({
      subtipo_relacionamento: 'casamento',
      ativo: true,
      data_separacao: '',
      local_separacao: '',
      observacoes: '',
    });
  };

  const handleSaveMarriage = async (rel: Relacionamento) => {
    setSavingMarriageId(rel.id);

    try {
      const payload = {
        subtipo_relacionamento: marriageForm.subtipo_relacionamento,
        ativo: marriageForm.ativo,
        data_separacao: marriageForm.data_separacao || null,
        local_separacao: marriageForm.local_separacao.trim() || null,
        observacoes: marriageForm.observacoes.trim() || null,
      };

      const updated = await atualizarRelacionamento(rel.id, payload);
      if (!updated) {
        alert('Não foi possível atualizar o relacionamento conjugal.');
        return;
      }

      const inverse = relacionamentos.find((candidate) =>
        candidate.id !== rel.id &&
        candidate.tipo_relacionamento === 'conjuge' &&
        candidate.pessoa_origem_id === rel.pessoa_destino_id &&
        candidate.pessoa_destino_id === rel.pessoa_origem_id
      );

      if (inverse) {
        await atualizarRelacionamento(inverse.id, payload);
      }

      await loadData();
      cancelMarriageEdit();
    } catch (error) {
      console.error('Erro ao atualizar relacionamento conjugal:', error);
      alert('Erro ao atualizar relacionamento conjugal.');
    } finally {
      setSavingMarriageId(null);
    }
  };

  const relacionamentosPorTipo = {
    conjuge: relacionamentos.filter(r => r.tipo_relacionamento === 'conjuge'),
    filiacao: relacionamentos.filter(
      r =>
        r.tipo_relacionamento === 'pai' ||
        r.tipo_relacionamento === 'mae' ||
        r.tipo_relacionamento === 'filho'
    ),
  };

  const conjugesUnicos = relacionamentosPorTipo.conjuge.filter((rel, index, self) =>
    index === self.findIndex(r =>
      (r.pessoa_origem_id === rel.pessoa_origem_id && r.pessoa_destino_id === rel.pessoa_destino_id) ||
      (r.pessoa_origem_id === rel.pessoa_destino_id && r.pessoa_destino_id === rel.pessoa_origem_id)
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-gray-900">Gerenciar Relacionamentos</h1>
          </div>

          <Button onClick={() => navigate('/admin/relacionamentos/novo')}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Relacionamento
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Relacionamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{relacionamentos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Casamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {conjugesUnicos.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Filiações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {relacionamentosPorTipo.filiacao.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-600" />
              Relacionamentos Conjugais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conjugesUnicos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum relacionamento conjugal cadastrado
                </div>
              ) : (
                conjugesUnicos.map((rel) => {
                  const pessoa1 = pessoasMap.get(rel.pessoa_origem_id);
                  const pessoa2 = pessoasMap.get(rel.pessoa_destino_id);
                  const isEditing = editingMarriageId === rel.id;
                  const status = getMarriageStatus(rel, pessoa1, pessoa2);

                  return (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Heart className="w-5 h-5 text-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {pessoa1?.nome_completo} ❤️ {pessoa2?.nome_completo}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span>Status: {status}</span>
                            {rel.subtipo_relacionamento && <span>Tipo: {rel.subtipo_relacionamento}</span>}
                            {rel.data_separacao && <span>Separação: {formatDateLabel(rel.data_separacao)}</span>}
                            {rel.local_separacao && <span>Local: {rel.local_separacao}</span>}
                            {rel.observacoes && <span>Com observações</span>}
                          </div>

                          {isEditing && (
                            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Tipo conjugal</label>
                                <select
                                  value={marriageForm.subtipo_relacionamento}
                                  onChange={(event) =>
                                    setMarriageForm((current) => ({
                                      ...current,
                                      subtipo_relacionamento: event.target.value as SubtipoRelacionamento,
                                    }))
                                  }
                                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                  disabled={savingMarriageId === rel.id}
                                >
                                  <option value="casamento">Casamento</option>
                                  <option value="uniao">União</option>
                                  <option value="separado">Separado</option>
                                </select>
                              </div>

                              <label className="flex items-center gap-3 self-end rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={marriageForm.ativo}
                                  onChange={(event) =>
                                    setMarriageForm((current) => ({ ...current, ativo: event.target.checked }))
                                  }
                                  disabled={savingMarriageId === rel.id}
                                  className="h-4 w-4"
                                />
                                Relacionamento ativo
                              </label>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Data de separação</label>
                                <Input
                                  type="date"
                                  value={marriageForm.data_separacao}
                                  onChange={(event) =>
                                    setMarriageForm((current) => ({ ...current, data_separacao: event.target.value }))
                                  }
                                  disabled={savingMarriageId === rel.id}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Local de separação</label>
                                <Input
                                  value={marriageForm.local_separacao}
                                  onChange={(event) =>
                                    setMarriageForm((current) => ({ ...current, local_separacao: event.target.value }))
                                  }
                                  disabled={savingMarriageId === rel.id}
                                />
                              </div>

                              <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-600">Observações internas</label>
                                <Textarea
                                  value={marriageForm.observacoes}
                                  onChange={(event) =>
                                    setMarriageForm((current) => ({ ...current, observacoes: event.target.value }))
                                  }
                                  disabled={savingMarriageId === rel.id}
                                />
                              </div>

                              <div className="flex justify-end gap-2 md:col-span-2">
                                <Button type="button" variant="outline" size="sm" onClick={cancelMarriageEdit}>
                                  <X className="mr-2 h-4 w-4" />
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveMarriage(rel)}
                                  disabled={savingMarriageId === rel.id}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  {savingMarriageId === rel.id ? 'Salvando...' : 'Salvar'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startMarriageEdit(rel)}
                          disabled={Boolean(editingMarriageId && editingMarriageId !== rel.id)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rel.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-blue-600" />
              Relacionamentos de Filiação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relacionamentosPorTipo.filiacao.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum relacionamento de filiação cadastrado
                </div>
              ) : (
                relacionamentosPorTipo.filiacao.map((rel) => {
                  const origem = pessoasMap.get(rel.pessoa_origem_id);
                  const destino = pessoasMap.get(rel.pessoa_destino_id);

                  return (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <UsersIcon className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {origem?.nome_completo} → {destino?.nome_completo}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {rel.tipo_relacionamento} • {rel.subtipo_relacionamento === 'adotivo' ? 'adotivo' : 'sangue'}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(rel.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
