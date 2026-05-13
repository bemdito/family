import React, { useMemo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ReactFlow, {
  EdgeTypes,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Node,
  CoordinateExtent,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Pessoa, Relacionamento } from '../../types';
import { nodeTypes } from './nodeTypes';
import { OrthogonalChildEdge } from './OrthogonalChildEdge';
import { GenealogySpouseEdge } from './GenealogySpouseEdge';
import { buildTreeGraph } from './buildTreeGraph';
import {
  collectDirectFamilyScopePersonIds,
  directFamilyDistributedLayout,
} from './layouts/directFamilyDistributedLayout';
import { filterGraphToPersonalScope } from './layouts/filterPersonalTreeScope';
import { genealogyColumnsLayout } from './layouts/genealogyColumnsLayout';
import type { TreeViewMode } from './ViewModeToggle';
import {
  injectExportSafeCss,
  sanitizeUnsupportedExportColors,
} from './utils/exportColorSanitizer';
import {
  DEFAULT_EDGE_FILTERS,
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DEFAULT_GENEALOGY_FILTERS,
  DirectRelativeFilters,
  EdgeFilters,
  GenealogyFilters,
  TREE_CONSTANTS,
  MarriageNodeDetails,
} from './types';
import { DIRECT_FAMILY_TOKENS } from './visualTokens';

interface FamilyTreeProps {
  pessoas: Pessoa[];
  relacionamentos: Relacionamento[];
  onPersonClick?: (pessoa: Pessoa) => void;
  onPersonView?: (pessoa: Pessoa) => void;
  onPersonEdit?: (pessoa: Pessoa) => void;
  onPersonAddConnection?: (pessoa: Pessoa) => void;
  onPersonRemove?: (pessoa: Pessoa) => void;
  onMarriageClick?: (details: MarriageNodeDetails) => void;
  selectedPersonId?: string;
  edgeFilters?: EdgeFilters;
  directRelativeFilters?: DirectRelativeFilters;
  genealogyFilters?: GenealogyFilters;
  viewMode: TreeViewMode;
  centralPersonId?: string;
  isMobile?: boolean;
  layoutRevision?: number;
}

export interface FamilyTreeActions {
  zoomIn: () => void;
  zoomOut: () => void;
  print: () => Promise<void>;
  savePdf: () => Promise<void>;
  saveImage: () => Promise<void>;
}

const edgeTypes: EdgeTypes = {
  orthogonalChild: OrthogonalChildEdge,
  childEdge: OrthogonalChildEdge,
  siblingEdge: OrthogonalChildEdge,
  spouseEdge: OrthogonalChildEdge,
  genealogySpouseEdge: GenealogySpouseEdge,
};

const MARRIAGE_NODE_SIZE = TREE_CONSTANTS.MARRIAGE_NODE_WIDTH;
const DIRECT_FAMILY_MAX_ZOOM = 2;
const DIRECT_FAMILY_MOBILE_MAX_ZOOM = 1.5;
const DIRECT_FAMILY_FALLBACK_MIN_ZOOM = 0.28;
const DIRECT_FAMILY_MOBILE_FALLBACK_MIN_ZOOM = 0.34;
const DIRECT_FAMILY_MIN_ZOOM_TOLERANCE = 0.02;
const DIRECT_FAMILY_VIEWPORT_PADDING = 18;
const DIRECT_FAMILY_MOBILE_VIEWPORT_PADDING = 16;
const DIRECT_FAMILY_TRANSLATE_PADDING = 120;
const DIRECT_FAMILY_MOBILE_TRANSLATE_PADDING = 80;
const GENEALOGY_MIN_ZOOM = 0.12;
const GENEALOGY_MOBILE_MIN_ZOOM = 0.06;
const GENEALOGY_MAX_ZOOM = 2;
const GENEALOGY_MOBILE_MAX_ZOOM = 1.7;
const GENEALOGY_TRANSLATE_PADDING = 220;
const GENEALOGY_MOBILE_TRANSLATE_PADDING = 140;

interface FlowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getNodeRenderSize(node: Node, fallbackWidth: number, fallbackHeight: number) {
  const dataWidth = Number(node.data?.width);
  const dataHeight = Number(node.data?.height);

  if (node.type === 'directFamilyLabelNode') {
    return {
      width: Number.isFinite(dataWidth) && dataWidth > 0 ? dataWidth : 180,
      height: node.data?.variant === 'title' ? 64 : 30,
    };
  }

  if (node.type === 'directFamilyGroupBoxNode') {
    return {
      width: Number.isFinite(dataWidth) && dataWidth > 0 ? dataWidth : 0,
      height: Number.isFinite(dataHeight) && dataHeight > 0 ? dataHeight : 0,
    };
  }

  if (node.type === 'directFamilyLegendNode') {
    return {
      width: Number.isFinite(dataWidth) && dataWidth > 0 ? dataWidth : 760,
      height: Number.isFinite(dataHeight) && dataHeight > 0 ? dataHeight : 92,
    };
  }

  if (node.type === 'directFamilyAnchorNode') {
    return { width: 1, height: 1 };
  }

  if (node.type === 'marriageNode') {
    return { width: MARRIAGE_NODE_SIZE, height: MARRIAGE_NODE_SIZE };
  }

  if (node.data?.directRelation === 'central' && node.data?.useCentralDirectLayout !== false) {
    return {
      width: DIRECT_FAMILY_TOKENS.CENTRAL_WIDTH,
      height: DIRECT_FAMILY_TOKENS.CENTRAL_HEIGHT,
    };
  }

  if (node.data?.directRelation) {
    return {
      width: DIRECT_FAMILY_TOKENS.CARD_WIDTH,
      height: DIRECT_FAMILY_TOKENS.CARD_HEIGHT,
    };
  }

  return { width: fallbackWidth, height: fallbackHeight };
}

function getFlowBounds(nodes: Node[], fallbackWidth: number, fallbackHeight: number): FlowBounds | null {
  const visibleNodes = nodes.filter((node) => !node.hidden && node.type !== 'directFamilyAnchorNode');
  if (visibleNodes.length === 0) return null;

  const bounds = visibleNodes.reduce(
    (acc, node) => {
      const { width, height } = getNodeRenderSize(node, fallbackWidth, fallbackHeight);
      const minX = node.position.x;
      const minY = node.position.y;
      const maxX = node.position.x + width;
      const maxY = node.position.y + height;

      return {
        minX: Math.min(acc.minX, minX),
        minY: Math.min(acc.minY, minY),
        maxX: Math.max(acc.maxX, maxX),
        maxY: Math.max(acc.maxY, maxY),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );

  if (
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.maxX) ||
    !Number.isFinite(bounds.maxY)
  ) {
    return null;
  }

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: Math.max(1, bounds.maxX - bounds.minX),
    height: Math.max(1, bounds.maxY - bounds.minY),
  };
}

function getDirectFamilyViewport(
  bounds: FlowBounds,
  containerWidth: number,
  containerHeight: number,
  padding: number
): Viewport {
  const paddedWidth = bounds.width + padding * 2;
  const paddedHeight = bounds.height + padding * 2;
  const zoomX = containerWidth / paddedWidth;
  const zoomY = containerHeight / paddedHeight;
  const zoom = Math.min(1, Math.max(0.1, Math.min(zoomX, zoomY)));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x: containerWidth / 2 - centerX * zoom,
    y: containerHeight / 2 - centerY * zoom,
    zoom,
  };
}

