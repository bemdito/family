import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MarriageNodeData } from './types';
import { FAMILY_TREE_COLORS } from './visualTokens';

export const MarriageNode = React.memo(({ data }: NodeProps<MarriageNodeData>) => {
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (data.details && data.onClickMarriage) {
        data.onClickMarriage(data.details);
      }
    },
    [data]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Visualizar informações do matrimônio"
      className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-lg transition-colors hover:bg-orange-50"
      style={{ borderColor: FAMILY_TREE_COLORS.EDGE_SPOUSE }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: FAMILY_TREE_COLORS.EDGE_SPOUSE, top: 0, left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: FAMILY_TREE_COLORS.EDGE_CHILD, bottom: 0, left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: FAMILY_TREE_COLORS.EDGE_SPOUSE, right: 0, top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: FAMILY_TREE_COLORS.EDGE_SPOUSE, left: 0, top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="family-center"
        style={{
          width: 1,
          height: 1,
          opacity: 0,
          border: 'none',
          background: 'transparent',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {data.emoji || '💑'}
    </button>
  );
});

MarriageNode.displayName = 'MarriageNode';
