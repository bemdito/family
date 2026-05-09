import React from 'react';
import { NodeProps } from 'reactflow';

interface DirectFamilyLabelNodeData {
  label: string;
  subtitle?: string;
  width?: number;
  variant?: 'group' | 'title';
}

export const DirectFamilyLabelNode = React.memo(({ data }: NodeProps<DirectFamilyLabelNodeData>) => {
  if (data.variant === 'title') {
    return (
      <div
        className="pointer-events-none select-none text-center tracking-normal"
        aria-label={data.label}
        style={{ width: data.width ?? 1280 }}
      >
        <div className="whitespace-nowrap text-6xl font-extrabold leading-[4.25rem] text-slate-900">
          {data.label}
        </div>
        {data.subtitle && (
          <div className="mt-2 whitespace-nowrap text-2xl font-medium leading-8 text-slate-600">
            {data.subtitle}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none flex min-h-[30px] select-none items-center justify-center rounded-md border border-slate-500/40 bg-white px-4 py-1 text-center text-[12px] font-bold uppercase tracking-normal text-slate-800"
      aria-label={data.label}
      style={{ width: data.width ?? 180 }}
    >
      {data.label}
    </div>
  );
});

DirectFamilyLabelNode.displayName = 'DirectFamilyLabelNode';