function getGenealogyViewport(
  bounds: FlowBounds,
  containerWidth: number,
  _containerHeight: number,
  isMobile: boolean
): Viewport {
  const paddingX = isMobile ? 48 : 80;
  const topOffset = isMobile ? 72 : 95;
  const minZoom = isMobile ? GENEALOGY_MOBILE_MIN_ZOOM : GENEALOGY_MIN_ZOOM;
  const maxZoom = isMobile ? GENEALOGY_MOBILE_MAX_ZOOM : GENEALOGY_MAX_ZOOM;
  const paddedWidth = bounds.width + paddingX * 2;
  const zoomX = containerWidth / paddedWidth;
  const zoom = Math.max(minZoom, Math.min(maxZoom, zoomX));
  const centerX = bounds.x + bounds.width / 2;

  return {
    x: containerWidth / 2 - centerX * zoom,
    y: topOffset - bounds.y * zoom,
    zoom,
  };
}

function getDirectFamilyTranslateExtent(bounds: FlowBounds, padding: number): CoordinateExtent {
  return [
    [bounds.x - padding, bounds.y - padding],
    [bounds.x + bounds.width + padding, bounds.y + bounds.height + padding],
  ];
}

function getExportableFlowElement(container: HTMLDivElement | null) {
  return container?.querySelector('.react-flow') as HTMLElement | null;
}

