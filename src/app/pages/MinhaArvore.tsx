import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { AppLink as Link } from '../components/AppLink';
import {
  ArrowLeft,
  Bell,
  Camera,
  CalendarDays,
  Filter,
  ImagePlus,
  Info,
  Link2,
  LogOut,
  Plus,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Button } from '../components/ui/button';
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
  adicionarPessoa,
  adicionarRelacionamentoComInverso,
  atualizarRelacionamento,
  excluirRelacionamentoComInverso,
  obterTodasPessoas,
  obterTodosRelacionamentos,
} from '../services/dataService';
import {
  buildMemberTreeSummary,
  filterPeopleByMemberScope,
} from '../services/memberTreeService';
import {
  EditableOwnPersonPayload,
  ensureMemberProfile,
  getPrimaryLinkedPerson,
  resolveFirstAccessLinkForUser,
  updateOwnLinkedPerson,
} from '../services/memberProfileService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  obterPreferenciasNotificacao,
  salvarPreferenciasNotificacao,
} from '../services/userEngagementService';
import { uploadPersonAvatarFile } from '../services/storageService';
import { Pessoa, PreferenciaNotificacao, Relacionamento } from '../types';
import {
  buildEditablePersonFormState,
  cleanPersonPayload,
  formatPersonName,
  formatPhone,
  getSocialPlaceholder,
  getInitials,
  maskBirthDate,
  normalizeBirthDate,
  normalizeLocation,
  PersonFieldErrors,
  SOCIAL_NETWORKS,
  validateEditablePersonForm,
  validateLocation,
} from '../utils/personFields';
import { getZodiacSignFromBirthDate } from '../utils/zodiac';
import { toast } from 'sonner';

type MemberScope = 'toda_arvore' | 'familia_direta' | 'ramo_materno' | 'ramo_paterno';
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

type AuthUserSummary = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};
type SocialProfileForm = {
  id: string;
  rede: string;
  perfil: string;
};
type RelationshipGroupKey = 'pais' | 'irmaos' | 'conjuges' | 'filhos';
type ParentRole = 'pai' | 'mae';
type AddRelativeMode = 'existing' | 'new';
type AddRelativeDialogState = {
  group: RelationshipGroupKey;
} | null;
type AddRelativeForm = {
  mode: AddRelativeMode;
  selectedPersonId: string;
  search: string;
  nome_completo: string;
  data_nascimento: string;
  local_nascimento: string;
  parentRole: ParentRole;
  baseParentRole: ParentRole;
  data_casamento: string;
  local_casamento: string;
};
type MarriageFormState = Record<string, { data_casamento: string; local_casamento: string; error?: string }>;
type MinhaArvoreDraft = {
  form: EditableOwnPersonPayload;
  complemento: string;
  socialProfiles: SocialProfileForm[];
};

const AVATAR_SIZE = 512;
const LOCATION_FORMAT_HELPER = 'Use o formato Nome da Cidade/UF. Exemplo: São José dos Pinhais/PR.';
const SOCIAL_PROFILE_PREFIXES: Record<string, string> = {
  LinkedIn: 'linkedin.com/in/',
  Facebook: 'facebook.com/',
  Instagram: 'instagram.com/',
  TikTok: 'tiktok.com/@',
};
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

function getDisplayName(pessoaBase?: Pessoa, user?: AuthUserSummary | null) {
  const metadataName = user?.user_metadata?.nome_exibicao;
  return pessoaBase?.nome_completo
    || (typeof metadataName === 'string' && metadataName.trim() ? metadataName : undefined)
    || user?.email
    || 'Membro da família';
}

function getAvatarUrl(pessoaBase?: Pessoa) {
  return pessoaBase?.foto_principal_url?.trim() || undefined;
}

function getPessoaInitials(name: string) {
  return getInitials(name);
}

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

function createSocialProfile(rede = '', perfil = ''): SocialProfileForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rede,
    perfil,
  };
}

function getDraftKey(userId: string, pessoaId: string) {
  return `minha-arvore-draft:${userId}:${pessoaId}`;
}

function readMinhaArvoreDraft(key: string): MinhaArvoreDraft | null {
  try {
    const rawDraft = window.sessionStorage.getItem(key);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<MinhaArvoreDraft>;
    if (!draft.form || !Array.isArray(draft.socialProfiles)) return null;

    return {
      form: draft.form,
      complemento: draft.complemento ?? '',
      socialProfiles: draft.socialProfiles.length > 0 ? draft.socialProfiles : [createSocialProfile()],
    };
  } catch {
    return null;
  }
}

function writeMinhaArvoreDraft(key: string, draft: MinhaArvoreDraft) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Rascunho é proteção auxiliar; falhas de storage não devem bloquear a edição.
  }
}

function removeMinhaArvoreDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // noop
  }
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

function uniquePeople(people: Pessoa[]) {
  return Array.from(new Map(people.map((person) => [person.id, person])).values());
}

function createEmptyAddRelativeForm(): AddRelativeForm {
  return {
    mode: 'existing',
    selectedPersonId: '',
    search: '',
    nome_completo: '',
    data_nascimento: '',
    local_nascimento: '',
    parentRole: 'pai',
    baseParentRole: 'pai',
    data_casamento: '',
    local_casamento: '',
  };
}

