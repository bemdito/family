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
import { createActivityLog } from '../../services/activityLogService';
import {
  listarArquivosHistoricosPorPessoa,
  substituirArquivosHistoricosDaPessoa,
} from '../../services/arquivosHistoricosService';
import {
  listarEventosDaPessoa,
  salvarEventosDaPessoa,
} from '../../services/personEventsService';
import {
  buildSocialProfilesFromRows,
  listarPessoaSocialProfiles,
  substituirPessoaSocialProfiles,
} from '../../services/pessoaSocialProfilesService';
import {
  gerarInsightsPessoa,
  getInsightByType,
  obterInsightsGeradosPessoa,
  PersonGeneratedInsight,
} from '../../services/personInsightsService';
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
} from '../../components/person/SocialProfilesEditor';
import { PersonBasicInfoFields } from '../../components/person/PersonBasicInfoFields';
import { PersonBioFields } from '../../components/person/PersonBioFields';
import { PersonContactFields } from '../../components/person/PersonContactFields';
import { PersonDatesLocationsFields } from '../../components/person/PersonDatesLocationsFields';
import { PersonEventsEditor } from '../../components/person/PersonEventsEditor';
import { PersonPrivacyFields } from '../../components/person/PersonPrivacyFields';
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
  isPersonDeceased,
  normalizeBirthDate,
  normalizeLocation,
  normalizeLocationByMode,
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

