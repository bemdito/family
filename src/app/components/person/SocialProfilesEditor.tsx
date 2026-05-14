import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  createSocialProfile,
  getSocialPlaceholder,
  SOCIAL_NETWORKS,
} from '../../utils/personFields';
import type { SocialProfileForm } from '../../utils/personFields';

const SOCIAL_PROFILE_PREFIXES: Record<string, string> = {
  LinkedIn: 'linkedin.com/in/',
  Facebook: 'facebook.com/',
  Instagram: 'instagram.com/',
  TikTok: 'tiktok.com/@',
};

type SocialProfilesEditorProps = {
  profiles: SocialProfileForm[];
  onChange: (profiles: SocialProfileForm[]) => void;
  disabled?: boolean;
  errors?: {
    rede_social?: string;
    instagram_usuario?: string;
  };
};

function ensureProfiles(profiles: SocialProfileForm[]) {
  return profiles.length > 0 ? profiles : [createSocialProfile()];
}

export function SocialProfilesEditor({
  profiles,
  onChange,
  disabled = false,
  errors,
}: SocialProfilesEditorProps) {
  const safeProfiles = ensureProfiles(profiles);

  const updateProfile = (profileId: string, field: 'rede' | 'perfil', value: string) => {
    onChange(
      safeProfiles.map((profile) =>
        profile.id === profileId ? { ...profile, [field]: value } : profile
      ),
    );
  };

  const addProfile = () => {
    onChange([...safeProfiles, createSocialProfile()]);
  };

  const removeProfile = (profileId: string) => {
    onChange(ensureProfiles(safeProfiles.filter((profile) => profile.id !== profileId)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Redes sociais</Label>
      </div>

      <div className="space-y-3">
        {safeProfiles.map((profile, index) => (
          <div key={profile.id} className="space-y-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-start">
              <select
                value={profile.rede}
                onChange={(event) => updateProfile(profile.id, 'rede', event.target.value)}
                disabled={disabled}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-invalid={index === 0 ? Boolean(errors?.rede_social) : undefined}
              >
                <option value="">Selecione a plataforma</option>
                {SOCIAL_NETWORKS.map((network) => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1">
                  {profile.rede && (
                    <span className="inline-flex h-10 shrink-0 items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">
                      {SOCIAL_PROFILE_PREFIXES[profile.rede]}
                    </span>
                  )}
                  <Input
                    value={profile.perfil}
                    onChange={(event) => updateProfile(profile.id, 'perfil', event.target.value)}
                    placeholder={getSocialPlaceholder(profile.rede)}
                    disabled={disabled || !profile.rede}
                    className={profile.rede ? 'rounded-l-none' : undefined}
                    aria-invalid={index === 0 ? Boolean(errors?.instagram_usuario) : undefined}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={addProfile}
                    disabled={disabled}
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
                    onClick={() => removeProfile(profile.id)}
                    disabled={disabled || safeProfiles.length === 1}
                    aria-label="Remover rede social"
                    title="Remover rede social"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {index === 0 && (errors?.rede_social || errors?.instagram_usuario) && (
              <p className="text-xs font-medium text-red-600">
                {errors.rede_social || errors.instagram_usuario}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { SocialProfileForm };
