import React from 'react';

export type TreeViewMode = 'minha-arvore' | 'genealogia' | 'visao-completa';

interface ViewModeToggleProps {
  value: TreeViewMode;
  onChange: (value: TreeViewMode) => void;
}

const options: Array<{ value: TreeViewMode; label: string }> = [
  { value: 'minha-arvore', label: 'Minha Árvore' },
  { value: 'genealogia', label: 'Genealogia' },
  { value: 'visao-completa', label: 'Visão Completa' },
];

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="absolute left-4 top-4 z-20 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1" role="tablist" aria-label="Visualização da árvore">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-semibold tracking-normal transition-colors',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
