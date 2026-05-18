# Plano de retomada dos testes e próximas implementações

## Objetivo deste documento

Este documento organiza a retomada dos trabalhos após as implementações realizadas em 13/05 e nas rodadas posteriores, com foco em:

- validar manualmente as funcionalidades recém-implementadas;
- registrar bugs e observações;
- priorizar correções;
- mapear próximas implementações;
- indicar arquivos prováveis relacionados a cada frente;
- manter uma ordem racional para desenvolvimento;
- evitar regressões em fluxos já estabilizados;
- registrar o que já foi implementado e o que ainda está pendente.

---

# 1. Preparação inicial

Antes de iniciar novos ajustes, revisar os documentos já criados:

```txt
docs/GUIA_IMPLEMENTACOES.md
docs/GUIA_CORRECAO_ERROS.md
```

## Checklist técnico inicial

Executar no terminal:

```bash
git status
npm run build
git diff --check
```

Observação operacional: antes de qualquer `supabase db push`, revisar `supabase migration list` e confirmar se há migration local realmente pendente. Em 09/05 houve caso em que o schema remoto já refletia os efeitos e o caminho correto foi `supabase migration repair --status applied`, não push.

## Resultado esperado

- `git status` sem alterações pendentes, salvo se houver novos registros de teste.
- `npm run build` passando.
- `git diff --check` sem erros.
- migrations pendentes identificadas e aprovadas antes de qualquer aplicação remota.

## Se algo falhar

- Se o build falhar: corrigir antes de qualquer teste manual.
- Se houver migration pendente: aplicar antes dos testes.
- Se houver diff inesperado: revisar antes de começar nova implementação.
- Se houver Edge Function pendente de deploy: validar antes de testar fluxo dependente.
- Se houver alteração em RLS: testar admin e usuário comum antes de prosseguir.
- Se houver secrets pendentes para Edge Functions: configurar antes de validar fluxos dependentes.
- Se houver notificações ou registros reais criados em QA: documentar os IDs antes de limpar.

---

# 2. Ambiente dos testes manuais

## Dados do ambiente

Preencher antes de iniciar os testes:

```md
## Ambiente

- Data:
- Branch:
- Commit atual:
- Supabase remoto aplicado: sim/não
- URL local:
- Navegador:
- Usuário admin:
- Usuário comum:
- Observações:
```

## Comandos úteis

```bash
git log --oneline -5
git status
npm run build
git diff --check
supabase db push
```

Para frentes de schema, rodar também:

```bash
supabase migration list
```

## Comandos úteis para Edge Functions

Quando a frente testada envolver Edge Functions:

```bash
supabase functions list
supabase functions deploy send-notification-email
supabase functions deploy run-daily-notifications
```

## Consultas SQL úteis

### Últimos logs de atividade

```sql
select action, actor_user_id, entity_type, entity_id, entity_label, metadata, created_at
from public.activity_logs
order by created_at desc
limit 30;
```

### Solicitações de vínculos

```sql
select *
from public.relationship_change_requests
order by created_at desc
limit 30;
```

### Arquivos históricos de relacionamento

```sql
select id, pessoa_id, relacionamento_id, titulo, url, created_at
from public.arquivos_historicos
where relacionamento_id is not null
order by created_at desc
limit 20;
```

### Arquivos históricos em base64 legado

```sql
select id, pessoa_id, relacionamento_id, titulo, created_at
from public.arquivos_historicos
where url ilike 'data:%'
order by created_at desc
limit 20;
```

### Eventos pessoais

```sql
select id, pessoa_id, tipo, titulo, data_evento, local, ordem, created_at
from public.person_events
order by created_at desc
limit 30;
```

### Logs de dispatch de notificações

```sql
select id, notification_id, user_id, tipo, canal, status, provider, error_message, metadata, created_at
from public.notification_dispatch_logs
order by created_at desc
limit 30;
```

### Ocorrências de notificações recorrentes

```sql
select id, occurrence_key, tipo, user_id, entity_type, entity_id, occurrence_date, status, metadata, created_at
from public.notification_occurrences
order by created_at desc
limit 30;
```

### Notificações recentes

```sql
select id, user_id, titulo, mensagem, tipo, canal, lida, metadata, created_at
from public.notificacoes_usuario
order by created_at desc
limit 30;
```

### Preferências de notificação

```sql
select id, user_id, receber_aniversarios, receber_datas_memoria, receber_eventos, receber_avisos_gerais, receber_email, receber_push, receber_whatsapp, updated_at
from public.preferencias_notificacao
order by updated_at desc nulls last
limit 30;
```

### Registros de pessoa falecida e locais no exterior

```sql
select id, nome_completo, falecido, data_falecimento, local_falecimento, local_nascimento, local_nascimento_exterior, local_falecimento_exterior
from public.pessoas
order by updated_at desc nulls last
limit 30;
```

### Validação de coluna legada de arquivos históricos

Executar no Supabase SQL Editor antes de qualquer remoção futura de coluna:

```sql
select count(*) as pessoas_com_json_legado
from public.pessoas
where arquivos_historicos is not null
  and arquivos_historicos::text not in ('[]', 'null');
```

### Auditoria rápida de RLS e policies

