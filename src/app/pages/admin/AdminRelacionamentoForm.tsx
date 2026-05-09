import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { adicionarRelacionamentoComInverso, obterTodasPessoas } from '../../services/dataService';
import { Pessoa, SubtipoRelacionamento, TipoRelacionamento } from '../../types';

const TIPOS_RELACIONAMENTO: Array<{ value: TipoRelacionamento; label: string }> = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'irmao', label: 'Irmão/Irmã' },
];

const SUBTIPOS_RELACIONAMENTO: Array<{ value: SubtipoRelacionamento; label: string }> = [
  { value: 'sangue', label: 'Sangue' },
  { value: 'adotivo', label: 'Adotivo' },
  { value: 'uniao', label: 'União' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'separado', label: 'Separado' },
];

export function AdminRelacionamentoForm() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaOrigemId, setPessoaOrigemId] = useState('');
  const [pessoaDestinoId, setPessoaDestinoId] = useState('');
  const [tipoRelacionamento, setTipoRelacionamento] = useState<TipoRelacionamento>('pai');
  const [subtipoRelacionamento, setSubtipoRelacionamento] = useState<SubtipoRelacionamento>('sangue');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPessoas() {
      try {
        setLoading(true);
        setError('');
        const data = await obterTodasPessoas();
        setPessoas(Array.isArray(data) ? data : []);
      } catch (loadError) {
        console.error('Erro ao carregar pessoas para relacionamento:', loadError);
        setError('Não foi possível carregar a lista de pessoas. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    loadPessoas();
  }, []);

  const pessoasOrdenadas = useMemo(
    () => [...pessoas].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR')),
    [pessoas]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!pessoaOrigemId || !pessoaDestinoId) {
      setError('Selecione a pessoa de origem e a pessoa de destino.');
      return;
    }

    if (pessoaOrigemId === pessoaDestinoId) {
      setError('A pessoa de origem e a pessoa de destino precisam ser diferentes.');
      return;
    }

    try {
      setSaving(true);
      const relacionamento = await adicionarRelacionamentoComInverso({
        pessoa_origem_id: pessoaOrigemId,
        pessoa_destino_id: pessoaDestinoId,
        tipo_relacionamento: tipoRelacionamento,
        subtipo_relacionamento: subtipoRelacionamento,
        ativo: true,
      });

      if (!relacionamento) {
        setError('Não foi possível salvar o relacionamento. Verifique se ele já existe ou tente novamente.');
        return;
      }

      navigate('/admin/relacionamentos');
    } catch (saveError) {
      console.error('Erro ao salvar relacionamento:', saveError);
      setError('Erro ao salvar relacionamento. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/relacionamentos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl text-gray-900">Novo Relacionamento</h1>
            <p className="text-sm text-gray-500">Cadastre um vínculo entre duas pessoas</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Dados do relacionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pessoa origem</label>
                  <Select value={pessoaOrigemId} onValueChange={setPessoaOrigemId} disabled={loading || saving}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione a origem'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoasOrdenadas.map((pessoa) => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pessoa destino</label>
                  <Select value={pessoaDestinoId} onValueChange={setPessoaDestinoId} disabled={loading || saving}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione o destino'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoasOrdenadas.map((pessoa) => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <Select
                    value={tipoRelacionamento}
                    onValueChange={(value) => setTipoRelacionamento(value as TipoRelacionamento)}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RELACIONAMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Subtipo</label>
                  <Select
                    value={subtipoRelacionamento}
                    onValueChange={(value) => setSubtipoRelacionamento(value as SubtipoRelacionamento)}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBTIPOS_RELACIONAMENTO.map((subtipo) => (
                        <SelectItem key={subtipo.value} value={subtipo.value}>
                          {subtipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/relacionamentos')}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || saving || pessoasOrdenadas.length < 2}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar relacionamento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
