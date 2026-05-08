import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  EdgeTypes,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Node,
  NodeDragHandler,
  CoordinateExtent,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../../types';
import { nodeTypes } from './nodeTypes';
import { OrthogonalChildEdge } from './OrthogonalChildEdge';
import { buildTreeGraph } from './buildTreeGraph';
import { legacySideLayout } from './layouts/legacySideLayout';
import { generationColumnsLayout } from './layouts/generationColumnsLayout';
import { chronologicalListLayout } from './layouts/chronologicalListLayout';
import { directFamilyDistributedLayout } from './layouts/directFamilyDistributedLayout';
import {
  DEFAULT_EDGE_FILTERS,
  DEFAULT_DIRECT_RELATIVE_FILTERS,
  DirectRelativeFilters,
  EdgeFilters,
  TREE_CONSTANTS,
  getDefaultViewMode,
  MarriageNodeDetails,
  GenerationColumnMeta,
} from './types';
import { DIRECT_FAMILY_TOKENS, FAMILY_TREE_COLORS, hasDeathDate } from './visualTokens';

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
  centralPersonId?: string;
  viewMode?: TipoVisualizacaoArvore;
  activeGeneration?: number;
  isMobile?: boolean;
  layoutRevision?: number;
  onGenerationColumnsChange?: (columns: GenerationColumnMeta[]) => void;
  onPersonGenerationChange?: (personId: string, generation: number) => Promise<void> | void;
}

const edgeTypes: EdgeTypes = {
  orthogonalChild: OrthogonalChildEdge,
  childEdge: OrthogonalChildEdge,
  siblingEdge: OrthogonalChildEdge,
  spouseEdge: OrthogonalChildEdge,
};

function getLayoutByViewMode(
  viewMode: TipoVisualizacaoArvore,
  graph: ReturnType<typeof buildTreeGraph>,
  options?: {
    centralPersonId?: string;
    directRelativeFilters?: DirectRelativeFilters;
  }
) {
  if (viewMode === 'familiares-diretos') {
    return directFamilyDistributedLayout(graph, {
      centralPersonId: options?.centralPersonId,
      filters: options?.directRelativeFilters,
    });
  }

  if (viewMode === 'lista') {
    return chronologicalListLayout(graph);
  }

  if (viewMode === 'geracoes') {
    return generationColumnsLayout(graph);
  }

  return legacySideLayout(graph);
}

const MARRIAGE_NODE_SIZE = TREE_CONSTANTS.MARRIAGE_NODE_WIDTH;
const INITIAL_MOBILE_CENTER_Y = TREE_CONSTANTS.INITIAL_Y + TREE_CONSTANTS.NODE_HEIGHT;
const MIN_MANUAL_GENERATION = 1;
const MAX_MANUAL_GENERATION = 7;
const DIRECT_FAMILY_MAX_ZOOM = 2;
const DIRECT_FAMILY_MOBILE_MAX_ZOOM = 1.5;
const DIRECT_FAMILY_FALLBACK_MIN_ZOOM = 0.28;
const DIRECT_FAMILY_MOBILE_FALLBACK_MIN_ZOOM = 0.34;
const DIRECT_FAMILY_MIN_ZOOM_TOLERANCE = 0.02;
const DIRECT_FAMILY_VIEWPORT_PADDING = 18;
const DIRECT_FAMILY_MOBILE_VIEWPORT_PADDING = 16;
const DIRECT_FAMILY_TRANSLATE_PADDING = 120;
const DIRECT_FAMILY_MOBILE_TRANSLATE_PADDING = 80;

interface FlowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampManualGeneration(generation: number) {
  return Math.min(MAX_MANUAL_GENERATION, Math.max(MIN_MANUAL_GENERATION, generation));
}

