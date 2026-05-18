import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, ImageDown, Loader2, Printer, X } from 'lucide-react';

import {
  buildTreeExportFilename,
  captureElementToCanvas,
  cropCanvas,
  downloadCanvasAsPng,
  exportCanvasAsPdf,
  ExportRect,
  openTreePrintWindow,
  printCanvas,
} from './utils/treeExport';

type ExportAction = 'png' | 'pdf' | 'print';

interface SelectionPoint {
  x: number;
  y: number;
}

interface TreeAreaSelectionOverlayProps {
  getTargetElement: () => HTMLElement | null;
  filenameLabel: string;
  title: string;
  onClose: () => void;
}

const MIN_SELECTION_SIZE = 80;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSelection(start: SelectionPoint, end: SelectionPoint): ExportRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
}

function getPointFromEvent(event: React.PointerEvent, target: HTMLElement): SelectionPoint {
  const rect = target.getBoundingClientRect();

  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

function getActionLabel(action: ExportAction) {
  if (action === 'png') return 'Salvando PNG...';
  if (action === 'pdf') return 'Gerando PDF...';
  return 'Preparando impressão...';
}

export function TreeAreaSelectionOverlay({
  getTargetElement,
  filenameLabel,
  title,
  onClose,
}: TreeAreaSelectionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [startPoint, setStartPoint] = useState<SelectionPoint | null>(null);
  const [endPoint, setEndPoint] = useState<SelectionPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeAction, setActiveAction] = useState<ExportAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selection = useMemo(() => {
    if (!startPoint || !endPoint) return null;
    return normalizeSelection(startPoint, endPoint);
  }, [startPoint, endPoint]);
  const hasValidSelection = Boolean(
    selection &&
      selection.width >= MIN_SELECTION_SIZE &&
      selection.height >= MIN_SELECTION_SIZE
  );
  const isBusy = Boolean(activeAction);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isBusy || event.button !== 0) return;

    const target = getTargetElement();
    if (!target) {
      setError('Área da árvore não encontrada para seleção.');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = getPointFromEvent(event, target);
    setStartPoint(point);
    setEndPoint(point);
    setIsDragging(true);
    setError(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [getTargetElement, isBusy]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isBusy) return;

    const target = getTargetElement();
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    setEndPoint(getPointFromEvent(event, target));
  }, [getTargetElement, isBusy, isDragging]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const target = getTargetElement();
    if (target) {
      setEndPoint(getPointFromEvent(event, target));
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [getTargetElement, isDragging]);

  const exportSelectedArea = useCallback(async (action: ExportAction) => {
    if (!selection || !hasValidSelection || isBusy) {
      setError('Selecione uma área maior da árvore antes de exportar.');
      return;
    }

    const target = getTargetElement();
    if (!target) {
      setError('Área da árvore não encontrada para exportação.');
      return;
    }

    setActiveAction(action);
    setError(null);
    let printWindow: Window | null = null;

    try {
      printWindow = action === 'print' ? openTreePrintWindow() : null;
      const targetRect = target.getBoundingClientRect();
      const canvas = await captureElementToCanvas(target);
      const scaleX = canvas.width / targetRect.width;
      const scaleY = canvas.height / targetRect.height;
      const croppedCanvas = cropCanvas(canvas, {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY,
      });

      if (action === 'png') {
        downloadCanvasAsPng(
          croppedCanvas,
          buildTreeExportFilename(`${filenameLabel}-area`, 'png')
        );
      } else if (action === 'pdf') {
        await exportCanvasAsPdf(
          croppedCanvas,
          buildTreeExportFilename(`${filenameLabel}-area`, 'pdf'),
          title
        );
      } else {
        printCanvas(croppedCanvas, title, printWindow);
      }
    } catch (exportError) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Não foi possível exportar a área selecionada.'
      );
    } finally {
      setActiveAction(null);
    }
  }, [
    filenameLabel,
    getTargetElement,
    hasValidSelection,
    isBusy,
    selection,
    title,
  ]);

  const targetRect = getTargetElement()?.getBoundingClientRect();
  const toolbarTop = selection
    ? clamp(selection.y + selection.height + 12, 16, Math.max(16, (targetRect?.height ?? 0) - 64))
    : 16;
  const toolbarLeft = selection
    ? clamp(selection.x, 16, Math.max(16, (targetRect?.width ?? 0) - 320))
    : 16;

  return (
    <div
      ref={overlayRef}
      data-tree-selection-overlay="true"
      className="absolute inset-0 z-40 cursor-crosshair select-none bg-slate-950/20"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="presentation"
    >
      <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ring-1 ring-slate-200">
        Arraste para selecionar uma área visível da árvore.
      </div>

      {selection && (
        <>
          <div
            className={[
              'pointer-events-none absolute border-2 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.28)]',
              hasValidSelection ? 'border-blue-500' : 'border-amber-500',
            ].join(' ')}
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          />

          <div
            className="absolute max-w-[calc(100%-2rem)] cursor-default rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
            style={{ left: toolbarLeft, top: toolbarTop }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!hasValidSelection || isBusy}
                onClick={() => exportSelectedArea('png')}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
                Salvar PNG
              </button>
              <button
                type="button"
                disabled={!hasValidSelection || isBusy}
                onClick={() => exportSelectedArea('pdf')}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Salvar PDF
              </button>
              <button
                type="button"
                disabled={!hasValidSelection || isBusy}
                onClick={() => exportSelectedArea('print')}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Imprimir
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onClose}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
            {!hasValidSelection && (
              <p className="mt-2 text-xs text-amber-700">
                Selecione uma área de pelo menos {MIN_SELECTION_SIZE} x {MIN_SELECTION_SIZE}px.
              </p>
            )}
            {activeAction && (
              <p className="mt-2 text-xs text-blue-700">{getActionLabel(activeAction)}</p>
            )}
            {error && (
              <p className="mt-2 max-w-md text-xs text-red-700">{error}</p>
            )}
          </div>
        </>
      )}

      {!selection && (
        <button
          type="button"
          disabled={isBusy}
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      )}
    </div>
  );
}
