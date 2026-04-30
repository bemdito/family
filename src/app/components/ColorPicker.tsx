import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ColorOption {
  nome: string;
  cores: string[];
}

const CORES_DISPONIVEIS: ColorOption[] = [
  {
    nome: 'Vermelho',
    cores: ['#FDF0F0', '#FBE3E3', '#F8CDCD', '#F4B8B8', '#F0AFAF']
  },
  {
    nome: 'Laranja',
    cores: ['#FEF4E8', '#FDEBD7', '#FADAB5', '#F8CEA0', '#F5C28B']
  },
  {
    nome: 'Amarelo',
    cores: ['#FFF9DB', '#FCF4C7', '#F9ECA0', '#F7E58D', '#F4DD79']
  },
  {
    nome: 'Verde',
    cores: ['#F1F8EA', '#E6F3DA', '#D1EABF', '#C7E5B0', '#BCE0A0']
  },
  {
    nome: 'Azul',
    cores: ['#F0F8FE', '#E3F2FC', '#C7E6F9', '#B8DEF7', '#A9D6F5']
  },
  {
    nome: 'Lilás',
    cores: ['#F7F0FE', '#F0E3FC', '#E4CCFA', '#DDBFF9']
  }
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Cor selecionada - clicável para expandir */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
      >
        {value ? (
          <>
            <div 
              className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm text-gray-700 font-mono flex-1 text-left">{value}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500 flex-1 text-left">Selecionar cor do card</span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Paleta de cores - exibida quando expandido */}
      {isExpanded && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          {CORES_DISPONIVEIS.map((grupo) => (
            <div key={grupo.nome}>
              <p className="text-xs font-medium text-gray-600 mb-2">{grupo.nome}</p>
              <div className="flex flex-wrap gap-2">
                {grupo.cores.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => {
                      onChange(cor);
                      setIsExpanded(false);
                    }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      value === cor 
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: cor }}
                    title={cor}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {value && (
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsExpanded(false);
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}