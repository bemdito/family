import React from 'react';
import { BaseEdge, EdgeProps } from 'reactflow';

interface OrthogonalEdgeData {
  corridorX?: number;
  corridorY?: number;
  side?: 'left' | 'right';
  offset?: number;
  kind?: 'child' | 'familyChild' | 'siblings' | 'singleParentChild' | 'generationChild';
  nodeWidth?: number;
  nodeHeight?: number;
  attachGap?: number;
  attachYOffset?: number;
  startX?: number;
  startY?: number;
  trunkX?: number;
  trunkMinY?: number;
  trunkMaxY?: number;
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
  if (data?.kind === 'familyChild') {
    const startX = data.startX ?? sourceX;
    const startY = data.startY ?? sourceY;
    const trunkX = data.trunkX ?? sourceX + (targetX - sourceX) / 2;
    const trunkMinY = data.trunkMinY ?? Math.min(startY, targetY);
    const trunkMaxY = data.trunkMaxY ?? Math.max(startY, targetY);

    const path = [
      `M ${startX} ${startY}`,
      `L ${trunkX} ${startY}`,
      `M ${trunkX} ${trunkMinY}`,
      `L ${trunkX} ${trunkMaxY}`,
      `M ${trunkX} ${targetY}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');

    return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
  }

  if (data?.kind === 'siblings') {
    const attachGap = data.attachGap ?? 16;
    const sourceSideX = sourceX;
    const targetSideX = targetX;
    const sourceSideY = sourceY;
    const targetSideY = targetY;
    const corridorX = data.corridorX ?? Math.min(sourceSideX, targetSideX) - attachGap;

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
