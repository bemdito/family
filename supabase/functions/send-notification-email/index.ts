import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationType =
  | "aniversario"
  | "datas_especiais"
  | "memoria"
  | "falecimento"
  | "novo_usuario"
  | "novas_mensagens_forum"
  | "novos_registros_historicos"
  | "evento_historico_familia"
  | "notificacao"
  | "aviso";

type EmailStatus =
  | "sent"
  | "failed"
  | "not_configured"
  | "missing_destination"
  | "disabled_by_preferences";

const preferenceByType: Partial<Record<NotificationType, string>> = {
  aniversario: "receber_email_datas_especiais",
  datas_especiais: "receber_email_datas_especiais",
  memoria: "receber_email_datas_especiais",
  falecimento: "receber_email_datas_especiais",
  novo_usuario: "receber_email_novo_usuario",
  novas_mensagens_forum: "receber_email_novas_mensagens_forum",
  novos_registros_historicos: "receber_email_novos_registros_historicos",
  evento_historico_familia: "receber_email_evento_historico_familia",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSiteUrl() {
  return (
    getEnv("SITE_URL") ||
    getEnv("PUBLIC_SITE_URL") ||
    getEnv("SUPABASE_SITE_URL") ||
    "https://arvorefamilia.com"
  ).replace(/\/+$/, "");
}

function buildAbsoluteLink(link?: string | null) {
  if (!link) return `${normalizeSiteUrl()}/notificacoes`;
  if (/^https?:\/\//i.test(link)) return link;
  return `${normalizeSiteUrl()}${link.startsWith("/") ? link : `/${link}`}`;
}

function textFromHtml(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildEmailTemplate(params: {
  titulo: string;
  mensagem: string;
  link?: string | null;
}) {
  const appName = "Arvore Familia";
  const safeTitle = escapeHtml(params.titulo);
  const safeMessage = escapeHtml(params.mensagem);
  const notificationUrl = buildAbsoluteLink("/notificacoes");
  const actionUrl = buildAbsoluteLink(params.link);

  const html = [
    '<div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">',
    '<div style="max-width:560px;margin:0 auto;padding:24px;">',
    '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">',
    `<p style="margin:0 0 12px;font-size:13px;color:#2563eb;font-weight:700;">${appName}</p>`,
    `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">${safeTitle}</h1>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${safeMessage}</p>`,
    params.link
      ? `<p style="margin:0 0 20px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-size:14px;font-weight:700;">Abrir no sistema</a></p>`
      : "",
    `<p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">Voce recebeu este e-mail conforme suas preferencias de notificacao. Acesse <a href="${escapeHtml(notificationUrl)}" style="color:#2563eb;">/notificacoes</a> para revisar notificacoes e preferencias.</p>`,
    "</div>",
    '<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Arvore Familia</p>',
    "</div>",
    "</div>",
  ].join("");

  const text = [
    appName,
    "",
    params.titulo,
    textFromHtml(params.mensagem),
    "",
    params.link ? `Abrir no sistema: ${actionUrl}` : `Notificacoes: ${notificationUrl}`,
    "",
    "Voce recebeu este e-mail conforme suas preferencias de notificacao.",
    `Preferencias: ${notificationUrl}`,
  ].join("\n");

  return { html, text };
}

async function getCaller(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function isAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.role === "admin";
}

function result(status: EmailStatus, params: Record<string, unknown> = {}) {
  return jsonResponse({ ok: status === "sent", status, provider: "resend", ...params });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, status: "failed", error: "Metodo nao permitido." }, 405);
  }

  try {
    const { userId, notificationType, titulo, mensagem, link } = await req.json();

    if (!userId || !notificationType || !titulo || !mensagem) {
      return jsonResponse({
        ok: false,
        status: "failed",
        error: "userId, notificationType, titulo e mensagem sao obrigatorios.",
      }, 400);
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = getEnv("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return result("not_configured", { error: "Supabase env vars ausentes." });
    }

    const caller = await getCaller(req, supabaseUrl, anonKey);
    if (!caller) {
      return jsonResponse({ ok: false, status: "failed", error: "Usuario nao autenticado." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const callerIsAdmin = await isAdmin(supabase, caller.id);

    if (caller.id !== userId && !callerIsAdmin) {
      return jsonResponse({ ok: false, status: "failed", error: "Usuario sem permissao para este destinatario." }, 403);
    }

    const { data: preferences, error: preferencesError } = await supabase
      .from("preferencias_notificacao")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (preferencesError) throw preferencesError;

    if (preferences?.receber_email === false) {
      return result("disabled_by_preferences");
    }

    const preferenceKey = preferenceByType[notificationType as NotificationType];
    if (preferenceKey && preferences?.[preferenceKey] === false) {
      return result("disabled_by_preferences");
    }

    const resendApiKey = getEnv("RESEND_API_KEY");
    const emailFrom = getEnv("NOTIFICATION_EMAIL_FROM") || getEnv("EMAIL_FROM");
    const replyTo = getEnv("NOTIFICATION_EMAIL_REPLY_TO");

    if (!resendApiKey || !emailFrom) {
      console.warn("[send-notification-email] Provider nao configurado.");
      return result("not_configured", { error: "RESEND_API_KEY ou NOTIFICATION_EMAIL_FROM ausente." });
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    const email = userData.user?.email;
    if (!email) {
      return result("missing_destination");
    }

    const template = buildEmailTemplate({
      titulo: String(titulo),
      mensagem: String(mensagem),
      link: link ? String(link) : null,
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        reply_to: replyTo || undefined,
        subject: String(titulo),
        html: template.html,
        text: template.text,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return result("failed", {
        error: payload?.message || payload?.error || "Erro ao enviar email.",
      });
    }

    return result("sent", { providerMessageId: payload?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("[send-notification-email]", message);
    return result("failed", { error: message });
  }
});
