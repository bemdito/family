# Notificacoes

## Status 7.1

Pronto:

- Central do usuario em `/notificacoes`;
- painel admin em `/admin/notificacoes`;
- notificacoes internas;
- preferencias por categoria e canal;
- logs em `notification_dispatch_logs`;
- deduplicacao de recorrencias em `notification_occurrences`;
- rotina manual de aniversarios e memorias;
- Edge Function `run-daily-notifications` preparada e deployada;
- Edge Function `send-notification-email` com provider Resend e teste controlado admin.

Futuro:

- push real;
- WhatsApp real;
- fila/retry avancado;
- cron automatico ativado por migration.

## Arquitetura

Services principais:

- `notificationDispatchService.ts`: orquestra canais, preferencias e logs;
- `notificationRecipientsService.ts`: resolve admins e usuarios vinculados;
- `notificationTriggersService.ts`: integra gatilhos event-driven;
- `notificationScheduledService.ts`: rotina manual de aniversarios/memorias;
- `notificationAdminService.ts`: diagnostico admin;
- `userEngagementService.ts`: preferencias e lista do usuario.

Tabelas principais:

- `notificacoes_usuario`;
- `preferencias_notificacao`;
- `notification_dispatch_logs`;
- `notification_occurrences`;
- `user_person_links`;
- `profiles`.

RPCs existentes:

- `create_internal_notification_for_user`;
- `insert_notification_dispatch_log_for_user`;
- `list_admin_user_ids`.

## Canais

Ativos:

- `interna`;
- `email`, quando `send-notification-email` esta deployada e os secrets do provider estao configurados.

Futuros:

- `push`;
- `whatsapp`.

Push e WhatsApp devem permanecer como `not_configured`/ignorado ate haver provider real.

## Preferencias

Preferencias gerais:

- `receber_aniversarios`;
- `receber_datas_memoria`;
- `receber_eventos`;
- `receber_avisos_gerais`;
- `receber_email`;
- `receber_push`;
- `receber_whatsapp`.

Preferencias especificas de email:

- `receber_email_novo_usuario`;
- `receber_email_datas_especiais`;
- `receber_email_novas_mensagens_forum`;
- `receber_email_novos_registros_historicos`;
- `receber_email_evento_historico_familia`.

## Rotina manual

A rotina manual fica em `/admin/notificacoes`, no card "Rotinas manuais".

O botao "Verificar aniversarios e memorias de hoje" chama `runDailyNotificationChecks`. A rotina usa apenas o canal interno, respeita preferencias e deduplica por `notification_occurrences.occurrence_key`.

Padrao de chave:

```txt
aniversario:YYYY-MM-DD:userId:pessoaId
memoria_falecimento:YYYY-MM-DD:userId:pessoaId
```

## Edge Function diaria

Function: `run-daily-notifications`

Arquivo:

```txt
supabase/functions/run-daily-notifications/index.ts
```

Aceita `POST` com body opcional:

```json
{
  "referenceDate": "2026-05-15"
}
```

Se `referenceDate` nao for enviado, a data atual em `America/Sao_Paulo` e usada.

Resposta esperada:

```json
{
  "ok": true,
  "referenceDate": "2026-05-15",
  "birthdaysFound": 0,
  "memorialsFound": 0,
  "notificationsCreated": 0,
  "duplicatesSkipped": 0,
  "preferenceSkipped": 0,
  "noRecipientSkipped": 0,
  "failed": 0
}
```

Seguranca:

- usa `SUPABASE_SERVICE_ROLE_KEY` somente dentro da Edge Function;
- aceita `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` ou `x-daily-notifications-secret`;
- nao envia email/push/WhatsApp.

## Agendamento

Status atual: preparado, nao ativado por migration.

Motivo: para chamar a Edge Function via `pg_cron` com seguranca, o segredo precisa estar no ambiente/secret manager do projeto, nao hardcoded em migration.

Horario planejado:

- 08:00 `America/Sao_Paulo`;
- 11:00 UTC.

Exemplo conceitual para adaptar no Supabase SQL Editor depois de configurar segredo seguro:

```sql
select cron.schedule(
  'run-daily-notifications-0800-brt',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/run-daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-daily-notifications-secret', '<secret-configurado-fora-do-repo>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## E-mail real

Provider escolhido: Resend.

Function:

```txt
supabase/functions/send-notification-email/index.ts
```

Secrets necessarios:

```bash
supabase secrets set RESEND_API_KEY="..."
supabase secrets set NOTIFICATION_EMAIL_FROM="Arvore Familia <notificacoes@seudominio.com>"
supabase secrets set NOTIFICATION_EMAIL_REPLY_TO="contato@seudominio.com"
supabase secrets set SITE_URL="https://seudominio.com"
```

Deploy:

```bash
supabase functions deploy send-notification-email
```

Seguranca:

- secrets ficam apenas no Supabase;
- o frontend nunca recebe `RESEND_API_KEY`;
- usuario comum so pode acionar e-mail para si mesmo;
- admin pode executar teste controlado para o proprio usuario pelo painel;
- falha de email nao desfaz notificacao interna.

Status possiveis:

- `sent`;
- `failed`;
- `not_configured`;
- `missing_destination`;
- `disabled_by_preferences`.

Para desativar temporariamente envio real, remova/desative `RESEND_API_KEY` ou `NOTIFICATION_EMAIL_FROM` nos secrets. A function retorna `not_configured`.

## Testes

Admin:

1. Login admin.
2. Abrir `/admin/notificacoes`.
3. Verificar cards, logs e diagnosticos.
4. Clicar em "Teste interno".
5. Clicar em "Verificar aniversarios e memorias de hoje".
6. Para e-mail, clicar em "Enviar e-mail de teste para mim" e confirmar.

Usuario comum:

1. Login usuario comum.
2. Abrir `/notificacoes`.
3. Alterar preferencias.
4. Marcar notificacao como lida.
5. Marcar todas como lidas.
6. Remover notificacao.

## Consultas SQL

```sql
select id, user_id, titulo, mensagem, tipo, canal, lida, metadata, created_at
from public.notificacoes_usuario
order by created_at desc
limit 50;

select id, notification_id, user_id, tipo, canal, status, provider, error_message, metadata, created_at
from public.notification_dispatch_logs
order by created_at desc
limit 50;

select id, occurrence_key, tipo, user_id, entity_type, entity_id, occurrence_date, status, metadata, created_at
from public.notification_occurrences
order by created_at desc
limit 50;

select id, user_id, receber_aniversarios, receber_datas_memoria, receber_eventos, receber_avisos_gerais, receber_email, receber_push, receber_whatsapp, updated_at
from public.preferencias_notificacao
order by updated_at desc nulls last
limit 50;
```

## Cuidados

- Nao commitar service role key, Resend API key ou secrets.
- Nao usar testes de email para todos os usuarios.
- Nao salvar metadata com telefone, endereco, email completo, token, base64 ou URL completa de arquivo.
- Nao apagar logs de producao sem confirmacao explicita.
