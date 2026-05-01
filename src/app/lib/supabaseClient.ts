import { createClient } from '@supabase/supabase-js';

function normalizeEnvValue(value: unknown) {
  const normalized = String(value ?? '').trim();
  const first = normalized.at(0);
  const last = normalized.at(-1);

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return normalized.slice(1, -1).trim();
  }

  return normalized;
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export function getSupabaseConfigDiagnostics() {
  return {
    url: supabaseUrl || '(ausente)',
    hasAnonKey: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey.length,
    anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.slice(0, 12) : '(ausente)',
    anonKeySuffix: supabaseAnonKey ? supabaseAnonKey.slice(-8) : '(ausente)',
  };
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Configuração inválida do cliente', getSupabaseConfigDiagnostics());
  throw new Error('Chave ausente: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar configuradas.');
}

console.info('[Supabase] Configuração do cliente', getSupabaseConfigDiagnostics());

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
