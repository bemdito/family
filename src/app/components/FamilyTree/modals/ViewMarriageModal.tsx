import React, { useEffect, useMemo, useState } from 'react';
import { X, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { ArquivosHistoricos } from '../../ArquivosHistoricos';
import { ArquivoHistorico } from '../../../types';
import {
  listarArquivosHistoricosDoRelacionamento,
  salvarArquivosHistoricosDoRelacionamento,
} from '../../../services/arquivosHistoricosService';
import {
  GenealogyMarriageStatus,
  getGenealogyMarriageStatus,
} from '../layouts/genealogyColumnsLayout';
import { MarriageNodeDetails } from '../types';

interface ViewMarriageModalProps {
  open: boolean;
  marriage: MarriageNodeDetails | null;
  isAdmin?: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<GenealogyMarriageStatus, string> = {
  active: 'Ativo',
  divorced: 'Separado/divorciado',
  widowed: 'Viuvez',
  unknown: 'Desconhecido',
};

function getRelationshipField(
  relationship: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!relationship) return undefined;

  for (const key of keys) {
    const value = relationship[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return undefined;
}

export function ViewMarriageModal({
  open,
  marriage,
  isAdmin = false,
  onClose,
}: ViewMarriageModalProps) {
  const [arquivos, setArquivos] = useState<ArquivoHistorico[]>([]);
  const [loadingArquivos, setLoadingArquivos] = useState(false);
  const [savingArquivos, setSavingArquivos] = useState(false);
  const [archivesDirty, setArchivesDirty] = useState(false);
  const relacionamentoId = marriage?.relationship?.id ?? marriage?.id ?? null;

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    let mounted = true;

    async function loadArquivos() {
      setArchivesDirty(false);

      if (!open || !relacionamentoId) {
        setArquivos([]);
        return;
      }

      setLoadingArquivos(true);
      try {
        const nextArquivos = await listarArquivosHistoricosDoRelacionamento(relacionamentoId);
        if (mounted) setArquivos(nextArquivos);
      } catch (error) {
        if (mounted) {
          toast.error(error instanceof Error ? error.message : 'Não foi possível carregar arquivos históricos.');
        }
      } finally {
        if (mounted) setLoadingArquivos(false);
      }
    }

    loadArquivos();

    return () => {
      mounted = false;
    };
  }, [open, relacionamentoId]);

  const status = useMemo(
    () => getGenealogyMarriageStatus(marriage?.relationship, marriage?.person1, marriage?.person2),
    [marriage]
  );

  if (!open || !marriage) return null;

  const relationship = (marriage.relationship || {}) as Record<string, unknown>;

  const dataCasamento = getRelationshipField(relationship, [
    'data_casamento',
    'data_relacionamento',
    'data_inicio',
  ]);

  const localCasamento = getRelationshipField(relationship, [
    'local_casamento',
    'local_relacionamento',
    'local_inicio',
  ]);

  const dataSeparacao = getRelationshipField(relationship, [
    'data_separacao',
    'data_fim',
  ]);

  const localSeparacao = getRelationshipField(relationship, [
    'local_separacao',
    'local_fim',
  ]);

  const tipoUniao = getRelationshipField(relationship, [
    'subtipo_relacionamento',
    'tipo_uniao',
    'tipo',
  ]);

  const observacoes = getRelationshipField(relationship, [
    'observacoes',
    'observacao',
    'descricao',
    'notas',
  ]);

  const handleArquivosChange = (nextArquivos: ArquivoHistorico[]) => {
    setArquivos(nextArquivos);
    setArchivesDirty(true);
  };

  const handleSaveArquivos = async () => {
    if (!relacionamentoId) {
      toast.error('Relacionamento conjugal não localizado para salvar arquivos.');
      return;
    }

    setSavingArquivos(true);
    try {
      const savedArquivos = await salvarArquivosHistoricosDoRelacionamento(relacionamentoId, arquivos);
      setArquivos(savedArquivos);
      setArchivesDirty(false);
      toast.success('Arquivos históricos do relacionamento salvos.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar arquivos históricos.');
    } finally {
      setSavingArquivos(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-marriage-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Heart className="h-5 w-5" />
            </div>

            <div>
              <h2 id="view-marriage-modal-title" className="text-base font-semibold text-gray-900">
                Relacionamento conjugal
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {marriage.person1?.nome_completo || marriage.person1Id}
                {' e '}
                {marriage.person2?.nome_completo || marriage.person2Id}
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoBlock label="Cônjuge 1" value={marriage.person1?.nome_completo || marriage.person1Id} />
            <InfoBlock label="Cônjuge 2" value={marriage.person2?.nome_completo || marriage.person2Id} />
            <InfoBlock label="Status" value={STATUS_LABELS[status]} />
            <InfoBlock label="Tipo de relacionamento" value={String(marriage.relationship?.tipo_relacionamento ?? '')} emptyText="Não informado" />
            <InfoBlock label="Subtipo" value={tipoUniao} emptyText="Não informado" />
            <InfoBlock label="Data do matrimônio" value={dataCasamento} emptyText="Não informada" />
            <InfoBlock label="Local do matrimônio" value={localCasamento} emptyText="Não informado" />
            <InfoBlock label="Data de separação" value={dataSeparacao} emptyText="Não informada" />
            <InfoBlock label="Local de separação" value={localSeparacao} emptyText="Não informado" />
            <InfoBlock label="ID do relacionamento" value={relacionamentoId ?? undefined} emptyText="Não informado" />
          </div>

          {isAdmin && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Observações
              </p>
              <div className="min-h-[84px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {observacoes || 'Nenhuma observação cadastrada.'}
              </div>
            </div>
          )}

          <section className="space-y-3">
            {loadingArquivos ? (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                Carregando arquivos históricos...
              </p>
            ) : (
              <ArquivosHistoricos
                arquivos={arquivos}
                onChange={handleArquivosChange}
                relacionamentoId={relacionamentoId}
                readOnly={!isAdmin || !relacionamentoId}
              />
            )}

            {isAdmin && relacionamentoId && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveArquivos}
                  disabled={!archivesDirty || savingArquivos}
                >
                  {savingArquivos ? 'Salvando...' : 'Salvar arquivos'}
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  emptyText = '-',
}: {
  label: string;
  value?: string;
  emptyText?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
        {value || emptyText}
      </div>
    </div>
  );
}
