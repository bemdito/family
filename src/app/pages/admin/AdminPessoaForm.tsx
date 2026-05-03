import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  adicionarPessoa,
  atualizarPessoa,
  obterPessoaPorId,
  adicionarRelacionamento,
  obterTodasPessoas,
} from '../../services/dataService';
import {
  TipoEntidade,
  ArquivoHistorico,
  Pessoa,
  TipoRelacionamento,
  SubtipoRelacionamento,
  LadoPessoa,
} from '../../types';
import { ArrowLeft, Save, Plus, X, User, Search } from 'lucide-react';
import { FotoUpload } from '../../components/FotoUpload';
import { ColorPicker } from '../../components/ColorPicker';
import { ArquivosHistoricos } from '../../components/ArquivosHistoricos';
import { RelacionamentoManagerWrapper } from '../../components/RelacionamentoManagerWrapper';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { formatarTelefone } from '../../utils/telefone';
import { toast } from 'sonner';

interface RelacionamentoPendente {
  pessoa: Pessoa;
  tipo: TipoRelacionamento;
  subtipo: SubtipoRelacionamento;
}

export function AdminPessoaForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    nome_completo: '',
    data_nascimento: '',
    local_nascimento: '',
    data_falecimento: '',
    local_falecimento: '',
    local_atual: '',
    foto_principal_url: '',
    humano_ou_pet: 'Humano' as TipoEntidade,
    lado: 'esquerda' as LadoPessoa,
    manual_generation: '',
    cor_bg_card: '',
    minibio: '',
    curiosidades: '',
    telefone: '',
    endereco: '',
    rede_social: '',
    arquivos_historicos: [] as ArquivoHistorico[],
  });

  const [initialData, setInitialData] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [relacionamentosPendentes, setRelacionamentosPendentes] = useState<RelacionamentoPendente[]>([]);
  const [showAddRelDialog, setShowAddRelDialog] = useState(false);
  const [todasPessoas, setTodasPessoas] = useState<Pessoa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoRelSelecionado, setTipoRelSelecionado] = useState<TipoRelacionamento>('pai');
  const [subtipoRelSelecionado, setSubtipoRelSelecionado] = useState<SubtipoRelacionamento>('sangue');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFalecido = !!(formData.data_falecimento || formData.local_falecimento);

  useEffect(() => {
    const init = async () => {
      if (isEdit && id) {
        try {
          const pessoa = await obterPessoaPorId(id);

          if (pessoa) {
            const data = {
              nome_completo: pessoa.nome_completo || '',
              data_nascimento: pessoa.data_nascimento?.toString() || '',
              local_nascimento: pessoa.local_nascimento || '',
              data_falecimento: pessoa.data_falecimento?.toString() || '',
              local_falecimento: pessoa.local_falecimento || '',
              local_atual: pessoa.local_atual || '',
              foto_principal_url: pessoa.foto_principal_url || '',
              humano_ou_pet: pessoa.humano_ou_pet || ('Humano' as TipoEntidade),
              lado: (pessoa.lado as LadoPessoa) || 'esquerda',
              manual_generation: pessoa.manual_generation?.toString() || '',
              cor_bg_card: pessoa.cor_bg_card || '',
              minibio: pessoa.minibio || '',
              curiosidades: pessoa.curiosidades || '',
              telefone: pessoa.telefone || '',
              endereco: pessoa.endereco || '',
              rede_social: pessoa.rede_social || '',
              arquivos_historicos: pessoa.arquivos_historicos || [],
            };

            setFormData(data);
            setInitialData(JSON.stringify(data));
          }
        } catch (error) {
          console.error('Erro ao carregar pessoa:', error);
          toast.error('Erro ao carregar dados da pessoa');
        }
      } else {
        setInitialData(JSON.stringify(formData));
        await loadTodasPessoas();
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const loadTodasPessoas = async () => {
    try {
      const pessoas = await obterTodasPessoas();
      setTodasPessoas(Array.isArray(pessoas) ? pessoas : []);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
      setTodasPessoas([]);
    }
  };

  useEffect(() => {
    const currentData = JSON.stringify(formData);
    setHasChanges(currentData !== initialData || relacionamentosPendentes.length > 0);
  }, [formData, initialData, relacionamentosPendentes]);

  const shouldBlockNavigation = hasChanges && !isSubmitting;
  const { showPrompt, confirmNavigation, cancelNavigation } = useUnsavedChanges(shouldBlockNavigation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const pessoaData = {
        ...formData,
        data_nascimento: formData.data_nascimento || undefined,
        data_falecimento: formData.data_falecimento || undefined,
        lado: formData.lado || 'esquerda',
        manual_generation: formData.manual_generation ? Number(formData.manual_generation) : null,
        arquivos_historicos: formData.arquivos_historicos || [],
      };

      let pessoaCriada: Pessoa | undefined;

      if (isEdit && id) {
        pessoaCriada = await atualizarPessoa(id, pessoaData);

        if (!pessoaCriada) {
          toast.error('Erro ao atualizar pessoa');
          return;
        }

        toast.success('Pessoa atualizada com sucesso!');
      } else {
        pessoaCriada = await adicionarPessoa(pessoaData);

        if (!pessoaCriada) {
          toast.error('Erro ao criar pessoa. Verifique os dados e tente novamente.');
          return;
        }

        toast.success('Pessoa criada com sucesso!');

        if (relacionamentosPendentes.length > 0) {
          toast.info('Criando relacionamentos...');
          let relsCriados = 0;

          for (const relPendente of relacionamentosPendentes) {
            try {
              await adicionarRelacionamento({
                pessoa_origem_id: pessoaCriada.id,
                pessoa_destino_id: relPendente.pessoa.id,
                tipo_relacionamento: relPendente.tipo,
                subtipo_relacionamento: relPendente.subtipo,
              });

              let tipoInverso: TipoRelacionamento = relPendente.tipo;

              if (relPendente.tipo === 'pai' || relPendente.tipo === 'mae') {
                tipoInverso = 'filho';
              } else if (relPendente.tipo === 'filho') {
                tipoInverso = 'pai';
              }

              await adicionarRelacionamento({
                pessoa_origem_id: relPendente.pessoa.id,
                pessoa_destino_id: pessoaCriada.id,
                tipo_relacionamento: tipoInverso,
                subtipo_relacionamento: relPendente.subtipo,
              });

              relsCriados++;
            } catch (error) {
              console.error('Erro ao criar relacionamento:', error);
            }
          }

          toast.success(`${relsCriados} relacionamento(s) criado(s)!`);
        }
      }

      const snapshotAtual = JSON.stringify({
        ...formData,
        lado: formData.lado || 'esquerda',
        arquivos_historicos: formData.arquivos_historicos || [],
      });

      setInitialData(snapshotAtual);
      setRelacionamentosPendentes([]);
      setHasChanges(false);
      navigate('/admin/pessoas');
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error);
      toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | ArquivoHistorico[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTelefoneChange = (value: string) => {
    const formatted = formatarTelefone(value);
    handleChange('telefone', formatted);
  };

  const handleAdicionarRelacionamentoPendente = (pessoa: Pessoa) => {
    const jaExiste = relacionamentosPendentes.some(
      (r) => r.pessoa.id === pessoa.id && r.tipo === tipoRelSelecionado
    );

    if (jaExiste) {
      toast.warning('Esta pessoa já está na lista de relacionamentos');
      return;
    }

    if (
      (tipoRelSelecionado === 'pai' || tipoRelSelecionado === 'mae') &&
      relacionamentosPendentes.some((r) => r.tipo === tipoRelSelecionado)
    ) {
      toast.warning(`Já existe ${tipoRelSelecionado === 'pai' ? 'um pai' : 'uma mãe'} selecionado(a)`);
      return;
    }

    setRelacionamentosPendentes((prev) => [
      ...prev,
      {
        pessoa,
        tipo: tipoRelSelecionado,
        subtipo: subtipoRelSelecionado,
      },
    ]);

    setShowAddRelDialog(false);
    setSearchTerm('');
    toast.success(`${pessoa.nome_completo} adicionado(a) à lista`);
  };

  const handleRemoverRelacionamentoPendente = (pessoaId: string, tipo?: TipoRelacionamento) => {
    setRelacionamentosPendentes((prev) =>
      prev.filter((r) => !(r.pessoa.id === pessoaId && (!tipo || r.tipo === tipo)))
    );
  };

  const getTipoLabel = (tipo: TipoRelacionamento) => {
    const labels: Record<TipoRelacionamento, string> = {
      pai: 'Pai',
      mae: 'Mãe',
      conjuge: 'Cônjuge',
      filho: 'Filho(a)',
      irmao: 'Irmão(ã)',
    };
    return labels[tipo] || tipo;
  };

  const pessoasFiltradas = todasPessoas.filter((p) => {
    const jaNaLista = relacionamentosPendentes.some(
      (r) => r.pessoa.id === p.id && r.tipo === tipoRelSelecionado
    );
    if (jaNaLista) return false;

    if (searchTerm) {
      return p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());
    }

    return true;
  });

  const paiSelecionado = relacionamentosPendentes.find((r) => r.tipo === 'pai');
  const maeSelecionada = relacionamentosPendentes.find((r) => r.tipo === 'mae');
  const outrosRelacionamentos = relacionamentosPendentes.filter(
    (r) => r.tipo !== 'pai' && r.tipo !== 'mae'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pessoas')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-gray-900">
              {isEdit ? 'Editar Pessoa' : 'Nova Pessoa'}
            </h1>
          </div>

          <Button form="pessoa-form" type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form id="pessoa-form" onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Foto Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <FotoUpload
                value={formData.foto_principal_url}
                onChange={(url) => handleChange('foto_principal_url', url)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                <Input
                  type="text"
                  value={formData.nome_completo}
                  onChange={(e) => handleChange('nome_completo', e.target.value)}
                  required
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={formData.humano_ou_pet}
                    onChange={(e) => handleChange('humano_ou_pet', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Humano">Humano</option>
                    <option value="Pet">Pet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lado (visualização por lados)
                  </label>
                  <select
                    value={formData.lado}
                    onChange={(e) => handleChange('lado', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="esquerda">Esquerda</option>
                    <option value="direita">Direita</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Este campo permanece ativo para o modo legado. A nova visualização por gerações não depende dele.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Geração</label>
                  <select
                    value={formData.manual_generation}
                    onChange={(e) => handleChange('manual_generation', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Automática</option>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((generation) => (
                      <option key={generation} value={generation}>
                        Geração {generation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Card (opcional)</label>
                  <ColorPicker
                    value={formData.cor_bg_card}
                    onChange={(color) => handleChange('cor_bg_card', color)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datas e Locais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                  <Input
                    type="text"
                    value={formData.data_nascimento}
                    onChange={(e) => handleChange('data_nascimento', e.target.value)}
                    placeholder="Ex: 1990 ou 15/03/1990"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Local de Nascimento</label>
                  <Input
                    type="text"
                    value={formData.local_nascimento}
                    onChange={(e) => handleChange('local_nascimento', e.target.value)}
                    placeholder="Ex: São Paulo/SP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Falecimento</label>
                  <Input
                    type="text"
                    value={formData.data_falecimento}
                    onChange={(e) => handleChange('data_falecimento', e.target.value)}
                    placeholder="Ex: 2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Local de Falecimento</label>
                  <Input
                    type="text"
                    value={formData.local_falecimento}
                    onChange={(e) => handleChange('local_falecimento', e.target.value)}
                    placeholder="Ex: Rio de Janeiro/RJ"
                  />
                </div>

                {!isFalecido && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Local Atual (residência)</label>
                    <Input
                      type="text"
                      value={formData.local_atual}
                      onChange={(e) => handleChange('local_atual', e.target.value)}
                      placeholder="Ex: Belo Horizonte/MG"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Biografia e Curiosidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mini Biografia</label>
                <textarea
                  value={formData.minibio}
                  onChange={(e) => handleChange('minibio', e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Breve biografia da pessoa..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curiosidades</label>
                <textarea
                  value={formData.curiosidades}
                  onChange={(e) => handleChange('curiosidades', e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Fatos interessantes, hobbies, conquistas..."
                />
              </div>
            </CardContent>
          </Card>

          {!isFalecido && (
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <Input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rede Social / Site</label>
                    <Input
                      type="url"
                      value={formData.rede_social}
                      onChange={(e) => handleChange('rede_social', e.target.value)}
                      placeholder="https://instagram.com/usuario"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                  <Input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <ArquivosHistoricos
            arquivos={formData.arquivos_historicos}
            onChange={(arquivos) => handleChange('arquivos_historicos', arquivos)}
          />

          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Relacionamentos Familiares (opcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-gray-600">
                  Defina os relacionamentos que serão criados automaticamente após salvar a pessoa.
                </p>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-4">👨‍👩‍👦 Filiação (Pais)</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pai</label>
                      <div className="space-y-2">
                        {paiSelecionado ? (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            {paiSelecionado.pessoa.foto_principal_url ? (
                              <img
                                src={paiSelecionado.pessoa.foto_principal_url}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <span className="flex-1 text-sm font-medium">
                              {paiSelecionado.pessoa.nome_completo}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoverRelacionamentoPendente(paiSelecionado.pessoa.id, 'pai')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTipoRelSelecionado('pai');
                              setSubtipoRelSelecionado('sangue');
                              setShowAddRelDialog(true);
                            }}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Selecionar Pai
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mãe</label>
                      <div className="space-y-2">
                        {maeSelecionada ? (
                          <div className="flex items-center gap-2 p-2 bg-pink-50 rounded-lg border border-pink-200">
                            {maeSelecionada.pessoa.foto_principal_url ? (
                              <img
                                src={maeSelecionada.pessoa.foto_principal_url}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <span className="flex-1 text-sm font-medium">
                              {maeSelecionada.pessoa.nome_completo}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoverRelacionamentoPendente(maeSelecionada.pessoa.id, 'mae')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTipoRelSelecionado('mae');
                              setSubtipoRelSelecionado('sangue');
                              setShowAddRelDialog(true);
                            }}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Selecionar Mãe
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">💍 Outros Relacionamentos</h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setTipoRelSelecionado('conjuge');
                        setSubtipoRelSelecionado('casamento');
                        setShowAddRelDialog(true);
                      }}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {outrosRelacionamentos.length > 0 && (
                    <div className="space-y-2">
                      {outrosRelacionamentos.map((rel) => (
                        <div
                          key={`${rel.pessoa.id}-${rel.tipo}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                        >
                          {rel.pessoa.foto_principal_url ? (
                            <img
                              src={rel.pessoa.foto_principal_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {rel.pessoa.nome_completo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getTipoLabel(rel.tipo)} · {rel.subtipo === 'adotivo' ? 'Adotivo' : 'Sangue/Casamento'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverRelacionamentoPendente(rel.pessoa.id, rel.tipo)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isEdit && id && <RelacionamentoManagerWrapper pessoaId={id} />}
        </form>
      </main>

      <ConfirmDialog
        open={showPrompt}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        title="Descartar alterações?"
        description="Você tem alterações não salvas. Se sair agora, elas serão perdidas."
      />

      <ConfirmDialog
        open={showAddRelDialog}
        onConfirm={() => {}}
        onCancel={() => {
          setShowAddRelDialog(false);
          setSearchTerm('');
        }}
        title="Adicionar relacionamento"
        description=""
        hideButtons
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={tipoRelSelecionado}
                onChange={(e) => setTipoRelSelecionado(e.target.value as TipoRelacionamento)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="conjuge">Cônjuge</option>
                <option value="filho">Filho(a)</option>
                <option value="irmao">Irmão(ã)</option>
                <option value="pai">Pai</option>
                <option value="mae">Mãe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtipo</label>
              <select
                value={subtipoRelSelecionado}
                onChange={(e) => setSubtipoRelSelecionado(e.target.value as SubtipoRelacionamento)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="sangue">Sangue</option>
                <option value="adotivo">Adotivo</option>
                <option value="casamento">Casamento</option>
                <option value="uniao">União</option>
                <option value="separado">Separado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar pessoa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome da pessoa..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto border rounded-lg">
            {pessoasFiltradas.length > 0 ? (
              pessoasFiltradas.map((pessoa) => (
                <button
                  key={pessoa.id}
                  type="button"
                  onClick={() => handleAdicionarRelacionamentoPendente(pessoa)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                >
                  {pessoa.foto_principal_url ? (
                    <img
                      src={pessoa.foto_principal_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{pessoa.nome_completo}</p>
                    {pessoa.local_nascimento && (
                      <p className="text-xs text-gray-500 truncate">{pessoa.local_nascimento}</p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">
                Nenhuma pessoa encontrada.
              </div>
            )}
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
