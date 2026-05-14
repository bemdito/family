import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { useNavigate } from 'react-router';
import { Camera, ImagePlus, Info, Save, Trash2, UploadCloud, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { ArquivosHistoricos } from '../components/ArquivosHistoricos';
import {
  SocialProfileForm,
  SocialProfilesEditor,
} from '../components/person/SocialProfilesEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import {
  GoogleAddressComponent,
  GooglePlaceResult,
  GooglePlacesAutocomplete,
  loadGoogleMapsPlaces,
} from '../lib/googleMapsLoader';
import {
  EditableOwnPersonPayload,
  ensureMemberProfile,
  getPrimaryLinkedPersonWithPessoa,
  resolveFirstAccessLinkForUser,
  updateOwnLinkedPerson,
  UserPersonLinkRecord,
} from '../services/memberProfileService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  obterPreferenciasNotificacao,
  salvarPreferenciasNotificacao,
} from '../services/userEngagementService';
import { uploadPersonAvatarFile } from '../services/storageService';
import {
  listarArquivosHistoricosPorPessoa,
  substituirArquivosHistoricosDaPessoa,
} from '../services/arquivosHistoricosService';
import { ArquivoHistorico, Pessoa, PreferenciaNotificacao } from '../types';
import {
  buildEditablePersonFormState,
  cleanPersonPayload,
  formatPersonName,
  formatPhone,
  getInitials,
  maskBirthDate,
  normalizeBirthDate,
  normalizeLocation,
  normalizeLocationByMode,
  PersonFieldErrors,
  buildSocialProfilesFromPerson,
  createSocialProfile,
  syncFirstSocialProfileToPersonFields,
  validateEditablePersonForm,
  validateLocation,
  validateLocationByMode,
} from '../utils/personFields';
import { getZodiacSignFromBirthDate } from '../utils/zodiac';

const AVATAR_SIZE = 512;
const LOCATION_FORMAT_HELPER = 'Use o formato Nome da Cidade/UF. Exemplo: São José dos Pinhais/PR.';
const INTERNATIONAL_LOCATION_FORMAT_HELPER = 'Use o formato Nome da Cidade (País). Exemplo: Dublin (Irlanda).';

type NotificationPreferenceKey =
  | 'receber_aniversarios'
  | 'receber_datas_memoria'
  | 'receber_eventos'
  | 'receber_avisos_gerais'
  | 'receber_email'
  | 'receber_push'
  | 'receber_whatsapp'
  | 'receber_email_novo_usuario'
  | 'receber_email_datas_especiais'
  | 'receber_email_novas_mensagens_forum'
  | 'receber_email_novos_registros_historicos'
  | 'receber_email_evento_historico_familia';

const NOTIFICATION_OPTIONS: Array<{ key: NotificationPreferenceKey; label: string; description: string }> = [
  {
    key: 'receber_aniversarios',
    label: 'Aniversários',
    description: 'Avisos sobre aniversários de familiares.',
  },
  {
    key: 'receber_datas_memoria',
    label: 'Datas de memória',
    description: 'Lembretes de datas marcantes da família.',
  },
  {
    key: 'receber_eventos',
    label: 'Eventos familiares',
    description: 'Convites e atualizações de eventos.',
  },
  {
    key: 'receber_avisos_gerais',
    label: 'Avisos gerais',
    description: 'Comunicados importantes da plataforma.',
  },
  {
    key: 'receber_email',
    label: 'Receber emails',
    description: 'Controle geral para emails opcionais.',
  },
  {
    key: 'receber_push',
    label: 'Receber notificações push',
    description: 'Avisos pelo navegador quando disponíveis.',
  },
  {
    key: 'receber_whatsapp',
    label: 'Receber avisos por WhatsApp',
    description: 'Comunicações familiares por WhatsApp quando disponíveis.',
  },
  {
    key: 'receber_email_novo_usuario',
    label: 'Email sobre novo usuário',
    description: 'Quando um novo familiar entra na plataforma.',
  },
  {
    key: 'receber_email_datas_especiais',
    label: 'Email sobre datas especiais',
    description: 'Aniversários, memórias e datas importantes.',
  },
  {
    key: 'receber_email_novas_mensagens_forum',
    label: 'Email sobre mensagens no fórum',
    description: 'Atualizações em conversas familiares.',
  },
  {
    key: 'receber_email_novos_registros_historicos',
    label: 'Email sobre registros históricos',
    description: 'Fotos, documentos e memórias adicionados.',
  },
  {
    key: 'receber_email_evento_historico_familia',
    label: 'Email sobre evento histórico',
    description: 'Avisos relacionados à história familiar.',
  },
];

