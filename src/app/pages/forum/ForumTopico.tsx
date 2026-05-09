import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppLink as Link } from '../../components/AppLink';
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  EyeOff,
  Heart,
  MessageSquare,
  UserRound,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../contexts/AuthContext';
import {
  criarComentarioForum,
  criarRespostaForum,
  atualizarComentarioForum,
  atualizarRespostaForum,
  deletarComentarioForum,
  deletarRespostaForum,
  deletarTopicoForum,
  incrementarVisualizacaoTopico,
  listarComentariosDaResposta,
  listarRespostasDoTopico,
  marcarRespostaComoSolucao,
  ocultarComentarioForum,
  ocultarRespostaForum,
  ocultarTopicoForum,
  obterResumoReacoes,
  obterTopicoForumPorId,
  reagirAoConteudo,
  ResumoReacoesForum,
} from '../../services/forumService';
import { isAdminUser } from '../../services/permissionService';
import {
  ForumAlvoTipo,
  ForumComentario,
  ForumReacaoTipo,
  ForumResposta,
  ForumTopicoStatus,
  ForumTopico as ForumTopicoType,
} from '../../types';

const REACAO_LABELS: Record<ForumReacaoTipo, string> = {
  curtir: 'Curtir',
  apoiar: 'Apoiar',
  lembrar: 'Lembrar',
  celebrar: 'Celebrar',
};

const TOPICO_TIPO_LABELS: Record<string, string> = {
  pergunta: 'Pergunta',
  discussao: 'Discussão',
  aviso: 'Aviso',
  memoria: 'Memória',
  ajuda: 'Ajuda',
};

const TOPICO_STATUS_LABELS: Record<ForumTopicoStatus, string> = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  oculto: 'Oculto',
};

const RESUMO_VAZIO: ResumoReacoesForum = { curtir: 0, apoiar: 0, lembrar: 0, celebrar: 0 };

function formatarData(valor?: string) {
  if (!valor) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
}

function nomeAutor(autorId: string, userId?: string) {
  if (autorId === userId) return 'Você';
  return `Familiar ${autorId.slice(0, 8)}`;
}

function ReactionBar({
  alvoTipo,
  alvoId,
  resumo,
  onChange,
}: {
  alvoTipo: ForumAlvoTipo;
  alvoId: string;
  resumo: ResumoReacoesForum;
  onChange: (resumo: ResumoReacoesForum) => void;
}) {
  async function reagir(tipo: ForumReacaoTipo) {
    const reacao = await reagirAoConteudo(alvoTipo, alvoId, tipo);
    if (!reacao) {
      toast.error('Não foi possível registrar a reação.');
      return;
    }

    const atualizado = await obterResumoReacoes(alvoTipo, alvoId);
    onChange(atualizado);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(REACAO_LABELS) as ForumReacaoTipo[]).map((tipo) => (
        <Button key={tipo} type="button" variant="outline" size="sm" onClick={() => reagir(tipo)}>
          <Heart className="w-3 h-3 mr-1" />
          {REACAO_LABELS[tipo]} {resumo[tipo] ? `(${resumo[tipo]})` : ''}
        </Button>
      ))}
    </div>
  );
}