```sql
select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

---

# 3. Ordem racional dos testes manuais

A ordem abaixo evita testar uma funcionalidade dependente antes de confirmar suas bases.

---

## 3.1 Login e permissões

### Objetivo

Confirmar que admin e usuário comum têm acessos distintos.

### Checklist

- [ ] Login com usuário admin.
- [ ] Login com usuário comum.
- [ ] Header mostra “Painel administrativo” apenas para admin.
- [ ] Usuário comum não acessa `/admin`.
- [ ] Usuário comum não acessa `/admin/atividades`.
- [ ] Usuário comum não acessa `/admin/integridade`.
- [ ] Usuário comum não acessa `/admin/solicitacoes-vinculos`.
- [ ] Usuário comum não acessa `/admin/notificacoes`.

### Arquivos prováveis

```txt
src/app/pages/Home.tsx
src/app/components/ProtectedRoute.tsx
src/app/services/permissionService.ts
src/app/routes.tsx
```

---

## 3.2 Formulários de pessoa e rascunhos

### Objetivo

Confirmar que os formulários de pessoa não perdem dados e que criação/edição usam fluxos consistentes.

### Checklist admin

- [ ] Abrir `/admin/pessoas/nova`.
- [ ] Preencher dados básicos.
- [ ] Preencher datas e locais.
- [ ] Marcar pessoa falecida sem data/local de falecimento.
- [ ] Preencher local de nascimento brasileiro no formato `Cidade/UF`.
- [ ] Marcar local no exterior e preencher `Cidade (País)`.
- [ ] Adicionar rede social com o editor padronizado.
- [ ] Adicionar evento pessoal.
- [ ] Adicionar arquivo histórico.
- [ ] Visualizar arquivo histórico sem perder dados.
- [ ] Adicionar relacionamento pendente.
- [ ] Adicionar cônjuge pendente com dados de casamento.
- [ ] Sair da página e cancelar alerta de navegação.
- [ ] Confirmar que os dados continuam no formulário.
- [ ] Recarregar página e confirmar rascunho, quando aplicável.
- [ ] Salvar.
- [ ] Confirmar que rascunho foi removido após salvar.

### Checklist edição

- [ ] Abrir `/admin/pessoas/:id/editar`.
- [ ] Confirmar que todos os campos carregam.
- [ ] Editar bio, contato, redes sociais, local exterior, pessoa falecida e eventos.
- [ ] Visualizar arquivo histórico.
- [ ] Confirmar que alterações locais não foram apagadas.
- [ ] Salvar.
- [ ] Reabrir e confirmar persistência.

### Pontos específicos a observar

- [ ] O fluxo de adicionar relacionamento não usa modal de confirmação indevido.
- [ ] O seletor de relacionamento não trava a página.
- [ ] Relacionamentos pendentes só são persistidos ao clicar no botão principal de salvar.
- [ ] O rascunho preserva `socialProfiles`.
- [ ] O rascunho preserva eventos pessoais.
- [ ] O rascunho preserva dados conjugais pendentes.
- [ ] O preview de arquivos históricos não dispara submit do formulário.
- [ ] Botões internos usam `type="button"` quando não devem submeter o formulário.

### Arquivos prováveis

```txt
src/app/pages/admin/AdminPessoaForm.tsx
src/app/components/person/PersonFormSection.tsx
src/app/components/person/PersonBasicInfoFields.tsx
src/app/components/person/PersonDatesLocationsFields.tsx
src/app/components/person/PersonBioFields.tsx
src/app/components/person/PersonContactFields.tsx
src/app/components/person/PersonPrivacyFields.tsx
src/app/components/person/SocialProfilesEditor.tsx
src/app/components/person/PersonEventsEditor.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/components/ArquivosHistoricos.tsx
src/app/utils/personFields.ts
src/app/utils/searchText.ts
src/app/services/personEventsService.ts
src/app/services/dataService.ts
```

---

## 3.3 Minha Árvore

### Objetivo

Confirmar que a árvore pessoal continua funcionando e que usuários comuns não alteram vínculos reais diretamente.

### Checklist

- [ ] Abrir Minha Árvore como usuário comum.
- [ ] Confirmar carregamento correto da árvore.
- [ ] Tentar solicitar novo vínculo.
- [ ] Tentar solicitar remoção de vínculo.
- [ ] Tentar solicitar correção conjugal.
- [ ] Confirmar que a árvore real não muda imediatamente.
- [ ] Confirmar que a solicitação aparece em `relationship_change_requests`.
- [ ] Confirmar que logs são registrados em `activity_logs`.
- [ ] Confirmar que busca por pessoa ignora acentuação.
- [ ] Confirmar que usuário comum não consegue alterar relação real diretamente.

### Arquivos prováveis

```txt
src/app/pages/MinhaArvore.tsx
src/app/services/relationshipChangeRequestService.ts
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/components/FamilyTree/modals/AddConnectionModal.tsx
src/app/utils/searchText.ts
```

---

## 3.4 Genealogia

### Objetivo

Confirmar que a view Genealogia mostra o escopo pessoal em layout por gerações.

### Checklist

- [ ] Abrir view Genealogia.
- [ ] Confirmar que usa escopo pessoal, não a base completa.
- [ ] Confirmar colunas por geração.
- [ ] Confirmar que os conectores pais-filhos aparecem.
- [ ] Confirmar que não há linhas diagonais.
- [ ] Confirmar que conectores não ficam soltos após filtros.
- [ ] Confirmar que cônjuges aparecem abaixo/acima conforme layout definido.
- [ ] Confirmar que anéis de casamento aparecem entre cônjuges.
- [ ] Confirmar que pessoa falecida é tratada corretamente.
- [ ] Confirmar que status conjugal considera viuvez quando aplicável.

### Arquivos prováveis

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/filterPersonalTreeScope.ts
src/app/components/FamilyTree/utils/personCardText.ts
src/app/utils/personFields.ts
src/app/pages/Home.tsx
```

---

## 3.5 Visão Completa

### Objetivo

Confirmar que a view Visão Completa mostra todas as pessoas cadastradas usando o layout de Genealogia.

### Checklist

- [ ] Abrir view Visão Completa.
- [ ] Confirmar que mostra a base completa.
- [ ] Confirmar que não está limitada ao escopo pessoal.
- [ ] Confirmar conectores pais-filhos.
- [ ] Confirmar anéis entre cônjuges.
- [ ] Confirmar filtros funcionando.
- [ ] Confirmar busca sem diferenciar acentuação.
- [ ] Confirmar que filtros não deixam conectores/anéis soltos.

### Arquivos prováveis

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/ViewModeToggle.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/pages/Home.tsx
src/app/utils/searchText.ts
```

---

## 3.6 Modal do anel 💍

### Objetivo

Confirmar que o modal conjugal abre corretamente ao clicar no anel entre cônjuges.

### Checklist como admin

- [ ] Abrir Genealogia.
- [ ] Clicar no emoji 💍.
- [ ] Confirmar que o modal abre.
- [ ] Confirmar que mostra os dois cônjuges corretos.
- [ ] Confirmar que mostra status conjugal.
- [ ] Confirmar que mostra tipo/subtipo.
- [ ] Confirmar que mostra data/local de casamento, quando houver.
- [ ] Confirmar que mostra data/local de separação, quando houver.
- [ ] Confirmar que observações aparecem para admin.
- [ ] Confirmar que arquivos históricos do relacionamento aparecem.
- [ ] Adicionar arquivo histórico de relacionamento.
- [ ] Salvar.
- [ ] Confirmar que `relacionamento_id` foi salvo em `arquivos_historicos`.
- [ ] Confirmar que `pessoa_id` ficou nulo em arquivo de relacionamento.
- [ ] Confirmar que URL salva é Storage, não base64.
- [ ] Confirmar `historical_file.added` em `activity_logs`.
- [ ] Confirmar notificação interna de novo registro histórico, se houver destinatário relevante.
- [ ] Confirmar log em `notification_dispatch_logs`, se notificação for disparada.

### Checklist como usuário comum

- [ ] Abrir Genealogia ou Visão Completa.
- [ ] Clicar no emoji 💍.
- [ ] Confirmar que o modal abre.
- [ ] Confirmar que consegue visualizar dados permitidos.
- [ ] Confirmar que observações internas não aparecem.
- [ ] Confirmar que não há botões de adicionar, editar, remover ou salvar arquivos.
- [ ] Confirmar que não consegue alterar relacionamento real.

### Arquivos prováveis

```txt
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/components/ArquivosHistoricos.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
src/app/services/notificationTriggersService.ts
src/app/pages/Home.tsx
```

---

## 3.7 Upload de arquivo histórico de relacionamento

### Objetivo

Confirmar que arquivos históricos ligados a relacionamentos são salvos corretamente.

### Checklist

- [ ] Adicionar arquivo pelo modal conjugal como admin.
- [ ] Confirmar que o arquivo aparece no modal após salvar.
- [ ] Confirmar que a URL salva aponta para `historical-files`.
- [ ] Confirmar que `relacionamento_id` está preenchido.
- [ ] Confirmar que `pessoa_id` não foi usado indevidamente.
- [ ] Confirmar log `historical_file.added`.
- [ ] Confirmar notificação interna de novo registro histórico, se houver destinatário.
- [ ] Confirmar dispatch log da notificação, se houver.
- [ ] Testar edição de título/descrição/ano.
- [ ] Testar preview de imagem.
- [ ] Testar preview de PDF.
- [ ] Testar download explícito.
- [ ] Testar abrir em nova aba.
- [ ] Testar remoção do registro.
- [ ] Confirmar logs `historical_file.updated` e `historical_file.removed`, quando aplicável.

### SQL de validação

```sql
select id, pessoa_id, relacionamento_id, titulo, url, created_at
from public.arquivos_historicos
where relacionamento_id is not null
order by created_at desc
limit 20;
```

```sql
select id, notification_id, user_id, tipo, canal, status, provider, error_message, metadata, created_at
from public.notification_dispatch_logs
order by created_at desc
limit 20;
```

### Arquivos prováveis

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
src/app/services/notificationTriggersService.ts
src/app/services/notificationDispatchService.ts
supabase/migrations/20260514120000_add_relationship_historical_files.sql
```

---

## 3.8 Solicitações de vínculos

### Objetivo

Confirmar que usuários comuns criam solicitações e admins revisam.

### Checklist usuário comum

- [ ] Solicitar criação de vínculo.
- [ ] Solicitar remoção de vínculo.
- [ ] Solicitar correção de vínculo conjugal.
- [ ] Preencher dados conjugais em cônjuge, quando aplicável.
- [ ] Confirmar toast ou feedback de envio.
- [ ] Confirmar que relacionamento real não muda imediatamente.
- [ ] Confirmar registro em `relationship_change_requests`.
- [ ] Confirmar log `relationship_change_requested`.