function getGenerationFromNodeX(nodeX: number, columns: GenerationColumnMeta[]) {
  const sortedColumns = [...columns].sort((a, b) => a.level - b.level);
  const firstColumn = sortedColumns[0];

  if (!firstColumn) {
    return MIN_MANUAL_GENERATION;
  }

  const columnGap =
    sortedColumns.length > 1
      ? sortedColumns[1].x - sortedColumns[0].x
      : TREE_CONSTANTS.HORIZONTAL_GAP_BETWEEN_GENERATIONS;

  const nodeCenterX = nodeX + TREE_CONSTANTS.NODE_WIDTH / 2;
  const firstColumnCenterX = firstColumn.x + TREE_CONSTANTS.NODE_WIDTH / 2;
  const detectedLevel = Math.round((nodeCenterX - firstColumnCenterX) / columnGap + firstColumn.level);

  return clampManualGeneration(detectedLevel + 1);
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

  if (node.data?.directRelation === 'central') {
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

function getDirectFamilyTranslateExtent(bounds: FlowBounds, padding: number): CoordinateExtent {
  return [
    [bounds.x - padding, bounds.y - padding],
    [bounds.x + bounds.width + padding, bounds.y + bounds.height + padding],
  ];
}

export function FamilyTree({
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
  centralPersonId,
  viewMode = getDefaultViewMode(),
  activeGeneration,
  isMobile = false,
  layoutRevision = 0,
  onGenerationColumnsChange,
  onPersonGenerationChange,
}: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const directFamilyRecenteringRef = useRef(false);
  const directFamilyViewportRef = useRef<Viewport | null>(null);
  const [dragTargetGeneration, setDragTargetGeneration] = useState<number | null>(null);
  const [directFamilyFitZoom, setDirectFamilyFitZoom] = useState<number | null>(null);
  const [directFamilyCurrentZoom, setDirectFamilyCurrentZoom] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { NODE_WIDTH, NODE_HEIGHT } = TREE_CONSTANTS;
  const isDirectFamilyView = viewMode === 'familiares-diretos';
  const directFamilyFallbackMinZoom = isMobile ? DIRECT_FAMILY_MOBILE_FALLBACK_MIN_ZOOM : DIRECT_FAMILY_FALLBACK_MIN_ZOOM;
  const directFamilyMinZoom = directFamilyFitZoom
    ? Math.max(directFamilyFitZoom * 0.9, Math.min(directFamilyFallbackMinZoom, directFamilyFitZoom))
    : directFamilyFallbackMinZoom;
  const directFamilyFittedZoom = directFamilyFitZoom ?? directFamilyMinZoom;
  const directFamilyViewportZoom = directFamilyCurrentZoom ?? directFamilyMinZoom;
  const directFamilyCanPan = !isDirectFamilyView || directFamilyViewportZoom > directFamilyFittedZoom + DIRECT_FAMILY_MIN_ZOOM_TOLERANCE;
  const directFamilyMaxZoom = isMobile ? DIRECT_FAMILY_MOBILE_MAX_ZOOM : DIRECT_FAMILY_MAX_ZOOM;
  const effectiveCentralPersonId = isDirectFamilyView
    ? centralPersonId || selectedPersonId || pessoas[0]?.id
    : centralPersonId;

  const dataHash = useMemo(() => {
    return JSON.stringify({
      pessoasIds: pessoas.map((p) => p.id).sort(),
      relacionamentosIds: relacionamentos.map((r) => r.id).sort(),
      selectedPersonId,
      edgeFilters,
      viewMode,
      directRelativeFilters,
      centralPersonId: effectiveCentralPersonId,
      isMobile,
    });
  }, [pessoas, relacionamentos, selectedPersonId, edgeFilters, directRelativeFilters, effectiveCentralPersonId, viewMode, isMobile]);

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

    return getLayoutByViewMode(viewMode, graph, {
      centralPersonId: effectiveCentralPersonId,
      directRelativeFilters,
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
    effectiveCentralPersonId,
    viewMode,
  ]);

  const initialNodes = layoutResult.nodes;
  const initialEdges = layoutResult.edges;
  const generationColumns = layoutResult.metadata?.generationColumns || [];

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
    if (!isDirectFamilyView) return null;
    return getFlowBounds(nodes, NODE_WIDTH, NODE_HEIGHT);
  }, [isDirectFamilyView, nodes, NODE_WIDTH, NODE_HEIGHT]);

  const directFamilyViewport = useMemo(() => {
    if (
      !directFamilyBounds ||
      containerSize.width <= 0 ||
      containerSize.height <= 0
    ) {
      return null;
    }

    return getDirectFamilyViewport(
      directFamilyBounds,
      containerSize.width,
      containerSize.height,
      isMobile ? DIRECT_FAMILY_MOBILE_VIEWPORT_PADDING : DIRECT_FAMILY_VIEWPORT_PADDING
    );
  }, [directFamilyBounds, containerSize, isMobile]);

  const directFamilyTranslateExtent = useMemo<CoordinateExtent | undefined>(() => {
    if (!isDirectFamilyView || !directFamilyBounds) return undefined;

    return getDirectFamilyTranslateExtent(
      directFamilyBounds,
      isMobile ? DIRECT_FAMILY_MOBILE_TRANSLATE_PADDING : DIRECT_FAMILY_TRANSLATE_PADDING
    );
  }, [directFamilyBounds, isDirectFamilyView, isMobile]);

  useEffect(() => {
    onGenerationColumnsChange?.(generationColumns);
  }, [generationColumns, onGenerationColumnsChange]);

  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.type !== 'generationHeaderNode') {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            isDragTarget:
              typeof node.data?.generation === 'number' &&
              dragTargetGeneration === node.data.generation + 1,
          },
        };
      })
    );
  }, [dragTargetGeneration, setNodes]);

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
              isSelected: node.data.pessoa.id === selectedPersonId,
              isCentralPerson: viewMode === 'familiares-diretos' && node.data.pessoa.id === effectiveCentralPersonId,
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
    viewMode,
    effectiveCentralPersonId,
    setNodes,
  ]);

  useEffect(() => {
    const focusPersonId = isDirectFamilyView ? effectiveCentralPersonId : selectedPersonId;
    if (!reactFlowRef.current || nodes.length === 0 || containerSize.width <= 0 || containerSize.height <= 0) return;

    if (!focusPersonId && !isDirectFamilyView) {
      const timer = window.setTimeout(() => {
        reactFlowRef.current?.fitView({
          padding: isMobile ? 0.12 : 0.2,
          includeHiddenNodes: false,
          duration: 320,
        });
      }, 50);

      return () => window.clearTimeout(timer);
    }

    if (!focusPersonId) return;

    if (isDirectFamilyView) {
      if (!directFamilyViewport) return;

      directFamilyViewportRef.current = directFamilyViewport;
      setDirectFamilyFitZoom(directFamilyViewport.zoom);
      setDirectFamilyCurrentZoom(directFamilyViewport.zoom);

      const timer = window.setTimeout(() => {
        reactFlowRef.current?.setViewport(directFamilyViewport, { duration: 360 });
      }, 50);

      return () => window.clearTimeout(timer);
    }

    const selectedNode = nodes.find((node) => node.id === focusPersonId);
    if (!selectedNode) return;

    const width = selectedNode.type === 'marriageNode'
      ? MARRIAGE_NODE_SIZE
      : selectedNode.data?.directRelation === 'central'
        ? DIRECT_FAMILY_TOKENS.CENTRAL_WIDTH
        : selectedNode.data?.directRelation
          ? DIRECT_FAMILY_TOKENS.CARD_WIDTH
          : NODE_WIDTH;
    const height = selectedNode.type === 'marriageNode'
      ? MARRIAGE_NODE_SIZE
      : selectedNode.data?.directRelation === 'central'
        ? DIRECT_FAMILY_TOKENS.CENTRAL_HEIGHT
        : selectedNode.data?.directRelation
          ? DIRECT_FAMILY_TOKENS.CARD_HEIGHT
          : NODE_HEIGHT;

    const centerX = selectedNode.position.x + width / 2;
    const centerY = selectedNode.position.y + height / 2;

    const timer = window.setTimeout(() => {
      reactFlowRef.current?.setCenter(centerX, centerY, {
        zoom: isDirectFamilyView
          ? (isMobile ? DIRECT_FAMILY_TOKENS.MOBILE_ZOOM : DIRECT_FAMILY_TOKENS.DESKTOP_ZOOM)
          : (isMobile ? 0.8 : 1.05),
        duration: 800,
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [
    selectedPersonId,
    effectiveCentralPersonId,
    nodes,
    NODE_WIDTH,
    NODE_HEIGHT,
    isMobile,
    isDirectFamilyView,
    directFamilyViewport,
    containerSize.width,
    containerSize.height,
    layoutRevision,
  ]);

  useEffect(() => {
    if (!reactFlowRef.current || containerSize.width <= 0 || containerSize.height <= 0) return;

    if (isDirectFamilyView && directFamilyViewport) {
      directFamilyViewportRef.current = directFamilyViewport;
      setDirectFamilyFitZoom(directFamilyViewport.zoom);
      setDirectFamilyCurrentZoom(directFamilyViewport.zoom);
      reactFlowRef.current.setViewport(directFamilyViewport, { duration: 180 });
      return;
    }

    if (!selectedPersonId) {
      reactFlowRef.current.fitView({
        padding: isMobile ? 0.12 : 0.2,
        includeHiddenNodes: false,
        duration: 180,
      });
    }
  }, [
    layoutRevision,
    containerSize.width,
    containerSize.height,
    isMobile,
    isDirectFamilyView,
    directFamilyViewport,
    selectedPersonId,
  ]);

  useEffect(() => {
    if (
      !reactFlowRef.current ||
      viewMode !== 'geracoes' ||
      !isMobile ||
      typeof activeGeneration !== 'number' ||
      generationColumns.length === 0
    ) {
      return;
    }

    const activeColumn = generationColumns.find((column) => column.level === activeGeneration);
    if (!activeColumn) return;

    const timer = window.setTimeout(() => {
      reactFlowRef.current?.setCenter(activeColumn.x + NODE_WIDTH / 2, INITIAL_MOBILE_CENTER_Y, {
        zoom: 0.78,
        duration: 500,
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [activeGeneration, generationColumns, viewMode, isMobile, NODE_WIDTH]);

  const handleNodeDrag = useCallback<NodeDragHandler>(
    (_event, node) => {
      if (viewMode === 'lista' || node.type !== 'personNode' || generationColumns.length === 0) {
        if (dragTargetGeneration !== null) {
          setDragTargetGeneration(null);
        }
        return;
      }

      const nextGeneration = getGenerationFromNodeX(node.position.x, generationColumns);
      setDragTargetGeneration((currentGeneration) =>
        currentGeneration === nextGeneration ? currentGeneration : nextGeneration
      );
    },
    [dragTargetGeneration, generationColumns, viewMode]
  );

  const handleNodeDragStop = useCallback<NodeDragHandler>(
    async (_event, node) => {
      if (
        viewMode === 'lista' ||
        node.type !== 'personNode' ||
        !node.data?.pessoa ||
        generationColumns.length === 0
      ) {
        setDragTargetGeneration(null);
        return;
      }

      const nextGeneration = getGenerationFromNodeX(node.position.x, generationColumns);
      setDragTargetGeneration(null);
      await onPersonGenerationChange?.(node.data.pessoa.id, nextGeneration);
    },
    [generationColumns, onPersonGenerationChange, viewMode]
  );

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      reactFlowRef.current = instance;

      if (isDirectFamilyView && directFamilyViewport) {
        directFamilyViewportRef.current = directFamilyViewport;
        setDirectFamilyFitZoom(directFamilyViewport.zoom);
        setDirectFamilyCurrentZoom(directFamilyViewport.zoom);
        instance.setViewport(directFamilyViewport);
        return;
      }

      if (!selectedPersonId && !isDirectFamilyView) {
        instance.fitView({
          padding: isMobile ? 0.12 : 0.2,
          includeHiddenNodes: false,
        });
      }
    },
    [selectedPersonId, isMobile, isDirectFamilyView, directFamilyViewport]
  );

  const handleMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!isDirectFamilyView) return;
      setDirectFamilyCurrentZoom(viewport.zoom);
    },
    [isDirectFamilyView]
  );

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (!isDirectFamilyView) return;

      setDirectFamilyCurrentZoom(viewport.zoom);

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
    [isDirectFamilyView]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'personNode' || !node.data?.pessoa) return;
      onPersonClick?.(node.data.pessoa);
    },
    [onPersonClick]
  );

  return (
    <div
      ref={containerRef}
      className={[
        'relative h-full w-full overflow-hidden',
        isDirectFamilyView ? 'bg-slate-50' : '',
      ].join(' ')}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={isDirectFamilyView ? directFamilyMinZoom : isMobile ? 0.5 : 0.1}
        maxZoom={isDirectFamilyView ? directFamilyMaxZoom : isMobile ? 1.3 : 2}
        nodesDraggable={!isDirectFamilyView}
        nodesConnectable={!isDirectFamilyView}
        elementsSelectable={!isDirectFamilyView}
        panOnDrag={directFamilyCanPan}
        panOnScroll={isDirectFamilyView ? directFamilyCanPan : undefined}
        zoomOnScroll={isDirectFamilyView ? true : undefined}
        zoomOnPinch={isDirectFamilyView ? true : undefined}
        translateExtent={directFamilyTranslateExtent}
        preventScrolling={isDirectFamilyView ? true : undefined}
        defaultViewport={{
          x: 0,
          y: 0,
          zoom: isDirectFamilyView
            ? directFamilyFittedZoom
            : (isMobile ? 0.72 : 0.8),
        }}
        proOptions={{ hideAttribution: true }}
      >
        {!isDirectFamilyView && <Background />}
        <Controls showInteractive={!isMobile} />
        {!isMobile && !isDirectFamilyView && (
          <MiniMap
            nodeColor={(node) => {
              const pessoa = node.data?.pessoa;
              if (pessoa?.id && pessoa.id === selectedPersonId) return '#1d4ed8';
              if (pessoa?.humano_ou_pet === 'Pet') return FAMILY_TREE_COLORS.CARD_BORDER_PET;
              if (hasDeathDate(pessoa?.data_falecimento)) return FAMILY_TREE_COLORS.CARD_BORDER_DECEASED;
              if (node.type === 'marriageNode') return FAMILY_TREE_COLORS.EDGE_SPOUSE;
              return FAMILY_TREE_COLORS.CARD_BORDER_ALIVE;
            }}
            maskColor="rgb(240, 240, 240, 0.6)"
          />
        )}
      </ReactFlow>
    </div>
  );
}
