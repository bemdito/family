import { Badge } from '../ui/badge';
import { NotificationDispatchStatus } from '../../types';

const STATUS_LABELS: Record<NotificationDispatchStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Ignorado',
  disabled_by_preferences: 'Desativado',
  missing_destination: 'Sem destino',
  not_configured: 'Não configurado',
};

const STATUS_CLASSES: Record<NotificationDispatchStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  sent: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
  skipped: 'border-gray-200 bg-gray-50 text-gray-700',
  disabled_by_preferences: 'border-slate-200 bg-slate-50 text-slate-700',
  missing_destination: 'border-orange-200 bg-orange-50 text-orange-800',
  not_configured: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function NotificationStatusBadge({ status }: { status: NotificationDispatchStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status] || STATUS_CLASSES.pending}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
