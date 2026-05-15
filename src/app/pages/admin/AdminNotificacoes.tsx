import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Mail, RefreshCcw } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { NotificationStatusBadge } from '../../components/admin/NotificationStatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { dispatchNotification } from '../../services/notificationDispatchService';
import { DailyNotificationRunSummary, runDailyNotificationChecks } from '../../services/notificationScheduledService';
import {
  checkNotificationEmailConfiguration,
  getNotificationAdminSummary,
  listRecentNotificationDispatchLogs,
  listRecentNotificationPreferencesAdmin,
  listRecentNotificationsAdmin,
  NotificationEmailConfiguration,
} from '../../services/notificationAdminService';
import {
  NotificationAdminSummary,
  NotificationDispatchLog,
  NotificacaoUsuario,
  PreferenciaNotificacao,
} from '../../types';

function formatDate(value?: string) {
  if (!value) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function maskUserId(userId?: string | null) {
  if (!userId) return 'Usuário não informado';
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

function booleanLabel(value: boolean) {
  return value ? 'Ligado' : 'Desligado';
}

function SummaryList({ title, items }: { title: string; items: Record<string, number> }) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">Sem dados para exibir.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-gray-700">{label}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminNotificacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificacaoUsuario[]>([]);
  const [preferences, setPreferences] = useState<PreferenciaNotificacao[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<NotificationDispatchLog[]>([]);
  const [summary, setSummary] = useState<NotificationAdminSummary>({
    totalNotifications: 0,
    unreadNotifications: 0,
    channelsUsed: 0,
    recentDispatchErrors: 0,
    byType: {},
    byChannel: {},
  });
  const [emailConfig, setEmailConfig] = useState<NotificationEmailConfiguration>(() =>
    checkNotificationEmailConfiguration()
  );
  const [loading, setLoading] = useState(true);
  const [creatingTest, setCreatingTest] = useState(false);
  const [runningManualRoutine, setRunningManualRoutine] = useState(false);
  const [manualRoutineSummary, setManualRoutineSummary] = useState<DailyNotificationRunSummary | null>(null);

  const loadDiagnostics = async () => {
    try {
      setLoading(true);
      const [nextNotifications, nextPreferences, nextDispatchLogs, nextSummary] = await Promise.all([
        listRecentNotificationsAdmin(50),
        listRecentNotificationPreferencesAdmin(50),
        listRecentNotificationDispatchLogs(50),
        getNotificationAdminSummary(),
      ]);

      setNotifications(nextNotifications);
      setPreferences(nextPreferences);
      setDispatchLogs(nextDispatchLogs);
      setSummary(nextSummary);
      setEmailConfig(checkNotificationEmailConfiguration());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleCreateInternalTest = async () => {
    if (!user?.id) return;

    try {
      setCreatingTest(true);
      await dispatchNotification({
        userId: user.id,
        type: 'notificacao',
        titulo: 'Teste interno de notificação',
        mensagem: 'Notificação criada pelo painel admin para validar o canal interno e os logs de dispatch.',
        link: '/notificacoes',
        metadata: {
          source: 'admin-notificacoes',
          test: true,
        },
        channels: ['interna'],
      });
      await loadDiagnostics();
    } finally {
      setCreatingTest(false);
    }
  };

  const handleRunManualRoutine = async () => {
    try {
      setRunningManualRoutine(true);
      const result = await runDailyNotificationChecks();
      setManualRoutineSummary(result);
      await loadDiagnostics();
    } finally {
      setRunningManualRoutine(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
              <p className="text-sm text-gray-500">Diagnóstico administrativo de preferências e disparos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Button>
            <Button onClick={loadDiagnostics} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar diagnóstico
            </Button>
            <Button variant="secondary" onClick={handleCreateInternalTest} disabled={creatingTest || loading}>
              <Bell className="mr-2 h-4 w-4" />
              Teste interno
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de notificações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary.totalNotifications}</div>
              <p className="mt-1 text-xs text-gray-500">Registros recentes acessíveis ao admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Não lidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary.unreadNotifications}</div>
              <p className="mt-1 text-xs text-gray-500">Pendentes na área interna</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Canais usados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary.channelsUsed}</div>
              <p className="mt-1 text-xs text-gray-500">Canais presentes nas notificações</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Últimos erros de envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary.recentDispatchErrors}</div>
              <p className="mt-1 text-xs text-gray-500">Falhas nos logs recentes de dispatch</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SummaryList title="Resumo por tipo" items={summary.byType} />
          <SummaryList title="Resumo por canal" items={summary.byChannel} />
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Diagnóstico de e-mail
            </CardTitle>
            <Badge variant={emailConfig.status === 'not_configured' ? 'destructive' : 'outline'}>
              {emailConfig.status === 'verified'
                ? 'Verificado'
                : emailConfig.status === 'not_configured'
                  ? 'Não configurado'
                  : 'Não verificado'}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{emailConfig.message}</p>
            <p className="mt-2 text-xs text-gray-500">
              Função esperada: {emailConfig.functionName}. Este painel é somente leitura e não envia e-mail real.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Rotinas manuais</CardTitle>
            <Button onClick={handleRunManualRoutine} disabled={runningManualRoutine || loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Verificar aniversários e memórias de hoje
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Executa apenas notificações internas para datas completas do dia. Não envia e-mail, push ou WhatsApp.
            </p>

            {runningManualRoutine && (
              <p className="mt-3 text-sm text-gray-500">Verificando datas especiais...</p>
            )}

            {manualRoutineSummary && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Aniversários</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.birthdaysFound}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Memórias</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.memorialsFound}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Criadas</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.notificationsCreated}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Duplicadas</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.skippedDuplicates}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Preferências</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.skippedByPreferences}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-500">Destinatários</p>
                  <p className="text-xl font-semibold text-gray-900">{manualRoutineSummary.recipientsResolved}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Notificações recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando notificações...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma notificação encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="max-w-[320px] whitespace-normal">
                        <p className="font-medium text-gray-900">{notification.titulo}</p>
                        <p className="line-clamp-2 text-xs text-gray-500">{notification.mensagem}</p>
                      </TableCell>
                      <TableCell>{notification.tipo}</TableCell>
                      <TableCell>{notification.canal}</TableCell>
                      <TableCell>
                        <Badge variant={notification.lida ? 'outline' : 'secondary'}>
                          {notification.lida ? 'Lida' : 'Não lida'}
                        </Badge>
                      </TableCell>
                      <TableCell>{maskUserId(notification.user_id)}</TableCell>
                      <TableCell>{formatDate(notification.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Preferências de usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando preferências...</p>
            ) : preferences.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma preferência encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Push</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Atualizada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preferences.map((preference) => (
                    <TableRow key={preference.id}>
                      <TableCell>{maskUserId(preference.user_id)}</TableCell>
                      <TableCell>{booleanLabel(preference.receber_email)}</TableCell>
                      <TableCell>{booleanLabel(preference.receber_push)}</TableCell>
                      <TableCell>{booleanLabel(preference.receber_whatsapp)}</TableCell>
                      <TableCell>{formatDate(preference.updated_at || preference.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs de dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando logs...</p>
            ) : dispatchLogs.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum log de dispatch encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <NotificationStatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>{log.tipo}</TableCell>
                      <TableCell>{log.canal}</TableCell>
                      <TableCell>{log.provider || 'Não informado'}</TableCell>
                      <TableCell className="max-w-[280px] whitespace-normal text-xs text-gray-600">
                        {log.error_message || 'Sem erro registrado'}
                      </TableCell>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
