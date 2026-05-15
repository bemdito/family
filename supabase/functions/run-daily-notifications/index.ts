import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-daily-notifications-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SpecialDateType = "aniversario" | "memoria_falecimento";
type OccurrenceStatus = "pending" | "sent" | "failed" | "skipped";
type DispatchStatus = "sent" | "failed" | "disabled_by_preferences";

type PessoaRecord = {
  id: string;
  nome_completo: string;
  data_nascimento?: string | number | null;
  data_falecimento?: string | number | null;
  local_falecimento?: string | null;
  falecido?: boolean | null;
};

type SpecialDateCandidate = {
  type: SpecialDateType;
  pessoa: PessoaRecord;
  occurrenceDate: string;
  age?: number;
  yearsSinceDeath?: number;
};

type UserLinkRow = {
  user_id?: string | null;
};

type PreferencesRow = {
  receber_aniversarios?: boolean | null;
  receber_datas_memoria?: boolean | null;
};

type RunSummary = {
  referenceDate: string;
  birthdaysFound: number;
  memorialsFound: number;
  notificationsCreated: number;
  duplicatesSkipped: number;
  preferenceSkipped: number;
  noRecipientSkipped: number;
  failed: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variavel de ambiente ausente: ${name}`);
  return value;
}

function getServiceClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function isAuthorized(req: Request) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const configuredSecret = Deno.env.get("DAILY_NOTIFICATIONS_SECRET") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const requestSecret = req.headers.get("x-daily-notifications-secret") ?? "";

  if (serviceRoleKey && bearerToken && timingSafeEqual(bearerToken, serviceRoleKey)) return true;
  if (configuredSecret && requestSecret && timingSafeEqual(requestSecret, configuredSecret)) return true;

  return false;
}

function getSaoPauloDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseReferenceDate(value: unknown) {
  if (value === undefined || value === null || value === "") return getSaoPauloDateKey();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("referenceDate deve estar no formato YYYY-MM-DD.");
  }

  const parsed = parseCompleteFamilyDate(value);
  if (!parsed) throw new Error("referenceDate invalida.");
  return value;
}

function parseCompleteFamilyDate(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return null;

  const text = String(value).trim();
  if (!text || /^\d{4}$/.test(text)) return null;

  const brMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const day = brMatch ? Number(brMatch[1]) : isoMatch ? Number(isoMatch[3]) : null;
  const month = brMatch ? Number(brMatch[2]) : isoMatch ? Number(isoMatch[2]) : null;
  const year = brMatch ? Number(brMatch[3]) : isoMatch ? Number(isoMatch[1]) : null;

  if (!day || !month || !year) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return { day, month, year };
}

function isPersonDeceased(pessoa: PessoaRecord) {
  return Boolean(
    pessoa.falecido ||
      String(pessoa.data_falecimento ?? "").trim() ||
      String(pessoa.local_falecimento ?? "").trim()
  );
}

function buildCandidates(pessoas: PessoaRecord[], referenceDate: string) {
  const reference = parseCompleteFamilyDate(referenceDate);
  if (!reference) throw new Error("Data de referencia invalida.");

  const candidates: SpecialDateCandidate[] = [];

  for (const pessoa of pessoas) {
    const birthDate = parseCompleteFamilyDate(pessoa.data_nascimento);
    if (
      birthDate &&
      !isPersonDeceased(pessoa) &&
      birthDate.day === reference.day &&
      birthDate.month === reference.month
    ) {
      candidates.push({
        type: "aniversario",
        pessoa,
        occurrenceDate: referenceDate,
        age: reference.year - birthDate.year,
      });
    }

    const deathDate = parseCompleteFamilyDate(pessoa.data_falecimento);
    if (
      deathDate &&
      isPersonDeceased(pessoa) &&
      deathDate.day === reference.day &&
      deathDate.month === reference.month
    ) {
      candidates.push({
        type: "memoria_falecimento",
        pessoa,
        occurrenceDate: referenceDate,
        yearsSinceDeath: reference.year - deathDate.year,
      });
    }
  }

  return candidates;
}

function uniqueUserIds(userIds: Array<string | null | undefined>) {
  return Array.from(new Set(userIds.filter((userId): userId is string => Boolean(userId))));
}

function getNotificationType(type: SpecialDateType) {
  return type === "aniversario" ? "aniversario" : "datas_especiais";
}

function buildOccurrenceKey(params: {
  type: SpecialDateType;
  occurrenceDate: string;
  userId: string;
  pessoaId: string;
}) {
  return `${params.type}:${params.occurrenceDate}:${params.userId}:${params.pessoaId}`;
}

function buildMetadata(candidate: SpecialDateCandidate) {
  return {
    source: "edge-run-daily-notifications",
    pessoa_id: candidate.pessoa.id,
    tipo_data: candidate.type,
    occurrence_date: candidate.occurrenceDate,
    age: candidate.age,
    years_since_death: candidate.yearsSinceDeath,
  };
}

async function listAdminUserIds(supabase: ReturnType<typeof getServiceClient>) {
  const { data, error } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (error) throw error;
  return uniqueUserIds((data ?? []).map((row: { id?: string | null }) => row.id));
}

async function listLinkedUserIdsForPessoa(supabase: ReturnType<typeof getServiceClient>, pessoaId: string) {
  const { data, error } = await supabase.from("user_person_links").select("user_id").eq("pessoa_id", pessoaId);
  if (error) throw error;
  return uniqueUserIds(((data ?? []) as UserLinkRow[]).map((row) => row.user_id));
}

async function listRecipients(supabase: ReturnType<typeof getServiceClient>, candidate: SpecialDateCandidate) {
  const [admins, linkedUsers] = await Promise.all([
    listAdminUserIds(supabase),
    listLinkedUserIdsForPessoa(supabase, candidate.pessoa.id),
  ]);
  return uniqueUserIds([...admins, ...linkedUsers]);
}

async function isAllowedByPreferences(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  candidateType: SpecialDateType
) {
  const { data, error } = await supabase
    .from("preferencias_notificacao")
    .select("receber_aniversarios,receber_datas_memoria")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const preferences = (data ?? {}) as PreferencesRow;

  if (candidateType === "aniversario") return preferences.receber_aniversarios !== false;
  return preferences.receber_datas_memoria !== false;
}

async function createOccurrence(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    occurrenceKey: string;
    candidate: SpecialDateCandidate;
    userId: string;
    status: OccurrenceStatus;
    metadata: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("notification_occurrences").insert({
    occurrence_key: params.occurrenceKey,
    tipo: params.candidate.type,
    user_id: params.userId,
    entity_type: "person",
    entity_id: params.candidate.pessoa.id,
    occurrence_date: params.candidate.occurrenceDate,
    notification_id: null,
    status: params.status,
    metadata: params.metadata,
  });

  if (!error) return { created: true, duplicate: false };
  if (error.code === "23505" || String(error.message ?? "").includes("duplicate key")) {
    return { created: false, duplicate: true };
  }
  throw error;
}

async function updateOccurrence(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    occurrenceKey: string;
    notificationId?: string | null;
    status: OccurrenceStatus;
    metadata: Record<string, unknown>;
  }
) {
  const { error } = await supabase
    .from("notification_occurrences")
    .update({
      notification_id: params.notificationId ?? null,
      status: params.status,
      metadata: params.metadata,
    })
    .eq("occurrence_key", params.occurrenceKey);

  if (error) throw error;
}

async function logDispatch(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    notificationId?: string | null;
    userId: string;
    type: string;
    status: DispatchStatus;
    errorMessage?: string | null;
    metadata: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("notification_dispatch_logs").insert({
    notification_id: params.notificationId ?? null,
    user_id: params.userId,
    tipo: params.type,
    canal: "interna",
    status: params.status,
    provider: "supabase-edge-function",
    error_message: params.errorMessage ?? null,
    metadata: params.metadata,
  });

  if (error) throw error;
}

async function createInternalNotification(
  supabase: ReturnType<typeof getServiceClient>,
  params: {
    candidate: SpecialDateCandidate;
    userId: string;
    metadata: Record<string, unknown>;
  }
) {
  const type = getNotificationType(params.candidate.type);
  const { data, error } = await supabase
    .from("notificacoes_usuario")
    .insert({
      user_id: params.userId,
      titulo: params.candidate.type === "aniversario" ? "Aniversario na familia" : "Data de memoria",
      mensagem:
        params.candidate.type === "aniversario"
          ? `Hoje e aniversario de ${params.candidate.pessoa.nome_completo}.`
          : `Hoje e uma data de memoria de ${params.candidate.pessoa.nome_completo}.`,
      tipo: type,
      canal: "interna",
      link: `/pessoa/${params.candidate.pessoa.id}`,
      metadata: params.metadata,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

async function processCandidate(
  supabase: ReturnType<typeof getServiceClient>,
  candidate: SpecialDateCandidate,
  summary: RunSummary
) {
  const recipients = await listRecipients(supabase, candidate);
  if (recipients.length === 0) {
    summary.noRecipientSkipped += 1;
    return;
  }

  for (const userId of recipients) {
    const occurrenceKey = buildOccurrenceKey({
      type: candidate.type,
      occurrenceDate: candidate.occurrenceDate,
      userId,
      pessoaId: candidate.pessoa.id,
    });
    const metadata = buildMetadata(candidate);

    try {
      const occurrence = await createOccurrence(supabase, {
        occurrenceKey,
        candidate,
        userId,
        status: "pending",
        metadata,
      });

      if (occurrence.duplicate) {
        summary.duplicatesSkipped += 1;
        continue;
      }

      const notificationType = getNotificationType(candidate.type);
      const allowedByPreferences = await isAllowedByPreferences(supabase, userId, candidate.type);

      if (!allowedByPreferences) {
        summary.preferenceSkipped += 1;
        const nextMetadata = { ...metadata, dispatch_status: "disabled_by_preferences" };
        await updateOccurrence(supabase, {
          occurrenceKey,
          status: "skipped",
          metadata: nextMetadata,
        });
        await logDispatch(supabase, {
          userId,
          type: notificationType,
          status: "disabled_by_preferences",
          metadata: nextMetadata,
        });
        continue;
      }

      const notificationId = await createInternalNotification(supabase, {
        candidate,
        userId,
        metadata,
      });
      const nextMetadata = { ...metadata, dispatch_status: "sent" };

      await updateOccurrence(supabase, {
        occurrenceKey,
        notificationId,
        status: "sent",
        metadata: nextMetadata,
      });
      await logDispatch(supabase, {
        notificationId,
        userId,
        type: notificationType,
        status: "sent",
        metadata: nextMetadata,
      });

      summary.notificationsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : "Erro inesperado na rotina diaria.";
      const nextMetadata = { ...metadata, dispatch_status: "failed", error_message: message.slice(0, 240) };

      try {
        await updateOccurrence(supabase, {
          occurrenceKey,
          status: "failed",
          metadata: nextMetadata,
        });
        await logDispatch(supabase, {
          userId,
          type: getNotificationType(candidate.type),
          status: "failed",
          errorMessage: message,
          metadata: nextMetadata,
        });
      } catch (loggingError) {
        console.warn("[run-daily-notifications] Falha ao registrar erro de dispatch.", loggingError);
      }

      console.warn("[run-daily-notifications] Falha ao processar destinatario.", {
        occurrenceKey,
        userId,
        error: message,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo nao permitido." }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, error: "Nao autorizado." }, 401);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { referenceDate?: unknown };
    const referenceDate = parseReferenceDate(body.referenceDate);
    const supabase = getServiceClient();

    const { data: pessoas, error: pessoasError } = await supabase
      .from("pessoas")
      .select("id,nome_completo,data_nascimento,data_falecimento,local_falecimento,falecido")
      .order("nome_completo", { ascending: true });

    if (pessoasError) throw pessoasError;

    const candidates = buildCandidates((pessoas ?? []) as PessoaRecord[], referenceDate);
    const summary: RunSummary = {
      referenceDate,
      birthdaysFound: candidates.filter((candidate) => candidate.type === "aniversario").length,
      memorialsFound: candidates.filter((candidate) => candidate.type === "memoria_falecimento").length,
      notificationsCreated: 0,
      duplicatesSkipped: 0,
      preferenceSkipped: 0,
      noRecipientSkipped: 0,
      failed: 0,
    };

    for (const candidate of candidates) {
      try {
        await processCandidate(supabase, candidate, summary);
      } catch (error) {
        summary.failed += 1;
        console.warn("[run-daily-notifications] Falha ao processar candidato.", {
          pessoaId: candidate.pessoa.id,
          type: candidate.type,
          error: error instanceof Error ? error.message : "Erro inesperado.",
        });
      }
    }

    console.info("[run-daily-notifications] Rotina finalizada.", summary);
    return jsonResponse({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("[run-daily-notifications]", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
