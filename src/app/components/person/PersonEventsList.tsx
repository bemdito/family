import { CalendarDays, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PersonEvent } from '../../types';
import { getPersonEventTypeLabel } from './PersonEventsEditor';

type PersonEventsListProps = {
  eventos: PersonEvent[];
};

function compareEvents(a: PersonEvent, b: PersonEvent) {
  const aDate = String(a.data_evento ?? '').trim();
  const bDate = String(b.data_evento ?? '').trim();
  if (aDate && bDate) return aDate.localeCompare(bDate, 'pt-BR', { numeric: true });
  if (aDate) return -1;
  if (bDate) return 1;
  return (a.ordem ?? 0) - (b.ordem ?? 0);
}

export function PersonEventsList({ eventos }: PersonEventsListProps) {
  const visibleEvents = [...eventos]
    .filter((evento) => evento.titulo.trim())
    .sort(compareEvents);

  if (visibleEvents.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos da vida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleEvents.map((evento) => (
            <article key={evento.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {getPersonEventTypeLabel(evento.tipo)}
                  </p>
                  <h3 className="mt-1 font-semibold text-gray-900">{evento.titulo}</h3>
                </div>
                {evento.data_evento && (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4" />
                    {evento.data_evento}
                  </span>
                )}
              </div>

              {evento.local && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {evento.local}
                </p>
              )}

              {evento.descricao && (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{evento.descricao}</p>
              )}
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
