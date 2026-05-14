import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  adicionarPessoa,
  atualizarPessoa,
  obterPessoaPorId,
  adicionarRelacionamentoComInverso,
  obterTodasPessoas,
} from '../../services/dataService';
import {
  listarArquivosHistoricosPorPessoa,
  substituirArquivosHistoricosDaPessoa,
} from '../../services/arquivosHistoricosService';
import {
  listarEventosDaPessoa,
  salvarEventosDaPessoa,
} from '../../services/personEventsService';
import {
  TipoEntidade,
  ArquivoHistorico,
  Pessoa,
  PersonEvent,
  TipoRelacionamento,
  SubtipoRelacionamento,
  LadoPessoa,
} from '../../types';
import { ArrowLeft, Save, Plus, X, User, Search } from 'lucide-react';
import { FotoUpload } from '../../components/FotoUpload';
import { ArquivosHistoricos } from '../../components/ArquivosHistoricos';
import {
  SocialProfileForm,
  SocialProfilesEditor,
} from '../../components/person/SocialProfilesEditor';
import { PersonEventsEditor } from '../../components/person/PersonEventsEditor';
import {
  createEmptyMarriageDetails,
  MarriageDetailsEditor,
  MarriageDetailsForm,
  normalizeMarriageDetails,
} from '../../components/relationships/MarriageDetailsEditor';
import { RelacionamentoManagerWrapper } from '../../components/RelacionamentoManagerWrapper';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import {
  buildSocialProfilesFromPerson,
  cleanPersonPayload,
  formatPhone,
  getZodiacSignFromBirthDate,
  maskBirthDate,
  normalizeBirthDate,
  normalizeLocation,
  normalizeLocationByMode,
  isPersonDeceased,
  syncFirstSocialProfileToPersonFields,
  validateEditablePersonForm,
  validateLocationByMode,
} from '../../utils/personFields';
import { includesNormalizedText } from '../../utils/searchText';
import { toast } from 'sonner';

interface RelacionamentoPendente {
  pessoa: Pessoa;
  tipo: TipoRelacionamento;
  subtipo: SubtipoRelacionamento;
  marriageDetails?: MarriageDetailsForm;
}

function createEmptyAdminPessoaFormData() {
  return {
    nome_completo: '',
    data_nascimento: '',
    local_nascimento: '',
    local_nascimento_exterior: false,
    data_falecimento: '',
    local_falecimento: '',
    local_falecimento_exterior: false,
    falecido: false,
    local_atual: '',
    foto_principal_url: '',
    humano_ou_pet: 'Humano' as TipoEntidade,
    lado: 'esquerda' as LadoPessoa,
    manual_generation: '',
    minibio: '',
    curiosidades: '',
    telefone: '',
    endereco: '',
    rede_social: '',
    instagram_usuario: '',
    instagram_url: '',
    permitir_exibir_data_nascimento: true,
    permitir_exibir_endereco: true,
    permitir_exibir_rede_social: true,
    permitir_exibir_telefone: true,
    permitir_exibir_instagram: true,
    permitir_mensagens_whatsapp: true,
    arquivos_historicos: [] as ArquivoHistorico[],
  };
}

type AdminPessoaFormData = ReturnType<typeof createEmptyAdminPessoaFormData>;

type AdminPessoaDraft = {
  formData: AdminPessoaFormData;
  relacionamentosPendentes: RelacionamentoPendente[];
  socialProfiles: SocialProfileForm[];
  personEvents: PersonEvent[];
  searchTerm: string;
  tipoRelSelecionado: TipoRelacionamento;
  subtipoRelSelecionado: SubtipoRelacionamento;
};

function getAdminPessoaDraftKey(isEdit: boolean, id?: string) {
  return isEdit && id ? `admin-pessoa-form-draft:edit:${id}` : 'admin-pessoa-form-draft:new';
}