export function ForumTopico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topico, setTopico] = useState<ForumTopicoType | null>(null);
  const [respostas, setRespostas] = useState<ForumResposta[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, ForumComentario[]>>({});
  const [resumoTopico, setResumoTopico] = useState<ResumoReacoesForum>(RESUMO_VAZIO);
  const [resumosRespostas, setResumosRespostas] = useState<Record<string, ResumoReacoesForum>>({});
  const [respostaTexto, setRespostaTexto] = useState('');
  const [comentarioTexto, setComentarioTexto] = useState<Record<string, string>>({});
  const [editandoRespostaId, setEditandoRespostaId] = useState<string | null>(null);
  const [respostaEditada, setRespostaEditada] = useState('');
  const [editandoComentarioId, setEditandoComentarioId] = useState<string | null>(null);
  const [comentarioEditado, setComentarioEditado] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [erro, setErro] = useState('');
  const [admin, setAdmin] = useState(false);

  const podeEditarTopico = useMemo(
    () => Boolean(user && topico && (topico.autor_id === user.id || admin)),
    [user, topico, admin]
  );
  const podeMarcarSolucao = useMemo(
    () => Boolean(user && topico && (topico.autor_id === user.id || admin)),
    [user, topico, admin]
  );

  async function carregar() {
    if (!id) return;
    setLoading(true);
    setErro('');
    const topicoData = await obterTopicoForumPorId(id);
    if (!topicoData) {
      setTopico(null);
      setRespostas([]);
      setErro('Não foi possível carregar este tópico. Ele pode ter sido removido ou ocultado.');
      setLoading(false);
      return;
    }
    const respostasData = await listarRespostasDoTopico(id);
    const [comentariosData, resumoTopicoData, resumosData] = await Promise.all([
      Promise.all(respostasData.map(async (resposta) => [resposta.id, await listarComentariosDaResposta(resposta.id)] as const)),
      obterResumoReacoes('topico', id),
      Promise.all(respostasData.map(async (resposta) => [resposta.id, await obterResumoReacoes('resposta', resposta.id)] as const)),
    ]);

    setTopico(topicoData);
    setRespostas(respostasData);
    setComentarios(Object.fromEntries(comentariosData));
    setResumoTopico(resumoTopicoData);
    setResumosRespostas(Object.fromEntries(resumosData));
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    if (id) incrementarVisualizacaoTopico(id);
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function carregarPermissaoAdmin() {
      if (!user) {
        setAdmin(false);
        return;
      }

      const result = await isAdminUser(user);
      if (!mounted) return;

      setAdmin(result.isAdmin);
    }

    carregarPermissaoAdmin();

    return () => {
      mounted = false;
    };
  }, [user]);

  async function responder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || !user) {
      toast.error('Entre para responder.');
      return;
    }

    if (topico?.status === 'fechado') {
      toast.error('Este tópico está fechado e não aceita novas respostas.');
      return;
    }

    if (!respostaTexto.trim()) {
      toast.error('Escreva uma resposta.');
      return;
    }

    setEnviandoResposta(true);
    const resposta = await criarRespostaForum({
      topico_id: id,
      autor_id: user.id,
      conteudo: respostaTexto.trim(),
    });
    setEnviandoResposta(false);

    if (!resposta) {
      toast.error('Não foi possível publicar a resposta.');
      return;
    }

    setRespostaTexto('');
    toast.success('Resposta publicada.');
    await carregar();
  }

  async function comentar(respostaId: string) {
    if (!user) {
      toast.error('Entre para comentar.');
      return;
    }

    const conteudo = comentarioTexto[respostaId]?.trim();
    if (!conteudo) {
      toast.error('Escreva um comentário.');
      return;
    }

    const comentario = await criarComentarioForum({
      resposta_id: respostaId,
      autor_id: user.id,
      conteudo,
    });

    if (!comentario) {
      toast.error('Não foi possível publicar o comentário.');
      return;
    }

    setComentarioTexto((prev) => ({ ...prev, [respostaId]: '' }));
    setComentarios((prev) => ({
      ...prev,
      [respostaId]: [...(prev[respostaId] ?? []), comentario],
    }));
    toast.success('Comentário publicado.');
  }

  async function removerTopico() {
    if (!topico || !window.confirm('Deseja excluir este tópico?')) return;
    const ok = await deletarTopicoForum(topico.id);
    if (!ok) {
      toast.error('Não foi possível excluir o tópico.');
      return;
    }
    toast.success('Tópico excluído.');
    navigate('/forum');
  }

  async function ocultarTopico() {
    if (!topico || !window.confirm('Deseja ocultar este tópico para os membros?')) return;
    const atualizado = await ocultarTopicoForum(topico.id);
    if (!atualizado) {
      toast.error('Não foi possível ocultar o tópico.');
      return;
    }
    toast.success('Tópico ocultado.');
    setTopico(atualizado);
  }

  async function removerResposta(respostaId: string) {
    if (!window.confirm('Deseja excluir esta resposta?')) return;
    const ok = await deletarRespostaForum(respostaId);
    if (!ok) {
      toast.error('Não foi possível excluir a resposta.');
      return;
    }
    toast.success('Resposta excluída.');
    await carregar();
  }

  function iniciarEdicaoResposta(resposta: ForumResposta) {
    setEditandoRespostaId(resposta.id);
    setRespostaEditada(resposta.conteudo);
  }

  async function salvarRespostaEditada(respostaId: string) {
    if (!respostaEditada.trim()) {
      toast.error('A resposta não pode ficar vazia.');
      return;
    }

    const atualizada = await atualizarRespostaForum(respostaId, { conteudo: respostaEditada.trim() });
    if (!atualizada) {
      toast.error('Não foi possível atualizar a resposta.');
      return;
    }

    setEditandoRespostaId(null);
    setRespostaEditada('');
    toast.success('Resposta atualizada.');
    await carregar();
  }

  async function ocultarResposta(respostaId: string) {
    if (!window.confirm('Deseja ocultar esta resposta para os membros?')) return;
    const ok = await ocultarRespostaForum(respostaId);
    if (!ok) {
      toast.error('Não foi possível ocultar a resposta.');
      return;
    }
    toast.success('Resposta ocultada.');
    await carregar();
  }

  async function removerComentario(respostaId: string, comentarioId: string) {
    if (!window.confirm('Deseja excluir este comentário?')) return;
    const ok = await deletarComentarioForum(comentarioId);
    if (!ok) {
      toast.error('Não foi possível excluir o comentário.');
      return;
    }
    setComentarios((prev) => ({
      ...prev,
      [respostaId]: (prev[respostaId] ?? []).filter((comentario) => comentario.id !== comentarioId),
    }));
    toast.success('Comentário excluído.');
  }

  function iniciarEdicaoComentario(comentario: ForumComentario) {
    setEditandoComentarioId(comentario.id);
    setComentarioEditado(comentario.conteudo);
  }

  async function salvarComentarioEditado(respostaId: string, comentarioId: string) {
    if (!comentarioEditado.trim()) {
      toast.error('O comentário não pode ficar vazio.');
      return;
    }

    const atualizado = await atualizarComentarioForum(comentarioId, { conteudo: comentarioEditado.trim() });
    if (!atualizado) {
      toast.error('Não foi possível atualizar o comentário.');
      return;
    }

    setComentarios((prev) => ({
      ...prev,
      [respostaId]: (prev[respostaId] ?? []).map((comentario) =>
        comentario.id === comentarioId ? atualizado : comentario
      ),
    }));
    setEditandoComentarioId(null);
    setComentarioEditado('');
    toast.success('Comentário atualizado.');
  }

  async function ocultarComentario(respostaId: string, comentarioId: string) {
    if (!window.confirm('Deseja ocultar este comentário para os membros?')) return;
    const ok = await ocultarComentarioForum(comentarioId);
    if (!ok) {
      toast.error('Não foi possível ocultar o comentário.');
      return;
    }
    setComentarios((prev) => ({
      ...prev,
      [respostaId]: (prev[respostaId] ?? []).filter((comentario) => comentario.id !== comentarioId),
    }));
    toast.success('Comentário ocultado.');
  }

  async function marcarSolucao(respostaId: string) {
    if (!topico) return;
    const ok = await marcarRespostaComoSolucao(topico.id, respostaId);
    if (!ok) {
      toast.error('Não foi possível marcar a solução.');
      return;
    }
    toast.success('Resposta marcada como solução.');
    await carregar();
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-500">Carregando tópico...</div>;
  }

  if (!topico) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-500">{erro || 'Tópico não encontrado.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao fórum
          </Link>

          {podeEditarTopico && (
            <div className="flex gap-2">
              <Link
                to={`/forum/topico/${topico.id}/editar`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Link>
              <Button type="button" variant="destructive" size="sm" onClick={removerTopico}>
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
              {admin && topico.status !== 'oculto' && (
                <Button type="button" variant="outline" size="sm" onClick={ocultarTopico}>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Ocultar
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {topico.categoria?.nome && <span>{topico.categoria.nome}</span>}
              <span>{TOPICO_TIPO_LABELS[topico.tipo]}</span>
              <span>{TOPICO_STATUS_LABELS[topico.status]}</span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{topico.titulo}</h1>
              <p className="mt-2 text-sm text-gray-500">
                Por {nomeAutor(topico.autor_id, user?.id)} em {formatarData(topico.created_at)}
              </p>
            </div>

            {topico.pessoa_relacionada && (
              <Card className="border-blue-100 bg-blue-50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase text-blue-700">Pessoa relacionada</p>
                        <h2 className="font-semibold text-gray-900">{topico.pessoa_relacionada.nome_completo}</h2>
                      </div>
                    </div>
                    <Link
                      to={`/pessoa/${topico.pessoa_relacionada.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{topico.conteudo}</p>

            <ReactionBar
              alvoTipo="topico"
              alvoId={topico.id}
              resumo={resumoTopico}
              onChange={setResumoTopico}
            />
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Respostas</h2>
            <span className="text-sm text-gray-500">{respostas.length} resposta(s)</span>
          </div>

          {respostas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">Nenhuma resposta publicada ainda.</CardContent>
            </Card>
          ) : (
            respostas.map((resposta) => {
              const podeAlterarResposta = Boolean(user && (resposta.autor_id === user.id || admin));
              return (
                <Card
                  key={resposta.id}
                  className={resposta.aceita_como_solucao ? 'border-emerald-300 bg-emerald-50/30' : undefined}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {nomeAutor(resposta.autor_id, user?.id)}
                          {resposta.aceita_como_solucao && (
                            <span className="ml-2 inline-flex items-center gap-1 text-sm text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              Solução
                            </span>
                          )}
                        </CardTitle>
                        <p className="text-xs text-gray-500">{formatarData(resposta.created_at)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {podeMarcarSolucao && !resposta.aceita_como_solucao && (
                          <Button type="button" variant="outline" size="sm" onClick={() => marcarSolucao(resposta.id)}>
                            Marcar solução
                          </Button>
                        )}
                        {podeAlterarResposta && (
                          <>
                            <Button type="button" variant="ghost" size="sm" onClick={() => iniciarEdicaoResposta(resposta)}>
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removerResposta(resposta.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </Button>
                          </>
                        )}
                        {admin && resposta.status !== 'oculto' && (
                          <Button type="button" variant="outline" size="sm" onClick={() => ocultarResposta(resposta.id)}>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Ocultar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-4">
                    {editandoRespostaId === resposta.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={respostaEditada}
                          onChange={(event) => setRespostaEditada(event.target.value)}
                          className="min-h-28"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={() => salvarRespostaEditada(resposta.id)}>
                            Salvar resposta
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditandoRespostaId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-700">{resposta.conteudo}</p>
                    )}

                    <ReactionBar
                      alvoTipo="resposta"
                      alvoId={resposta.id}
                      resumo={resumosRespostas[resposta.id] ?? RESUMO_VAZIO}
                      onChange={(resumo) => setResumosRespostas((prev) => ({ ...prev, [resposta.id]: resumo }))}
                    />

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <MessageSquare className="w-4 h-4" />
                        Comentários
                      </h3>

                      {(comentarios[resposta.id] ?? []).map((comentario) => {
                        const podeAlterarComentario = Boolean(user && (comentario.autor_id === user.id || admin));
                        return (
                          <div key={comentario.id} className="rounded-md bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-gray-700">
                                  {nomeAutor(comentario.autor_id, user?.id)}
                                </p>
                                {editandoComentarioId === comentario.id ? (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={comentarioEditado}
                                      onChange={(event) => setComentarioEditado(event.target.value)}
                                      className="min-h-16"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => salvarComentarioEditado(resposta.id, comentario.id)}
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditandoComentarioId(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{comentario.conteudo}</p>
                                )}
                              </div>
                              {podeAlterarComentario && (
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => iniciarEdicaoComentario(comentario)}
                                    className="text-gray-400 hover:text-blue-600"
                                    aria-label="Editar comentário"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removerComentario(resposta.id, comentario.id)}
                                    className="text-gray-400 hover:text-red-600"
                                    aria-label="Excluir comentário"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  {admin && comentario.status !== 'oculto' && (
                                    <button
                                      type="button"
                                      onClick={() => ocultarComentario(resposta.id, comentario.id)}
                                      className="text-gray-400 hover:text-amber-700"
                                      aria-label="Ocultar comentário"
                                    >
                                      <EyeOff className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Textarea
                          value={comentarioTexto[resposta.id] ?? ''}
                          onChange={(event) =>
                            setComentarioTexto((prev) => ({ ...prev, [resposta.id]: event.target.value }))
                          }
                          placeholder="Escrever comentário"
                          className="min-h-16"
                        />
                        <Button type="button" onClick={() => comentar(resposta.id)} className="sm:self-start">
                          Comentar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Responder</CardTitle>
          </CardHeader>
          <CardContent>
            {topico.status === 'fechado' ? (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                Este tópico está fechado e não aceita novas respostas.
              </p>
            ) : (
              <form onSubmit={responder} className="space-y-3">
                <Textarea
                  value={respostaTexto}
                  onChange={(event) => setRespostaTexto(event.target.value)}
                  placeholder="Escreva sua resposta"
                  className="min-h-32"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={enviandoResposta}>
                    <Send className="w-4 h-4 mr-2" />
                    {enviandoResposta ? 'Enviando...' : 'Publicar resposta'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