### Checklist admin

- [ ] Acessar `/admin/solicitacoes-vinculos`.
- [ ] Ver solicitações pendentes.
- [ ] Abrir detalhes.
- [ ] Aprovar solicitação.
- [ ] Confirmar que relacionamento real foi alterado.
- [ ] Confirmar log `relationship_change_approved`.
- [ ] Rejeitar outra solicitação.
- [ ] Confirmar que relacionamento real não foi alterado.
- [ ] Confirmar log `relationship_change_rejected`.

### Arquivos prováveis

```txt
src/app/services/relationshipChangeRequestService.ts
src/app/pages/admin/AdminSolicitacoesVinculos.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/MeusVinculos.tsx
src/app/components/FamilyTree/modals/AddConnectionModal.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/routes.tsx
supabase/migrations/20260513173000_create_relationship_change_requests.sql
```

---

## 3.9 Histórico de atividades

### Objetivo

Confirmar que ações relevantes estão sendo registradas.

### Checklist

- [ ] Acessar `/admin/atividades`.
- [ ] Confirmar lista de logs.
- [ ] Filtrar por tipo de ação.
- [ ] Filtrar por entidade.
- [ ] Confirmar logs de perfil.
- [ ] Confirmar logs de foto.
- [ ] Confirmar logs de privacidade.
- [ ] Confirmar logs de notificações.
- [ ] Confirmar logs de arquivos históricos.
- [ ] Confirmar logs de eventos pessoais.
- [ ] Confirmar logs de solicitações de vínculo.
- [ ] Confirmar que metadata não contém URL completa, base64, telefone, endereço ou e-mail.
- [ ] Confirmar que logs de notification dispatch ficam no painel de notificações, não necessariamente em activity logs.

### Arquivos prováveis

```txt
src/app/pages/admin/AdminAtividades.tsx
src/app/services/activityLogService.ts
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/personEventsService.ts
src/app/services/userEngagementService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/services/notificationDispatchService.ts
src/app/types/index.ts
supabase/migrations/20260513143000_create_activity_logs.sql
```

---

## 3.10 Tela de integridade

### Objetivo

Confirmar que a tela `/admin/integridade` apresenta diagnóstico real sem alterar dados.

### Checklist

- [ ] Acessar `/admin/integridade` como admin.
- [ ] Confirmar cards de resumo.
- [ ] Confirmar diagnóstico de pessoas.
- [ ] Confirmar diagnóstico de relacionamentos.
- [ ] Confirmar diagnóstico de arquivos históricos.
- [ ] Confirmar diagnóstico de Storage.
- [ ] Confirmar diagnóstico de usuários/vínculos.
- [ ] Confirmar diagnóstico de activity logs.
- [ ] Confirmar diagnóstico de solicitações de vínculos.
- [ ] Confirmar botão “Atualizar diagnóstico”.
- [ ] Confirmar links para telas relacionadas.
- [ ] Confirmar que a tela não altera dados.
- [ ] Tentar acessar como usuário comum e confirmar bloqueio.

### Arquivos prováveis

```txt
src/app/pages/admin/AdminIntegridade.tsx
src/app/routes.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/lib/supabaseClient.ts
```

---

## 3.11 Notificações

### Objetivo

Confirmar que notificações internas, preferências, logs e rotinas manuais funcionam corretamente.

### Checklist usuário comum

- [ ] Acessar `/notificacoes`.
- [ ] Confirmar lista de notificações.
- [ ] Confirmar estado vazio, se não houver notificações.
- [ ] Marcar notificação como lida.
- [ ] Marcar todas como lidas.
- [ ] Remover notificação.
- [ ] Alterar preferências.
- [ ] Recarregar a página e confirmar persistência.
- [ ] Confirmar que usuário comum não acessa `/admin/notificacoes`.

### Checklist admin

- [ ] Acessar `/admin/notificacoes`.
- [ ] Confirmar cards de resumo.
- [ ] Confirmar notificações recentes.
- [ ] Confirmar preferências recentes.
- [ ] Confirmar diagnóstico de e-mail.
- [ ] Confirmar logs de dispatch.
- [ ] Usar botão “Teste interno”.
- [ ] Confirmar que teste interno cria notificação interna para o admin.
- [ ] Confirmar que teste interno não envia e-mail real.
- [ ] Rodar rotina manual de aniversários/memórias.
- [ ] Confirmar resumo da rotina.
- [ ] Rodar rotina manual novamente.
- [ ] Confirmar que não duplica notificações.
- [ ] Confirmar registros em `notification_occurrences`.
- [ ] Confirmar logs em `notification_dispatch_logs`.

### Gatilhos a testar

- [ ] Novo arquivo histórico de pessoa.
- [ ] Novo arquivo histórico de relacionamento.
- [ ] Novo vínculo/primeiro acesso confirmado.
- [ ] Nova resposta no fórum.
- [ ] Novo comentário no fórum.
- [ ] Aniversário do dia.
- [ ] Data de memória/falecimento do dia.

### Arquivos prováveis

```txt
src/app/pages/Notificacoes.tsx
src/app/pages/admin/AdminNotificacoes.tsx
src/app/services/userEngagementService.ts
src/app/services/notificationAdminService.ts
src/app/services/notificationDispatchService.ts
src/app/services/notificationRecipientsService.ts
src/app/services/notificationTriggersService.ts
src/app/services/notificationScheduledService.ts
src/app/utils/notificationDateRules.ts
src/app/services/activityLogService.ts
src/app/types/index.ts
supabase/functions/send-notification-email
supabase/functions/run-daily-notifications
supabase/migrations
```

---

# 4. Registro de bugs encontrados

## Modelo de bug

```md
## Bug X - Título curto

- Status:
- Prioridade:
- Área:
- Página/rota:
- Usuário:
- Ambiente:
- Commit:
- Data:
- Passos para reproduzir:
  1.
  2.
  3.
- Resultado esperado:
- Resultado atual:
- Evidências:
  - print:
  - console:
  - SQL:
- Arquivos prováveis:
- Hipótese inicial:
- Correção sugerida:
- Teste após correção:
```

## Níveis de prioridade

### P0 - Bloqueador

- Impede login.
- Impede acesso à árvore.
- Quebra build.
- Permite usuário comum acessar admin ou alterar dados restritos.
- Causa perda de dados.
- Expõe secrets, tokens ou service role no frontend.
- Dispara e-mails reais em massa sem confirmação.

### P1 - Alto

- Fluxo principal falha.
- Solicitação de vínculo não registra.
- Histórico não registra.
- Upload falha.
- Modal conjugal não abre.
- Admin não consegue aprovar/rejeitar solicitação.
- Notificação interna não é criada por gatilho principal.
- Rotina de aniversários/memórias duplica notificações.
- RLS permite escrita indevida.

### P2 - Médio

- Problema visual relevante.
- Diagnóstico incorreto.
- Filtro não funciona.
- Status visual inconsistente.
- Toast/feedback confuso.
- Notificação aparece sem link quando deveria ter.
- Logs de dispatch incompletos.
- Preview/download de arquivo histórico falha em algum formato.

### P3 - Baixo

- Texto.
- Ajuste fino de layout.
- Pequeno ruído em log.
- Melhorias de usabilidade.
- Documentação incompleta.

---

# 5. Pendências conhecidas

## Pendências de validação

