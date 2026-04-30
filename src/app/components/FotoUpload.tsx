import React, { useState } from 'react';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { User, Upload } from 'lucide-react';

interface FotoUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function FotoUpload({ value, onChange }: FotoUploadProps) {
  const [showModal, setShowModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é imagem
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Simular upload - em produção, isso enviaria para um servidor/storage
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          {/* Preview da foto */}
          <div 
            className={`flex-shrink-0 ${value ? 'cursor-pointer' : ''}`}
            onClick={() => value && setShowModal(true)}
          >
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 hover:border-gray-400 transition-colors">
              {value ? (
                <img 
                  src={value} 
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            {value && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                Clique para ampliar
              </p>
            )}
          </div>

          {/* Controles de upload */}
          <div className="flex-1 space-y-2">
            <label className="block">
              <div className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {value ? 'Alterar foto' : 'Fazer upload da foto'}
                </span>
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Modal para visualizar foto em tamanho maior */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Foto Principal</DialogTitle>
          </DialogHeader>
          {value && (
            <div className="mt-4">
              <img 
                src={value} 
                alt="Foto principal"
                className="w-full h-auto rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
