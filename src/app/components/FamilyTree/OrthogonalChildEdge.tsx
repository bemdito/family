import React from 'react';
import { BaseEdge, EdgeProps } from 'reactflow';

interface OrthogonalEdgeData {
  corridorX?: number;
  corridorY?: number;
  side?: 'left' | 'right';
  offset?: number;
  kind?: 'child' | 'siblings' | 'singleParentChild' | 'generationChild';
  nodeWidth?: number;
  nodeHeight?: number;
  attachGap?: number;
  attachYOffset?: number;
}

export function OrthogonalChildEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps<OrthogonalEdgeData>) {
  if (data?.kind === 'siblings') {
    const nodeWidth = data.nodeWidth ?? 280;
    const nodeHeight = data.nodeHeight ?? 120;
    const attachGap = data.attachGap ?? 16;
    const attachYOffset = data.attachYOffset ?? 42;

    const sourceSideX = sourceX - nodeWidth / 2;
    const targetSideX = targetX - nodeWidth / 2;
    const sourceSideY = sourceY - nodeHeight + attachYOffset;
    const targetSideY = targetY + attachYOffset;
    const corridorX = Math.min(sourceSideX, targetSideX) - attachGap;

    const path = [
      `M ${sourceSideX} ${sourceSideY}`,
      `L ${corridorX} ${sourceSideY}`,
      `L ${corridorX} ${targetSideY}`,
      `L ${targetSideX} ${targetSideY}`,
    ].join(' ');

    return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
  }

  if (data?.kind === 'singleParentChild') {
    const corridorY = data.corridorY ?? sourceY + (data.offset ?? 28);
    const corridorX = typeof data.corridorX === 'number'
      ? data.corridorX
      : sourceX + (targetX - sourceX) / 2;

    const path = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${corridorY}`,
      `L ${corridorX} ${corridorY}`,
      `L ${corridorX} ${targetY}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');

    return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
  }

  if (data?.kind === 'generationChild') {
    const corridorX = typeof data.corridorX === 'number'
      ? data.corridorX
      : sourceX + (targetX - sourceX) / 2;
    const corridorY = typeof data.corridorY === 'number'
      ? data.corridorY
      : sourceY;

    const path = [
      `M ${sourceX} ${sourceY}`,
      `L ${corridorX} ${sourceY}`,
      `L ${corridorX} ${corridorY}`,
      `L ${corridorX} ${targetY}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');

    return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
  }

  let midX: number;

  if (typeof data?.corridorX === 'number') {
    midX = data.corridorX;
  } else if (data?.side === 'left') {
    midX = Math.min(sourceX, targetX) - (data.offset ?? 48);
  } else if (data?.side === 'right') {
    midX = Math.max(sourceX, targetX) + (data.offset ?? 48);
  } else {
    midX = sourceX + (targetX - sourceX) / 2;
  }

  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${midX} ${sourceY}`,
    `L ${midX} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ');

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}