async function captureVisibleTree(container: HTMLDivElement | null) {
  const element = getExportableFlowElement(container);
  if (!element) {
    throw new Error('Área da árvore não encontrada para exportação.');
  }

  // Loaded on demand because print/PDF export needs a bitmap of the current ReactFlow viewport.
  const { default: html2canvas } = await import('html2canvas');
  document.documentElement.classList.add('is-exporting-family-tree');

  try {
    return await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: true,
      logging: false,
      ignoreElements: (node) => {
        const elementNode = node as HTMLElement;
        return Boolean(
          elementNode.classList?.contains('react-flow__controls') ||
          elementNode.classList?.contains('react-flow__minimap')
        );
      },
      onclone: (clonedDocument) => {
        clonedDocument.documentElement.classList.add('is-exporting-family-tree');
        injectExportSafeCss(clonedDocument);
        const clonedRoot =
          clonedDocument.querySelector('[data-export-root="family-tree"]') ||
          clonedDocument.querySelector('.react-flow') ||
          clonedDocument.body;
        sanitizeUnsupportedExportColors(clonedDocument.body);
        sanitizeUnsupportedExportColors(clonedRoot as HTMLElement);
      },
    });
  } finally {
    document.documentElement.classList.remove('is-exporting-family-tree');
  }
}

async function printVisibleTree(container: HTMLDivElement | null) {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('O navegador bloqueou a janela de impressão.');
  }

  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Preparando impressão</title>
    <style>
      html, body { margin: 0; min-height: 100%; background: #f8fafc; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { display: flex; align-items: center; justify-content: center; }
      p { margin: 0; font-size: 14px; }
    </style>
  </head>
  <body>
    <p>Preparando impressão da árvore...</p>
  </body>
</html>`);
  printWindow.document.close();

  try {
    const canvas = await captureVisibleTree(container);
    const imageUrl = canvas.toDataURL('image/png');

    if (printWindow.closed) {
      throw new Error('A janela de impressão foi fechada antes da conclusão.');
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Imprimir árvore</title>
    <style>
      html, body { margin: 0; min-height: 100%; background: #f8fafc; }
      body { display: flex; align-items: center; justify-content: center; }
      img { width: 100vw; height: 100vh; object-fit: contain; display: block; }
      @page { margin: 0; }
      @media print {
        html, body { width: 100%; height: 100%; }
        img { width: 100%; height: 100%; }
      }
    </style>
  </head>
  <body>
    <img src="${imageUrl}" alt="Área visível da árvore genealógica" />
    <script>
      const image = document.querySelector('img');
      const printTree = () => {
        window.focus();
        window.print();
      };
      if (image.complete) {
        setTimeout(printTree, 50);
      } else {
        image.addEventListener('load', () => setTimeout(printTree, 50), { once: true });
      }
    </script>
  </body>
</html>`);
    printWindow.document.close();
  } catch (error) {
    printWindow.close();
    throw error;
  }
}

async function saveVisibleTreePdf(container: HTMLDivElement | null) {
  const canvas = await captureVisibleTree(container);
  const imageUrl = canvas.toDataURL('image/png');
  // Loaded on demand so normal tree navigation does not pay the PDF generation cost.
  const { jsPDF } = await import('jspdf');
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [canvas.width, canvas.height],
    compress: true,
  });

  pdf.addImage(imageUrl, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save('minha-arvore.pdf');
}

async function saveVisibleTreeImage(container: HTMLDivElement | null, viewMode: TreeViewMode) {
  const canvas = await captureVisibleTree(container);
  const imageUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');

  link.href = imageUrl;
  link.download = viewMode === 'minha-arvore' ? 'minha-arvore.png' : 'arvore-genealogica.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function usesGenealogyLayout(viewMode: TreeViewMode) {
  return viewMode === 'genealogia' || viewMode === 'visao-completa';
}

