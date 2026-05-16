import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, CalendarClock, Dog, Globe, Home, Lightbulb, MapPin, Phone, Sparkles, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Pessoa } from '../../types';
import { formatPhone, getPersonZodiacSign, isPersonDeceased } from '../../utils/personFields';
import { getSocialLink, isBirthDate, shouldShowAquariusFallback } from '../../utils/personProfile';
import { canUseWhatsAppContact } from '../../utils/whatsapp';
import { WhatsAppContactButton } from './WhatsAppContactButton';
import {
  gerarInsightsPessoa,
  getInsightByType,
  obterInsightsGeradosPessoa,
  PersonGeneratedInsight,
} from '../../services/personInsightsService';

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2 text-gray-700">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm">
        {label}: <strong>{value}</strong>
      </span>
    </div>
  );
}

function toParagraphs(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim()) return [value];

  return [];
}

export function PersonDataView({ pessoa }: { pessoa: Pessoa }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [generatedInsights, setGeneratedInsights] = useState<PersonGeneratedInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const isPet = pessoa.humano_ou_pet === 'Pet';
  const isFalecido = isPersonDeceased(pessoa);
  const canShowBirthDate = pessoa.permitir_exibir_data_nascimento !== false;
  const zodiacSign = canShowBirthDate ? getPersonZodiacSign(pessoa) : undefined;
  const canShowSocial = Boolean(
    (pessoa.permitir_exibir_rede_social === true || pessoa.permitir_exibir_instagram === true) &&
    (pessoa.instagram_url || pessoa.instagram_usuario || pessoa.rede_social)
  );
  const canShowPhoneNumber = Boolean(pessoa.permitir_exibir_telefone === true && pessoa.telefone);
  const canShowWhatsAppButton = canUseWhatsAppContact(pessoa);
  const canShowAddress = Boolean(pessoa.permitir_exibir_endereco === true && pessoa.endereco);
  const socialLink = getSocialLink(pessoa);

  useEffect(() => {
    let cancelled = false;

    async function loadInsights() {
      if (!pessoa.id || !pessoa.data_nascimento || isPet || !canShowBirthDate) {
        setGeneratedInsights([]);
        setInsightsError(null);
        setInsightsLoading(false);
        return;
      }

      try {
        setInsightsLoading(true);
        setInsightsError(null);

        const existing = await obterInsightsGeradosPessoa(pessoa.id);

        if (cancelled) return;

        const hasAstrology = existing.some((item) => item.tipo === 'astrology');
        const hasHistorical = existing.some((item) => item.tipo === 'historical_events');

        if (hasAstrology && hasHistorical) {
          setGeneratedInsights(existing);
          return;
        }

        await gerarInsightsPessoa(pessoa.id);

        if (cancelled) return;

        const refreshed = await obterInsightsGeradosPessoa(pessoa.id);

        if (!cancelled) {
          setGeneratedInsights(refreshed);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Erro ao carregar conteúdos automáticos.';
          setInsightsError(message);
        }
      } finally {
        if (!cancelled) {
          setInsightsLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, [pessoa.id, pessoa.data_nascimento, isPet, canShowBirthDate]);

  const astrologyInsight = useMemo(
    () => getInsightByType(generatedInsights, 'astrology'),
    [generatedInsights]
  );

  const historicalInsight = useMemo(
    () => getInsightByType(generatedInsights, 'historical_events'),
    [generatedInsights]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => pessoa.foto_principal_url && setPhotoOpen(true)}
                disabled={!pessoa.foto_principal_url}
                aria-label={pessoa.foto_principal_url ? `Ampliar foto de ${pessoa.nome_completo}` : undefined}
                className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ${pessoa.foto_principal_url ? 'cursor-zoom-in ring-offset-2 transition hover:ring-2 hover:ring-blue-300' : 'cursor-default'} ${isPet ? 'bg-amber-200' : isFalecido ? 'bg-gray-300' : 'bg-blue-200'}`}
              >
                {pessoa.foto_principal_url ? (
                  <img src={pessoa.foto_principal_url} alt={pessoa.nome_completo} className="h-32 w-32 object-cover" />
                ) : isPet ? (
                  <Dog className="h-16 w-16 text-amber-700" />
                ) : (
                  <User className="h-16 w-16 text-blue-700" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">{pessoa.nome_completo}</h1>
              <div className="mb-4 flex flex-wrap gap-2">
                {isPet && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">Pet da família</span>}
                {isFalecido && <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">In Memoriam</span>}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {canShowBirthDate && (
                  <>
                    <InfoItem icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={pessoa.data_nascimento} />
                    <InfoItem icon={<Calendar className="h-4 w-4" />} label="Signo" value={zodiacSign || 'Não identificado'} />
                  </>
                )}
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="Local de nascimento" value={pessoa.local_nascimento} />
                {!isFalecido && <InfoItem icon={<Home className="h-4 w-4" />} label="Residência atual" value={pessoa.local_atual} />}
                <InfoItem icon={<Calendar className="h-4 w-4" />} label="Falecimento" value={pessoa.data_falecimento || (isFalecido ? 'Falecido(a)' : undefined)} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="Local de falecimento" value={pessoa.local_falecimento} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="border-0 bg-black/90 p-3 text-white shadow-2xl sm:max-w-[90vw]">
          <DialogTitle className="sr-only">Foto ampliada de {pessoa.nome_completo}</DialogTitle>
          {pessoa.foto_principal_url && (
            <img
              src={pessoa.foto_principal_url}
              alt={pessoa.nome_completo}
              className="mx-auto max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {(pessoa.minibio || pessoa.curiosidades) && (
        <Card>
          <CardHeader>
            <CardTitle>Sobre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pessoa.minibio && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-800">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold">Mini bio</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{pessoa.minibio}</p>
              </div>
            )}
            {pessoa.curiosidades && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-800">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold">Curiosidades</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{pessoa.curiosidades}</p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isFalecido && (canShowPhoneNumber || canShowWhatsAppButton || canShowAddress || canShowSocial) && (
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {canShowPhoneNumber && (
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label="Telefone"
                value={formatPhone(String(pessoa.telefone ?? ''))}
              />
            )}
            <WhatsAppContactButton
              telefone={pessoa.telefone ?? null}
              permitirExibirTelefone={pessoa.permitir_exibir_telefone ?? null}
              permitirMensagensWhatsApp={pessoa.permitir_mensagens_whatsapp ?? null}
              personId={pessoa.id}
              personName={pessoa.nome_completo}
            />
            <InfoItem icon={<Home className="h-4 w-4" />} label="Endereço" value={canShowAddress ? pessoa.endereco : undefined} />
            {canShowSocial && (
              <InfoItem
                icon={<Globe className="h-4 w-4" />}
                label="Rede social"
                value={
                  socialLink ? (
                    <a href={socialLink.href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {socialLink.label}
                    </a>
                  ) : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {pessoa.data_nascimento && !isPet && canShowBirthDate && (
        <>
          <PersonAstrologyCard
            pessoa={pessoa}
            insight={astrologyInsight}
            loading={insightsLoading}
            error={insightsError}
          />

          <PersonHistoricalEventsCard
            pessoa={pessoa}
            insight={historicalInsight}
            loading={insightsLoading}
            error={insightsError}
          />
        </>
      )}
    </div>
  );
}

export function PersonAstrologyCard({
  pessoa,
  insight,
  loading,
  error,
}: {
  pessoa: Pessoa;
  insight?: PersonGeneratedInsight;
  loading?: boolean;
  error?: string | null;
}) {
  const content = insight?.conteudo;
  const fallback = shouldShowAquariusFallback(pessoa);

  if (!content && !loading && !error && !fallback) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          O que diz a astrologia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
          {content?.body ? (
            <p className="text-sm leading-relaxed text-gray-700">{content.body}</p>
          ) : loading ? (
            <p className="text-sm leading-relaxed text-gray-700">Gerando conteúdo astrológico...</p>
          ) : error ? (
            <p className="text-sm leading-relaxed text-gray-700">Não foi possível gerar este conteúdo agora.</p>
          ) : (
            <p className="text-sm leading-relaxed text-gray-700">
              Dentro de Aquário, quem nasce em 23 de janeiro costuma carregar uma energia bem típica do signo: mental,
              independente, curiosa e voltada para novas ideias. Tende a ser alguém criativo, observador e mentalmente
              inquieto, que valoriza liberdade, autenticidade e conexões com propósito. Se dá bem com signos de Ar —
              Gêmeos, Libra e Aquário — e também pode ter boa sintonia com signos de Fogo, como Áries e Sagitário.
              Costuma ter mais desafios com signos de Terra — Touro, Virgem e Capricórnio — e de Água, especialmente
              Câncer, Escorpião e Peixes, quando há excesso de controle, apego ou cobrança emocional.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PersonHistoricalEventsCard({
  pessoa,
  insight,
  loading,
  error,
}: {
  pessoa: Pessoa;
  insight?: PersonGeneratedInsight;
  loading?: boolean;
  error?: string | null;
}) {
  const showHistoricalFallback = isBirthDate(pessoa.data_nascimento, 23, 1, 1989);
  const content = insight?.conteudo;
  const brazilParagraphs = toParagraphs(content?.brazil?.body);
  const worldParagraphs = toParagraphs(content?.world?.body);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-600" />
          Acontecimentos históricos no dia do nascimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <div className="space-y-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{content.title}</h3>
              {content.main_event && (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{content.main_event}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {content.period_title || 'O que estava acontecendo na época'}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white/70 p-4">
                  <h4 className="text-sm font-semibold text-gray-800">{content.brazil?.title || 'Brasil'}</h4>
                  {brazilParagraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-2 text-sm leading-relaxed text-gray-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="rounded-lg bg-white/70 p-4">
                  <h4 className="text-sm font-semibold text-gray-800">{content.world?.title || 'Mundo'}</h4>
                  {worldParagraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-2 text-sm leading-relaxed text-gray-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
          <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
            Gerando acontecimentos históricos...
          </p>
        ) : error ? (
          <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
            Não foi possível gerar este conteúdo agora.
          </p>
        ) : showHistoricalFallback ? (
          <div className="space-y-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">23/01/1989 — principal acontecimento do dia</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                O fato histórico mais marcante de 23 de janeiro de 1989 foi a morte de Salvador Dalí, pintor espanhol
                ligado ao surrealismo, em Figueres, na Espanha, aos 84 anos. Ele é um dos artistas mais conhecidos do
                século XX, famoso por imagens oníricas, simbólicas e visualmente provocativas.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">O que estava acontecendo na época</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-white/70 p-4">
                  <h4 className="text-sm font-semibold text-gray-800">Brasil</h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    Em janeiro de 1989, o Brasil vivia o governo José Sarney, a redemocratização ainda recente e uma
                    crise econômica severa, marcada por inflação muito alta. Naquele mês, o governo lançou o Plano
                    Verão, uma tentativa de conter a inflação, com mudança monetária e criação do Cruzado Novo.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    Politicamente, 1989 seria um ano decisivo: em 15 de novembro e 17 de dezembro de 1989, o Brasil
                    realizou a primeira eleição presidencial direta desde 1960, já sob a Constituição de 1988. Fernando
                    Collor venceu Lula no segundo turno.
                  </p>
                </div>
                <div className="rounded-lg bg-white/70 p-4">
                  <h4 className="text-sm font-semibold text-gray-800">Mundo</h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    1989 foi um ano de virada histórica global. Em janeiro, esse processo ainda estava começando, mas
                    ao longo do ano ocorreriam eventos que mudariam a ordem mundial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            Em breve, esta seção será gerada automaticamente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
