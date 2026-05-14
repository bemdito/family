import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArquivoHistorico } from '../types';
import { ArrowDown, ArrowUp, Upload, X, FileText, Eye } from 'lucide-react';
import { uploadHistoricalFile } from '../services/storageService';

const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

interface ArquivosHistoricosProps {
  arquivos: ArquivoHistorico[];
  onChange: (arquivos: ArquivoHistorico[]) => void;
  pessoaId?: string | null;
  readOnly?: boolean;
}

export function ArquivosHistoricos({ arquivos, onChange, pessoaId, readOnly = false }: ArquivosHistoricosProps) {
  const [novoArquivo, setNovoArquivo] = useState({
    titulo: '',
    descricao: '',
    ano: '',
    tipo: 'imagem' as 'imagem' | 'pdf',
    url: ''
  });
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; tipo: ArquivoHistorico['tipo'] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      alert('Apenas JPG, PNG, WebP e PDF são permitidos');
      return;
    }

    setIsUploadingFile(true);
    try {
      const upload = await uploadHistoricalFile(file, { pessoaId });
      setNovoArquivo(prev => ({
        ...prev,
        url: upload.url,
        tipo: isImage ? 'imagem' : 'pdf'
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
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
      descricao: novoArquivo.descricao || undefined,
      ano: novoArquivo.ano || undefined,
      ordem: arquivos.length,
    };

    onChange([...arquivos, arquivo]);
    setNovoArquivo({ titulo: '', descricao: '', ano: '', tipo: 'imagem', url: '' });
    setIsAddingFile(false);
  };

  const handleRemoveArquivo = (id: string) => {
    onChange(arquivos.filter(a => a.id !== id));
  };

  const handleUpdateArquivo = (id: string, field: 'titulo' | 'descricao' | 'ano', value: string) => {
    onChange(arquivos.map((arquivo) => (
      arquivo.id === id ? { ...arquivo, [field]: value } : arquivo
    )));
  };

  const handleMoveArquivo = (id: string, direction: -1 | 1) => {
    const currentIndex = arquivos.findIndex((arquivo) => arquivo.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= arquivos.length) return;

    const nextArquivos = [...arquivos];
    const [item] = nextArquivos.splice(currentIndex, 1);
    nextArquivos.splice(nextIndex, 0, item);
    onChange(nextArquivos.map((arquivo, index) => ({ ...arquivo, ordem: index })));
  };

  const handleViewFile = (arquivo: ArquivoHistorico) => {
    setPreviewFile({ url: arquivo.url, tipo: arquivo.tipo });
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
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploadingFile}
                  className="cursor-pointer"
                />
                {novoArquivo.url && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Arquivo carregado ({novoArquivo.tipo})
                  </p>
                )}
                {isUploadingFile && (
                  <p className="text-xs text-blue-600 mt-1">
                    Enviando arquivo para o Storage...
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano
                </label>
                <Input
                  type="text"
                  value={novoArquivo.ano}
                  onChange={(e) => setNovoArquivo(prev => ({ ...prev, ano: e.target.value }))}
                  placeholder="Ex: 1950"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingFile(false);
                    setNovoArquivo({ titulo: '', descricao: '', ano: '', tipo: 'imagem', url: '' });
                  }}
                  disabled={isUploadingFile}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddArquivo}
                  disabled={isUploadingFile}
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
              {arquivos.map((arquivo, index) => (
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
                      {readOnly ? (
                        <>
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {arquivo.titulo}
                          </h4>
                          {arquivo.ano && (
                            <p className="text-xs text-gray-500 mt-1">{arquivo.ano}</p>
                          )}
                          {arquivo.descricao && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {arquivo.descricao}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={arquivo.titulo}
                            onChange={(event) => handleUpdateArquivo(arquivo.id, 'titulo', event.target.value)}
                            placeholder="Título"
                            className="h-8 bg-white text-sm"
                          />
                          <Input
                            value={arquivo.ano ?? ''}
                            onChange={(event) => handleUpdateArquivo(arquivo.id, 'ano', event.target.value)}
                            placeholder="Ano"
                            className="h-8 bg-white text-sm"
                          />
                          <textarea
                            value={arquivo.descricao ?? ''}
                            onChange={(event) => handleUpdateArquivo(arquivo.id, 'descricao', event.target.value)}
                            rows={2}
                            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            placeholder="Descrição"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleViewFile(arquivo)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Visualizar
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMoveArquivo(arquivo.id, -1)}
                              disabled={index === 0}
                              className="text-xs text-gray-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 flex items-center gap-1"
                            >
                              <ArrowUp className="w-3 h-3" />
                              Subir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveArquivo(arquivo.id, 1)}
                              disabled={index === arquivos.length - 1}
                              className="text-xs text-gray-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 flex items-center gap-1"
                            >
                              <ArrowDown className="w-3 h-3" />
                              Descer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveArquivo(arquivo.id)}
                              className="text-xs text-red-600 hover:underline flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Remover
                            </button>
                          </>
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
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Visualização do Arquivo</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="mt-4">
              {previewFile.tipo === 'imagem' || previewFile.url.startsWith('data:image') ? (
                <img 
                  src={previewFile.url}
                  alt="Visualização"
                  className="w-full h-auto rounded"
                />
              ) : (
                <iframe
                  src={previewFile.url}
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