function getAddRelativeTitle(group: RelationshipGroupKey) {
  if (group === 'pais') return 'Adicionar pai ou mãe';
  if (group === 'irmaos') return 'Adicionar irmão';
  if (group === 'conjuges') return 'Adicionar cônjuge';
  return 'Adicionar filho';
}

function getGroupEmptyLabel(group: RelationshipGroupKey) {
  if (group === 'pais') return 'Nenhum pai ou mãe cadastrado.';
  if (group === 'irmaos') return 'Nenhum irmão cadastrado.';
  if (group === 'conjuges') return 'Nenhum cônjuge cadastrado.';
  return 'Nenhum filho cadastrado.';
}

function matchesRelationshipPair(rel: Relacionamento, originId: string, destinationId: string) {
  return rel.pessoa_origem_id === originId && rel.pessoa_destino_id === destinationId;
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

export function MinhaArvore() {
  const { user, signOut } = useAuth();
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedFormRef = useRef(false);
  const initializedPessoaIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relacionamentos, setRelacionamentos] = useState<Relacionamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedPersonId, setLinkedPersonId] = useState<string | undefined>();
  const [linkLoading, setLinkLoading] = useState(true);
  const [scope, setScope] = useState<MemberScope>('familia_direta');
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
  const [saving, setSaving] = useState(false);
  const [addRelativeDialog, setAddRelativeDialog] = useState<AddRelativeDialogState>(null);
  const [addRelativeForm, setAddRelativeForm] = useState<AddRelativeForm>(() => createEmptyAddRelativeForm());
  const [relationshipSaving, setRelationshipSaving] = useState(false);
  const [relationshipRemoving, setRelationshipRemoving] = useState<string | null>(null);
  const [marriageForms, setMarriageForms] = useState<MarriageFormState>({});
  const [marriageSaving, setMarriageSaving] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const [pessoasData, relacionamentosData] = await Promise.all([
        obterTodasPessoas(),
        obterTodosRelacionamentos(),
      ]);
      setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
      setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);
      setLoading(false);
    };

    carregar();
  }, []);

  useEffect(() => {
    const carregarVinculo = async () => {
      if (!user) {
        setLinkLoading(false);
        return;
      }

      setLinkLoading(true);
      await ensureMemberProfile(user.id, {
        nome_exibicao: (user.user_metadata?.nome_exibicao as string | undefined) ?? user.email ?? null,
      });
      await resolveFirstAccessLinkForUser(user);
      const { data, error } = await getPrimaryLinkedPerson(user.id);
      if (error) {
        toast.error(error);
      }
      setLinkedPersonId(data?.pessoa_id);
      setLinkLoading(false);
    };

    carregarVinculo();
  }, [user]);

  const pessoaBase = useMemo(() => {
    if (!linkedPersonId) return undefined;
    return pessoas.find((pessoa) => pessoa.id === linkedPersonId);
  }, [pessoas, linkedPersonId]);

  const resumo = useMemo(
    () => buildMemberTreeSummary(pessoaBase?.id, pessoas, relacionamentos),
    [pessoaBase, pessoas, relacionamentos]
  );

  const pessoasNoEscopo = useMemo(
    () => filterPeopleByMemberScope(pessoas, scope, resumo),
    [pessoas, scope, resumo]
  );

  const relationshipGroups = useMemo(
    () => ({
      pais: uniquePeople(resumo.pais),
      irmaos: uniquePeople(resumo.irmaos),
      conjuges: uniquePeople(resumo.conjuges),
      filhos: uniquePeople(resumo.filhos),
    }),
    [resumo.pais, resumo.irmaos, resumo.conjuges, resumo.filhos]
  );

  const selectedGroupPeople = addRelativeDialog ? relationshipGroups[addRelativeDialog.group] : [];
  const existingRelativeCandidates = useMemo(() => {
    const search = addRelativeForm.search.trim().toLocaleLowerCase('pt-BR');
    const blockedIds = new Set([
      pessoaBase?.id,
      ...selectedGroupPeople.map((person) => person.id),
    ].filter(Boolean));

    return pessoas
      .filter((person) => !blockedIds.has(person.id))
      .filter((person) => {
        if (!search) return true;
        return `${person.nome_completo} ${person.local_nascimento ?? ''}`.toLocaleLowerCase('pt-BR').includes(search);
      })
      .slice(0, 12);
  }, [addRelativeForm.search, pessoaBase?.id, pessoas, selectedGroupPeople]);

  const selectedRelative = useMemo(
    () => pessoas.find((person) => person.id === addRelativeForm.selectedPersonId),
    [addRelativeForm.selectedPersonId, pessoas]
  );

  const findRelationshipBetween = (
    baseId: string,
    relatedId: string,
    acceptedTypes: Relacionamento['tipo_relacionamento'][]
  ) => {
    return relacionamentos.find((rel) => {
      if (!acceptedTypes.includes(rel.tipo_relacionamento)) return false;

      if (matchesRelationshipPair(rel, baseId, relatedId) || matchesRelationshipPair(rel, relatedId, baseId)) {
        return true;
      }

      if (
        acceptedTypes.includes('pai') || acceptedTypes.includes('mae') || acceptedTypes.includes('filho')
      ) {
        return (
          (matchesRelationshipPair(rel, baseId, relatedId) || matchesRelationshipPair(rel, relatedId, baseId)) &&
          ['pai', 'mae', 'filho'].includes(rel.tipo_relacionamento)
        );
      }

      return false;
    });
  };

  useEffect(() => {
    if (!pessoaBase) return;

    const samePessoa = initializedPessoaIdRef.current === pessoaBase.id;
    const shouldPreserveDraft = hasInitializedFormRef.current && isDirtyRef.current && samePessoa;

    if (!shouldPreserveDraft) {
      const draftKey = user?.id ? getDraftKey(user.id, pessoaBase.id) : null;
      const draft = draftKey ? readMinhaArvoreDraft(draftKey) : null;

      setForm(draft?.form ?? buildEditablePersonFormState(pessoaBase));
      setSocialProfiles(draft?.socialProfiles ?? [
        createSocialProfile(
          String(pessoaBase.rede_social ?? ''),
          String(pessoaBase.instagram_usuario ?? ''),
        ),
      ]);
      setComplemento(draft?.complemento ?? '');
      isDirtyRef.current = Boolean(draft);
    }

    hasInitializedFormRef.current = true;
    initializedPessoaIdRef.current = pessoaBase.id;
    setPhotoMarkedForRemoval(false);
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCroppedPhotoBlob(null);
  }, [pessoaBase, user?.id]);

  useEffect(() => {
    if (!pessoaBase) return;

    setMarriageForms((current) => {
      const next: MarriageFormState = {};

      for (const spouse of relationshipGroups.conjuges) {
        const rel = findRelationshipBetween(pessoaBase.id, spouse.id, ['conjuge']);
        next[spouse.id] = {
          data_casamento: current[spouse.id]?.data_casamento ?? String(rel?.data_casamento ?? ''),
          local_casamento: current[spouse.id]?.local_casamento ?? String(rel?.local_casamento ?? ''),
          error: current[spouse.id]?.error,
        };
      }

      return next;
    });
  }, [pessoaBase, relationshipGroups.conjuges, relacionamentos]);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    obterPreferenciasNotificacao(user.id).then((preferences) => {
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
    });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const input = addressInputRef.current;

    if (!apiKey) {
      if (import.meta.env.DEV) {
        console.warn('[Google Maps] VITE_GOOGLE_MAPS_API_KEY ausente; autocomplete de endereço desativado.');
      }
      return;
    }

    if (loading || linkLoading || !pessoaBase || !input) return;

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
  }, [loading, linkLoading, pessoaBase?.id]);

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
    if (!user?.id || !pessoaBase?.id || !hasInitializedFormRef.current || !isDirtyRef.current) return;

    writeMinhaArvoreDraft(getDraftKey(user.id, pessoaBase.id), {
      form,
      complemento,
      socialProfiles,
    });
  }, [complemento, form, pessoaBase?.id, socialProfiles, user?.id]);

  const previewName = useMemo(() => {
    const name = formatPersonName(String(form.nome_completo ?? '').trim());
    return name || getDisplayName(pessoaBase, user);
  }, [form.nome_completo, pessoaBase, user]);
  const currentPhotoUrl = photoMarkedForRemoval ? '' : photoPreviewUrl || String(form.foto_principal_url ?? '');
  const displayName = previewName;
  const avatarUrl = currentPhotoUrl || getAvatarUrl(pessoaBase);
  const pessoaInitials = getPessoaInitials(displayName);
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
    const firstProfile = profiles[0] ?? createSocialProfile();

    markFormDirty();
    setForm((current) => ({
      ...current,
      rede_social: firstProfile.rede,
      instagram_usuario: firstProfile.perfil,
    }));
    setErrors((current) => ({
      ...current,
      rede_social: undefined,
      instagram_usuario: undefined,
    }));
  };

  const updateSocialProfile = (profileId: string, field: 'rede' | 'perfil', value: string) => {
    markFormDirty();
    const nextProfiles = socialProfiles.map((profile) =>
      profile.id === profileId ? { ...profile, [field]: value } : profile
    );

    setSocialProfiles(nextProfiles);
    syncFirstSocialProfileToLegacyFields(nextProfiles);
  };

  const addSocialProfile = () => {
    markFormDirty();
    setSocialProfiles((current) => [...current, createSocialProfile()]);
  };

  const removeSocialProfile = (profileId: string) => {
    markFormDirty();
    const nextProfiles = socialProfiles.filter((profile) => profile.id !== profileId);
    const ensuredProfiles = nextProfiles.length > 0 ? nextProfiles : [createSocialProfile()];

    setSocialProfiles(ensuredProfiles);
    syncFirstSocialProfileToLegacyFields(ensuredProfiles);
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
      const normalizedLocation = normalizeLocation(value);
      updateField(field, normalizedLocation);
      setErrors((current) => ({
        ...current,
        [field]: validateLocation(normalizedLocation),
      }));
    }
  };

  const validateForm = () => {
    const normalizedForm = {
      ...form,
      nome_completo: formatPersonName(String(form.nome_completo ?? '')),
      data_nascimento: normalizeBirthDate(String(form.data_nascimento ?? '')),
      local_nascimento: normalizeLocation(String(form.local_nascimento ?? '')),
      local_atual: normalizeLocation(String(form.local_atual ?? '')),
      telefone: formatPhone(String(form.telefone ?? '')),
    };
    const nextErrors = validateEditablePersonForm(normalizedForm);

    setErrors(nextErrors);
    setForm((current) => ({
      ...current,
      ...normalizedForm,
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
    markFormDirty();
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
    setForm((current) => ({ ...current, foto_principal_url: '' }));
  };

  const handleApplyCrop = async () => {
    if (!cropImageUrl || !croppedAreaPixels) {
      toast.error('Selecione e ajuste uma imagem antes de aplicar.');
      return;
    }

    try {
      const blob = await createCroppedAvatarBlob(cropImageUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(blob);

      markFormDirty();
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
    if (!user || !pessoaBase?.id) return { error: 'Não foi possível localizar o usuário para salvar a foto.', url: null };

    try {
      const upload = await uploadPersonAvatarFile(blob, { pessoaId: pessoaBase.id });
      return { error: undefined, url: upload.url };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Não foi possível enviar a foto.',
        url: null,
      };
    }
  };

  const handleSavePersonalData = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !pessoaBase?.id) {
      toast.error('Não foi possível localizar seu vínculo com a árvore.');
      return;
    }

    if (!validateForm()) {
      toast.error('Revise os campos destacados antes de salvar.');
      return;
    }

    setSaving(true);

    // TODO: extrair este formulário junto com /meus-dados e persistir múltiplas redes em pessoa_social_profiles.
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

    const { error: updateError, data: updatedPessoa } = await updateOwnLinkedPerson(pessoaBase.id, payload);

    if (updateError || !updatedPessoa) {
      setSaving(false);
      toast.error(updateError || 'Não foi possível salvar seus dados.');
      return;
    }

    setPessoas((current) =>
      current.map((pessoa) => (pessoa.id === updatedPessoa.id ? updatedPessoa : pessoa))
    );
    setForm(buildEditablePersonFormState(updatedPessoa));
    setPhotoMarkedForRemoval(false);
    setCroppedPhotoBlob(null);

    const { error: profileError } = await ensureMemberProfile(user.id, {
      nome_exibicao: updatedPessoa.nome_completo ?? String(payload.nome_completo ?? ''),
      avatar_url: String(updatedPessoa.foto_principal_url ?? '') || null,
    });

    if (profileError) {
      toast.warning(`Dados pessoais salvos, mas não foi possível atualizar o perfil do usuário: ${profileError}`);
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

    removeMinhaArvoreDraft(getDraftKey(user.id, pessoaBase.id));
    isDirtyRef.current = false;
    setSaving(false);
    toast.success('Dados pessoais salvos.');
  };

  const reloadFamilyData = async () => {
    const [pessoasData, relacionamentosData] = await Promise.all([
      obterTodasPessoas(),
      obterTodosRelacionamentos(),
    ]);
    setPessoas(Array.isArray(pessoasData) ? pessoasData : []);
    setRelacionamentos(Array.isArray(relacionamentosData) ? relacionamentosData : []);
  };

  const openAddRelativeDialog = (group: RelationshipGroupKey) => {
    setAddRelativeDialog({ group });
    setAddRelativeForm(createEmptyAddRelativeForm());
  };

  const closeAddRelativeDialog = () => {
    if (relationshipSaving) return;
    setAddRelativeDialog(null);
    setAddRelativeForm(createEmptyAddRelativeForm());
  };

  const updateAddRelativeForm = <K extends keyof AddRelativeForm>(field: K, value: AddRelativeForm[K]) => {
    setAddRelativeForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'mode' ? { selectedPersonId: '', search: '' } : {}),
    }));
  };

  const createSimplePersonFromAddForm = async () => {
    const nome = formatPersonName(addRelativeForm.nome_completo);
    if (!nome) {
      toast.error('Informe o nome completo do familiar.');
      return undefined;
    }

    const newPerson = await adicionarPessoa({
      nome_completo: nome,
      data_nascimento: normalizeBirthDate(addRelativeForm.data_nascimento) || undefined,
      local_nascimento: normalizeLocation(addRelativeForm.local_nascimento) || undefined,
      humano_ou_pet: 'Humano',
    });

    if (!newPerson) {
      toast.error('Não foi possível criar a pessoa. Verifique permissões do Supabase.');
      return undefined;
    }

    setPessoas((current) => uniquePeople([...current, newPerson]));
    return newPerson;
  };

  const getRelationshipPayloadForGroup = (group: RelationshipGroupKey, relatedId: string) => {
    if (!pessoaBase) return undefined;

    if (group === 'pais') {
      return {
        pessoa_origem_id: pessoaBase.id,
        pessoa_destino_id: relatedId,
        tipo_relacionamento: addRelativeForm.parentRole,
        subtipo_relacionamento: 'sangue',
        ativo: true,
      } satisfies Omit<Relacionamento, 'id'>;
    }

    if (group === 'filhos') {
      return {
        pessoa_origem_id: relatedId,
        pessoa_destino_id: pessoaBase.id,
        tipo_relacionamento: addRelativeForm.baseParentRole,
        subtipo_relacionamento: 'sangue',
        ativo: true,
      } satisfies Omit<Relacionamento, 'id'>;
    }

    if (group === 'irmaos') {
      return {
        pessoa_origem_id: pessoaBase.id,
        pessoa_destino_id: relatedId,
        tipo_relacionamento: 'irmao',
        subtipo_relacionamento: 'sangue',
        ativo: true,
      } satisfies Omit<Relacionamento, 'id'>;
    }

    return {
      pessoa_origem_id: pessoaBase.id,
      pessoa_destino_id: relatedId,
      tipo_relacionamento: 'conjuge',
      subtipo_relacionamento: 'casamento',
      data_casamento: normalizeBirthDate(addRelativeForm.data_casamento) || undefined,
      local_casamento: normalizeLocation(addRelativeForm.local_casamento) || undefined,
      ativo: true,
    } satisfies Omit<Relacionamento, 'id'>;
  };

  const handleAddRelative = async () => {
    if (!addRelativeDialog || !pessoaBase) return;

    setRelationshipSaving(true);

    try {
      if (addRelativeForm.mode === 'new' && addRelativeForm.local_nascimento.trim()) {
        const normalizedBirthPlace = normalizeLocation(addRelativeForm.local_nascimento);
        const birthPlaceError = validateLocation(normalizedBirthPlace);
        if (birthPlaceError) {
          toast.error(birthPlaceError);
          setRelationshipSaving(false);
          return;
        }
      }

      if (addRelativeDialog.group === 'conjuges' && addRelativeForm.local_casamento.trim()) {
        const normalizedMarriagePlace = normalizeLocation(addRelativeForm.local_casamento);
        const marriagePlaceError = validateLocation(normalizedMarriagePlace);
        if (marriagePlaceError) {
          toast.error(marriagePlaceError);
          setRelationshipSaving(false);
          return;
        }
      }

      const relatedPerson = addRelativeForm.mode === 'existing'
        ? selectedRelative
        : await createSimplePersonFromAddForm();

      if (!relatedPerson) {
        if (addRelativeForm.mode === 'existing') {
          toast.error('Selecione uma pessoa existente ou crie uma nova pessoa.');
        }
        setRelationshipSaving(false);
        return;
      }

      if (selectedGroupPeople.some((person) => person.id === relatedPerson.id)) {
        toast.error('Esta pessoa já está neste grupo familiar.');
        setRelationshipSaving(false);
        return;
      }

      const payload = getRelationshipPayloadForGroup(addRelativeDialog.group, relatedPerson.id);
      if (!payload) {
        toast.error('Não foi possível preparar o vínculo familiar.');
        setRelationshipSaving(false);
        return;
      }

      const created = await adicionarRelacionamentoComInverso(payload, {
        inverseTipoForFilho: addRelativeDialog.group === 'filhos' ? addRelativeForm.baseParentRole : undefined,
      });

      if (!created) {
        toast.error('Não foi possível criar o vínculo. Verifique permissões do Supabase.');
        setRelationshipSaving(false);
        return;
      }

      await reloadFamilyData();
      toast.success('Vínculo familiar adicionado.');
      setAddRelativeDialog(null);
      setAddRelativeForm(createEmptyAddRelativeForm());
    } catch (error) {
      console.error('[MinhaArvore] Erro ao adicionar vínculo familiar:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar o vínculo familiar.');
    } finally {
      setRelationshipSaving(false);
    }
  };

  const getAcceptedTypesForGroup = (group: RelationshipGroupKey): Relacionamento['tipo_relacionamento'][] => {
    if (group === 'pais') return ['pai', 'mae', 'filho'];
    if (group === 'filhos') return ['pai', 'mae', 'filho'];
    if (group === 'irmaos') return ['irmao'];
    return ['conjuge'];
  };

  const handleRemoveRelative = async (group: RelationshipGroupKey, person: Pessoa) => {
    if (!pessoaBase) return;
    if (!window.confirm('Remover este vínculo familiar?')) return;

    const rel = findRelationshipBetween(pessoaBase.id, person.id, getAcceptedTypesForGroup(group));
    if (!rel) {
      toast.error('Não foi possível localizar o relacionamento para remover.');
      return;
    }

    setRelationshipRemoving(`${group}:${person.id}`);

    try {
      const removed = await excluirRelacionamentoComInverso(rel.id);
      if (!removed) {
        toast.error('Não foi possível remover o vínculo. Verifique permissões do Supabase.');
        return;
      }

      await reloadFamilyData();
      toast.success('Vínculo familiar removido.');
    } catch (error) {
      console.error('[MinhaArvore] Erro ao remover vínculo familiar:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o vínculo familiar.');
    } finally {
      setRelationshipRemoving(null);
    }
  };

  const updateMarriageForm = (spouseId: string, field: 'data_casamento' | 'local_casamento', value: string) => {
    setMarriageForms((current) => ({
      ...current,
      [spouseId]: {
        data_casamento: current[spouseId]?.data_casamento ?? '',
        local_casamento: current[spouseId]?.local_casamento ?? '',
        [field]: field === 'data_casamento' ? maskBirthDate(value) : value,
        error: undefined,
      },
    }));
  };

  const normalizeMarriageField = (spouseId: string, field: 'data_casamento' | 'local_casamento') => {
    setMarriageForms((current) => {
      const details = current[spouseId] ?? { data_casamento: '', local_casamento: '' };
      const nextValue = field === 'data_casamento'
        ? normalizeBirthDate(details.data_casamento)
        : normalizeLocation(details.local_casamento);

      return {
        ...current,
        [spouseId]: {
          ...details,
          [field]: nextValue,
          error: field === 'local_casamento' && nextValue ? validateLocation(nextValue) : undefined,
        },
      };
    });
  };

  const handleSaveMarriage = async (spouse: Pessoa) => {
    if (!pessoaBase) return;

    const details = marriageForms[spouse.id] ?? { data_casamento: '', local_casamento: '' };
    const normalizedDate = normalizeBirthDate(details.data_casamento);
    const normalizedLocation = normalizeLocation(details.local_casamento);
    const locationError = normalizedLocation ? validateLocation(normalizedLocation) : undefined;

    if (locationError) {
      setMarriageForms((current) => ({
        ...current,
        [spouse.id]: { ...details, local_casamento: normalizedLocation, error: locationError },
      }));
      toast.error('Revise o local de casamento antes de salvar.');
      return;
    }

    const principal = findRelationshipBetween(pessoaBase.id, spouse.id, ['conjuge']);
    if (!principal) {
      toast.error('Não foi possível localizar o vínculo de cônjuge.');
      return;
    }

    const inverse = relacionamentos.find((rel) =>
      rel.id !== principal.id &&
      rel.tipo_relacionamento === 'conjuge' &&
      rel.pessoa_origem_id === principal.pessoa_destino_id &&
      rel.pessoa_destino_id === principal.pessoa_origem_id &&
      rel.subtipo_relacionamento === principal.subtipo_relacionamento
    );

    setMarriageSaving(spouse.id);

    try {
      const payload = {
        data_casamento: normalizedDate,
        local_casamento: normalizedLocation,
      };
      const updated = await atualizarRelacionamento(principal.id, payload);
      if (!updated) {
        toast.error('Não foi possível salvar o casamento. Verifique permissões do Supabase.');
        return;
      }

      if (inverse) {
        await atualizarRelacionamento(inverse.id, payload);
      }

      setMarriageForms((current) => ({
        ...current,
        [spouse.id]: {
          data_casamento: normalizedDate,
          local_casamento: normalizedLocation,
          error: undefined,
        },
      }));
      await reloadFamilyData();
      toast.success('Dados de casamento salvos.');
    } catch (error) {
      console.error('[MinhaArvore] Erro ao salvar casamento:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar os dados de casamento.');
    } finally {
      setMarriageSaving(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada.');
  };

  const semVinculo = !loading && !linkLoading && !pessoaBase;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minha Árvore</h1>
            <p className="text-sm text-gray-500">Área inicial do membro autenticado</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" />
                Árvore geral
              </button>
            </Link>
            <Link to="/calendario-familiar">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <CalendarDays className="w-4 h-4" />
                Calendário
              </button>
            </Link>
            <Link to="/meus-favoritos">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Star className="w-4 h-4" />
                Favoritos
              </button>
            </Link>
            <Link to="/notificacoes">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Bell className="w-4 h-4" />
                Notificações
              </button>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {semVinculo && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-amber-950">
                Sua conta ainda não está vinculada a uma pessoa da árvore
              </h2>
              <p className="text-sm text-amber-900 mt-2">
                Para ativar a visualização personalizada da sua família direta, associe esta conta ao seu perfil dentro da árvore genealógica.
              </p>
            </div>
            <Link to="/vincular-perfil">
              <button className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700">
                <Link2 className="w-4 h-4" />
                Vincular meu perfil
              </button>
            </Link>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-bold">
                  {pessoaInitials}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {displayName}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Esta área reúne seus dados, vínculos familiares e o escopo de visualização da sua árvore.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">Pais</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{resumo.pais.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Irmãos</p>
                <p className="text-2xl font-bold text-amber-900 mt-2">{resumo.irmaos.length}</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-700 font-semibold">Cônjuges</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">{resumo.conjuges.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">Filhos</p>
                <p className="text-2xl font-bold text-sky-900 mt-2">{resumo.filhos.length}</p>
              </div>
            </div>
          </div>
        </section>

        {pessoaBase && (
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Meus dados</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Edite suas informações pessoais, foto, permissões e preferências de notificação.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
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
            </div>

            <form onSubmit={handleSavePersonalData} className="space-y-5">
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
                      <p>Se souber, adicione também o dia e o mês de nascimento.</p>
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
                    placeholder="Cidade/UF"
                    aria-invalid={Boolean(errors.local_nascimento)}
                  />
                  <p className="text-xs text-gray-500">{LOCATION_FORMAT_HELPER}</p>
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
                    name="google-places-address-input-minha-arvore"
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
                  <Label>Redes sociais</Label>
                  <div className="space-y-3">
                    {socialProfiles.map((profile, index) => (
                      <div key={profile.id} className="space-y-2">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-start">
                          <select
                            value={profile.rede}
                            onChange={(event) => updateSocialProfile(profile.id, 'rede', event.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                            aria-invalid={index === 0 ? Boolean(errors.rede_social) : undefined}
                          >
                            <option value="">Selecione a plataforma</option>
                            {SOCIAL_NETWORKS.map((network) => (
                              <option key={network} value={network}>
                                {network}
                              </option>
                            ))}
                          </select>

                          {profile.rede && (
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                              <div className="flex min-w-0 flex-1">
                                <span className="inline-flex h-10 shrink-0 items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                                  {SOCIAL_PROFILE_PREFIXES[profile.rede]}
                                </span>
                                <Input
                                  value={profile.perfil}
                                  onChange={(e) => updateSocialProfile(profile.id, 'perfil', e.target.value)}
                                  placeholder={getSocialPlaceholder(profile.rede)}
                                  className="rounded-l-none"
                                  aria-invalid={index === 0 ? Boolean(errors.instagram_usuario) : undefined}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0"
                                  onClick={addSocialProfile}
                                  aria-label="Adicionar rede social"
                                  title="Adicionar rede social"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0"
                                  onClick={() => removeSocialProfile(profile.id)}
                                  disabled={socialProfiles.length === 1}
                                  aria-label="Remover rede social"
                                  title="Remover rede social"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        {index === 0 && (errors.rede_social || errors.instagram_usuario) && (
                          <p className="text-xs font-medium text-red-600">
                            {errors.rede_social || errors.instagram_usuario}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ToggleField
                  label="Exibir minha data de nascimento para outros familiares"
                  description="Controla a visualização da data no perfil."
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
                  description="Controla a visualização da rede social no perfil."
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

              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Preferências de notificação</h3>
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button type="submit" disabled={saving} className="sm:min-w-[220px]">
                  {saving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar meus dados
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        )}

        {pessoaBase && (
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">Vínculos familiares</h2>
              <p className="mt-1 text-sm text-gray-500">
                Adicione ou remova vínculos da sua família direta sem apagar pessoas da árvore.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {([
                ['pais', 'Pais'],
                ['irmaos', 'Irmãos'],
                ['conjuges', 'Cônjuge'],
                ['filhos', 'Filhos'],
              ] as Array<[RelationshipGroupKey, string]>).map(([group, title]) => (
                <div key={group} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => openAddRelativeDialog(group)}
                      aria-label={getAddRelativeTitle(group)}
                      title={getAddRelativeTitle(group)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {relationshipGroups[group].length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-500">
                      {getGroupEmptyLabel(group)}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {relationshipGroups[group].map((person) => {
                        const removeKey = `${group}:${person.id}`;
                        const marriageDetails = marriageForms[person.id] ?? { data_casamento: '', local_casamento: '' };

                        return (
                          <div key={person.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{person.nome_completo}</p>
                                {person.local_nascimento && (
                                  <p className="mt-1 text-xs text-gray-500">{person.local_nascimento}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveRelative(group, person)}
                                disabled={relationshipRemoving === removeKey}
                                aria-label={`Remover ${person.nome_completo}`}
                                title={`Remover ${person.nome_completo}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {group === 'conjuges' && (
                              <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                                <Field label="Data de casamento">
                                  <Input
                                    value={marriageDetails.data_casamento}
                                    onChange={(event) => updateMarriageForm(person.id, 'data_casamento', event.target.value)}
                                    onBlur={() => normalizeMarriageField(person.id, 'data_casamento')}
                                    placeholder="DD/MM/AAAA ou AAAA"
                                    className="bg-white"
                                  />
                                </Field>
                                <Field label="Local de casamento" error={marriageDetails.error}>
                                  <Input
                                    value={marriageDetails.local_casamento}
                                    onChange={(event) => updateMarriageForm(person.id, 'local_casamento', event.target.value)}
                                    onBlur={() => normalizeMarriageField(person.id, 'local_casamento')}
                                    placeholder="Cidade/UF"
                                    className="bg-white"
                                    aria-invalid={Boolean(marriageDetails.error)}
                                  />
                                </Field>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleSaveMarriage(person)}
                                  disabled={marriageSaving === person.id}
                                >
                                  {marriageSaving === person.id ? 'Salvando...' : 'Salvar casamento'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Escopo da visualização</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              ['familia_direta', 'Família direta'],
              ['ramo_materno', 'Ramo materno'],
              ['ramo_paterno', 'Ramo paterno'],
              ['toda_arvore', 'Toda a árvore'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value as MemberScope)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  scope === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Este filtro já organiza a área do membro. O próximo passo será levar o mesmo escopo para a visualização gráfica da árvore.
          </p>

          <div className="mt-5 border-t border-gray-100 pt-5">
            {pessoasNoEscopo.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma pessoa encontrada neste escopo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pessoasNoEscopo.map((pessoa) => (
                  <Link
                    key={pessoa.id}
                    to={`/pessoa/${pessoa.id}`}
                    className="block rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{pessoa.nome_completo}</p>
                    {pessoa.local_nascimento && (
                      <p className="text-xs text-gray-500 mt-1">{pessoa.local_nascimento}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <Dialog open={Boolean(addRelativeDialog)} onOpenChange={(open) => (!open ? closeAddRelativeDialog() : undefined)}>
        <DialogContent className="bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{addRelativeDialog ? getAddRelativeTitle(addRelativeDialog.group) : 'Adicionar familiar'}</DialogTitle>
            <DialogDescription>
              Selecione uma pessoa já cadastrada ou crie um registro simples para vincular à sua árvore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => updateAddRelativeForm('mode', 'existing')}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  addRelativeForm.mode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pessoa existente
              </button>
              <button
                type="button"
                onClick={() => updateAddRelativeForm('mode', 'new')}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  addRelativeForm.mode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nova pessoa
              </button>
            </div>

            {addRelativeDialog?.group === 'pais' && (
              <Field label="Tipo de vínculo">
                <select
                  value={addRelativeForm.parentRole}
                  onChange={(event) => updateAddRelativeForm('parentRole', event.target.value as ParentRole)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <option value="pai">Pai</option>
                  <option value="mae">Mãe</option>
                </select>
              </Field>
            )}

            {addRelativeDialog?.group === 'filhos' && (
              <Field label="Seu papel em relação ao filho">
                <select
                  value={addRelativeForm.baseParentRole}
                  onChange={(event) => updateAddRelativeForm('baseParentRole', event.target.value as ParentRole)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <option value="pai">Sou pai</option>
                  <option value="mae">Sou mãe</option>
                </select>
              </Field>
            )}

            {addRelativeForm.mode === 'existing' ? (
              <div className="space-y-3">
                <Field label="Buscar pessoa">
                  <Input
                    value={addRelativeForm.search}
                    onChange={(event) => updateAddRelativeForm('search', event.target.value)}
                    placeholder="Digite nome ou local de nascimento"
                  />
                </Field>

                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {existingRelativeCandidates.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">Nenhuma pessoa disponível para este vínculo.</p>
                  ) : (
                    existingRelativeCandidates.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => updateAddRelativeForm('selectedPersonId', person.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          addRelativeForm.selectedPersonId === person.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{person.nome_completo}</p>
                        {person.local_nascimento && (
                          <p className="mt-1 text-xs text-gray-500">{person.local_nascimento}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome completo">
                  <Input
                    value={addRelativeForm.nome_completo}
                    onBlur={() => updateAddRelativeForm('nome_completo', formatPersonName(addRelativeForm.nome_completo))}
                    onChange={(event) => updateAddRelativeForm('nome_completo', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Data de nascimento">
                  <Input
                    value={addRelativeForm.data_nascimento}
                    onBlur={() => updateAddRelativeForm('data_nascimento', normalizeBirthDate(addRelativeForm.data_nascimento))}
                    onChange={(event) => updateAddRelativeForm('data_nascimento', maskBirthDate(event.target.value))}
                    placeholder="DD/MM/AAAA ou AAAA"
                  />
                </Field>
                <Field label="Local de nascimento">
                  <Input
                    value={addRelativeForm.local_nascimento}
                    onBlur={() => updateAddRelativeForm('local_nascimento', normalizeLocation(addRelativeForm.local_nascimento))}
                    onChange={(event) => updateAddRelativeForm('local_nascimento', event.target.value)}
                    placeholder="Cidade/UF"
                  />
                </Field>
              </div>
            )}

            {addRelativeDialog?.group === 'conjuges' && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
                <Field label="Data de casamento">
                  <Input
                    value={addRelativeForm.data_casamento}
                    onBlur={() => updateAddRelativeForm('data_casamento', normalizeBirthDate(addRelativeForm.data_casamento))}
                    onChange={(event) => updateAddRelativeForm('data_casamento', maskBirthDate(event.target.value))}
                    placeholder="DD/MM/AAAA ou AAAA"
                    className="bg-white"
                  />
                </Field>
                <Field label="Local de casamento">
                  <Input
                    value={addRelativeForm.local_casamento}
                    onBlur={() => updateAddRelativeForm('local_casamento', normalizeLocation(addRelativeForm.local_casamento))}
                    onChange={(event) => updateAddRelativeForm('local_casamento', event.target.value)}
                    placeholder="Cidade/UF"
                    className="bg-white"
                  />
                </Field>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAddRelativeDialog} disabled={relationshipSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddRelative} disabled={relationshipSaving}>
              {relationshipSaving ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="minha-arvore-avatar-zoom">Zoom</Label>
                <input
                  id="minha-arvore-avatar-zoom"
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