type MeusDadosDraft = {
  form: EditableOwnPersonPayload;
  complemento: string;
  socialProfiles: SocialProfileForm[];
  archives: ArquivoHistorico[];
};

// Futuro banco: substituir campos rede_social/instagram_usuario por pessoa_social_profiles
// (id, pessoa_id, rede, perfil, url, exibir_no_perfil, created_at, updated_at).

function getAddressComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  name: 'long_name' | 'short_name' = 'long_name',
) {
  return components?.find((component) => component.types.includes(type))?.[name] ?? '';
}

function joinAddressParts(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ');
}

function getDraftKey(userId: string, pessoaId: string) {
  return `meus-dados-draft:${userId}:${pessoaId}`;
}

function readMeusDadosDraft(key: string): MeusDadosDraft | null {
  try {
    const rawDraft = window.sessionStorage.getItem(key);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<MeusDadosDraft>;
    if (!draft.form || !Array.isArray(draft.socialProfiles)) return null;

    return {
      form: draft.form,
      complemento: draft.complemento ?? '',
      socialProfiles: draft.socialProfiles.length > 0 ? draft.socialProfiles : [createSocialProfile()],
      archives: Array.isArray(draft.archives) ? draft.archives : [],
    };
  } catch {
    return null;
  }
}

function writeMeusDadosDraft(key: string, draft: MeusDadosDraft) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Rascunho é uma proteção auxiliar; falhas de storage não devem bloquear a edição.
  }
}

function removeMeusDadosDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // noop
  }
}

function formatGooglePlaceAddress(place: GooglePlaceResult) {
  const components = place.address_components;
  if (!components?.length) return place.formatted_address ?? '';

  const street = getAddressComponent(components, 'route');
  const number = getAddressComponent(components, 'street_number');
  const neighborhood =
    getAddressComponent(components, 'sublocality_level_1') ||
    getAddressComponent(components, 'sublocality') ||
    getAddressComponent(components, 'neighborhood');
  const city =
    getAddressComponent(components, 'locality') ||
    getAddressComponent(components, 'administrative_area_level_2') ||
    getAddressComponent(components, 'postal_town');
  const state = getAddressComponent(components, 'administrative_area_level_1', 'short_name');
  const postalCode = getAddressComponent(components, 'postal_code');
  const postalCodeSuffix = getAddressComponent(components, 'postal_code_suffix');
  const fullPostalCode = [postalCode, postalCodeSuffix].filter(Boolean).join('-');
  const cityState = [city, state].filter(Boolean).join('/');
  const streetLine = joinAddressParts([street, number]);
  const address = joinAddressParts([streetLine, neighborhood, cityState, fullPostalCode ? `CEP ${fullPostalCode}` : '']);

  return address || (place.formatted_address ?? '');
}

function readImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });
}

async function createCroppedAvatarBlob(imageSrc: string, cropPixels: Area) {
  const image = await readImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Não foi possível preparar o corte da imagem.');
  }

  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Não foi possível gerar o JPEG final.'));
        return;
      }

      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

