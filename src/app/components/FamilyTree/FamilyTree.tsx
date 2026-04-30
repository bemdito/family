import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  EdgeTypes,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Pessoa, Relacionamento, TipoVisualizacaoArvore } from '../../types';
import { nodeTypes } from './nodeTypes';
import { OrthogonalChildEdge } from './OrthogonalChildEdge';
import { buildTreeGraph } from './buildTreeGraph';
import { legacySideLayout } from './layouts/legacySideLayout';
import { generationColumnsLayout } from './layouts/generationColumnsLayout';
import {
  DEFAULT_EDGE_FILTERS,
  EdgeFilters,
  TREE_CONSTANTS,
  getDefaultViewMode,
  MarriageNodeDetails,
  GenerationColumnMeta,
} from './types';

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
  viewMode?: TipoVisualizacaoArvore;
  activeGeneration?: number;
  isMobile?: boolean;
  onGenerationColumnsChange?: (columns: GenerationColumnMeta[]) => void;
}

const edgeTypes: EdgeTypes = {
  orthogonalChild: OrthogonalChildEdge,
};

function getLayoutByViewMode(
  viewMode: TipoVisualizacaoArvore,
  graph: ReturnType<typeof buildTreeGraph>
) {
  if (viewMode === 'geracoes') {
    return generationColumnsLayout(graph);
  }

  return legacySideLayout(graph);
}

const MARRIAGE_NODE_SIZE = TREE_CONSTANTS.MARRIAGE_NODE_WIDTH;
const INITIAL_MOBILE_CENTER_Y = TREE_CONSTANTS.INITIAL_Y + TREE_CONSTANTS.NODE_HEIGHT;

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
  viewMode = getDefaultViewMode(),
  activeGeneration,
  isMobile = false,
  onGenerationColumnsChange,
}: FamilyTreeProps) {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const { NODE_WIDTH, NODE_HEIGHT } = TREE_CONSTANTS;

  const dataHash = useMemo(() => {
    return JSON.stringify({
      pessoasIds: pessoas.map((p) => p.id).sort(),
      relacionamentosIds: relacionamentos.map((r) => r.id).sort(),
      selectedPersonId,
      edgeFilters,
      viewMode,
      isMobile,
    });
  }, [pessoas, relacionamentos, selectedPersonId, edgeFilters, viewMode, isMobile]);

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

    return getLayoutByViewMode(viewMode, graph);
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
    onGenerationColumnsChange?.(generationColumns);
  }, [generationColumns, onGenerationColumnsChange]);

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
    setNodes,
  ]);

  useEffect(() => {
    if (!selectedPersonId || !reactFlowRef.current || nodes.length === 0) return;

    const selectedNode = nodes.find((node) => node.id === selectedPersonId);
    if (!selectedNode) return;

    const width = selectedNode.type === 'marriageNode' ? MARRIAGE_NODE_SIZE : NODE_WIDTH;
    const height = selectedNode.type === 'marriageNode' ? MARRIAGE_NODE_SIZE : NODE_HEIGHT;

    const centerX = selectedNode.position.x + width / 2;
    const centerY = selectedNode.position.y + height / 2;

    const timer = window.setTimeout(() => {
      reactFlowRef.current?.setCenter(centerX, centerY, {
        zoom: isMobile ? 0.8 : 1.05,
        duration: 800,
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [selectedPersonId, nodes, NODE_WIDTH, NODE_HEIGHT, isMobile]);

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

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'personNode' && onPersonClick && node.data?.pessoa) {
        onPersonClick(node.data.pessoa);
      }
    },
    [onPersonClick]
  );

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      reactFlowRef.current = instance;

      if (!selectedPersonId) {
        instance.fitView({
          padding: isMobile ? 0.12 : 0.2,
          includeHiddenNodes: false,
        });
      }
    },
    [selectedPersonId, isMobile]
  );

  return (
    <div className="w-full h-full" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={isMobile ? 0.5 : 0.1}
        maxZoom={isMobile ? 1.3 : 2}
        defaultViewport={{ x: 0, y: 0, zoom: isMobile ? 0.72 : 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={!isMobile} />
        {!isMobile && (
          <MiniMap
            nodeColor={(node) => {
              const pessoa = node.data?.pessoa;
              if (pessoa?.id && pessoa.id === selectedPersonId) return '#1d4ed8';
              if (pessoa?.humano_ou_pet === 'Pet') return '#eab308';
              if (pessoa?.data_falecimento) return '#a855f7';
              if (node.type === 'marriageNode') return '#10b981';
              return '#3b82f6';
            }}
            maskColor="rgb(240, 240, 240, 0.6)"
          />
        )}
      </ReactFlow>
    </div>
  );
}