function readAdminPessoaDraft(key: string): AdminPessoaDraft | null {
  try {
    const rawDraft = window.sessionStorage.getItem(key);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<AdminPessoaDraft>;
    if (!draft.formData) return null;

    return {
      formData: {
        ...createEmptyAdminPessoaFormData(),
        ...draft.formData,
        arquivos_historicos: Array.isArray(draft.formData.arquivos_historicos)
          ? draft.formData.arquivos_historicos
          : [],
      },
      relacionamentosPendentes: Array.isArray(draft.relacionamentosPendentes)
        ? draft.relacionamentosPendentes
        : [],
      socialProfiles: Array.isArray(draft.socialProfiles) && draft.socialProfiles.length > 0
        ? draft.socialProfiles
        : buildSocialProfilesFromPerson(draft.formData),
      personEvents: Array.isArray(draft.personEvents) ? draft.personEvents : [],
      searchTerm: draft.searchTerm ?? '',
      tipoRelSelecionado: draft.tipoRelSelecionado ?? 'pai',
      subtipoRelSelecionado: draft.subtipoRelSelecionado ?? 'sangue',
    };
  } catch {
    return null;
  }
}

function writeAdminPessoaDraft(key: string, draft: AdminPessoaDraft) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Rascunho é auxiliar; falha de storage não deve bloquear edição.
  }
}

function removeAdminPessoaDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // noop
  }
}

