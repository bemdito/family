import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PersonEvent, PersonEventType } from '../../types';

export const PERSON_EVENT_TYPE_OPTIONS: Array<{ value: PersonEventType; label: string }> = [
  { value: 'imigracao', label: 'Imigração' },
  { value: 'chegada_brasil', label: 'Chegada ao Brasil' },
  { value: 'mudanca', label: 'Mudança' },
  { value: 'batismo', label: 'Batismo' },
  { value: 'formatura', label: 'Formatura' },
  { value: 'profissao', label: 'Profissão/carreira' },
  { value: 'militar', label: 'Serviço militar' },
  { value: 'religioso', label: 'Evento religioso' },
  { value: 'memoria', label: 'Memória' },
  { value: 'outro', label: 'Outro' },
];

type PersonEventsEditorProps = {
  eventos: PersonEvent[];
  onChange: (eventos: PersonEvent[]) => void;
  readOnly?: boolean;
};

function createLocalEvent(order: number): PersonEvent {
  return {
    id: `person-event-local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    pessoa_id: '',
    tipo: 'outro',
    titulo: '',
    data_evento: '',
    local: '',
    descricao: '',
    ordem: order,
  };
}

function reorder(eventos: PersonEvent[]) {
  return eventos.map((evento, index) => ({ ...evento, ordem: index }));
}

export function getPersonEventTypeLabel(tipo: PersonEventType | string) {
  return PERSON_EVENT_TYPE_OPTIONS.find((option) => option.value === tipo)?.label ?? 'Outro';
}

export function PersonEventsEditor({ eventos, onChange, readOnly = false }: PersonEventsEditorProps) {
  const updateEvent = (eventId: string, field: keyof PersonEvent, value: string) => {
    onChange(eventos.map((evento) => (
      evento.id === eventId ? { ...evento, [field]: value } : evento
    )));
  };

  const addEvent = () => {
    onChange([...eventos, createLocalEvent(eventos.length)]);
  };

  const removeEvent = (eventId: string) => {
    onChange(reorder(eventos.filter((evento) => evento.id !== eventId)));
  };

  const moveEvent = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= eventos.length) return;

    const nextEventos = [...eventos];
    const [item] = nextEventos.splice(index, 1);
    nextEventos.splice(nextIndex, 0, item);
    onChange(reorder(nextEventos));
  };

  if (readOnly) return null;

  return (
    <div className="space-y-4">
      {eventos.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Nenhum evento cadastrado.
        </p>
      ) : (
        <div className="space-y-3">
          {eventos.map((evento, index) => (
            <div key={evento.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">Evento {index + 1}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveEvent(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover evento para cima"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveEvent(index, 1)}
                    disabled={index === eventos.length - 1}
                    aria-label="Mover evento para baixo"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-700 hover:bg-red-50"
                    onClick={() => removeEvent(evento.id)}
                    aria-label="Remover evento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={evento.tipo}
                    onChange={(event) => updateEvent(evento.id, 'tipo', event.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {PERSON_EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Título *</label>
                  <Input
                    value={evento.titulo}
                    onChange={(event) => updateEvent(evento.id, 'titulo', event.target.value)}
                    placeholder="Ex: Imigração para o Brasil"
                    aria-invalid={!evento.titulo.trim()}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Data</label>
                  <Input
                    value={evento.data_evento ?? ''}
                    onChange={(event) => updateEvent(evento.id, 'data_evento', event.target.value)}
                    placeholder="Ex: 1950 ou 12/03/1950"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Local</label>
                  <Input
                    value={evento.local ?? ''}
                    onChange={(event) => updateEvent(evento.id, 'local', event.target.value)}
                    placeholder="Ex: Porto Alegre/RS"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  value={evento.descricao ?? ''}
                  onChange={(event) => updateEvent(evento.id, 'descricao', event.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Detalhes relevantes sobre o evento"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={addEvent}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar evento
      </Button>
    </div>
  );
}