function getGeneratedInsightStatusLabel(insight?: PersonGeneratedInsight) {
  if (!insight) return 'Ausente';

  if (insight.status === 'completed') return 'Gerado';
  if (insight.status === 'pending') return 'Pendente';
  if (insight.status === 'error') return 'Erro';

  return insight.status;
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
  pendingMarriageDetails: MarriageDetailsForm;
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
      pendingMarriageDetails: normalizeMarriageDetails(draft.pendingMarriageDetails),
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
  const [generatedInsights, setGeneratedInsights] = useState<PersonGeneratedInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsActionLoading, setInsightsActionLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
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
            let loadedSocialProfiles = buildSocialProfilesFromPerson(pessoa);
            try {
              const socialProfileRows = await listarPessoaSocialProfiles(id);
              loadedSocialProfiles = buildSocialProfilesFromRows(socialProfileRows, pessoa);
            } catch (socialProfilesError) {
              toast.warning(
                socialProfilesError instanceof Error
                  ? `Não foi possível carregar redes sociais versionadas: ${socialProfilesError.message}`
                  : 'Não foi possível carregar redes sociais versionadas.',
              );
            }
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
              setSocialProfiles(draft?.socialProfiles ?? loadedSocialProfiles);
              setPersonEvents(draft?.personEvents ?? eventosDaPessoa);
              setPendingMarriageDetails(draft?.pendingMarriageDetails ?? createEmptyMarriageDetails());
              setSearchTerm(draft?.searchTerm ?? '');
              setTipoRelSelecionado(draft?.tipoRelSelecionado ?? 'pai');
              setSubtipoRelSelecionado(draft?.subtipoRelSelecionado ?? 'sangue');
            }
            setInitialData(JSON.stringify({
              formData: data,
              personEvents: eventosDaPessoa,
              pendingMarriageDetails: createEmptyMarriageDetails(),
            }));
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
        setPendingMarriageDetails(draft?.pendingMarriageDetails ?? createEmptyMarriageDetails());
        setSearchTerm(draft?.searchTerm ?? '');
        setTipoRelSelecionado(draft?.tipoRelSelecionado ?? 'pai');
        setSubtipoRelSelecionado(draft?.subtipoRelSelecionado ?? 'sangue');
        setInitialData(JSON.stringify({
          formData: emptyData,
          personEvents: [],
          pendingMarriageDetails: createEmptyMarriageDetails(),
        }));
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

  useEffect(() => {
    let mounted = true;

    async function loadInsightsForCurrentPerson() {
      if (!isEdit || !id) {
        setGeneratedInsights([]);
        setInsightsError(null);
        setInsightsLoading(false);
        return;
      }

      try {
        setInsightsLoading(true);
        setInsightsError(null);

        const insights = await obterInsightsGeradosPessoa(id);

        if (mounted) {
          setGeneratedInsights(insights);
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Erro ao carregar insights gerados.';
          setInsightsError(message);
        }
      } finally {
        if (mounted) {
          setInsightsLoading(false);
        }
      }
    }

    loadInsightsForCurrentPerson();

    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

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
    const currentData = JSON.stringify({ formData, personEvents, pendingMarriageDetails });
    setHasChanges(currentData !== initialData || relacionamentosPendentes.length > 0);
  }, [formData, initialData, pendingMarriageDetails, personEvents, relacionamentosPendentes]);

  useEffect(() => {
    if (!hasInitializedDraftRef.current || !hasUserEditedRef.current) return;

    writeAdminPessoaDraft(draftKey, {
      formData,
      relacionamentosPendentes,
      socialProfiles,
      personEvents,
      pendingMarriageDetails,
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
    pendingMarriageDetails,
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
      const formDataWithSocialProfile = syncFirstSocialProfileToPersonFields(formData, socialProfiles);
      const pessoaData = {
        ...formDataWithSocialProfile,
        ...cleanPersonPayload(formDataWithSocialProfile),
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
      try {
        await substituirPessoaSocialProfiles(pessoaCriada.id, socialProfiles, {
          exibirNoPerfil: pessoaData.permitir_exibir_rede_social !== false,
        });
      } catch (socialProfilesError) {
        toast.warning(
          socialProfilesError instanceof Error
            ? `Pessoa salva, mas não foi possível salvar redes sociais versionadas: ${socialProfilesError.message}`
            : 'Pessoa salva, mas não foi possível salvar redes sociais versionadas.',
        );
      }
      await salvarEventosDaPessoa(pessoaCriada.id, personEvents);

      const snapshotAtual = JSON.stringify({
        formData: {
          ...formData,
          lado: formData.lado || 'esquerda',
          arquivos_historicos: formData.arquivos_historicos || [],
        },
        personEvents,
        pendingMarriageDetails: createEmptyMarriageDetails(),
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

  const handleGenerateInsights = async (force = false) => {
    if (!id) return;

    try {
      setInsightsActionLoading(true);
      setInsightsError(null);


      await gerarInsightsPessoa(id, force);
      const refreshedInsights = await obterInsightsGeradosPessoa(id);
      setGeneratedInsights(refreshedInsights);

      await createActivityLog({
        action: force ? 'person_insights.regenerated' : 'person_insights.generated',
        entity_type: 'person',
        entity_id: id,
        entity_label: formData.nome_completo,
        metadata: {
          tipos: ['astrology', 'historical_events'],
          force,
          source: 'admin_person_form',
        },
      });

      toast.success(force ? 'Conteúdos regenerados com sucesso.' : 'Conteúdos gerados com sucesso.');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar insights.';
      setInsightsError(message);
      toast.error(message);
    } finally {
      setInsightsActionLoading(false);
    }
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

  const astrologyInsight = getInsightByType(generatedInsights, 'astrology');
  const historicalEventsInsight = getInsightByType(generatedInsights, 'historical_events');
  const hasAstrologyInsight = Boolean(astrologyInsight);
  const hasHistoricalEventsInsight = Boolean(historicalEventsInsight);
  const hasAllGeneratedInsights = hasAstrologyInsight && hasHistoricalEventsInsight;
  const canManageGeneratedInsights = Boolean(
    isEdit &&
    id &&
    formData.data_nascimento.trim() &&
    formData.humano_ou_pet !== 'Pet' &&
    formData.permitir_exibir_data_nascimento !== false
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

          <PersonBasicInfoFields
            value={formData}
            onChange={(field, value) => handleChange(field, value)}
          />

          <PersonDatesLocationsFields
            value={formData}
            isFalecido={isFalecido}
            onChange={(field, value) => handleChange(field, value)}
          />

          {isEdit && id && (
            <Card>
              <CardHeader>
                <CardTitle>Astrologia e acontecimentos do nascimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Gere ou regenere conteúdos persistidos para exibição no perfil. Esta ação usa a Edge Function
                  `generate-person-insights` e deve ser executada apenas quando necessário.
                </p>

                {insightsLoading && (
                  <p className="text-sm text-gray-500">Carregando insights gerados...</p>
                )}

                {insightsError && (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {insightsError}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Astrologia</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {getGeneratedInsightStatusLabel(astrologyInsight)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Acontecimentos históricos
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {getGeneratedInsightStatusLabel(historicalEventsInsight)}
                    </p>
                  </div>
                </div>

                {!canManageGeneratedInsights && (
                  <p className="text-sm text-gray-500">
                    Disponível apenas para pessoas humanas com data de nascimento exibível.
                  </p>
                )}

                {canManageGeneratedInsights && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleGenerateInsights(false)}
                      disabled={insightsActionLoading || hasAllGeneratedInsights}
                    >
                      {insightsActionLoading ? 'Processando...' : 'Gerar conteúdos ausentes'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleGenerateInsights(true)}
                      disabled={insightsActionLoading}
                    >
                      {insightsActionLoading ? 'Processando...' : 'Regenerar conteúdos'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <PersonBioFields
            value={formData}
            onChange={(field, value) => handleChange(field, value)}
          />

          {!isFalecido && (
            <PersonContactFields
              value={formData}
              socialProfiles={socialProfiles}
              onChange={(field, value) => handleChange(field, value)}
              onPhoneChange={handleTelefoneChange}
              onSocialProfilesChange={handleSocialProfilesChange}
            />
          )}

          <PersonPrivacyFields
            value={formData}
            onChange={(field, value) => handleChange(field, value)}
            onSocialPrivacyChange={handleRedeSocialPrivacyChange}
          />

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
