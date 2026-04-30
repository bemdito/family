import React, { useState, useEffect } from 'react';
import { Pessoa } from '../types';
import { obterRelacionamentosDaPessoa } from '../services/dataService';
import { RelacionamentoManager } from './RelacionamentoManager';

interface RelacionamentoManagerWrapperProps {
  pessoaId: string;
  pessoaNome: string;
  onChange?: () => void;
}

export function RelacionamentoManagerWrapper({
  pessoaId,
  pessoaNome,
  onChange
}: RelacionamentoManagerWrapperProps) {
  const [relacionamentos, setRelacionamentos] = useState<{
    pais: Pessoa[];
    maes: Pessoa[];
    conjuges: Pessoa[];
    filhos: Pessoa[];
    irmaos: Pessoa[];
  }>({
    pais: [],
    maes: [],
    conjuges: [],
    filhos: [],
    irmaos: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelacionamentos();
  }, [pessoaId]);

  const loadRelacionamentos = async () => {
    setLoading(true);
    try {
      const rels = await obterRelacionamentosDaPessoa(pessoaId);
      setRelacionamentos(rels);
    } catch (error) {
      console.error('Erro ao carregar relacionamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = () => {
    loadRelacionamentos();
    onChange?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RelacionamentoManager
      pessoaId={pessoaId}
      pessoaNome={pessoaNome}
      relacionamentosIniciais={relacionamentos}
      onChange={handleChange}
    />
  );
}