import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from 'reactflow';
import type { GenealogyMarriageStatus } from './layouts/genealogyColumnsLayout';

interface GenealogySpouseEdgeData {
  marriageStatus?: GenealogyMarriageStatus;
}

const marriageStatusStyles: Record<GenealogyMarriageStatus, { background: string; border: string }> = {
  active: {
    background: '#ffffff',
    border: '#D1D5DB',
  },
  divorced: {
    background: '#FEF3C7',
    border: '#F59E0B',
  },
  widowed: {
    background: '#E5E7EB',
    border: '#9CA3AF',
  },
  unknown: {
    background: '#ffffff',
    border: '#D1D5DB',
  },
};

export function GenealogySpouseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps<GenealogySpouseEdgeData>) {
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const markerX = sourceX + (targetX - sourceX) / 2;
  const markerY = sourceY + (targetY - sourceY) / 2;
  const marriageStatus = data?.marriageStatus ?? 'unknown';
  const markerStyle = marriageStatusStyles[marriageStatus];

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute flex h-8 w-8 items-center justify-center rounded-full border text-base shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${markerX}px, ${markerY}px)`,
            backgroundColor: markerStyle.background,
            borderColor: markerStyle.border,
          }}
          aria-hidden="true"
        >
          💍
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
