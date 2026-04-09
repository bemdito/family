import React from 'react';
import { NodeProps } from 'reactflow';

export interface GenerationHeaderNodeData {
  label: string;
  generation: number;
}

export const GenerationHeaderNode = React.memo(
  ({ data }: NodeProps<GenerationHeaderNodeData>) => {
    return (
      <div
        className="pointer-events-none flex min-w-[280px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50/90 px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm"
        aria-label={data.label}
        title={data.label}
      >
        {data.label}
      </div>
    );
  }
);

GenerationHeaderNode.displayName = 'GenerationHeaderNode';