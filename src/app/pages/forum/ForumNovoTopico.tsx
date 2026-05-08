import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AppLink as Link } from '../../components/AppLink';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../contexts/AuthContext';
import { obterTodasPessoas } from '../../services/dataService';
import { criarTopicoForum, listarCategoriasForum } from '../../services/forumService';
import { ForumCategoria, ForumTopicoTipo, Pessoa } from '../../types';

const TIPO_OPTIONS: Array<{ value: ForumTopicoTipo; label: string }> = [
  { value: 'pergunta', label: 'Pergunta' },
  { value: 'discussao', label: 'Discussão' },
  { value: 'aviso', label: 'Aviso' },
  { value: 'memoria', label: 'Memória' },
  { value: 'ajuda', label: 'Ajuda' },
];

function criarSlug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function ForumNovoTopico() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<ForumCategoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [titulo, setTitulo] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipo, setTipo] = useState<ForumTopicoTipo>('discussao');
  const [conteudo, setConteudo] = useState('');
  const [pessoaRelacionadaId, setPessoaRelacionadaId] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let mounted = true;
    const pessoaIdParam = searchParams.get('pessoaId') ?? '';

    async function carregar() {
      const [categoriasData, pessoasData] = await Promise.all([
        listarCategoriasForum(),
        obterTodasPessoas(),
      ]);

      if (!mounted) return;
      setCategorias(categoriasData);
      setPessoas(pessoasData);
      setCategoriaId(categoriasData[0]?.id ?? '');
      if (pessoaIdParam && pessoasData.some((pessoa) => pessoa.id === pessoaIdParam)) {
        setPessoaRelacionadaId(pessoaIdParam);
      }
    }

    carregar();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  async function publicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      toast.error('Entre para criar um tópico.');
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      toast.error('Informe título e conteúdo.');
      return;
    }

    setSalvando(true);
    const topico = await criarTopicoForum({
      autor_id: user.id,
      categoria_id: categoriaId || null,
      titulo: titulo.trim(),
      slug: `${criarSlug(titulo) || 'topico'}-${Date.now()}`,
      conteudo: conteudo.trim(),
      tipo,
      pessoa_relacionada_id: pessoaRelacionadaId || null,
    });
    setSalvando(false);

    if (!topico) {
      toast.error('Não foi possível publicar o tópico.');
      return;
    }

    toast.success('Tópico publicado.');
    navigate(`/forum/topico/${topico.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Criar tópico</h1>
            <p className="text-sm text-gray-500">Compartilhe uma pergunta, memória, documento ou pedido de ajuda.</p>
          </div>
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Fórum
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo tópico</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={publicar} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="titulo">Título</label>
                <Input id="titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="categoria">Categoria</label>
                  <select
                    id="categoria"
                    value={categoriaId}
                    onChange={(event) => setCategoriaId(event.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="tipo">Tipo</label>
                  <select
                    id="tipo"
                    value={tipo}
                    onChange={(event) => setTipo(event.target.value as ForumTopicoTipo)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {TIPO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="pessoa">Pessoa relacionada</label>
                <select
                  id="pessoa"
                  value={pessoaRelacionadaId}
                  onChange={(event) => setPessoaRelacionadaId(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Nenhuma pessoa relacionada</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>{pessoa.nome_completo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="conteudo">Conteúdo</label>
                <Textarea
                  id="conteudo"
                  value={conteudo}
                  onChange={(event) => setConteudo(event.target.value)}
                  className="min-h-48"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={salvando}>
                  <Send className="w-4 h-4 mr-2" />
                  {salvando ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
