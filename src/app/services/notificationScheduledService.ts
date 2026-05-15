import { supabase } from '../lib/supabaseClient';
import { obterTodasPessoas } from './dataService';
import { dispatchNotification, sanitizeNotificationMetadata } from './notificationDispatchService';
import { listAdminUserIds, listLinkedUserIdsForPessoa, uniqueUserIds } from './notificationRecipientsService';
import { NotificationDispatchResult, NotificationDispatchStatus, TipoNotificacaoUsuario } from '../types';
import {
  getSpecialDateCandidatesForPeople,
  SpecialDateCandidate,
  SpecialDateCandidateType,
} from '../utils/notificationDateRules';

export type NotificationOccurrenceType = 'aniversario' | 'memoria_falecimento';

export interface NotificationOccurrenceInput {
  occurrenceKey: string;
  tipo: NotificationOccurrenceType;
  userId: string;
  entityType: 'person';
  entityId: string;
  occurrenceDate: string;
  notificationId?: string | null;
  status: 'created';
  metadata: Record<string, unknown>;
}

export interface NotificationOccurrenceResult {
  created: boolean;
  duplicate: boolean;
}

export interface DailyNotificationRunSummary {
  referenceDate: string;
  birthdaysFound: number;
  memorialsFound: number;
  notificationsCreated: number;
  skippedDuplicates: number;
  skippedByPreferences: number;
  recipientsResolved: number;
  dispatchResults: NotificationDispatchResult[];
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNotificationType(candidateType: SpecialDateCandidateType): TipoNotificacaoUsuario {
  return candidateType === 'aniversario' ? 'aniversario' : 'datas_especiais';
}

function getOccurrenceType(candidateType: SpecialDateCandidateType): NotificationOccurrenceType {
  return candidateType === 'aniversario' ? 'aniversario' : 'memoria_falecimento';
}

function getDispatchStatus(results: NotificationDispatchResult[]): NotificationDispatchStatus | undefined {
  return results.find((result) => result.channel === 'interna')?.status;
}

export function buildOccurrenceKey(params: {
  tipo: NotificationOccurrenceType;
  occurrenceDate: string;
  userId: string;
  pessoaId: string;
}) {
  return `${params.tipo}:${params.occurrenceDate}:${params.userId}:${params.pessoaId}`;
}

export async function getTodaySpecialDateCandidates(referenceDate = new Date()) {
  const pessoas = await obterTodasPessoas();
  return getSpecialDateCandidatesForPeople(pessoas, referenceDate);
}

export async function createNotificationOccurrenceIfMissing(
  input: NotificationOccurrenceInput
): Promise<NotificationOccurrenceResult> {
  const { error } = await supabase
    .from('notification_occurrences')
    .insert({
      occurrence_key: input.occurrenceKey,
      tipo: input.tipo,
      user_id: input.userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      occurrence_date: input.occurrenceDate,
      notification_id: input.notificationId ?? null,
      status: input.status,
      metadata: sanitizeNotificationMetadata(input.metadata),
    });

  if (!error) {
    return { created: true, duplicate: false };
  }

  if (error.code === '23505' || String(error.message ?? '').includes('duplicate key')) {
    return { created: false, duplicate: true };
  }

  throw error;
}

async function notificationOccurrenceExists(occurrenceKey: string) {
  const { data, error } = await supabase
    .from('notification_occurrences')
    .select('id')
    .eq('occurrence_key', occurrenceKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function listRecipientsForSpecialDate(candidate: SpecialDateCandidate) {
  const [admins, linkedUsers] = await Promise.all([
    listAdminUserIds(),
    listLinkedUserIdsForPessoa(candidate.pessoa.id),
  ]);

  return uniqueUserIds([...admins, ...linkedUsers]);
}

async function dispatchSpecialDateCandidate(candidate: SpecialDateCandidate): Promise<DailyNotificationRunSummary> {
  const summary: DailyNotificationRunSummary = {
    referenceDate: candidate.occurrenceDate,
    birthdaysFound: candidate.type === 'aniversario' ? 1 : 0,
    memorialsFound: candidate.type === 'memoria_falecimento' ? 1 : 0,
    notificationsCreated: 0,
    skippedDuplicates: 0,
    skippedByPreferences: 0,
    recipientsResolved: 0,
    dispatchResults: [],
  };

  const recipients = await listRecipientsForSpecialDate(candidate);
  summary.recipientsResolved = recipients.length;

  for (const userId of recipients) {
    const occurrenceType = getOccurrenceType(candidate.type);
    const occurrenceKey = buildOccurrenceKey({
      tipo: occurrenceType,
      occurrenceDate: candidate.occurrenceDate,
      userId,
      pessoaId: candidate.pessoa.id,
    });

    const metadata = {
      pessoa_id: candidate.pessoa.id,
      tipo_data: occurrenceType,
      occurrence_date: candidate.occurrenceDate,
      age: candidate.age,
      years_since_death: candidate.yearsSinceDeath,
    };

    try {
      const alreadyCreated = await notificationOccurrenceExists(occurrenceKey);
      if (alreadyCreated) {
        summary.skippedDuplicates += 1;
        continue;
      }

      const results = await dispatchNotification({
        userId,
        type: getNotificationType(candidate.type),
        titulo: candidate.type === 'aniversario' ? 'Aniversário na família' : 'Data de memória',
        mensagem:
          candidate.type === 'aniversario'
            ? `Hoje é aniversário de ${candidate.pessoa.nome_completo}.`
            : `Hoje é uma data de memória de ${candidate.pessoa.nome_completo}.`,
        link: `/pessoa/${candidate.pessoa.id}`,
        metadata,
        channels: ['interna'],
        respectPreferences: true,
      });

      summary.dispatchResults.push(...results);
      const status = getDispatchStatus(results);

      if (status === 'disabled_by_preferences') {
        summary.skippedByPreferences += 1;
        continue;
      }

      const notificationId = results.find((result) => result.channel === 'interna')?.notificationId ?? null;
      const occurrence = await createNotificationOccurrenceIfMissing({
        occurrenceKey,
        tipo: occurrenceType,
        userId,
        entityType: 'person',
        entityId: candidate.pessoa.id,
        occurrenceDate: candidate.occurrenceDate,
        notificationId,
        status: 'created',
        metadata,
      });

      if (occurrence.duplicate) {
        summary.skippedDuplicates += 1;
      } else if (occurrence.created && status === 'sent') {
        summary.notificationsCreated += 1;
      }
    } catch (error) {
      console.warn('[Notificações] Falha na rotina manual de datas especiais:', error);
    }
  }

  return summary;
}

function mergeSummaries(summaries: DailyNotificationRunSummary[], referenceDate: string): DailyNotificationRunSummary {
  return summaries.reduce<DailyNotificationRunSummary>(
    (acc, summary) => ({
      referenceDate,
      birthdaysFound: acc.birthdaysFound + summary.birthdaysFound,
      memorialsFound: acc.memorialsFound + summary.memorialsFound,
      notificationsCreated: acc.notificationsCreated + summary.notificationsCreated,
      skippedDuplicates: acc.skippedDuplicates + summary.skippedDuplicates,
      skippedByPreferences: acc.skippedByPreferences + summary.skippedByPreferences,
      recipientsResolved: acc.recipientsResolved + summary.recipientsResolved,
      dispatchResults: [...acc.dispatchResults, ...summary.dispatchResults],
    }),
    {
      referenceDate,
      birthdaysFound: 0,
      memorialsFound: 0,
      notificationsCreated: 0,
      skippedDuplicates: 0,
      skippedByPreferences: 0,
      recipientsResolved: 0,
      dispatchResults: [],
    }
  );
}

export async function dispatchBirthdayNotifications(referenceDate = new Date()) {
  const candidates = (await getTodaySpecialDateCandidates(referenceDate)).filter(
    (candidate) => candidate.type === 'aniversario'
  );
  const summaries = await Promise.all(candidates.map(dispatchSpecialDateCandidate));
  return mergeSummaries(summaries, toDateKey(referenceDate));
}

export async function dispatchMemorialDateNotifications(referenceDate = new Date()) {
  const candidates = (await getTodaySpecialDateCandidates(referenceDate)).filter(
    (candidate) => candidate.type === 'memoria_falecimento'
  );
  const summaries = await Promise.all(candidates.map(dispatchSpecialDateCandidate));
  return mergeSummaries(summaries, toDateKey(referenceDate));
}

export async function runDailyNotificationChecks(referenceDate = new Date()) {
  const candidates = await getTodaySpecialDateCandidates(referenceDate);
  const summaries = await Promise.all(candidates.map(dispatchSpecialDateCandidate));
  return mergeSummaries(summaries, toDateKey(referenceDate));
}