- [ ] Testar manualmente o modal do anel com admin e usuário comum.
- [ ] Testar upload de arquivo histórico de relacionamento.
- [ ] Confirmar `relacionamento_id` em `arquivos_historicos`.
- [ ] Confirmar que usuário comum não consegue adicionar arquivo histórico de relacionamento.
- [ ] Confirmar que observações conjugais aparecem apenas para admin.
- [ ] Confirmar que `/admin/integridade` não altera dados.
- [ ] Confirmar que `/admin/solicitacoes-vinculos` aprova/rejeita corretamente.
- [ ] Confirmar que `/admin/atividades` lista logs recentes corretamente.
- [ ] Testar preview real de imagem histórica.
- [ ] Testar preview real de PDF histórico.
- [ ] Testar download explícito de arquivo histórico.
- [ ] Testar notificação por upload histórico via UI.
- [ ] Testar notificação por fórum via UI.
- [ ] Testar notificação por novo vínculo/primeiro acesso.
- [ ] Testar aniversários/memórias com pessoa de data correspondente ao dia.
- [ ] Confirmar deduplicação real em `notification_occurrences`.
- [ ] Confirmar que metadata de logs não contém dados sensíveis.
- [ ] Testar fórum: categorias, tópicos, respostas, comentários, reações, solução e moderação.
- [ ] Testar Google Calendar: status da conexão, OAuth, sincronização e proteção de tokens.
- [ ] Confirmar visualmente se `total_arquivos_relacionais = 0`, quando observado no remoto, é esperado para o ambiente.
- [ ] Confirmar no Supabase SQL Editor se `public.pessoas.arquivos_historicos` não tem dados úteis antes de qualquer remoção futura.

## Pendências técnicas

- [ ] Verificar se upload abandonado no modal deixa objeto órfão no Storage.
- [ ] Criar controle para evitar uploads órfãos no Storage.
- [ ] Refinar `/admin/integridade` com filtros por severidade.
- [ ] Remover campo técnico `lado` dos `changed_fields` do histórico.
- [x] Implementar lazy loading/code splitting básico das rotas.
- [x] Adicionar Playwright E2E básico.
- [x] Integrar gradualmente `public.pessoa_social_profiles`, mantendo fallback nos campos legados de `pessoas`.
- [x] Criar scripts dry-run para diagnóstico de órfãos no Storage e migração de base64 legado.
- [ ] Avaliar upload por evento pessoal.
- [ ] Avaliar privacidade por evento pessoal.
- [ ] Avaliar exportação PDF de eventos/timeline.
- [ ] Confirmar ou implementar Edge Function/agendamento diário `run-daily-notifications`.
- [ ] Confirmar ou implementar envio real de e-mail por `send-notification-email`.
- [ ] Documentar arquitetura de notificações em arquivo próprio.
- [ ] Criar QA final da frente de notificações.
- [ ] Push real e WhatsApp real seguem como futuras implementações.
- [ ] Atualizar `MIGRATION-GUIDE.md` com fluxo de dump, `migration list`, repair e validação antes de push.
- [ ] Decidir se `public.pessoas_com_estatisticas` será removida ou documentada como legado remoto.
- [ ] Decidir se `public.imagens_pessoa` será aposentada das migrations futuras ou mantida como histórico antigo.
- [ ] Arquivar ou revisar scripts SQL legados, como `supabase/forum-schema.sql` e `supabase/google-calendar-schema.sql`.
- [x] Criar migration local idempotente para `public.person_generated_insights`.
- [x] Remover geração automática de insights em `PersonDataView.tsx`.
- [x] Criar geração/regeneração controlada por admin para astrologia e acontecimentos do nascimento.
- [x] Registrar logs seguros para geração/regeneração de insights.
- [x] Executar QA final da frente 7.2.

## Pendências de produto

- [ ] Definir e implementar upload de arquivos históricos de casamento por usuário comum.

## Pendências operacionais

- [x] Migration local de `public.person_generated_insights` criada e histórico remoto alinhado por `supabase migration repair --status applied 20260518174542`.
- [ ] Rodar dry-run dos scripts administrativos em ambiente protegido:
  - `node scripts/storage-diagnose-orphans.mjs --output=/tmp/storage-orphans.json`;
  - `node scripts/migrate-legacy-base64-files.mjs --output=/tmp/base64-migration.json`.

---

# 6. Ordem recomendada para correções imediatas

## 6.1 Primeiro: bugs bloqueadores

Corrigir antes de novas funcionalidades:

1. Login admin/usuário comum.
2. Proteção de rotas admin.
3. Build quebrado.
4. RLS permitindo escrita indevida.
5. Perda ou corrupção de dados.
6. Solicitações de vínculo alterando relacionamento real antes de aprovação.
7. Exposição de secrets ou service role.
8. Envio real de e-mail sem confirmação/configuração adequada.
9. Rotina recorrente duplicando notificações.

## 6.2 Segundo: fluxos principais

1. Modal do anel 💍.
2. Upload de arquivo histórico de relacionamento.
3. Solicitações de vínculo.
4. Histórico de atividades.
5. Tela de integridade.
6. Formulários de pessoa e rascunhos.
7. Eventos pessoais.
8. Central de notificações.
9. Rotina de aniversários/memórias.

## 6.3 Terceiro: melhorias técnicas

1. Uploads órfãos.
2. Aplicação remota da migration pendente.
3. Filtros na integridade.
4. Limpeza de metadata.
5. Dry-run administrativo dos scripts de Storage/base64.
6. E-mail real de notificações.
7. Edge Function/cron de notificações.
8. Documentação final das frentes implementadas.

---

# 7. Próximas implementações desejadas

## 7.1 Notificações

### Status

Parcialmente implementado.

### Já implementado ou consolidado

- Página `/notificacoes`.
- Preferências de notificação por usuário.
- Painel admin `/admin/notificacoes`.
- Diagnóstico admin de notificações.
- Logs de dispatch.
- Dispatch central de notificações.
- Canais diferenciados:
  - interna;
  - email;
  - push;
  - WhatsApp.
- Canal interno funcional.
- Push e WhatsApp marcados como `not_configured`/`skipped`.
- Teste interno para admin.
- Gatilhos internos para:
  - novo arquivo histórico;
  - novo vínculo/primeiro acesso;
  - nova resposta no fórum;
  - novo comentário no fórum.
- Rotina manual de aniversários e datas de memória.
- Deduplicação via `notification_occurrences`.

### Ainda pendente ou sem confirmação completa

- Edge Function/agendamento diário `run-daily-notifications`.
- Envio real de e-mail por `send-notification-email`.
- QA final da frente de notificações.
- Documentação final de notificações.
- Teste completo via UI dos gatilhos de arquivo/fórum.
- Teste completo com datas reais de aniversário/memória.
- Limpeza de notificações/logs criados em testes, se desejado.

### Objetivo

Diagnosticar e ajustar o funcionamento das notificações por e-mail e pela área interna de notificações.

### Pontos a verificar

- Notificações de aniversário.
- Datas de memória.
- Eventos.
- Avisos gerais.
- Novo usuário.
- Novos registros históricos.
- Novas mensagens no fórum.
- Evento histórico da família.
- Preferências de notificação por usuário.
- Logs de alteração de preferências.
- Logs de dispatch.
- Deduplicação de notificações recorrentes.
- Segurança de RPCs e Edge Functions.
- Metadata sanitizada.

### Arquivos prováveis

```txt
src/app/pages/Notificacoes.tsx
src/app/pages/admin/AdminNotificacoes.tsx
src/app/services/userEngagementService.ts
src/app/services/notificationAdminService.ts
src/app/services/notificationDispatchService.ts
src/app/services/notificationRecipientsService.ts
src/app/services/notificationTriggersService.ts
src/app/services/notificationScheduledService.ts
src/app/utils/notificationDateRules.ts
src/app/services/activityLogService.ts
src/app/types/index.ts
supabase/functions/send-notification-email
supabase/functions/run-daily-notifications
supabase/migrations
```

### Sugestões

- Finalizar QA da frente de notificações.
- Confirmar ou implementar Edge Function/cron.
- Confirmar ou implementar e-mail real.
- Registrar logs quando notificações forem disparadas.
- Diferenciar claramente notificação interna, e-mail, push e WhatsApp.
- Documentar configuração de secrets para e-mail.
- Documentar como rodar/verificar rotina diária.
- Não ativar e-mail real sem teste controlado.