export function AdminPessoaForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<AdminPessoaFormData>(() => createEmptyAdminPessoaFormData());

  const [initialData, setInitialData] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [relacionamentosPendentes, setRelacionamentosPendentes] = useState<RelacionamentoPendente[]>([]);
  const [showAddRelDialog, setShowAddRelDialog] = useState(false);
  const [todasPessoas, setTodasPessoas] = useState<Pessoa[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfileForm[]>(() => buildSocialProfilesFromPerson());
  const [personEvents, setPersonEvents] = useState<PersonEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoRelSelecionado, setTipoRelSelecionado] = useState<TipoRelacionamento>('pai');
  const [subtipoRelSelecionado, setSubtipoRelSelecionado] = useState<SubtipoRelacionamento>('sangue');
  const [pendingMarriageDetails, setPendingMarriageDetails] = useState<MarriageDetailsForm>(() => createEmptyMarriageDetails());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draftKey = useMemo(() => getAdminPessoaDraftKey(isEdit, id), [id, isEdit]);
  const hasInitializedDraftRef = useRef(false);
  const hasUserEditedRef = useRef(false);

  const isFalecido = isPersonDeceased(formData);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      hasInitializedDraftRef.current = false;
      hasUserEditedRef.current = false;
      const draft = readAdminPessoaDraft(draftKey);

      if (isEdit && id) {
        try {
          const pessoa = await obterPessoaPorId(id);

          if (pessoa && mounted) {
            const arquivosHistoricos = await listarArquivosHistoricosPorPessoa(id);
            const eventosDaPessoa = await listarEventosDaPessoa(id);
            const data = {
              nome_completo: pessoa.nome_completo || '',
              data_nascimento: pessoa.data_nascimento?.toString() || '',
              local_nascimento: pessoa.local_nascimento || '',
              local_nascimento_exterior: pessoa.local_nascimento_exterior ?? false,
              data_falecimento: pessoa.data_falecimento?.toString() || '',
              local_falecimento: pessoa.local_falecimento || '',
              local_falecimento_exterior: pessoa.local_falecimento_exterior ?? false,
              falecido: pessoa.falecido ?? Boolean(pessoa.data_falecimento || pessoa.local_falecimento),
              local_atual: pessoa.local_atual || '',
              foto_principal_url: pessoa.foto_principal_url || '',
              humano_ou_pet: pessoa.humano_ou_pet || ('Humano' as TipoEntidade),
              lado: (pessoa.lado as LadoPessoa) || 'esquerda',
              manual_generation: pessoa.manual_generation?.toString() || '',
              minibio: pessoa.minibio || '',
              curiosidades: pessoa.curiosidades || '',
              telefone: pessoa.telefone || '',
              endereco: pessoa.endereco || '',
              rede_social: pessoa.rede_social || '',
              instagram_usuario: pessoa.instagram_usuario || '',
              instagram_url: pessoa.instagram_url || '',
              permitir_exibir_data_nascimento: pessoa.permitir_exibir_data_nascimento ?? true,
              permitir_exibir_endereco: pessoa.permitir_exibir_endereco ?? true,
              permitir_exibir_rede_social: pessoa.permitir_exibir_rede_social ?? pessoa.permitir_exibir_instagram ?? true,
              permitir_exibir_telefone: pessoa.permitir_exibir_telefone ?? true,
              permitir_exibir_instagram: pessoa.permitir_exibir_instagram ?? pessoa.permitir_exibir_rede_social ?? true,
              permitir_mensagens_whatsapp: pessoa.permitir_mensagens_whatsapp ?? true,
              arquivos_historicos: arquivosHistoricos,
            };

            const nextFormData = draft?.formData ?? data;
            if (draft || !hasUserEditedRef.current) {
              setFormData(nextFormData);
              setRelacionamentosPendentes(draft?.relacionamentosPendentes ?? []);
              setSocialProfiles(draft?.socialProfiles ?? buildSocialProfilesFromPerson(pessoa));
              setPersonEvents(draft?.personEvents ?? eventosDaPessoa);
              setSearchTerm(draft?.searchTerm ?? '');
              setTipoRelSelecionado(draft?.tipoRelSelecionado ?? 'pai');
              setSubtipoRelSelecionado(draft?.subtipoRelSelecionado ?? 'sangue');
            }
            setInitialData(JSON.stringify({ formData: data, personEvents: eventosDaPessoa }));
            if (draft) hasUserEditedRef.current = true;
          }
        } catch (error) {
          console.error('Erro ao carregar pessoa:', error);
          toast.error('Erro ao carregar dados da pessoa');
        }
      } else {
        const emptyData = createEmptyAdminPessoaFormData();
        setFormData(draft?.formData ?? emptyData);
        setRelacionamentosPendentes(draft?.relacionamentosPendentes ?? []);
        setSocialProfiles(draft?.socialProfiles ?? buildSocialProfilesFromPerson());
        setPersonEvents(draft?.personEvents ?? []);
        setSearchTerm(draft?.searchTerm ?? '');
        setTipoRelSelecionado(draft?.tipoRelSelecionado ?? 'pai');
        setSubtipoRelSelecionado(draft?.subtipoRelSelecionado ?? 'sangue');
        setInitialData(JSON.stringify({ formData: emptyData, personEvents: [] }));
        hasUserEditedRef.current = Boolean(draft);
        await loadTodasPessoas();
      }

      if (mounted) {
        hasInitializedDraftRef.current = true;
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [draftKey, isEdit, id]);

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
    const currentData = JSON.stringify({ formData, personEvents });
    setHasChanges(currentData !== initialData || relacionamentosPendentes.length > 0);
  }, [formData, initialData, personEvents, relacionamentosPendentes]);

  useEffect(() => {
    if (!hasInitializedDraftRef.current || !hasUserEditedRef.current) return;

    writeAdminPessoaDraft(draftKey, {
      formData,
      relacionamentosPendentes,
      socialProfiles,
      personEvents,
      searchTerm,
      tipoRelSelecionado,
      subtipoRelSelecionado,
    });
  }, [
    draftKey,
    formData,
    relacionamentosPendentes,
    socialProfiles,
    personEvents,
    searchTerm,
    tipoRelSelecionado,
    subtipoRelSelecionado,
  ]);

  const shouldBlockNavigation = hasChanges && !isSubmitting;
  const { showPrompt, confirmNavigation, cancelNavigation } = useUnsavedChanges(shouldBlockNavigation);

  const markDraftDirty = () => {
    hasUserEditedRef.current = true;
  };

  const handleConfirmDiscardChanges = () => {
    removeAdminPessoaDraft(draftKey);
    confirmNavigation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const pessoaData = {
        ...formData,
        ...cleanPersonPayload(formData),
        data_nascimento: normalizeBirthDate(formData.data_nascimento) || undefined,
        data_falecimento: normalizeBirthDate(formData.data_falecimento) || undefined,
        falecido: isFalecido,
        local_nascimento: normalizeLocationByMode(formData.local_nascimento, {
          international: formData.local_nascimento_exterior,
        }),
        local_atual: normalizeLocation(formData.local_atual),
        local_falecimento: normalizeLocationByMode(formData.local_falecimento, {
          international: formData.local_falecimento_exterior,
        }),
        local_nascimento_exterior: formData.local_nascimento_exterior === true,
        local_falecimento_exterior: formData.local_falecimento_exterior === true,
        lado: formData.lado || 'esquerda',
        manual_generation: formData.manual_generation ? Number(formData.manual_generation) : null,
      };

      const validationErrors = validateEditablePersonForm(pessoaData);
      const deathLocationError = validateLocationByMode(String(pessoaData.local_falecimento ?? ''), {
        international: pessoaData.local_falecimento_exterior === true,
      });
      if (deathLocationError) {
        (validationErrors as Record<string, string>).local_falecimento = deathLocationError;
      }
      if (Object.keys(validationErrors).length > 0) {
        toast.error(Object.values(validationErrors)[0] ?? 'Revise os campos antes de salvar.');
        return;
      }
      const invalidEvent = personEvents.find((event) => !event.titulo.trim());
      if (invalidEvent) {
        toast.error('Informe o título de todos os eventos da vida ou remova os eventos vazios.');
        return;
      }

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
              await adicionarRelacionamentoComInverso({
                pessoa_origem_id: pessoaCriada.id,
                pessoa_destino_id: relPendente.pessoa.id,
                tipo_relacionamento: relPendente.tipo,
                subtipo_relacionamento: relPendente.subtipo,
                ...(relPendente.tipo === 'conjuge'
                  ? {
                      data_casamento: relPendente.marriageDetails?.data_casamento.trim() || undefined,
                      local_casamento: relPendente.marriageDetails?.local_casamento.trim() || undefined,
                      ativo: relPendente.marriageDetails?.ativo ?? true,
                      data_separacao: relPendente.marriageDetails?.data_separacao.trim() || undefined,
                      local_separacao: relPendente.marriageDetails?.local_separacao.trim() || undefined,
                      observacoes: relPendente.marriageDetails?.observacoes.trim() || undefined,
                    }
                  : {}),
              }, { inverseTipoForFilho: 'pai' });

              relsCriados++;
            } catch (error) {
              console.error('Erro ao criar relacionamento:', error);
            }
          }

          toast.success(`${relsCriados} relacionamento(s) criado(s)!`);
        }
      }

      await substituirArquivosHistoricosDaPessoa(pessoaCriada.id, formData.arquivos_historicos || []);
      await salvarEventosDaPessoa(pessoaCriada.id, personEvents);

      const snapshotAtual = JSON.stringify({
        formData: {
          ...formData,
          lado: formData.lado || 'esquerda',
          arquivos_historicos: formData.arquivos_historicos || [],
        },
        personEvents,
      });

      setInitialData(snapshotAtual);
      setRelacionamentosPendentes([]);
      removeAdminPessoaDraft(draftKey);
      hasUserEditedRef.current = false;
      setHasChanges(false);
      navigate('/admin/pessoas');
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error);
      toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonEventsChange = (eventos: PersonEvent[]) => {
    markDraftDirty();
    setPersonEvents(eventos);
  };

  const handleChange = (field: string, value: string | boolean | ArquivoHistorico[]) => {
    markDraftDirty();
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...((field === 'data_falecimento' || field === 'local_falecimento') && String(value).trim()
        ? { falecido: true }
        : {}),
    }));
  };

  const handleRedeSocialPrivacyChange = (checked: boolean) => {
    markDraftDirty();
    setFormData((prev) => ({
      ...prev,
      permitir_exibir_rede_social: checked,
      permitir_exibir_instagram: checked,
    }));
  };

  const handleSocialProfilesChange = (nextProfiles: SocialProfileForm[]) => {
    markDraftDirty();
    setSocialProfiles(nextProfiles);
    setFormData((prev) => syncFirstSocialProfileToPersonFields(prev, nextProfiles));
  };

  const handleTelefoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleChange('telefone', formatted);
  };

  const handleCloseRelacionamentoDialog = () => {
    setShowAddRelDialog(false);
    setSearchTerm('');
    setPendingMarriageDetails(createEmptyMarriageDetails());
  };

  const handleAdicionarRelacionamentoPendente = (pessoa: Pessoa) => {
    markDraftDirty();
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
        marriageDetails: tipoRelSelecionado === 'conjuge'
          ? normalizeMarriageDetails(pendingMarriageDetails)
          : undefined,
      },
    ]);

    setPendingMarriageDetails(createEmptyMarriageDetails());
    handleCloseRelacionamentoDialog();
    toast.success(`${pessoa.nome_completo} adicionado(a) à lista`);
  };

  const handleRemoverRelacionamentoPendente = (pessoaId: string, tipo?: TipoRelacionamento) => {
    markDraftDirty();
    setRelacionamentosPendentes((prev) =>
      prev.filter((r) => !(r.pessoa.id === pessoaId && (!tipo || r.tipo === tipo)))
    );
  };

  const handlePendingMarriageDetailsChange = (
    pessoaId: string,
    tipo: TipoRelacionamento,
    details: MarriageDetailsForm
  ) => {
    markDraftDirty();
    setRelacionamentosPendentes((prev) => prev.map((rel) => (
      rel.pessoa.id === pessoaId && rel.tipo === tipo
        ? { ...rel, marriageDetails: normalizeMarriageDetails(details) }
        : rel
    )));
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

    return includesNormalizedText(p.nome_completo, searchTerm);
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
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/admin/pessoas')}>
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
                pessoaId={id}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onChange={(e) => handleChange('data_nascimento', maskBirthDate(e.target.value))}
                    placeholder="Ex: 1990 ou 15/03/1990"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signo</label>
                  <Input
                    type="text"
                    value={getZodiacSignFromBirthDate(formData.data_nascimento) || 'Não identificado'}
                    readOnly
                    className="bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Local de Nascimento</label>
                  <Input
                    type="text"
                    value={formData.local_nascimento}
                    onChange={(e) => handleChange('local_nascimento', e.target.value)}
                    onBlur={() => handleChange('local_nascimento', normalizeLocationByMode(formData.local_nascimento, {
                      international: formData.local_nascimento_exterior,
                    }))}
                    placeholder={formData.local_nascimento_exterior ? 'Ex: Dublin (Irlanda)' : 'Ex: São Paulo/SP'}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.local_nascimento_exterior === true}
                      onChange={(event) => handleChange('local_nascimento_exterior', event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Local de nascimento fora do Brasil
                  </label>
                </div>

                <div className="md:col-span-2">
                  <PrivacyCheckbox
                    label="Pessoa falecida"
                    description="Marque mesmo que a data ou o local de falecimento sejam desconhecidos."
                    checked={formData.falecido === true}
                    onChange={(checked) => handleChange('falecido', checked)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Falecimento</label>
                  <Input
                    type="text"
                    value={formData.data_falecimento}
                    onChange={(e) => handleChange('data_falecimento', maskBirthDate(e.target.value))}
                    placeholder="Ex: 2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Local de Falecimento</label>
                  <Input
                    type="text"
                    value={formData.local_falecimento}
                    onChange={(e) => handleChange('local_falecimento', e.target.value)}
                    onBlur={() => handleChange('local_falecimento', normalizeLocationByMode(formData.local_falecimento, {
                      international: formData.local_falecimento_exterior,
                    }))}
                    placeholder={formData.local_falecimento_exterior ? 'Ex: Lisboa (Portugal)' : 'Ex: Rio de Janeiro/RJ'}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.local_falecimento_exterior === true}
                      onChange={(event) => handleChange('local_falecimento_exterior', event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Local de falecimento fora do Brasil
                  </label>
                </div>

                {!isFalecido && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Local Atual (residência)</label>
                    <Input
                      type="text"
                      value={formData.local_atual}
                      onChange={(e) => handleChange('local_atual', e.target.value)}
                      onBlur={() => handleChange('local_atual', normalizeLocation(formData.local_atual))}
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
                </div>

                <SocialProfilesEditor
                  profiles={socialProfiles}
                  onChange={handleSocialProfilesChange}
                />

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

          <Card>
            <CardHeader>
              <CardTitle>Privacidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Defina quais dados pessoais podem aparecer para outros familiares. Essas opções podem ser ajustadas depois.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PrivacyCheckbox
                  label="Exibir minha data de nascimento para outros familiares"
                  checked={formData.permitir_exibir_data_nascimento !== false}
                  onChange={(checked) => handleChange('permitir_exibir_data_nascimento', checked)}
                />
                <PrivacyCheckbox
                  label="Exibir meu telefone para outros familiares"
                  checked={formData.permitir_exibir_telefone !== false}
                  onChange={(checked) => handleChange('permitir_exibir_telefone', checked)}
                />
                <PrivacyCheckbox
                  label="Exibir meu endereço para outros familiares"
                  checked={formData.permitir_exibir_endereco !== false}
                  onChange={(checked) => handleChange('permitir_exibir_endereco', checked)}
                />
                <PrivacyCheckbox
                  label="Exibir minha rede social para outros familiares"
                  checked={formData.permitir_exibir_rede_social !== false && formData.permitir_exibir_instagram !== false}
                  onChange={handleRedeSocialPrivacyChange}
                />
                <PrivacyCheckbox
                  label="Permitir mensagens por WhatsApp"
                  checked={formData.permitir_mensagens_whatsapp !== false}
                  onChange={(checked) => handleChange('permitir_mensagens_whatsapp', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <ArquivosHistoricos
            arquivos={formData.arquivos_historicos}
            onChange={(arquivos) => handleChange('arquivos_historicos', arquivos)}
            pessoaId={id}
          />

          <Card>
            <CardHeader>
              <CardTitle>Eventos da vida</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonEventsEditor
                eventos={personEvents}
                onChange={handlePersonEventsChange}
              />
            </CardContent>
          </Card>

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
                              markDraftDirty();
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
                              markDraftDirty();
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
                        markDraftDirty();
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
                        <div key={`${rel.pessoa.id}-${rel.tipo}`} className="rounded-lg border bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
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
                          {rel.tipo === 'conjuge' && (
                            <div className="mt-3">
                              <MarriageDetailsEditor
                                value={rel.marriageDetails ?? createEmptyMarriageDetails()}
                                onChange={(details) => handlePendingMarriageDetailsChange(rel.pessoa.id, rel.tipo, details)}
                                isAdmin
                                allowHistoricalFiles
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isEdit && id && (
            <RelacionamentoManagerWrapper
              pessoaId={id}
              pessoaNome={formData.nome_completo || 'Pessoa'}
            />
          )}
        </form>
      </main>

      <ConfirmDialog
        open={showPrompt}
        onOpenChange={(open) => {
          if (!open) cancelNavigation();
        }}
        onConfirm={handleConfirmDiscardChanges}
        title="Descartar alterações?"
        description="Você tem alterações não salvas. Se sair agora, elas serão perdidas."
      />

      <Dialog
        open={showAddRelDialog}
        onOpenChange={(open) => {
          if (open) {
            setShowAddRelDialog(true);
            return;
          }

          handleCloseRelacionamentoDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar relacionamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={tipoRelSelecionado}
                  onChange={(e) => {
                    markDraftDirty();
                    const nextTipo = e.target.value as TipoRelacionamento;
                    setTipoRelSelecionado(nextTipo);
                    setSubtipoRelSelecionado(nextTipo === 'conjuge' ? 'casamento' : 'sangue');
                    if (nextTipo !== 'conjuge') {
                      setPendingMarriageDetails(createEmptyMarriageDetails());
                    }
                  }}
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
                  onChange={(e) => {
                    markDraftDirty();
                    setSubtipoRelSelecionado(e.target.value as SubtipoRelacionamento);
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {tipoRelSelecionado === 'conjuge' ? (
                    <>
                      <option value="casamento">Casamento</option>
                      <option value="uniao">União</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar pessoa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    markDraftDirty();
                    setSearchTerm(e.target.value);
                  }}
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

            {tipoRelSelecionado === 'conjuge' && (
              <MarriageDetailsEditor
                value={pendingMarriageDetails}
                onChange={(details) => {
                  markDraftDirty();
                  setPendingMarriageDetails(details);
                }}
                isAdmin
                allowHistoricalFiles
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRelacionamentoDialog}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrivacyCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
      />
      <span>
        <span className="block">{label}</span>
        {description && <span className="mt-1 block text-xs text-gray-500">{description}</span>}
      </span>
    </label>
  );
}
