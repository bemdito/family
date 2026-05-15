# Implementacoes 14/05 - Frente 7.1 Notificacoes

## Status

Frente 7.1 consolidada para QA final.

Implementado:

- `/notificacoes` para usuarios;
- `/admin/notificacoes` para diagnostico admin;
- preferencias por tipo e canal;
- notificacoes internas;
- logs de dispatch;
- deduplicacao de recorrencias;
- gatilhos internos para forum, arquivos historicos e vinculos;
- rotina manual de aniversarios e memorias;
- Edge Function `run-daily-notifications` preparada e deployada;
- Edge Function `send-notification-email` revisada com Resend e teste admin controlado.

## Testado nesta rodada

- Build de producao;
- validacao de whitespace com `git diff --check`;
- `supabase db push`;
- deploy das Edge Functions;
- abertura de `/admin/notificacoes` em rodada anterior da mesma frente;
- execucao manual de aniversarios/memorias em ambiente sem candidatos no dia.

## Pendente

- Ativar `pg_cron` com segredo armazenado fora do repositorio;
- configurar secrets reais do Resend no projeto remoto;
- confirmar recebimento real de email no admin QA;
- executar QA manual completo com usuario comum;
- limpar notificacoes/logs de teste somente apos confirmacao.

## Bugs conhecidos ou riscos

- O painel nao consegue verificar secrets do provider pelo frontend; a validacao real depende do teste controlado.
- Se `RESEND_API_KEY` ou `NOTIFICATION_EMAIL_FROM` estiverem ausentes, email retorna `not_configured`.
- Push e WhatsApp seguem sem provider real.

## Proximas frentes recomendadas

- Ativacao segura do cron diario.
- QA manual completo com massa controlada.
- Politica de limpeza/retencao de logs.
- Provider push/WhatsApp apenas quando houver requisito e opt-in claro.