---

## 7.2 Astrologia e acontecimentos do nascimento

### Status

Concluído no escopo funcional previsto para esta rodada.

A frente 7.2 possui schema rastreado, service, Edge Function, UI de exibição, geração/regeneração admin, logs seguros e QA manual aprovado. O status anterior “parcialmente implementado” foi encerrado após a remoção da geração automática no perfil, reconciliação da migration local/remota, criação do controle admin e validação final.

### Já confirmado

- Existe tabela remota:
  - `public.person_generated_insights`
- A tabela remota tem RLS ativo.
- Há policy de leitura para usuários autenticados:
  - `Authenticated users can read generated insights`
- A tabela remota possui:
  - `id`
  - `pessoa_id`
  - `tipo`
  - `data_nascimento`
  - `conteudo`
  - `modelo`
  - `prompt_version`
  - `status`
  - `error_message`
  - `created_at`
  - `updated_at`
- Constraints confirmadas:
  - `PRIMARY KEY (id)`
  - `FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE`
  - `UNIQUE (pessoa_id, tipo)`
  - `tipo` restrito a `astrology` e `historical_events`
  - `status` restrito a `pending`, `completed` e `error`

### Migration e histórico remoto

- Migration local criada:
  - `supabase/migrations/20260518174542_reconcile_person_generated_insights_schema.sql`
- O schema remoto já existia antes da migration local.
- A migration foi criada de forma idempotente para rastrear o schema no repositório.
- O histórico remoto foi alinhado com:
  - `supabase migration repair --status applied 20260518174542`
- `supabase migration list` foi validado com a migration presente em Local e Remote.
- Não foi usado `supabase db push` para aplicar essa migration porque o schema já existia no remoto.

### Já existe no código

- Service:
  - `src/app/services/personInsightsService.ts`
- Edge Function:
  - `supabase/functions/generate-person-insights/index.ts`
- Configuração da Edge Function:
  - `supabase/config.toml`
- UI de exibição no perfil:
  - `src/app/components/person/PersonDataView.tsx`
- Controle admin de geração/regeneração:
  - `src/app/pages/admin/AdminPessoaForm.tsx`
- Logs seguros:
  - `src/app/services/activityLogService.ts`
  - `src/app/types/index.ts`
- Uso na Home/Curiosidades:
  - `src/app/pages/Home.tsx`

### Tipos implementados

Os tipos efetivamente implementados são:

```txt
astrology
historical_events
```

Não tratar `birth_date_events` ou `historical_context` como tipos implementados nesta versão. Se forem desejados futuramente, devem ser tratados como evolução de schema/código em etapa própria.

### Objetivo

Exibir no perfil da pessoa conteúdos gerados e persistidos sobre:

- astrologia/signo;
- acontecimentos históricos relacionados à data de nascimento.

### Regra consolidada

- O conteúdo é gerado por Edge Function e persistido em `person_generated_insights`.
- O perfil apenas lê e exibe conteúdos existentes.
- O perfil não dispara geração automática de IA ao carregar.
- A geração/regeneração é ação explícita de admin.
- A chamada de IA permanece em Edge Function, sem expor chave no frontend.
- Usuário comum não consegue disparar geração ou regeneração.
- Conteúdo ausente aparece como estado vazio/informativo, não como gatilho automático.
- Regeneração usa `force=true` apenas no fluxo admin explícito.

### Logs seguros

- Ações registradas:
  - `person_insights.generated`
  - `person_insights.regenerated`
- Entity type:
  - `person`
- Metadata segura:
  - `tipos`
  - `force`
  - `source`
- Os logs não salvam prompt completo, conteúdo gerado, telefone, e-mail, endereço, URL completa, base64, tokens, secrets, chave OpenAI ou service role.

### Arquivos prováveis

```txt
src/app/components/person/PersonDataView.tsx
src/app/pages/PersonProfile.tsx
src/app/pages/Home.tsx
src/app/pages/admin/AdminPessoaForm.tsx
src/app/services/personInsightsService.ts
src/app/services/activityLogService.ts
src/app/types/index.ts
src/app/lib/supabaseClient.ts
supabase/functions/generate-person-insights/index.ts
supabase/config.toml
supabase/migrations/20260518174542_reconcile_person_generated_insights_schema.sql
```

### Secrets envolvidos

A Edge Function depende de secrets/configurações server-side:

```txt
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Esses valores não devem aparecer no frontend, nos logs públicos, em commits ou em documentação com valores reais.

### QA aprovado da 7.2

- [x] Pessoa humana com data de nascimento completa e insights existentes exibe os cards corretamente.
- [x] Pessoa humana com data de nascimento completa e sem insights não dispara geração automática no perfil.
- [x] Pessoa sem data de nascimento completa não tenta gerar conteúdo.
- [x] Pessoa marcada como pet não exibe/gatilha insights de nascimento.
- [x] Pessoa com privacidade de data de nascimento desativada não exibe/gatilha insights.
- [x] Usuário comum não consegue gerar/regenerar insights.
- [x] Admin consegue gerar insights por ação explícita.
- [x] Admin consegue regenerar insights por ação explícita.
- [x] Edge Function não expõe secrets no frontend.
- [x] Falha da Edge Function não quebra o perfil.
- [x] Logs de geração/regeneração não contêm prompt completo, telefone, e-mail, URL completa, base64, tokens ou secrets.
- [x] `npm run build` passa.
- [x] `git diff --check` passa.
- [x] `supabase migration list` foi revisado e está alinhado para a migration da 7.2.

### Ordem executada

1. 7.2R1 — Reconciliar migration local de `person_generated_insights`.
2. 7.2R2 — Alinhar histórico remoto com `supabase migration repair --status applied 20260518174542`.
3. 7.2R3 — Remover geração automática no perfil.
4. 7.2R4 — Criar geração/regeneração admin.
5. 7.2R5 — Registrar logs seguros.
6. 7.2R6 — QA final e documentação.

### Backlog futuro

- Revisar prompts/editorial da Edge Function, se necessário.
- Avaliar novos tipos como `birth_date_events` ou `historical_context` apenas em etapa própria.
- Avaliar privacidade mais forte para leitura de insights, se a regra de produto exigir algo além da leitura por usuários autenticados.
- Criar documentação específica da frente caso o módulo cresça.

---

## 7.3 Linha do tempo do usuário

### Status

Implementado funcionalmente.

- 7.3A diagnóstico/modelagem: concluído.
- 7.3B builder `buildPersonTimeline`: implementado.
- 7.3C componente `PersonTimeline` e integração no perfil: implementado.
- 7.3D QA, ajustes e documentação: concluído.
- Documentação detalhada: `docs/TIMELINE.md`.

### Objetivo

Criar uma timeline da pessoa com eventos relevantes.

### Eventos desejados

- Ano/data de nascimento.
- Casamento/união.
- Nascimento dos filhos.
- Datas especiais.
- Divórcio/separação.
- Falecimento.
- Arquivos históricos.
- Eventos históricos da família.
- Eventos pessoais já cadastrados em `person_events`.

### Arquivos prováveis

```txt
src/app/pages/PersonProfile.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/services/dataService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/personEventsService.ts
src/app/types/index.ts
src/app/utils/familyDates.ts
```

### Sugestões

- Componente criado:

```txt
src/app/components/Timeline/PersonTimeline.tsx
```

- Função utilitária criada:

```txt
src/app/utils/buildPersonTimeline.ts
```

- Não criar tabela inicialmente, se a timeline puder ser derivada dos dados existentes.
- Criar persistência apenas para eventos manuais/customizados.
- Usar `person_events` para eventos pessoais já cadastrados.

### Primeira versão implementada

- Timeline derivada automaticamente.
- Eventos ordenados por data.
- Cards simples.
- Sem edição manual.
- Sem nova tabela.
- Sem upload por evento.
- Sem exportação PDF.
- Integrada ao perfil da pessoa em `src/app/pages/PersonProfile.tsx`.
- Usa relacionamentos detalhados da pessoa e arquivos históricos de relacionamentos conjugais quando disponíveis.
- Mantém `PersonEventsList` separado nesta etapa.

### Backlog futuro

- Eventos manuais.
- Uploads por evento.
- Privacidade por evento.
- Exportação em PDF.
- Consolidação visual futura com `PersonEventsList`, se fizer sentido após QA de uso.

Essas evoluções permanecem em backlog e não bloqueiam o status funcional da primeira versão.

### Ordem executada de prompts

1. Diagnóstico e modelagem da timeline derivada — concluído.
2. Utilitário `buildPersonTimeline` — concluído.
3. Componente `PersonTimeline` no perfil — concluído.
4. QA, ajustes visuais e documentação — concluído.

---

## 7.4 Entrar em contato por WhatsApp

### Status

Concluído no escopo visual/frontend.

- 7.4A diagnóstico técnico concluído.
- 7.4B helper/base técnica concluído.
- 7.4C componente visual e integração no perfil concluído.
- 7.4D QA técnico final, revisão Home/ContactInfo e documentação concluídos.
- Privacidade forte em nível de banco/API permanece como possível frente futura, não requisito da primeira versão visual.
- Log de clique `contact.whatsapp_clicked` permanece como melhoria futura opcional, sem telefone, URL `wa.me` ou mensagem em metadata.

### Objetivo

Permitir que usuários entrem em contato com familiares via WhatsApp quando permitido.

### Regras

- Mostrar botão apenas se:
  - telefone existir;
  - `permitir_exibir_telefone` ou `permitir_mensagens_whatsapp` permitir;
  - o usuário estiver autenticado, se essa for a regra desejada.
- Exibir número em texto somente se `permitir_exibir_telefone === true`.
- Permitir contato por WhatsApp com `permitir_mensagens_whatsapp === true` sem expor o número em texto.

### Arquivos prováveis

```txt
src/app/pages/PersonProfile.tsx
src/app/components/PersonDataView.tsx
src/app/components/FamilyTree/PersonNode.tsx
src/app/types/index.ts
src/app/utils/personFields.ts
```

### Sugestões

- Helper criado:

```txt
src/app/utils/whatsapp.ts
```

- Gerar link:

```txt
https://wa.me/55NUMERO
```

- Normalizar telefone antes de gerar link.
- Respeitar privacidade.
- Registrar activity log opcional:
  - `contact.whatsapp_clicked`

### Próximo passo

- Manter como futuras evoluções:
  - privacidade forte de telefone em banco/API via RLS, view ou RPC;
  - log opcional de clique, com metadata segura e sem telefone ou URL `wa.me`;
  - QA manual adicional em navegador para múltiplos perfis reais.

---

## 7.5 Grau de parentesco/vínculo

### Status

7.5B/7.5C criados como base técnica pura e testada.
7.5D integrou a UI existente de cálculo de vínculo ao utilitário puro.
A frente 7.5 ainda não está finalizada porque falta QA manual com admin e usuário comum.

### Objetivo

Estudar e ajustar a funcionalidade de verificar grau de parentesco/vínculo com outros usuários.

### Problema atual

- A funcionalidade não está funcionando corretamente.

### Pontos a investigar

- Se usa grafo de relacionamentos.
- Se considera inversos.
- Se considera cônjuges.
- Se considera irmãos por pais compartilhados.
- Se considera caminhos indiretos.
- Se há limite de profundidade.
- Se há problema com relacionamentos duplicados ou sem inverso.

### Arquivos prováveis

```txt
src/app/services/dataService.ts
src/app/components/FamilyTree/FamilyTree.tsx
src/app/utils
src/app/types/index.ts
```

### Sugestões

- Criar utilitário dedicado:

```txt
src/app/utils/relationshipDegree.ts
```

- Construir grafo normalizado.
- Usar busca em largura.
- Retornar:
  - caminho;
  - grau;
  - descrição textual;
  - confiança.
- Criar testes unitários para casos conhecidos.

### Registro 7.5B

- Criado `src/app/utils/relationshipDegree.ts` como utilitário puro e testável.
- O utilitário recebe pessoas e relacionamentos já carregados em memória.
- Não há chamada direta ao Supabase no utilitário.
- Não há UI nova nesta etapa.
- Não houve migration.
- Não houve alteração de schema.
- Não houve alteração de RLS.
- A implementação parcial existente em `relationshipResolverService.ts` e `RelationshipFinder.tsx` permanece intacta.
- Próxima etapa recomendada: 7.5C com testes unitários do utilitário; depois 7.5D para integração visual.

### Registro 7.5C

- Criados testes unitários para `src/app/utils/relationshipDegree.ts`.
- Adicionado Vitest como dependência de desenvolvimento mínima.
- Adicionado script `npm test` para executar `vitest run`.
- Os testes usam apenas fixtures locais de pessoas e relacionamentos.
- Não há chamada Supabase nos testes.
- Não há UI nova nesta etapa.
- Não houve migration.
- Não houve alteração de schema.
- Não houve alteração de RLS.
- Próxima etapa recomendada: 7.5D com integração visual controlada, avaliando `RelationshipFinder.tsx` e `relationshipResolverService.ts` antes de substituir a lógica legada.

### Registro 7.5D

- Adaptada a UI existente de cálculo de vínculo para usar `src/app/utils/relationshipDegree.ts`.
- `RelationshipFinder.tsx` passou a calcular localmente com `calculateRelationshipDegree`.
- A aba "Qual a minha conexão com alguém?" da Home também passou a usar o utilitário puro.
- O cálculo usa `Pessoa[]` e `Relacionamento[]` já carregados ou obtidos por `dataService` na camada de página/componente.
- Na Home, o cálculo reaproveita `pessoas` e `relacionamentos` já carregados pela árvore, sem consulta duplicada.
- No perfil, o cálculo reaproveita o cache em memória da árvore quando disponível e usa `dataService` como fallback, respeitando o escopo/RLS da tela chamadora.
- Foi adicionada opção explícita para incluir ex-cônjuges/separações no cálculo.
- A UI exibe label, descrição, confiança, distância/grau, caminho legível e avisos amigáveis.
- Não houve migration.
- Não houve alteração de schema.
- Não houve alteração de RLS.
- Não houve alteração de dados reais.
- Não houve integração na árvore/Genealogia.
- Não houve cálculo em massa.
- Não houve cache persistido novo.
- `relationshipResolverService.ts` permanece como legado/parcial e deixou de ser usado no fluxo visual principal adaptado.
- Próxima etapa recomendada: 7.5E com QA manual e refinamento de UX/documentação.

### Registro 7.5E

- Executado QA manual parcial da UI de grau de parentesco/vínculo na Home, na aba "Curiosidades" > "Qual a minha conexão com alguém?", e no componente `RelationshipFinder` do perfil de pessoa.
- O QA foi feito em navegador local com usuário admin e usuário comum, incluindo checagem desktop e mobile básica.
- A Home carregou a seção de conexão sem erro e preservou o escopo de dados já carregado pela árvore.
- O perfil carregou o `RelationshipFinder` usando o contexto disponível; quando o cache da árvore estava disponível, não exibiu aviso de escopo.
- Corrigido bug claro no utilitário puro: a orientação real dos registros `pai`/`mae` e `filho` em `public.relacionamentos` foi alinhada com a semântica usada pelo app (`pai`/`mae`: destino é pai/mãe da origem; `filho`: destino é filho da origem).
- Ajustados testes unitários de `relationshipDegree.ts` para cobrir a orientação real dos dados.
- Refinada a apresentação da UI: descrições foram humanizadas na camada `relationshipDegreeDisplay.ts`, `Grau` indefinido deixou de aparecer como "não definido", e avisos globais não poluem resultados encontrados.
- Verificado que o resultado não exibe telefone, endereço, e-mail, URL de arquivo, base64, observações internas, token ou secret.
- `relationshipDegree.ts` continua sem Supabase e sem IA.
- O fluxo visual principal continua sem depender de `regras_parentesco` ou `parentescos_calculados`.
- Não houve migration nesta frente 7.5E.
- Não houve alteração de schema.
- Não houve alteração de RLS.
- Não houve alteração de dados reais.
- Não houve integração na árvore/Genealogia, cálculo em massa, cache persistido ou remoção destrutiva do legado.
- Não houve alteração de notificações, Edge Functions ou da frente 7.6.
- QA funcional manual ainda não cobriu todos os casos mínimos em navegador; a frente 7.5 permanece parcial.
- Próxima etapa recomendada: 7.5F com QA complementar/correções finais da UI, cobrindo todos os casos mínimos com admin e usuário comum antes de consolidação final.

### Registro 7.5F

- Executado QA complementar em navegador local para a UI de grau de parentesco/vínculo.
- Rotas/componentes verificados:
  - Home, aba "Curiosidades" > "Qual a minha conexão com alguém?";
  - perfil de pessoa em `/pessoa/:id`, componente `RelationshipFinder`.
- Permissões verificadas:
  - Home como admin;
  - Perfil como admin;
  - Home como usuário comum;
  - Perfil como usuário comum.
- Ambientes visuais verificados:
  - desktop;
  - mobile básico em 390px;
  - console do navegador.
- Casos testados manualmente e aprovados com dados reais disponíveis:
  - seleção vazia, com botão desabilitado/estado inicial claro;
  - filho(a) para pai/mãe;
  - pai/mãe para filho(a);
  - irmãos;
  - cônjuge ativo;
  - vínculo indireto;
  - caminho de pessoas e caminho de relações;
  - warnings amigáveis sem duplicação relevante;
  - resultado sem exposição de telefone, endereço, e-mail, URL de arquivo, base64, token, secret ou observações internas.
- Casos cobertos pelos testes unitários e pela semântica real do app:
  - pai/mãe;
  - filho(a);
  - irmãos explícitos e derivados;
  - avô/avó;
  - neto(a);
  - tio(a);
  - sobrinho(a);
  - primo(a);
  - cônjuge ativo;
  - cônjuge inativo ignorado por padrão;
  - cônjuge inativo incluído quando a opção é marcada;
  - sem vínculo;
  - dados incompletos;
  - caminhos indiretos.
- Casos não testados manualmente por ausência de dados reais no escopo visual carregado:
  - cônjuge separado/inativo com opção desmarcada;
  - cônjuge separado/inativo com opção marcada;
  - pessoa base sem outra pessoa disponível.
- Ajuste final realizado:
  - corrigida acentuação residual de "específica" em resultado de vínculo indireto na camada `relationshipDegreeDisplay.ts`.
- A Home continuou usando `pessoas` e `relacionamentos` já carregados pela árvore.
- O Perfil continuou usando cache em memória da árvore quando disponível e fallback por `dataService` quando necessário, respeitando o escopo/RLS da tela chamadora.
- O aviso de escopo do Perfil permanece condicionado à ausência de contexto completo.
- `relationshipDegree.ts` continua utilitário puro, sem Supabase, sem IA e sem cache persistido.
- O fluxo visual principal não depende de `regras_parentesco` nem de `parentescos_calculados`.
- `relationshipResolverService.ts` permanece legado/parcial e fora do fluxo principal.
- Não houve migration.
- Não houve criação/alteração de schema.
- Não houve alteração de RLS.
- Não houve alteração de dados reais.
- Não houve alteração de notificações, Edge Functions, `relationship_change_requests`, permissões ou fluxo de edição de relacionamentos reais.
- A migration local pendente `20260516120000_refine_person_events_and_historical_file_storage_metadata.sql` permanece fora do escopo da frente 7.5, não foi aplicada e deve ser tratada em prompt próprio.
- Console: sem erros relevantes de runtime; permanecem apenas log informativo de diagnóstico Supabase e warning genérico de `DialogContent` sem descrição, registrados como hardening posterior.
- Status: 7.5 funcionalmente consolidada após QA, com pendências futuras opcionais.
- Pendências futuras opcionais da 7.5:
  - integração futura na árvore/Genealogia;
  - integração futura na Visão Completa;
  - limpeza técnica futura do service legado `relationshipResolverService.ts`;
  - testes de componente quando houver infraestrutura dedicada;
  - novo QA específico se forem adicionados dados reais de cônjuge inativo/separado.

### Exemplos de retorno esperado

```txt
Tulius → mãe → avó → bisavô
Grau: bisavô
```

---

## 7.6 Selecionar área para PDF/impressão

### Status

7.6A diagnóstico concluído. 7.6B implementado em primeira versão para seleção da viewport visível. 7.6C executado com QA técnico, refinamentos pontuais e documentação final.

### Objetivo

Implementar funcionalidade para selecionar área que o usuário deseja salvar como PDF ou imprimir.

### Implementado em 7.6B

- Botão **Selecionar área** no painel **Informações da árvore**.
- Overlay de seleção retangular sobre a viewport visível da `.react-flow`.
- Cancelamento por botão **Cancelar** e tecla `Esc`.
- Exportação da área selecionada como PNG.
- Exportação da área selecionada como PDF com orientação automática.
- Impressão apenas da área selecionada.
- Feedback de carregamento e erro no overlay.
- Captura limitada à área visível atual da árvore; não exporta árvore completa.
- Sem migration, sem alteração de schema Supabase e sem Storage.

### Refinado em 7.6C

- O modo de seleção fecha após exportação PNG/PDF/impressão concluída, liberando pan/zoom.
- `releasePointerCapture` foi protegido para evitar erro em cancelamento de pointer.
- `ignoreElements` passou a cobrir descendentes de:
  - `[data-tree-selection-overlay="true"]`;
  - `[data-tree-node-menu="true"]`;
  - `.react-flow__controls`;
  - `.react-flow__minimap`.
- Seleções pequenas continuam recusadas.
- Seleções grandes demais são recusadas antes da captura para evitar travamento sem feedback.
- Não houve migration, alteração de schema, RLS, Storage ou logs persistidos.

### Pontos a verificar

- Se usa `html2canvas`.
- Se usa `jspdf`.
- Se a árvore inteira é exportada.
- Se deve permitir selecionar:
  - card;
  - núcleo familiar;
  - geração;
  - área visível;
  - árvore completa.

### Arquivos prováveis

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/TreeAreaSelectionOverlay.tsx
src/app/components/FamilyTree/utils/treeExport.ts
src/app/pages/Home.tsx
```

