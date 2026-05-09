import { createClient } from "npm:@supabase/supabase-js@2";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export type GoogleCalendarConnection = {
  id: string;
  user_id: string;
  google_account_email: string | null;
  google_calendar_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  ativo: boolean;
  last_sync_at: string | null;
};

export type GoogleCalendarEventBody = {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  recurrence: string[];
  reminders: {
    useDefault: boolean;
    overrides: Array<{ method: "popup"; minutes: number }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variavel de ambiente ausente: ${name}`);
  return value;
}

export function getServiceClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request) {
  const supabase = getUserClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ success: false, error: "Usuario nao autenticado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return data.user;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Falha ao trocar codigo OAuth.");
  }
  return payload as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}

function getGoogleApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } | string }).error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
  }
  return fallback;
}

export async function refreshGoogleAccessToken(connection: GoogleCalendarConnection) {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Conexao Google sem refresh token. Reconecte o Google Calendar.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Falha ao renovar token do Google.");
  }

  const nextExpiresAt = new Date(Date.now() + Number(payload.expires_in ?? 3600) * 1000).toISOString();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .update({
      access_token: payload.access_token,
      token_type: payload.token_type ?? connection.token_type ?? "Bearer",
      scope: payload.scope ?? connection.scope,
      expires_at: nextExpiresAt,
      ativo: true,
    })
    .eq("id", connection.id)
    .select("*")
    .single();

  if (error) throw error;
  return (data as GoogleCalendarConnection).access_token;
}

export async function getValidConnection(userId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const connection = data as GoogleCalendarConnection;
  return connection;
}

export async function createOrUpdateGoogleCalendarEvent(params: {
  accessToken: string;
  googleCalendarId: string;
  event: GoogleCalendarEventBody;
  googleEventId?: string | null;
}) {
  const method = params.googleEventId ? "PATCH" : "POST";
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.googleCalendarId)}/events`;
  const url = params.googleEventId ? `${base}/${encodeURIComponent(params.googleEventId)}` : base;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.event),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getGoogleApiError(payload, "Falha ao criar ou atualizar evento no Google Agenda."));
  }

  return payload as { id: string };
}

export async function deleteGoogleCalendarEvent(params: {
  accessToken: string;
  googleCalendarId: string;
  googleEventId: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.googleCalendarId)}/events/${encodeURIComponent(params.googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${params.accessToken}` },
    },
  );

  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getGoogleApiError(payload, "Falha ao remover evento no Google Agenda."));
  }
}

export function parseCompleteFamilyDate(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return null;

  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return null;

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year = Number(br[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return { day, month, year };
    }
    return null;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return { day, month, year };
    }
  }

  return null;
}

export function getFrontendRedirectUrl(path = "/calendario-familiar") {
  const base = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  return new URL(path, base).toString();
}
