import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Image, Save, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import {
  confirmOwnLinkedPersonData,
  EditableOwnPersonPayload,
  ensureMemberProfile,
  getPrimaryLinkedPersonWithPessoa,
  updateOwnLinkedPerson,
  UserPersonLinkRecord,
} from '../services/memberProfileService';
import { Pessoa } from '../types';

const EDITABLE_FIELDS: Array<keyof EditableOwnPersonPayload> = [
  'nome_completo',
  'data_nascimento',
  'local_nascimento',
  'local_atual',
  'foto_principal_url',
  'minibio',
  'curiosidades',
  'telefone',
  'endereco',
  'rede_social',
  'instagram_usuario',
  'instagram_url',
  'permitir_exibir_instagram',
  'permitir_mensagens_whatsapp',
];

function buildFormState(pessoa?: Pessoa | null): EditableOwnPersonPayload {
  return {
    nome_completo: pessoa?.nome_completo ?? '',
    data_nascimento: pessoa?.data_nascimento ?? '',
    local_nascimento: pessoa?.local_nascimento ?? '',
    local_atual: pessoa?.local_atual ?? '',
    foto_principal_url: pessoa?.foto_principal_url ?? '',
    minibio: pessoa?.minibio ?? '',
    curiosidades: pessoa?.curiosidades ?? '',
    telefone: pessoa?.telefone ?? '',
    endereco: pessoa?.endereco ?? '',
    rede_social: pessoa?.rede_social ?? '',
    instagram_usuario: pessoa?.instagram_usuario ?? '',
    instagram_url: pessoa?.instagram_url ?? '',
    permitir_exibir_instagram: Boolean(pessoa?.permitir_exibir_instagram),
    permitir_mensagens_whatsapp: Boolean(pessoa?.permitir_mensagens_whatsapp),
  };
}

function cleanPayload(form: EditableOwnPersonPayload): EditableOwnPersonPayload {
  return EDITABLE_FIELDS.reduce<EditableOwnPersonPayload>((payload, field) => {
    const value = form[field];

    if (typeof value === 'string') {
      (payload as Record<string, unknown>)[field] = value.trim();
      return payload;
    }

    (payload as Record<string, unknown>)[field] = value;
    return payload;
  }, {});
}

export function MeusDados() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [link, setLink] = useState<(UserPersonLinkRecord & { pessoa: Pessoa | null }) | null>(null);
  const [form, setForm] = useState<EditableOwnPersonPayload>(buildFormState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user) return;

      setLoading(true);
      const { data, error } = await getPrimaryLinkedPersonWithPessoa(user.id);

      if (!mounted) return;

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      setLink(data);
      setForm(buildFormState(data?.pessoa));
      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const pessoa = link?.pessoa;
  const alreadyConfirmed = Boolean(link?.dados_confirmados);

  const previewName = useMemo(() => {
    const name = String(form.nome_completo ?? '').trim();
    return name || pessoa?.nome_completo || 'Minha pessoa na árvore';
  }, [form.nome_completo, pessoa?.nome_completo]);

  const updateField = (field: keyof EditableOwnPersonPayload, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !link?.id || !pessoa?.id) {
      toast.error('Não foi possível localizar seu vínculo com a árvore.');
      return;
    }

    if (!String(form.nome_completo ?? '').trim()) {
      toast.error('Nome completo é obrigatório.');
      return;
    }

    setSaving(true);

    const payload = cleanPayload(form);
    const { error: updateError, data: updatedPessoa } = await updateOwnLinkedPerson(pessoa.id, payload);

    if (updateError) {
      setSaving(false);
      toast.error(updateError);
      return;
    }

    const { error: profileError } = await ensureMemberProfile(user.id, {
      nome_exibicao: updatedPessoa?.nome_completo ?? String(payload.nome_completo ?? ''),
      avatar_url: String(payload.foto_principal_url ?? '') || null,
    });

    if (profileError) {
      setSaving(false);
      toast.error(profileError);
      return;
    }

    const { error: confirmError } = await confirmOwnLinkedPersonData(link.id);
    setSaving(false);

    if (confirmError) {
      toast.error(confirmError);
      return;
    }

    toast.success('Dados confirmados.');
    navigate('/', { replace: true });
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
            <p className="text-sm font-medium text-blue-700">
              {alreadyConfirmed ? 'Gerenciamento dos meus dados' : 'Confirmação necessária'}
            </p>
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
            <Field label="Nome completo">
              <Input value={String(form.nome_completo ?? '')} onChange={(e) => updateField('nome_completo', e.target.value)} required />
            </Field>
            <Field label="Data de nascimento">
              <Input value={String(form.data_nascimento ?? '')} onChange={(e) => updateField('data_nascimento', e.target.value)} placeholder="DD/MM/AAAA ou AAAA" />
            </Field>
            <Field label="Local de nascimento">
              <Input value={String(form.local_nascimento ?? '')} onChange={(e) => updateField('local_nascimento', e.target.value)} />
            </Field>
            <Field label="Residência atual">
              <Input value={String(form.local_atual ?? '')} onChange={(e) => updateField('local_atual', e.target.value)} />
            </Field>
            <Field label="Telefone">
              <Input value={String(form.telefone ?? '')} onChange={(e) => updateField('telefone', e.target.value)} />
            </Field>
            <Field label="Endereço">
              <Input value={String(form.endereco ?? '')} onChange={(e) => updateField('endereco', e.target.value)} />
            </Field>
            <Field label="Rede social">
              <Input value={String(form.rede_social ?? '')} onChange={(e) => updateField('rede_social', e.target.value)} />
            </Field>
            <Field label="Usuário do Instagram">
              <Input value={String(form.instagram_usuario ?? '')} onChange={(e) => updateField('instagram_usuario', e.target.value)} placeholder="@usuario" />
            </Field>
            <Field label="URL do Instagram">
              <Input value={String(form.instagram_url ?? '')} onChange={(e) => updateField('instagram_url', e.target.value)} placeholder="https://instagram.com/usuario" />
            </Field>
            <Field label="URL da foto principal">
              <Input value={String(form.foto_principal_url ?? '')} onChange={(e) => updateField('foto_principal_url', e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <Field label="Mini bio">
              <Textarea value={String(form.minibio ?? '')} onChange={(e) => updateField('minibio', e.target.value)} className="min-h-24" />
            </Field>
            <Field label="Curiosidades">
              <Textarea value={String(form.curiosidades ?? '')} onChange={(e) => updateField('curiosidades', e.target.value)} className="min-h-24" />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToggleField
              label="Exibir Instagram no perfil"
              checked={Boolean(form.permitir_exibir_instagram)}
              onCheckedChange={(checked) => updateField('permitir_exibir_instagram', checked)}
            />
            <ToggleField
              label="Permitir mensagens por WhatsApp"
              checked={Boolean(form.permitir_mensagens_whatsapp)}
              onCheckedChange={(checked) => updateField('permitir_mensagens_whatsapp', checked)}
            />
          </div>

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

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-blue-700">
              {form.foto_principal_url ? (
                <img src={String(form.foto_principal_url)} alt={previewName} className="h-full w-full object-cover" />
              ) : (
                <Image className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-gray-900">{previewName}</h2>
              <p className="text-sm text-gray-500">{String(form.local_atual || form.local_nascimento || 'Sem local informado')}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Campos administrativos como geração manual, lado da árvore, falecimento e tipo de entidade continuam protegidos.
          </div>

          {alreadyConfirmed && (
            <Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/')}>
              Acessar árvore
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
