import React from 'react';
import { Handle, NodeProps, NodeTypes, Position } from 'reactflow';
import { PersonNode } from './PersonNode';
import { MarriageNode } from './MarriageNode';
import { DirectFamilyLabelNode } from './DirectFamilyLabelNode';
import { FAMILY_TREE_COLORS } from './visualTokens';
import {
  DIRECT_FAMILY_GROUP_CONTAINER_BORDER,
  DIRECT_FAMILY_STATUS_BORDER_COLORS,
} from './directFamilyColors';

interface DirectFamilyGroupBoxNodeData {
  width?: number;
  height?: number;
}

interface DirectFamilyLegendNodeData {
  width?: number;
  height?: number;
}

function DirectFamilyAnchorNode() {
  const hiddenHandle = { background: 'transparent', border: 'none', width: 1, height: 1 };

  return React.createElement(
    'div',
    { 'aria-hidden': true, className: 'pointer-events-none h-px w-px opacity-0' },
    React.createElement(Handle, { type: 'target', position: Position.Top, id: 'top', style: { top: 0, left: 0, ...hiddenHandle } }),
    React.createElement(Handle, { type: 'source', position: Position.Bottom, id: 'bottom', style: { bottom: 0, left: 0, ...hiddenHandle } }),
    React.createElement(Handle, { type: 'source', position: Position.Right, id: 'right', style: { right: 0, top: 0, ...hiddenHandle } }),
    React.createElement(Handle, { type: 'target', position: Position.Right, id: 'right', style: { right: 0, top: 0, ...hiddenHandle } }),
    React.createElement(Handle, { type: 'source', position: Position.Left, id: 'left', style: { left: 0, top: 0, ...hiddenHandle } }),
    React.createElement(Handle, { type: 'target', position: Position.Left, id: 'left', style: { left: 0, top: 0, ...hiddenHandle } })
  );
}

function DirectFamilyGroupBoxNode({ data }: NodeProps<DirectFamilyGroupBoxNodeData>) {
  return React.createElement('div', {
    'aria-hidden': true,
    className: 'pointer-events-none rounded-xl bg-white/[0.04]',
    style: {
      width: data.width ?? 0,
      height: data.height ?? 0,
      borderColor: DIRECT_FAMILY_GROUP_CONTAINER_BORDER.color,
      borderWidth: DIRECT_FAMILY_GROUP_CONTAINER_BORDER.width,
      borderStyle: 'solid',
    },
  });
}

function LegendSample({ type }: { type: 'alive' | 'deceased' | 'spouse' | 'child' | 'sibling' }) {
  if (type === 'alive' || type === 'deceased') {
    return React.createElement('span', {
      className: 'h-4 w-7 rounded bg-white',
      style: {
        borderColor: type === 'alive'
          ? DIRECT_FAMILY_STATUS_BORDER_COLORS.alive
          : DIRECT_FAMILY_STATUS_BORDER_COLORS.deceased,
        borderWidth: 3,
        borderStyle: 'solid',
      },
    });
  }

  return React.createElement('span', {
    className: 'block h-0 w-8 border-t-2',
    style: {
      borderColor: type === 'spouse'
        ? FAMILY_TREE_COLORS.EDGE_SPOUSE
        : type === 'child'
          ? FAMILY_TREE_COLORS.EDGE_CHILD
          : FAMILY_TREE_COLORS.EDGE_SIBLING,
      borderStyle: type === 'sibling' ? 'dashed' : 'solid',
    },
  });
}

function DirectFamilyLegendNode({ data }: NodeProps<DirectFamilyLegendNodeData>) {
  const items = [
    ['alive', 'Vivas'],
    ['deceased', 'Falecidas'],
    ['spouse', 'Cônjuges'],
    ['child', 'Filhos'],
    ['sibling', 'Irmãos'],
  ] as const;

  return React.createElement(
    'div',
    {
      className: 'pointer-events-none rounded-md border border-gray-200 bg-white/90 px-4 py-2.5 shadow-sm',
      style: {
        width: data.width ?? 760,
        height: data.height ?? 92,
      },
    },
    React.createElement(
      'div',
      {
        className: 'grid h-full content-center gap-x-4 gap-y-1',
        style: { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' },
      },
      items.map(([type, label]) =>
        React.createElement(
          'div',
          { key: type, className: 'flex min-w-0 items-center justify-center gap-2 text-xs text-gray-600' },
          React.createElement('span', { className: 'flex w-8 shrink-0 items-center justify-center' }, React.createElement(LegendSample, { type })),
          React.createElement('span', { className: 'truncate' }, label)
        )
      )
    )
  );
}

export const nodeTypes: NodeTypes = {
  personNode: PersonNode,
  marriageNode: MarriageNode,
  directFamilyLabelNode: DirectFamilyLabelNode,
  directFamilyAnchorNode: DirectFamilyAnchorNode,
  directFamilyGroupBoxNode: DirectFamilyGroupBoxNode,
  directFamilyLegendNode: DirectFamilyLegendNode,
};
