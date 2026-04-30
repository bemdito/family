import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArquivoHistorico } from '../types';
import { Upload, X, FileText, Image as ImageIcon, Eye } from 'lucide-react';

interface ArquivosHistoricosProps {
  arquivos: ArquivoHistorico[];
  onChange: (arquivos: ArquivoHistorico[]) => void;
  readOnly?: boolean;
}

export function ArquivosHistoricos({ arquivos, onChange, readOnly = false }: ArquivosHistoricosProps) {
  const [novoArquivo, setNovoArquivo] = useState({
    titulo: '',
    descricao: '',
    tipo: 'imagem' as 'imagem' | 'pdf',
    url: ''
  });
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tipo de arquivo
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      alert('Apenas imagens e PDFs são permitidos');
      return;
    }

    // Simular upload - em produção, isso enviaria para um servidor/storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setNovoArquivo(prev => ({
        ...prev,
        url,
        tipo: isImage ? 'imagem' : 'pdf'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddArquivo = () => {
    if (!novoArquivo.titulo || !novoArquivo.url) {
      alert('Por favor, preencha o título e selecione um arquivo');
      return;
    }

    const arquivo: ArquivoHistorico = {
      id: `arquivo-${Date.now()}`,
      tipo: novoArquivo.tipo,
      url: novoArquivo.url,
      titulo: novoArquivo.titulo,
      descricao: novoArquivo.descricao || undefined
    };

    onChange([...arquivos, arquivo]);
    setNovoArquivo({ titulo: '', descricao: '', tipo: 'imagem', url: '' });
    setIsAddingFile(false);
  };

  const handleRemoveArquivo = (id: string) => {
    onChange(arquivos.filter(a => a.id !== id));
  };

  const handleViewFile = (url: string) => {
    setPreviewUrl(url);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Arquivos Históricos</CardTitle>
            {!readOnly && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddingFile(!isAddingFile)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Adicionar Arquivo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingFile && !readOnly && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo (imagem ou PDF) *
                </label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {novoArquivo.url && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Arquivo carregado ({novoArquivo.tipo})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <Input
                  type="text"
                  value={novoArquivo.titulo}
                  onChange={(e) => setNovoArquivo(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Certidão de nascimento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={novoArquivo.descricao}
                  onChange={(e) => setNovoArquivo(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Informações adicionais sobre o arquivo..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingFile(false);
                    setNovoArquivo({ titulo: '', descricao: '', tipo: 'imagem', url: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddArquivo}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {arquivos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum arquivo histórico adicionado
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {arquivos.map((arquivo) => (
                <div
                  key={arquivo.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {arquivo.tipo === 'imagem' ? (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                          <img 
                            src={arquivo.url} 
                            alt={arquivo.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-red-50 rounded flex items-center justify-center">
                          <FileText className="w-8 h-8 text-red-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {arquivo.titulo}
                      </h4>
                      {arquivo.descricao && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {arquivo.descricao}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleViewFile(arquivo.url)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Visualizar
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveArquivo(arquivo.id)}
                            className="text-xs text-red-600 hover:underline flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de visualização */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Visualização do Arquivo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="mt-4">
              {previewUrl.startsWith('data:image') ? (
                <img 
                  src={previewUrl} 
                  alt="Visualização"
                  className="w-full h-auto rounded"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded border"
                  title="Visualização PDF"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
