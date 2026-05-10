import React from 'react';
import { NodeProps } from 'reactflow';

export interface GenerationHeaderNodeData {
  label: string;
  generation: number;
  period?: string;
  description?: string;
  isDragTarget?: boolean;
}

export const GenerationHeaderNode = React.memo(
  ({ data }: NodeProps<GenerationHeaderNodeData>) => {
    const isChronologicalHeader = Boolean(data.period || data.description);

    return (
      <div
        className={[
          'pointer-events-none flex flex-col items-center justify-center rounded-md border px-4 py-2 text-center transition-colors',
          isChronologicalHeader ? 'w-[240px] max-w-[240px]' : 'min-w-[280px]',
          data.isDragTarget
            ? 'border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200'
            : 'border-slate-200 bg-white/80 text-slate-800',
        ].join(' ')}
        aria-label={[data.label, data.period, data.description].filter(Boolean).join('. ')}
        title={[data.label, data.period, data.description].filter(Boolean).join('. ')}
      >
        <span className="whitespace-nowrap text-base font-semibold leading-none">{data.label}</span>
        {data.period && (
          <span className="mt-1 whitespace-nowrap text-xs font-medium leading-snug text-slate-600">{data.period}</span>
        )}
        {data.description && (
          <span
            className="mt-1 max-w-[208px] whitespace-normal text-[11px] font-normal leading-snug text-blue-900/75"
            style={{
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
            }}
          >
            {data.description}
          </span>
        )}
      </div>
    );
  }
);

GenerationHeaderNode.displayName = 'GenerationHeaderNode';
