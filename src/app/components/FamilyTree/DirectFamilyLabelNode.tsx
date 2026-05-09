import React from 'react';
import { NodeProps } from 'reactflow';
import { DIRECT_FAMILY_GROUP_CONTAINER_BORDER } from './directFamilyColors';

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
      className="pointer-events-none flex min-h-[34px] select-none items-center justify-center rounded-md bg-white px-4 py-1.5 text-center text-[13px] font-bold uppercase tracking-normal text-slate-800"
      aria-label={data.label}
      style={{
        width: data.width ?? 180,
        borderColor: DIRECT_FAMILY_GROUP_CONTAINER_BORDER.color,
        borderWidth: DIRECT_FAMILY_GROUP_CONTAINER_BORDER.width,
        borderStyle: 'solid',
      }}
    >
      {data.label}
    </div>
  );
});

DirectFamilyLabelNode.displayName = 'DirectFamilyLabelNode';
