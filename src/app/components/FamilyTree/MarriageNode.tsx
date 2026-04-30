import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MarriageNodeData } from './types';

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
      className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-lg transition-colors hover:bg-emerald-50"
    >
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#10b981', top: 0, left: '50%' }} />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#10b981', bottom: 0, left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#10b981', right: 0, top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#10b981', left: 0, top: '50%' }}
      />
      {data.emoji || '💑'}
    </button>
  );
});

MarriageNode.displayName = 'MarriageNode';