export function MeusDados() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedFormRef = useRef(false);
  const initializedPessoaIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const [link, setLink] = useState<(UserPersonLinkRecord & { pessoa: Pessoa | null }) | null>(null);
  const [form, setForm] = useState<EditableOwnPersonPayload>(buildEditablePersonFormState());
  const [complemento, setComplemento] = useState('');
  const [socialProfiles, setSocialProfiles] = useState<SocialProfileForm[]>(() => [createSocialProfile()]);
  const [notificationPreferences, setNotificationPreferences] = useState<PreferenciaNotificacao | null>(null);
  const [errors, setErrors] = useState<PersonFieldErrors>({});
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [croppedPhotoBlob, setCroppedPhotoBlob] = useState<Blob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archives, setArchives] = useState<ArquivoHistorico[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user) return;

      setLoading(true);
      await resolveFirstAccessLinkForUser(user);
      const { data, error } = await getPrimaryLinkedPersonWithPessoa(user.id);

      if (!mounted) return;

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      const nextPessoaId = data?.pessoa?.id ?? null;
      const samePessoa = nextPessoaId && initializedPessoaIdRef.current === nextPessoaId;
      const shouldPreserveDraft = hasInitializedFormRef.current && isDirtyRef.current && samePessoa;
      const draftKey = user.id && nextPessoaId ? getDraftKey(user.id, nextPessoaId) : null;
      const draft = draftKey && !shouldPreserveDraft ? readMeusDadosDraft(draftKey) : null;

      setLink(data);

      if (nextPessoaId) {
        try {
          const nextArchives = await listarArquivosHistoricosPorPessoa(nextPessoaId);
          if (mounted && !shouldPreserveDraft) setArchives(draft?.archives ?? nextArchives);
        } catch (archivesError) {
          if (mounted) {
            toast.error(
              archivesError instanceof Error
                ? archivesError.message
                : 'Não foi possível carregar arquivos históricos.',
            );
          }
        }
      } else if (!shouldPreserveDraft) {
        setArchives([]);
      }

      if (!shouldPreserveDraft) {
        setForm(draft?.form ?? buildEditablePersonFormState(data?.pessoa));
        setSocialProfiles(draft?.socialProfiles ?? buildSocialProfilesFromPerson(data?.pessoa));
        setComplemento(draft?.complemento ?? '');
        isDirtyRef.current = Boolean(draft);
      }

      const preferences = await obterPreferenciasNotificacao(user.id);
      if (!mounted) return;
      setNotificationPreferences({
        ...preferences,
        ...Object.fromEntries(
          Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([key, defaultValue]) => [
            key,
            (preferences as Record<string, unknown>)[key] === false ? false : defaultValue,
          ]),
        ),
      } as PreferenciaNotificacao);

      hasInitializedFormRef.current = true;
      initializedPessoaIdRef.current = nextPessoaId;
      setPhotoMarkedForRemoval(false);
      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const input = addressInputRef.current;

    if (!apiKey) {
      if (import.meta.env.DEV) {
        console.warn('[Google Maps] VITE_GOOGLE_MAPS_API_KEY ausente; autocomplete de endereço desativado.');
      }
      return;
    }

    if (loading || !input) return;

    let active = true;
    let autocomplete: GooglePlacesAutocomplete | undefined;
    let listener: { remove: () => void } | undefined;

    loadGoogleMapsPlaces(apiKey)
      .then((googleMaps) => {
        if (!active || !googleMaps || !addressInputRef.current) return;

        const brazilBounds = new googleMaps.maps.LatLngBounds(
          { lat: -33.75, lng: -73.99 },
          { lat: 5.27, lng: -34.79 },
        );

        autocomplete = new googleMaps.maps.places.Autocomplete(addressInputRef.current, {
          bounds: brazilBounds,
          componentRestrictions: { country: 'br' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
          strictBounds: false,
          types: ['geocode'],
        });

        if (import.meta.env.DEV) {
          console.debug('[Google Maps] Autocomplete de endereço inicializado.');
        }

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();

          if (!place?.address_components?.length && import.meta.env.DEV) {
            console.warn('[Google Maps] place_changed sem address_components.', place);
          }

          const selectedAddress = place ? formatGooglePlaceAddress(place) : '';
          if (!selectedAddress) return;

          markFormDirty();
          setForm((current) => ({
            ...current,
            endereco: selectedAddress,
          }));
          setErrors((current) => ({
            ...current,
            endereco: undefined,
          }));
        });
      })
      .catch((error) => {
        if (active && import.meta.env.DEV) {
          console.warn('[Google Maps] Não foi possível carregar Places.', error);
        }
      });

    return () => {
      active = false;
      listener?.remove();
      if (autocomplete && window.google?.maps.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [loading]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    };
  }, [cropImageUrl]);

  useEffect(() => {
    const pessoaId = link?.pessoa?.id;
    if (!user?.id || !pessoaId || !hasInitializedFormRef.current || !isDirtyRef.current) return;

    writeMeusDadosDraft(getDraftKey(user.id, pessoaId), {
      form,
      complemento,
      socialProfiles,
      archives,
    });
  }, [archives, complemento, form, link?.pessoa?.id, socialProfiles, user?.id]);

  const pessoa = link?.pessoa;
  const previewName = useMemo(() => {
    const name = formatPersonName(String(form.nome_completo ?? '').trim());
    return name || pessoa?.nome_completo || 'Minha pessoa na árvore';
  }, [form.nome_completo, pessoa?.nome_completo]);

  const previewLocation = useMemo(() => {
    if (form.local_atual) return normalizeLocation(String(form.local_atual)) || 'Sem local informado';
    return normalizeLocationByMode(String(form.local_nascimento || ''), {
      international: form.local_nascimento_exterior === true,
    }) || 'Sem local informado';
  }, [form.local_atual, form.local_nascimento, form.local_nascimento_exterior]);

  const currentPhotoUrl = photoMarkedForRemoval ? '' : photoPreviewUrl || String(form.foto_principal_url ?? '');
  const zodiacSign = useMemo(
    () => getZodiacSignFromBirthDate(form.data_nascimento),
    [form.data_nascimento],
  );
  const shouldSuggestFullBirthDate = /^\d{4}$/.test(String(form.data_nascimento ?? '').trim());

  const markFormDirty = () => {
    isDirtyRef.current = true;
  };

  const updateField = (field: keyof EditableOwnPersonPayload, value: string | boolean) => {
    markFormDirty();
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const updateTextField = (field: keyof EditableOwnPersonPayload, value: string) => {
    if (field === 'data_nascimento') {
      updateField(field, maskBirthDate(value));
      return;
    }

    if (field === 'telefone') {
      updateField(field, formatPhone(value));
      return;
    }

    updateField(field, value);
  };

  const syncFirstSocialProfileToLegacyFields = (profiles: SocialProfileForm[]) => {
    markFormDirty();
    setForm((current) => syncFirstSocialProfileToPersonFields(current, profiles));
    setErrors((current) => ({
      ...current,
      rede_social: undefined,
      instagram_usuario: undefined,
    }));
  };

  const handleSocialProfilesChange = (nextProfiles: SocialProfileForm[]) => {
    markFormDirty();
    setSocialProfiles(nextProfiles);
    syncFirstSocialProfileToLegacyFields(nextProfiles);
  };

  const updateNotificationPreference = (key: NotificationPreferenceKey, checked: boolean) => {
    setNotificationPreferences((current) => ({
      id: current?.id ?? `local-${user?.id ?? 'user'}`,
      user_id: current?.user_id ?? user?.id ?? '',
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...current,
      [key]: checked,
    }));
  };

  const normalizeFieldOnBlur = (field: keyof EditableOwnPersonPayload) => {
    const value = String(form[field] ?? '');

    if (field === 'nome_completo') updateField(field, formatPersonName(value));
    if (field === 'data_nascimento') updateField(field, normalizeBirthDate(value));
    if (field === 'local_nascimento' || field === 'local_atual') {
      const normalizedLocation = field === 'local_nascimento'
        ? normalizeLocationByMode(value, { international: form.local_nascimento_exterior === true })
        : normalizeLocation(value);
      updateField(field, normalizedLocation);
      setErrors((current) => ({
        ...current,
        [field]: field === 'local_nascimento'
          ? validateLocationByMode(normalizedLocation, { international: form.local_nascimento_exterior === true })
          : validateLocation(normalizedLocation),
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = validateEditablePersonForm(form);
    const normalizedName = formatPersonName(String(form.nome_completo ?? ''));
    const normalizedBirthDate = normalizeBirthDate(String(form.data_nascimento ?? ''));
    const normalizedBirthLocation = normalizeLocationByMode(String(form.local_nascimento ?? ''), {
      international: form.local_nascimento_exterior === true,
    });
    const normalizedCurrentLocation = normalizeLocation(String(form.local_atual ?? ''));

    setErrors(nextErrors);
    setForm((current) => ({
      ...current,
      nome_completo: normalizedName,
      data_nascimento: normalizedBirthDate,
      local_nascimento: normalizedBirthLocation,
      local_atual: normalizedCurrentLocation,
      telefone: formatPhone(String(current.telefone ?? '')),
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const handlePhotoFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }

    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPhotoMarkedForRemoval(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setPhotoPreviewUrl(null);
    setCropImageUrl(null);
    setCroppedPhotoBlob(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPhotoMarkedForRemoval(true);
    setPhotoDialogOpen(false);
  };

  const handleApplyCrop = async () => {
    if (!cropImageUrl || !croppedAreaPixels) {
      toast.error('Selecione e ajuste uma imagem antes de aplicar.');
      return;
    }

    try {
      const blob = await createCroppedAvatarBlob(cropImageUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(blob);

      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(previewUrl);
      setCroppedPhotoBlob(blob);
      setPhotoMarkedForRemoval(false);
      setPhotoDialogOpen(false);
      toast.success('Corte aplicado ao avatar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aplicar o corte.');
    }
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    if (!user || !pessoa?.id) return { error: 'Não foi possível localizar o usuário para salvar a foto.', url: null };

    try {
      const upload = await uploadPersonAvatarFile(blob, { pessoaId: pessoa.id });
      return { error: undefined, url: upload.url };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Não foi possível enviar a foto.',
        url: null,
      };
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !link?.id || !pessoa?.id) {
      toast.error('Não foi possível localizar seu vínculo com a árvore.');
      return;
    }

    if (!validateForm()) {
      toast.error('Revise os campos destacados antes de salvar.');
      return;
    }

    setSaving(true);

    // TODO: persistir todos os itens em pessoa_social_profiles quando a tabela estiver disponível.
    const primarySocialProfile = socialProfiles[0];
    const payload = cleanPersonPayload({
      ...form,
      rede_social: primarySocialProfile?.rede || '',
      instagram_usuario: primarySocialProfile?.perfil || '',
    });
    if (photoMarkedForRemoval) {
      payload.foto_principal_url = '';
    } else if (croppedPhotoBlob) {
      const upload = await uploadAvatarBlob(croppedPhotoBlob);

      if (upload.error) {
        setSaving(false);
        toast.error(`Não foi possível enviar a foto: ${upload.error}`);
        return;
      }

      payload.foto_principal_url = upload.url;
    }

    const { error: updateError, data: updatedPessoa } = await updateOwnLinkedPerson(pessoa.id, payload);

    if (updateError) {
      setSaving(false);
      toast.error(updateError);
      return;
    }

    try {
      const savedArchives = await substituirArquivosHistoricosDaPessoa(pessoa.id, archives);
      setArchives(savedArchives);
    } catch (archivesError) {
      setSaving(false);
      toast.error(
        archivesError instanceof Error
          ? `Dados pessoais salvos, mas não foi possível salvar arquivos históricos: ${archivesError.message}`
          : 'Dados pessoais salvos, mas não foi possível salvar arquivos históricos.',
      );
      return;
    }

    const { error: profileError } = await ensureMemberProfile(user.id, {
      nome_exibicao: updatedPessoa?.nome_completo ?? String(payload.nome_completo ?? ''),
      avatar_url: photoMarkedForRemoval ? null : String(updatedPessoa?.foto_principal_url ?? form.foto_principal_url ?? '') || null,
    });

    if (profileError) {
      setSaving(false);
      toast.error(profileError);
      return;
    }

    if (notificationPreferences) {
      try {
        const savedPreferences = await salvarPreferenciasNotificacao(user.id, notificationPreferences);
        setNotificationPreferences(savedPreferences);
        if (savedPreferences.id.startsWith('local-')) {
          toast.warning('Dados pessoais salvos, mas as preferências de notificação ficaram apenas locais.');
        }
      } catch (notificationError) {
        toast.warning(
          notificationError instanceof Error
            ? `Dados pessoais salvos, mas não foi possível salvar notificações: ${notificationError.message}`
            : 'Dados pessoais salvos, mas não foi possível salvar as preferências de notificação.',
        );
      }
    }

    setSaving(false);

    if (user?.id && pessoa.id) {
      removeMeusDadosDraft(getDraftKey(user.id, pessoa.id));
    }
    isDirtyRef.current = false;
    toast.success('Dados pessoais salvos.');
    navigate('/meus-vinculos', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (!link || !pessoa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <UserCircle2 className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Perfil não vinculado</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sua conta ainda não está vinculada a uma pessoa da árvore. Use o primeiro acesso ou solicite ajuda.
          </p>
          <Button className="mt-5" onClick={() => navigate('/entrar')}>
            Ir para autenticação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revisar meus dados</h1>
            <p className="mt-1 text-sm text-gray-500">
              Confira suas informações antes de acessar a árvore principal.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
        <form onSubmit={handleConfirm} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome completo" error={errors.nome_completo}>
              <Input
                value={String(form.nome_completo ?? '')}
                onBlur={() => normalizeFieldOnBlur('nome_completo')}
                onChange={(e) => updateTextField('nome_completo', e.target.value)}
                aria-invalid={Boolean(errors.nome_completo)}
                required
              />
            </Field>
            <Field label="Data de nascimento" error={errors.data_nascimento}>
              <Input
                value={String(form.data_nascimento ?? '')}
                onBlur={() => normalizeFieldOnBlur('data_nascimento')}
                onChange={(e) => updateTextField('data_nascimento', e.target.value)}
                placeholder="DD/MM/AAAA ou AAAA"
                aria-invalid={Boolean(errors.data_nascimento)}
              />
              {shouldSuggestFullBirthDate && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                  Se souber, adicione também o dia e o mês de nascimento.
                  </p>
                </div>
              )}
            </Field>
            <Field label="Signo">
              <Input value={zodiacSign || 'Não identificado'} readOnly className="bg-gray-50 text-gray-700" />
            </Field>
            <Field label="Local de nascimento" error={errors.local_nascimento}>
              <Input
                value={String(form.local_nascimento ?? '')}
                onBlur={() => normalizeFieldOnBlur('local_nascimento')}
                onChange={(e) => updateTextField('local_nascimento', e.target.value)}
                placeholder={form.local_nascimento_exterior === true ? 'Cidade (País)' : 'Cidade/UF'}
                aria-invalid={Boolean(errors.local_nascimento)}
              />
              <p className="text-xs text-gray-500">
                {form.local_nascimento_exterior === true ? INTERNATIONAL_LOCATION_FORMAT_HELPER : LOCATION_FORMAT_HELPER}
              </p>
              <ToggleField
                label="Nasci fora do Brasil"
                checked={form.local_nascimento_exterior === true}
                onCheckedChange={(checked) => updateField('local_nascimento_exterior', checked)}
              />
            </Field>
            <Field label="Cidade de Residência" error={errors.local_atual}>
              <Input
                value={String(form.local_atual ?? '')}
                onBlur={() => normalizeFieldOnBlur('local_atual')}
                onChange={(e) => updateTextField('local_atual', e.target.value)}
                placeholder="Cidade/UF"
                aria-invalid={Boolean(errors.local_atual)}
              />
              <p className="text-xs text-gray-500">{LOCATION_FORMAT_HELPER}</p>
            </Field>
            <div className="md:col-span-2">
              <ToggleField
                label="Pessoa falecida"
                description="Marque mesmo que a data ou o local de falecimento sejam desconhecidos."
                checked={form.falecido === true}
                onCheckedChange={(checked) => updateField('falecido', checked)}
              />
            </div>
            <Field label="Telefone">
              <Input
                value={String(form.telefone ?? '')}
                onChange={(e) => updateTextField('telefone', e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
              />
            </Field>
            <Field label="Endereço">
              <Input
                ref={addressInputRef}
                name="google-places-address-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={String(form.endereco ?? '')}
                onChange={(e) => updateTextField('endereco', e.target.value)}
                placeholder="Rua, número, bairro, cidade, CEP"
              />
            </Field>
            <Field label="Complemento">
              <Input
                value={complemento}
                onChange={(e) => {
                  markFormDirty();
                  setComplemento(e.target.value);
                }}
                placeholder="Apartamento, bloco, casa, referência"
              />
              {/* Campo visual até public.pessoas.complemento existir no schema e na tipagem. */}
            </Field>
            <div className="space-y-2 md:col-span-2">
              <SocialProfilesEditor
                profiles={socialProfiles}
                onChange={handleSocialProfilesChange}
                errors={{
                  rede_social: errors.rede_social,
                  instagram_usuario: errors.instagram_usuario,
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <Field label="Mini bio">
              <Textarea
                value={String(form.minibio ?? '')}
                onChange={(e) => updateTextField('minibio', e.target.value)}
                placeholder="Opcional: escreva uma breve apresentação sobre você. Conte quem você é, de onde vem, o que faz ou fez, sua trajetória, valores, conquistas e sua relação com a família."
                className="min-h-24 border-gray-300 bg-white text-sm focus-visible:ring-blue-600"
              />
            </Field>
            <Field label="Curiosidades de Vida">
              <Textarea
                value={String(form.curiosidades ?? '')}
                onChange={(e) => updateTextField('curiosidades', e.target.value)}
                placeholder="Opcional: compartilhe fatos, histórias ou lembranças curiosas sobre sua vida. Pode incluir hobbies, costumes, viagens, talentos, apelidos, momentos marcantes ou detalhes que ajudem a família a conhecer melhor você."
                className="min-h-24 border-gray-300 bg-white text-sm focus-visible:ring-blue-600"
              />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToggleField
              label="Exibir minha data de nascimento para outros familiares"
              description="Você pode alterar esta opção depois na edição do perfil."
              checked={form.permitir_exibir_data_nascimento !== false}
              onCheckedChange={(checked) => updateField('permitir_exibir_data_nascimento', checked)}
            />
            <ToggleField
              label="Exibir meu telefone para outros familiares"
              description="Controla a visualização do número no perfil."
              checked={form.permitir_exibir_telefone !== false}
              onCheckedChange={(checked) => updateField('permitir_exibir_telefone', checked)}
            />
            <ToggleField
              label="Exibir meu endereço para outros familiares"
              description="Controla a visualização do endereço no perfil."
              checked={form.permitir_exibir_endereco !== false}
              onCheckedChange={(checked) => updateField('permitir_exibir_endereco', checked)}
            />
            <ToggleField
              label="Exibir minha rede social para outros familiares"
              description="Você pode alterar esta opção depois na edição do perfil."
              checked={form.permitir_exibir_rede_social !== false && form.permitir_exibir_instagram !== false}
              onCheckedChange={(checked) => {
                updateField('permitir_exibir_rede_social', checked);
                updateField('permitir_exibir_instagram', checked);
              }}
            />
            <ToggleField
              label="Permitir mensagens por WhatsApp"
              description="Permite que familiares usem seu telefone para contato por WhatsApp."
              checked={form.permitir_mensagens_whatsapp !== false}
              onCheckedChange={(checked) => updateField('permitir_mensagens_whatsapp', checked)}
            />
          </div>

          {pessoa?.id && (
            <div className="mt-6">
              <ArquivosHistoricos
                arquivos={archives}
                onChange={(nextArchives) => {
                  markFormDirty();
                  setArchives(nextArchives);
                }}
                pessoaId={pessoa.id}
              />
            </div>
          )}

          <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Preferências de notificação</h2>
              <p className="mt-1 text-sm text-gray-500">Escolha quais avisos familiares deseja receber.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {NOTIFICATION_OPTIONS.map((option) => (
                <ToggleField
                  key={option.key}
                  label={option.label}
                  description={option.description}
                  checked={notificationPreferences?.[option.key] !== false}
                  onCheckedChange={(checked) => updateNotificationPreference(option.key, checked)}
                />
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" disabled={saving} className="sm:min-w-[220px]">
              {saving ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Confirmar meus dados
                </>
              )}
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-3xl font-bold text-blue-700">
            {currentPhotoUrl ? (
              <img src={currentPhotoUrl} alt={previewName} className="h-full w-full object-cover" />
            ) : (
              <span>{getInitials(previewName)}</span>
            )}
          </div>

          <h2 className="mt-4 whitespace-normal text-xl font-bold leading-snug text-gray-900">
            {previewName}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{previewLocation}</p>

          <div className="mt-5 grid grid-cols-1 gap-2">
            <Button type="button" variant="outline" onClick={() => setPhotoDialogOpen(true)}>
              <Camera className="mr-2 h-4 w-4" />
              {currentPhotoUrl ? 'Alterar foto' : 'Cadastrar foto'}
            </Button>
            {currentPhotoUrl && (
              <Button type="button" variant="ghost" onClick={handleRemovePhoto} className="text-red-700 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover foto
              </Button>
            )}
          </div>

        </aside>
      </main>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{currentPhotoUrl ? 'Alterar foto' : 'Cadastrar foto'}</DialogTitle>
            <DialogDescription>
              Selecione uma imagem, ajuste o corte quadrado e aplique antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {cropImageUrl ? (
            <div className="space-y-4">
              <div className="relative h-72 overflow-hidden rounded-xl bg-gray-950">
                <Cropper
                  image={cropImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-zoom">Zoom</Label>
                <input
                  id="avatar-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center text-sm font-medium text-blue-700 hover:text-blue-800">
                <UploadCloud className="mr-2 h-4 w-4" />
                Escolher outra imagem
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handlePhotoFile(event.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <label
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handlePhotoFile(event.dataTransfer.files?.[0]);
              }}
            >
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Preview da foto" className="h-32 w-32 rounded-2xl object-cover" />
              ) : currentPhotoUrl ? (
                <img src={currentPhotoUrl} alt={previewName} className="h-32 w-32 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
              <span className="mt-4 flex items-center text-sm font-medium text-gray-900">
                <UploadCloud className="mr-2 h-4 w-4" />
                Arraste uma imagem ou clique para selecionar
              </span>
              <span className="mt-1 text-xs text-gray-500">O corte final será quadrado.</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handlePhotoFile(event.target.files?.[0])}
              />
            </label>
          )}

          <DialogFooter>
            {currentPhotoUrl && (
              <Button type="button" variant="ghost" onClick={handleRemovePhoto} className="text-red-700 hover:bg-red-50">
                Remover foto
              </Button>
            )}
            {cropImageUrl ? (
              <Button type="button" onClick={handleApplyCrop}>
                Aplicar corte
              </Button>
            ) : (
              <Button type="button" onClick={() => setPhotoDialogOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description && <p className="text-xs leading-snug text-gray-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
