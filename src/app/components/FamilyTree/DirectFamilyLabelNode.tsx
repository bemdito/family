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
          <div className="mt-2 whitespace-nowrap text-4xl font-semibold leading-10 text-slate-600">
            {data.subtitle}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none flex min-h-[30px] w-full select-none items-center justify-center overflow-visible whitespace-nowrap bg-transparent p-0 text-center text-[18px] font-bold uppercase tracking-normal text-slate-800 shadow-none"
      aria-label={data.label}
      style={{
        width: data.width ?? 180,
        borderColor: 'transparent',
        borderWidth: 0,
        borderStyle: 'none',
      }}
    >
      {data.label}
    </div>
  );
});

DirectFamilyLabelNode.displayName = 'DirectFamilyLabelNode';
