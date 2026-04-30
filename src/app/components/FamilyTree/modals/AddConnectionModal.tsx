import React from 'react';
import { X, Link2, Search } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Pessoa } from '../../../types';

export type AddConnectionType = 'conjuge' | 'pai' | 'mae' | 'filho' | 'irmao';

export interface AddConnectionPayload {
  sourcePersonId: string;
  targetPersonId: string;
  connectionType: AddConnectionType;
  notes?: string;
}

interface AddConnectionModalProps {
  open: boolean;
  sourcePerson: Pessoa | null;
  pessoas: Pessoa[];
  onClose: () => void;
  onSubmit: (payload: AddConnectionPayload) => void;
}

const CONNECTION_OPTIONS: Array<{ value: AddConnectionType; label: string }> = [
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'irmao', label: 'Irmão(ã)' },
];

export function AddConnectionModal({
  open,
  sourcePerson,
  pessoas,
  onClose,
  onSubmit,
}: AddConnectionModalProps) {
  const [search, setSearch] = React.useState('');
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>('');
  const [connectionType, setConnectionType] = React.useState<AddConnectionType>('conjuge');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedTargetId('');
      setConnectionType('conjuge');
      setNotes('');
      return;
    }

    setSearch('');
    setSelectedTargetId('');
    setConnectionType('conjuge');
    setNotes('');
  }, [open, sourcePerson]);

  const filteredPeople = React.useMemo(() => {
    const sourceId = sourcePerson?.id;
    const normalizedSearch = search.trim().toLowerCase();

    return pessoas
      .filter((pessoa) => pessoa.id !== sourceId)
      .filter((pessoa) => {
        if (!normalizedSearch) return true;

        return (
          pessoa.nome_completo?.toLowerCase().includes(normalizedSearch) ||
          pessoa.local_nascimento?.toLowerCase().includes(normalizedSearch) ||
          pessoa.local_atual?.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 30);
  }, [pessoas, sourcePerson, search]);

  const selectedTarget = React.useMemo(
    () => pessoas.find((pessoa) => pessoa.id === selectedTargetId) || null,
    [pessoas, selectedTargetId]
  );

  const handleSubmit = React.useCallback(() => {
    if (!sourcePerson || !selectedTargetId) return;

    onSubmit({
      sourcePersonId: sourcePerson.id,
      targetPersonId: selectedTargetId,
      connectionType,
      notes: notes.trim() || undefined,
    });
  }, [sourcePerson, selectedTargetId, connectionType, notes, onSubmit]);

  if (!open || !sourcePerson) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-connection-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Link2 className="h-5 w-5" />
            </div>

            <div>
              <h2 id="add-connection-modal-title" className="text-base font-semibold text-gray-900">
                Adicionar conexão
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Origem: {sourcePerson.nome_completo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Buscar pessoa de destino
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Digite nome ou local..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                {filteredPeople.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">
                    Nenhuma pessoa encontrada.
                  </div>
                ) : (
                  filteredPeople.map((pessoa) => {
                    const isSelected = selectedTargetId === pessoa.id;

                    return (
                      <button
                        key={pessoa.id}
                        type="button"
                        onClick={() => setSelectedTargetId(pessoa.id)}
                        className={[
                          'w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 transition-colors',
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
                        ].join(' ')}
                        aria-pressed={isSelected}
                      >
                        <p className="text-sm font-medium text-gray-900">{pessoa.nome_completo}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {pessoa.local_nascimento || pessoa.local_atual || 'Sem local informado'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tipo de conexão
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {CONNECTION_OPTIONS.map((option) => {
                    const isActive = option.value === connectionType;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setConnectionType(option.value)}
                        className={[
                          'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                        ].join(' ')}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Pessoa selecionada
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800">
                  {selectedTarget ? selectedTarget.nome_completo : 'Nenhuma pessoa selecionada.'}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!sourcePerson || !selectedTargetId}>
            Salvar conexão
          </Button>
        </div>
      </div>
    </div>
  );
}