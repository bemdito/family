import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppLink as Link } from '../../components/AppLink';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../contexts/AuthContext';
import { obterTodasPessoas } from '../../services/dataService';
import {
  atualizarTopicoForum,
  listarCategoriasForum,
  obterTopicoForumPorId,
} from '../../services/forumService';
import { isAdminUser } from '../../services/permissionService';
import { ForumCategoria, ForumTopico, ForumTopicoTipo, Pessoa } from '../../types';

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

export function ForumEditarTopico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topico, setTopico] = useState<ForumTopico | null>(null);
  const [categorias, setCategorias] = useState<ForumCategoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [titulo, setTitulo] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipo, setTipo] = useState<ForumTopicoTipo>('discussao');
  const [conteudo, setConteudo] = useState('');
  const [pessoaRelacionadaId, setPessoaRelacionadaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [admin, setAdmin] = useState(false);

  const podeEditar = useMemo(
    () => Boolean(user && topico && (topico.autor_id === user.id || admin)),
    [user, topico, admin]
  );

  useEffect(() => {
    let mounted = true;

    async function carregarPermissaoAdmin() {
      if (!user) {
        setAdmin(false);
        return;
      }

      const result = await isAdminUser(user);
      if (mounted) setAdmin(result.isAdmin);
    }

    carregarPermissaoAdmin();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function carregar() {
      if (!id) return;
      setLoading(true);
      const [topicoData, categoriasData, pessoasData] = await Promise.all([
        obterTopicoForumPorId(id),
        listarCategoriasForum(),
        obterTodasPessoas(),
      ]);

      if (!mounted) return;
      setCategorias(categoriasData);
      setPessoas(pessoasData);
      setTopico(topicoData ?? null);

      if (topicoData) {
        setTitulo(topicoData.titulo);
        setCategoriaId(topicoData.categoria_id ?? '');
        setTipo(topicoData.tipo);
        setConteudo(topicoData.conteudo);
        setPessoaRelacionadaId(topicoData.pessoa_relacionada_id ?? '');
      }

      setLoading(false);
    }

    carregar();

    return () => {
      mounted = false;
    };
  }, [id]);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || !podeEditar) {
      toast.error('Você não tem permissão para editar este tópico.');
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      toast.error('Informe título e conteúdo.');
      return;
    }

    setSalvando(true);
    const atualizado = await atualizarTopicoForum(id, {
      categoria_id: categoriaId || null,
      titulo: titulo.trim(),
      slug: criarSlug(titulo) || topico?.slug,
      conteudo: conteudo.trim(),
      tipo,
      pessoa_relacionada_id: pessoaRelacionadaId || null,
    });
    setSalvando(false);

    if (!atualizado) {
      toast.error('Não foi possível salvar o tópico.');
      return;
    }

    toast.success('Tópico atualizado.');
    navigate(`/forum/topico/${id}`);
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-500">Carregando tópico...</div>;
  }

  if (!topico) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-500">Tópico não encontrado.</div>;
  }

  if (!podeEditar) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Você não tem permissão para editar este tópico.</p>
            <Link to={`/forum/topico/${topico.id}`} className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:underline">
              Voltar ao tópico
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar tópico</h1>
            <p className="text-sm text-gray-500">Atualize as informações do tópico.</p>
          </div>
          <Link
            to={`/forum/topico/${topico.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do tópico</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={salvar} className="space-y-5">
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
                    <option value="">Sem categoria</option>
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
                  <Save className="w-4 h-4 mr-2" />
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