export const FamilyTree = React.forwardRef<FamilyTreeActions, FamilyTreeProps>(function FamilyTree({
  pessoas,
  relacionamentos,
  onPersonClick,
  onPersonView,
  onPersonEdit,
  onPersonAddConnection,
  onPersonRemove,
  onMarriageClick,
  selectedPersonId,
  edgeFilters = DEFAULT_EDGE_FILTERS,
  directRelativeFilters = DEFAULT_DIRECT_RELATIVE_FILTERS,
  genealogyFilters = DEFAULT_GENEALOGY_FILTERS,
  viewMode,
  centralPersonId,
  isMobile = false,
  layoutRevision = 0,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const directFamilyRecenteringRef = useRef(false);
  const directFamilyViewportRef = useRef<Viewport | null>(null);
  const [directFamilyFitZoom, setDirectFamilyFitZoom] = useState<number | null>(null);
  const [directFamilyCurrentZoom, setDirectFamilyCurrentZoom] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { NODE_WIDTH, NODE_HEIGHT } = TREE_CONSTANTS;
  const directFamilyFallbackMinZoom = isMobile ? DIRECT_FAMILY_MOBILE_FALLBACK_MIN_ZOOM : DIRECT_FAMILY_FALLBACK_MIN_ZOOM;
  const directFamilyMinZoom = directFamilyFitZoom
    ? Math.max(directFamilyFitZoom * 0.9, Math.min(directFamilyFallbackMinZoom, directFamilyFitZoom))
    : directFamilyFallbackMinZoom;
  const directFamilyFittedZoom = directFamilyFitZoom ?? directFamilyMinZoom;
  const directFamilyViewportZoom = directFamilyCurrentZoom ?? directFamilyMinZoom;
  const directFamilyCanPan = directFamilyViewportZoom > directFamilyFittedZoom + DIRECT_FAMILY_MIN_ZOOM_TOLERANCE;
  const directFamilyMaxZoom = isMobile ? DIRECT_FAMILY_MOBILE_MAX_ZOOM : DIRECT_FAMILY_MAX_ZOOM;
  const isGenealogyLayout = usesGenealogyLayout(viewMode);
  const activeMinZoom = isGenealogyLayout
    ? (isMobile ? GENEALOGY_MOBILE_MIN_ZOOM : GENEALOGY_MIN_ZOOM)
    : directFamilyMinZoom;
  const activeMaxZoom = isGenealogyLayout
    ? (isMobile ? GENEALOGY_MOBILE_MAX_ZOOM : GENEALOGY_MAX_ZOOM)
    : directFamilyMaxZoom;
  const activeFittedZoom = directFamilyFitZoom ?? activeMinZoom;
  const activeCanPan = isGenealogyLayout ? true : directFamilyCanPan;
  const effectiveCentralPersonId = centralPersonId || selectedPersonId || pessoas[0]?.id;

  const dataHash = useMemo(() => {
    return JSON.stringify({
      pessoasIds: pessoas.map((p) => p.id).sort(),
      relacionamentosIds: relacionamentos.map((r) => r.id).sort(),
      selectedPersonId,
      edgeFilters,
      directRelativeFilters,
      genealogyFilters,
      centralPersonId: effectiveCentralPersonId,
      isMobile,
      viewMode,
    });
  }, [pessoas, relacionamentos, selectedPersonId, edgeFilters, directRelativeFilters, genealogyFilters, effectiveCentralPersonId, isMobile, viewMode]);

  const layoutResult = useMemo(() => {
    const graph = buildTreeGraph({
      pessoas,
      relacionamentos,
      onPersonClick,
      onMarriageClick,
      onView: onPersonView,
      onEdit: onPersonEdit,
      onAddConnection: onPersonAddConnection,
      onRemove: onPersonRemove,
      selectedPersonId,
      edgeFilters,
    });

    const personalScopeGraph = viewMode === 'visao-completa'
      ? graph
      : filterGraphToPersonalScope(
          graph,
          collectDirectFamilyScopePersonIds(graph, {
            centralPersonId: effectiveCentralPersonId,
          })
        );
    const layoutGraph = viewMode === 'visao-completa' ? graph : personalScopeGraph;

    if (isGenealogyLayout) {
      return genealogyColumnsLayout(layoutGraph, {
        filters: genealogyFilters,
      });
    }

    return directFamilyDistributedLayout(layoutGraph, {
      centralPersonId: effectiveCentralPersonId,
      filters: directRelativeFilters,
    });
  }, [
    dataHash,
    pessoas,
    relacionamentos,
    onPersonClick,
    onMarriageClick,
    onPersonView,
    onPersonEdit,
    onPersonAddConnection,
    onPersonRemove,
    selectedPersonId,
    edgeFilters,
    directRelativeFilters,
    genealogyFilters,
    effectiveCentralPersonId,
    isGenealogyLayout,
    viewMode,
  ]);

  const initialNodes = layoutResult.nodes;
  const initialEdges = layoutResult.edges;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateContainerSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize((currentSize) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        if (currentSize.width === width && currentSize.height === height) {
          return currentSize;
        }

        return { width, height };
      });
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(container);

    window.addEventListener('resize', updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);

  const directFamilyBounds = useMemo(() => {
    return getFlowBounds(nodes, NODE_WIDTH, NODE_HEIGHT);
  }, [nodes, NODE_WIDTH, NODE_HEIGHT]);

  const directFamilyViewport = useMemo(() => {
    if (
      !directFamilyBounds ||
      containerSize.width <= 0 ||
      containerSize.height <= 0
    ) {
      return null;
    }

    if (isGenealogyLayout) {
      return getGenealogyViewport(
        directFamilyBounds,
        containerSize.width,
        containerSize.height,
        isMobile
      );
    }

    return getDirectFamilyViewport(
      directFamilyBounds,
      containerSize.width,
      containerSize.height,
      isMobile ? DIRECT_FAMILY_MOBILE_VIEWPORT_PADDING : DIRECT_FAMILY_VIEWPORT_PADDING
    );
  }, [directFamilyBounds, containerSize, isGenealogyLayout, isMobile]);

  const directFamilyTranslateExtent = useMemo<CoordinateExtent | undefined>(() => {
    if (!directFamilyBounds) return undefined;

    return getDirectFamilyTranslateExtent(
      directFamilyBounds,
      isGenealogyLayout
        ? (isMobile ? GENEALOGY_MOBILE_TRANSLATE_PADDING : GENEALOGY_TRANSLATE_PADDING)
        : (isMobile ? DIRECT_FAMILY_MOBILE_TRANSLATE_PADDING : DIRECT_FAMILY_TRANSLATE_PADDING)
    );
  }, [directFamilyBounds, isGenealogyLayout, isMobile]);

  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.type === 'personNode' && node.data?.pessoa) {
          return {
            ...node,
            data: {
              ...node.data,
              onClick: onPersonClick,
              onView: onPersonView,
              onEdit: onPersonEdit,
              onAddConnection: onPersonAddConnection,
              onRemove: onPersonRemove,
              isSelected: viewMode === 'minha-arvore' && node.data.pessoa.id === selectedPersonId,
              isCentralPerson: viewMode === 'minha-arvore' && node.data.pessoa.id === effectiveCentralPersonId,
            },
          };
        }

        if (node.type === 'marriageNode') {
          return {
            ...node,
            data: {
              ...node.data,
              onClickMarriage: onMarriageClick,
            },
          };
        }

        return node;
      })
    );
  }, [
    selectedPersonId,
    onPersonClick,
    onPersonView,
    onPersonEdit,
    onPersonAddConnection,
    onPersonRemove,
    onMarriageClick,
    effectiveCentralPersonId,
    viewMode,
    setNodes,
  ]);

  useEffect(() => {
    if (!reactFlowRef.current || nodes.length === 0 || containerSize.width <= 0 || containerSize.height <= 0) return;
    if (!directFamilyViewport) return;

    const timer = window.setTimeout(() => {
      directFamilyViewportRef.current = directFamilyViewport;
      setDirectFamilyFitZoom(directFamilyViewport.zoom);
      setDirectFamilyCurrentZoom(directFamilyViewport.zoom);
      reactFlowRef.current?.setViewport(directFamilyViewport, { duration: 360 });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [
    effectiveCentralPersonId,
    nodes,
    directFamilyViewport,
    containerSize.width,
    containerSize.height,
    layoutRevision,
    viewMode,
  ]);

  useEffect(() => {
    if (!reactFlowRef.current || containerSize.width <= 0 || containerSize.height <= 0) return;
    if (!directFamilyViewport) return;

    directFamilyViewportRef.current = directFamilyViewport;
    setDirectFamilyFitZoom(directFamilyViewport.zoom);
    setDirectFamilyCurrentZoom(directFamilyViewport.zoom);
    reactFlowRef.current.setViewport(directFamilyViewport, { duration: 180 });
  }, [
    layoutRevision,
    containerSize.width,
    containerSize.height,
    directFamilyViewport,
    viewMode,
  ]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      reactFlowRef.current = instance;

      if (directFamilyViewport) {
        directFamilyViewportRef.current = directFamilyViewport;
        setDirectFamilyFitZoom(directFamilyViewport.zoom);
        setDirectFamilyCurrentZoom(directFamilyViewport.zoom);
        instance.setViewport(directFamilyViewport);
      }
    },
    [directFamilyViewport]
  );

  const handleMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setDirectFamilyCurrentZoom(viewport.zoom);
    },
    []
  );

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setDirectFamilyCurrentZoom(viewport.zoom);

      if (isGenealogyLayout) {
        return;
      }

      if (
        !reactFlowRef.current ||
        !directFamilyViewportRef.current ||
        viewport.zoom > directFamilyViewportRef.current.zoom + DIRECT_FAMILY_MIN_ZOOM_TOLERANCE ||
        directFamilyRecenteringRef.current
      ) {
        return;
      }

      directFamilyRecenteringRef.current = true;
      const targetViewport = directFamilyViewportRef.current;
      reactFlowRef.current.setViewport(targetViewport, { duration: 220 });

      window.setTimeout(() => {
        setDirectFamilyCurrentZoom(targetViewport.zoom);
        directFamilyRecenteringRef.current = false;
      }, 260);
    },
    [isGenealogyLayout]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'personNode' || !node.data?.pessoa) return;
      onPersonClick?.(node.data.pessoa);
    },
    [onPersonClick]
  );

  const handleZoomIn = useCallback(() => {
    reactFlowRef.current?.zoomIn({ duration: 160 });
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowRef.current?.zoomOut({ duration: 160 });
  }, []);

  const handlePrint = useCallback(async () => {
    try {
      await printVisibleTree(containerRef.current);
    } catch (error) {
      console.error('Erro ao imprimir árvore:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível imprimir a árvore.');
    }
  }, []);

  const handleSavePdf = useCallback(async () => {
    try {
      await saveVisibleTreePdf(containerRef.current);
    } catch (error) {
      console.error('Erro ao exportar árvore:', error);
      toast.error('Não foi possível gerar o PDF. As cores da árvore foram ajustadas para exportação; tente novamente.');
    }
  }, []);

  const handleSaveImage = useCallback(async () => {
    try {
      await saveVisibleTreeImage(containerRef.current, viewMode);
    } catch (error) {
      console.error('Erro ao exportar imagem da árvore:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a imagem da árvore.');
    }
  }, [viewMode]);

  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    print: handlePrint,
    savePdf: handleSavePdf,
    saveImage: handleSaveImage,
  }), [handleZoomIn, handleZoomOut, handlePrint, handleSavePdf, handleSaveImage]);

  return (
    <div
      ref={containerRef}
      data-export-root="family-tree"
      data-export-view={viewMode}
      className={[
        'family-tree-export-root',
        'relative h-full w-full overflow-hidden',
        'bg-slate-50',
      ].join(' ')}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      <div className="absolute left-4 top-4 z-20 flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-9 w-9 items-center justify-center border-r border-gray-200 text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title="Aumentar zoom"
          aria-label="Aumentar zoom"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title="Diminuir zoom"
          aria-label="Diminuir zoom"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={activeMinZoom}
        maxZoom={activeMaxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={activeCanPan}
        panOnScroll={activeCanPan}
        zoomOnScroll
        zoomOnPinch
        translateExtent={directFamilyTranslateExtent}
        preventScrolling
        defaultViewport={{
          x: directFamilyViewport?.x ?? 0,
          y: directFamilyViewport?.y ?? 0,
          zoom: activeFittedZoom,
        }}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
});