### Pendências remanescentes após 7.6C

- Ampliar QA manual em dados reais nas três visões quando houver janela dedicada.
- Testar em mais combinações de navegadores, zoom do browser e densidade de tela.
- Testar árvores muito grandes e imagens externas sem CORS.
- Avaliar redução automática de escala para seleções grandes, além da recusa atual.
- Avaliar exportação da árvore completa futuramente.

---

## 7.7 Legendas visuais da árvore

### Status

Não implementado.

### Objetivo

Verificar as legendas existentes e atualizar conforme os novos tipos visuais.

### Itens que precisam de legenda

- Tipos de linhas.
- Linhas pais-filhos.
- Linhas conjugais.
- Barramento vertical.
- Anel ativo.
- Anel separado/divorciado.
- Anel viuvez.
- Cores de cards.
- Bordas.
- Backgrounds.
- Diferentes views:
  - Minha Árvore;
  - Genealogia;
  - Visão Completa.

### Arquivos prováveis

```txt
src/app/pages/Home.tsx
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx
src/app/components/FamilyTree/PersonNode.tsx
src/app/components/FamilyTree/layouts/directFamilyLayoutTokens.ts
```

### Sugestões

- Criar componente:

```txt
src/app/components/FamilyTree/TreeLegend.tsx
```

