import { ArquivoHistorico } from '../../types';
import { ArquivosHistoricos } from '../ArquivosHistoricos';
import { Input } from '../ui/input';

export type MarriageDetailsForm = {
  data_casamento: string;
  local_casamento: string;
  ativo: boolean;
  data_separacao: string;
  local_separacao: string;
  observacoes: string;
  arquivos_historicos?: ArquivoHistorico[];
};

type MarriageDetailsEditorProps = {
  value: MarriageDetailsForm;
  onChange: (value: MarriageDetailsForm) => void;
  relacionamentoId?: string | null;
  isAdmin?: boolean;
  readOnly?: boolean;
  allowHistoricalFiles?: boolean;
};

export function createEmptyMarriageDetails(): MarriageDetailsForm {
  return {
    data_casamento: '',
    local_casamento: '',
    ativo: true,
    data_separacao: '',
    local_separacao: '',
    observacoes: '',
    arquivos_historicos: [],
  };
}

export function normalizeMarriageDetails(value?: Partial<MarriageDetailsForm> | null): MarriageDetailsForm {
  return {
    ...createEmptyMarriageDetails(),
    ...value,
    ativo: value?.ativo ?? true,
    arquivos_historicos: Array.isArray(value?.arquivos_historicos) ? value.arquivos_historicos : [],
  };
}

export function MarriageDetailsEditor({
  value,
  onChange,
  relacionamentoId,
  isAdmin = false,
  readOnly = false,
  allowHistoricalFiles = false,
}: MarriageDetailsEditorProps) {
  const details = normalizeMarriageDetails(value);

  const updateField = (field: keyof MarriageDetailsForm, fieldValue: string | boolean | ArquivoHistorico[]) => {
    onChange({
      ...details,
      [field]: fieldValue,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Data de casamento</label>
          <Input
            value={details.data_casamento}
            onChange={(event) => updateField('data_casamento', event.target.value)}
            placeholder="DD/MM/AAAA ou AAAA"
            readOnly={readOnly}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Local de casamento</label>
          <Input
            value={details.local_casamento}
            onChange={(event) => updateField('local_casamento', event.target.value)}
            placeholder="Cidade/UF"
            readOnly={readOnly}
          />
        </div>

        <label className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={details.ativo}
            onChange={(event) => updateField('ativo', event.target.checked)}
            disabled={readOnly}
            className="h-4 w-4"
          />
          Relacionamento ativo
        </label>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Data de separação</label>
          <Input
            value={details.data_separacao}
            onChange={(event) => updateField('data_separacao', event.target.value)}
            placeholder="DD/MM/AAAA ou AAAA"
            readOnly={readOnly}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">Local de separação</label>
          <Input
            value={details.local_separacao}
            onChange={(event) => updateField('local_separacao', event.target.value)}
            placeholder="Cidade/UF"
            readOnly={readOnly}
          />
        </div>
      </div>

      {isAdmin && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Observações internas</label>
          <textarea
            value={details.observacoes}
            onChange={(event) => updateField('observacoes', event.target.value)}
            rows={3}
            readOnly={readOnly}
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            placeholder="Notas administrativas sobre o relacionamento"
          />
        </div>
      )}

      {allowHistoricalFiles && (
        relacionamentoId ? (
          <ArquivosHistoricos
            arquivos={details.arquivos_historicos ?? []}
            onChange={(arquivos) => updateField('arquivos_historicos', arquivos)}
            relacionamentoId={relacionamentoId}
            readOnly={readOnly}
          />
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Arquivos históricos do casamento poderão ser adicionados depois que o relacionamento for salvo.
          </p>
        )
      )}
    </div>
  );
}
