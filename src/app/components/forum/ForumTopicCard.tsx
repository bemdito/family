import { CheckCircle2, MessageCircle, Pin, Sparkles } from 'lucide-react';
import { AppLink as Link } from '../AppLink';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ForumCategoria, ForumTopico, ForumTopicoStatus, ForumTopicoTipo } from '../../types';

const TIPO_LABELS: Record<ForumTopicoTipo, string> = {
  pergunta: 'Pergunta',
  discussao: 'Discussão',
  aviso: 'Aviso',
  memoria: 'Memória',
  ajuda: 'Ajuda',
};

const STATUS_LABELS: Record<ForumTopicoStatus, string> = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  oculto: 'Oculto',
};

type ForumTopicCardProps = {
  topico: ForumTopico;
  categoria?: ForumCategoria | null;
  autor?: string;
  href?: string;
};

function formatarData(valor?: string) {
  if (!valor) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(valor));
}

function ConteudoTopicCard({ topico, categoria, autor }: Omit<ForumTopicCardProps, 'href'>) {
  const categoriaResolvida = categoria ?? topico.categoria;

  return (
    <Card className="h-full transition hover:border-blue-200 hover:shadow-md">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {categoriaResolvida?.nome && <span>{categoriaResolvida.nome}</span>}
          <Badge variant="outline">{TIPO_LABELS[topico.tipo]}</Badge>
          <Badge variant="outline">{STATUS_LABELS[topico.status]}</Badge>
          {topico.fixado && (
            <span className="inline-flex items-center gap-1 text-blue-700">
              <Pin className="h-3 w-3" />
              Fixado
            </span>
          )}
          {topico.status === 'resolvido' && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Resolvido
            </span>
          )}
          {topico.destacado && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Sparkles className="h-3 w-3" />
              Destaque
            </span>
          )}
        </div>
        <CardTitle className="text-lg leading-snug">{topico.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="line-clamp-2 text-sm leading-6 text-gray-600">{topico.conteudo}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{autor ?? `Familiar ${topico.autor_id.slice(0, 8)}`}</span>
          <span>{formatarData(topico.created_at)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {topico.respostas_count ?? 0} resposta(s)
          </span>
          <span>{topico.reacoes_count ?? 0} reação(ões)</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ForumTopicCard(props: ForumTopicCardProps) {
  if (!props.href) return <ConteudoTopicCard {...props} />;

  return (
    <Link to={props.href} className="block">
      <ConteudoTopicCard {...props} />
    </Link>
  );
}