- Mostrar legenda em modal ou painel lateral.
- Ajustar conforme view selecionada.
- Incluir explicação do anel 💍.

---

## 7.8 Favoritos em todo o site

### Status

Não implementado nesta rodada.

### Objetivo

Implementar botão de estrela em páginas, modais, tópicos de fórum, views personalizadas e outras áreas para o usuário favoritar conteúdos.

### Áreas possíveis

- Pessoas.
- Modal conjugal.
- Arquivos históricos.
- Tópicos de fórum.
- Views personalizadas.
- Solicitações relevantes.
- Eventos/timeline.

### Arquivos prováveis

```txt
src/app/services/userEngagementService.ts
src/app/pages/Favoritos.tsx
src/app/pages/PersonProfile.tsx
src/app/components/FamilyTree/PersonNode.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/types/index.ts
```

### Sugestões

- Verificar estrutura atual de favoritos.
- Generalizar favoritos com:
  - `entity_type`
  - `entity_id`
  - `label`
  - `metadata`
- Criar componente reutilizável:

```txt
src/app/components/FavoriteButton.tsx
```

- Registrar logs opcionais:
  - `favorite.added`
  - `favorite.removed`

---

## 7.9 Página de favoritos

### Status

Não implementado nesta rodada.

### Objetivo

Testar se a página de favoritos está armazenando e exibindo todo o conteúdo salvo pelo usuário.

### Checklist

- [ ] Favoritar pessoa.
- [ ] Favoritar relacionamento/modal conjugal.
- [ ] Favoritar arquivo histórico.
- [ ] Favoritar tópico de fórum.
- [ ] Remover favorito.
- [ ] Confirmar persistência após reload.
- [ ] Confirmar isolamento por usuário.

### Arquivos prováveis

```txt
src/app/pages/Favoritos.tsx
src/app/services/userEngagementService.ts
src/app/types/index.ts
```

### Sugestões

- Criar agrupamento por tipo.
- Adicionar busca.
- Adicionar filtros.
- Criar links diretos para entidade favoritada.
- Verificar se favoritos quebram quando entidade é removida.

---

## 7.10 Responsividade/mobile

### Status

Não implementado nesta rodada.

### Objetivo

Configurar e testar visualização mobile das páginas.

### Áreas prioritárias

- Home.
- Minha Árvore.
- Genealogia.
- Visão Completa.
- Modal conjugal.
- Perfil de pessoa.
- Meus Dados.
- Meus Vínculos.
- Notificações.
- Admin Dashboard.
- Admin Notificações.
- Admin Integridade.
- Admin Solicitações de Vínculos.
- Admin Atividades.

### Arquivos prováveis

```txt
src/app/pages/Home.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/MeusDados.tsx
src/app/pages/MeusVinculos.tsx
src/app/pages/Notificacoes.tsx
src/app/pages/PersonProfile.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/pages/admin/AdminNotificacoes.tsx
src/app/pages/admin/AdminIntegridade.tsx
src/app/pages/admin/AdminSolicitacoesVinculos.tsx
src/app/pages/admin/AdminAtividades.tsx
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/components/ArquivosHistoricos.tsx
```

### Sugestões

- Testar larguras:
  - 320px;
  - 375px;
  - 390px;
  - 430px;
  - 768px;
  - desktop.
- Verificar overflow horizontal.
- Verificar modais em tela pequena.
- Verificar botões fixos/sticky.
- Verificar árvore em touch.
- Verificar se pan/zoom funciona bem no mobile.

---

## 7.11 Roadmap de produto legado a avaliar

### Status

Backlog estratégico; verificar escopo antes de implementar.

### Objetivo

Consolidar ideias ainda úteis dos documentos legados sem tratá-las como implementadas.

### Itens a avaliar

- Calendário familiar visual com aniversários, datas de memória, eventos internos e filtros por favoritos/ramo.
- Integração com Google Agenda ou exportação `.ics` por pessoa, grupo ou favoritos.
- Assistente de IA como camada de consulta sobre dados estruturados, sem substituir cálculo determinístico de parentesco.
- Curiosidades e estatísticas, como sobrenomes frequentes, cidades recorrentes, aniversários por mês e distribuição por décadas.
- Mural/fórum com anexos, marcação de pessoas, temas editoriais e notificações de resposta.
- Álbuns e acervo por ramo, década, casamento, encontro, infância, pessoa, evento, local ou tema.
- Linha do tempo da família, modo história e páginas de homenagens.
- Mapa da família com cidades de nascimento, residência, países e fluxos migratórios.
- Colaboração moderada para correções, fotos, histórias, datas e documentos enviados por familiares.
- Comparador de perfis por parentesco, idade, cidades, sobrenomes, ramo e eventos parecidos.
- Home dinâmica com aniversariantes, lembranças, curiosidades, tópicos recentes, arquivos novos e próximos eventos.

### Dependências antes de priorizar

- Normalizar datas, cidades, sobrenomes e relacionamentos.
- Definir regras de privacidade e consentimento para telefone, WhatsApp, fotos, datas sensíveis e perfis memoriais.
- Separar cada módulo grande em issues ou etapas independentes.
- Confirmar quais partes já têm base técnica existente, como fórum, Google Calendar, favoritos e notificações.

---

# 8. Sugestões novas

## 8.1 Criar checklist formal de QA

Criar arquivo:

```txt
docs/TESTES_MANUAIS_1405.md
```

Objetivo:

- registrar todos os testes manuais;
- marcar aprovado/reprovado;
- anexar observações;
- orientar a ordem dos ajustes.

---

## 8.2 Criar issues no GitHub para bugs relevantes

Para bugs P0/P1, criar issue individual.

Modelo de título:

```txt
[P1] Modal conjugal não salva arquivo histórico de relacionamento
```

Labels sugeridas:

```txt
bug
admin
genealogia
storage
rls
qa
notificacoes
```

---

## 8.3 Criar matriz de permissões

Criar arquivo:

```txt
docs/MATRIZ_PERMISSOES.md
```

Com colunas:

```md
| Área | Admin | Usuário comum | Visitante |
|---|---|---|---|
| Ver árvore | Sim | Sim | Depende |
| Editar pessoa | Sim | Própria pessoa | Não |
| Editar relacionamento real | Sim | Não | Não |
| Solicitar vínculo | Sim | Sim | Não |
| Ver histórico global | Sim | Não | Não |
| Ver notificações próprias | Sim | Sim | Não |
| Ver logs de notificações | Sim | Não | Não |
```

---

## 8.4 Criar documentação específica de notificações

Criar arquivo:

```txt
docs/NOTIFICACOES.md
```

Conteúdo sugerido:

- arquitetura;
- tabelas;
- services;
- Edge Functions;
- canais ativos;
- canais futuros;
- preferências;
- logs;
- rotina de aniversários/memórias;
- como testar;
- como configurar secrets;
- como verificar cron/agendamento;
- limitações conhecidas.

---

## 8.5 Criar documentação de eventos pessoais

Criar arquivo:

```txt
docs/EVENTOS_PESSOAIS.md
```

Conteúdo sugerido:

- tabela `person_events`;
- tipos de evento;
- como editar no admin;
- como aparece no perfil;
- logs;
- futuras integrações com timeline.

---

## 8.6 Criar documentação de arquivos históricos

Criar arquivo:

```txt
docs/ARQUIVOS_HISTORICOS.md
```

Conteúdo sugerido:

- arquivos de pessoa;
- arquivos de relacionamento;
- Storage;
- base64 legado;
- preview;
- download;
- permissões;
- logs;
- pendências de uploads órfãos.

---

## 8.7 Criar documentação de formulários de pessoa

Criar arquivo:

```txt
docs/FORMULARIOS_PESSOA.md
```

Conteúdo sugerido:

- rascunhos;
- redes sociais;
- pessoa falecida;
- locais no exterior;
- eventos pessoais;
- arquivos históricos;
- relacionamentos pendentes;
- dados conjugais;
- diferenças entre criação e edição.

---
