import React from 'react';
import { Columns3, List, Users } from 'lucide-react';
import { TipoVisualizacaoArvore } from '../../types';

interface ViewModeToggleProps {
  value: TipoVisualizacaoArvore;
  onChange: (value: TipoVisualizacaoArvore) => void;
  className?: string;
  availableModes?: TipoVisualizacaoArvore[];
}

const OPTIONS: Array<{
  value: TipoVisualizacaoArvore;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'lados',
    label: 'Por lados',
    Icon: Users,
  },
  {
    value: 'geracoes',
    label: 'Por gerações',
    Icon: Columns3,
  },
  {
    value: 'lista',
    label: 'Lista',
    Icon: List,
  },
];

export function ViewModeToggle({
  value,
  onChange,
  className = '',
  availableModes,
}: ViewModeToggleProps) {
  const visibleOptions = React.useMemo(() => {
    if (!availableModes || availableModes.length === 0) {
      return OPTIONS;
    }

    const allowed = new Set(availableModes);
    return OPTIONS.filter((option) => allowed.has(option.value));
  }, [availableModes]);

  const fallbackValue = React.useMemo(() => {
    if (visibleOptions.some((option) => option.value === value)) {
      return value;
    }

    return visibleOptions[0]?.value;
  }, [value, visibleOptions]);

  if (!visibleOptions.length) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm ${className}`.trim()}
      role="tablist"
      aria-label="Selecionar visualização da árvore"
    >
      {visibleOptions.map(({ value: optionValue, label, Icon }) => {
        const isActive = fallbackValue === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(optionValue)}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
