# Mapa de investigação por tema

Abaixo está um mapa operacional: **tema → arquivos envolvidos → onde olhar se der erro → direcionamento de correção**.

Este documento deve ser usado quando uma funcionalidade falhar, quando houver regressão após uma implementação ou quando for necessário localizar rapidamente os arquivos prováveis de uma área.

---

## 1. Menu do usuário / Acesso ao admin

### Arquivos envolvidos

```txt
src/app/pages/Home.tsx
src/app/services/permissionService.ts
src/app/components/ProtectedRoute.tsx
src/app/routes.tsx
```

### Se der erro

#### Botão “Painel administrativo” aparece para usuário comum

- Verificar em `Home.tsx` se `isAdminUser(user)` está sendo chamado.
- Confirmar se `isAdmin` inicia como `false`.
- Confirmar se, em caso de erro na RPC, o botão fica oculto.
- Verificar se o usuário realmente não tem `profiles.role = 'admin'`.

#### Admin não vê o botão

- Verificar `permissionService.ts`.
- Conferir se a RPC `is_admin_user` retorna `true`.
- Conferir `public.profiles.role = 'admin'`.
- Conferir sessão Supabase ativa.

#### Clique abre `/admin/login`

- Corrigir em `Home.tsx`.
- O botão deve navegar direto para:

```txt
/admin
```

---

## 2. Rotas admin protegidas

### Arquivos envolvidos

```txt
src/app/routes.tsx
src/app/components/ProtectedRoute.tsx
src/app/services/permissionService.ts
```

### Se der erro

#### Usuário comum acessa página admin

- Verificar se a rota está envolvida por:

```tsx
<ProtectedRoute>...</ProtectedRoute>
```

- Verificar se `ProtectedRoute` consulta permissões corretamente.
- Verificar se fallback de erro bloqueia acesso, não libera.

#### Admin é redirecionado indevidamente

- Verificar `isAdminUser`.
- Verificar sessão Supabase.
- Verificar se `profiles.role` está correto.
- Verificar se a rota foi adicionada no bloco correto em `routes.tsx`.

#### Nova rota admin não abre

- Conferir import em `routes.tsx`.
- Conferir se o componente foi exportado corretamente.
- Conferir se a rota foi adicionada dentro da proteção adequada.
- Conferir se o componente não depende de service ainda inexistente.

---

## 3. Dashboard administrativo

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminDashboard.tsx
src/app/services/activityLogService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/services/dataService.ts
src/app/services/notificationAdminService.ts
```

### Se der erro

#### Cards/atalhos não aparecem

- Verificar array `quickActions` em `AdminDashboard.tsx`.
- Verificar se a rota correspondente existe em `routes.tsx`.
- Verificar imports de ícones em `lucide-react`.

#### Contagem de solicitações pendentes errada

- Verificar `listPendingRelationshipChangeRequests`.
- Verificar RLS de `relationship_change_requests`.
- Verificar se status usados são exatamente:
  - `pending`
  - `approved`
  - `rejected`
  - `cancelled`

#### Histórico recente vazio

- Verificar `listRecentActivityLogs`.
- Verificar RLS de `activity_logs`.
- Verificar se há logs recentes no banco.
- Verificar se admin realmente tem permissão de leitura global.

#### Atalho “Notificações” não aparece

- Verificar `AdminDashboard.tsx`.
- Verificar se `/admin/notificacoes` foi registrado em `routes.tsx`.
- Verificar import/export de `AdminNotificacoes`.

---

## 4. Gerenciar Pessoas

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminPessoas.tsx
src/app/pages/admin/AdminPessoaForm.tsx
src/app/services/dataService.ts
src/app/utils/personFields.ts
src/app/utils/searchText.ts
src/app/components/person/SocialProfilesEditor.tsx
src/app/components/person/PersonEventsEditor.tsx
src/app/components/person/PersonFormSection.tsx
src/app/components/person/PersonBasicInfoFields.tsx
src/app/components/person/PersonDatesLocationsFields.tsx
src/app/components/person/PersonBioFields.tsx
src/app/components/person/PersonContactFields.tsx
src/app/components/person/PersonPrivacyFields.tsx
```

### Se der erro

#### Campo “Lado” voltou a aparecer

- Remover do JSX em `AdminPessoaForm.tsx`.
- Manter apenas fallback técnico no payload, se necessário.
- Conferir componentes extraídos de formulário de pessoa.

#### Filtros não funcionam

- Verificar estado dos filtros avançados em `AdminPessoas.tsx`.
- Conferir se busca textual, humano/pet e filtros do modal estão sendo combinados.
- Conferir se `includesNormalizedText` está sendo usado para ignorar acentuação.
- Conferir se filtros de falecidos usam `isPersonDeceased`.

#### Busca diferencia acentos

- Verificar `src/app/utils/searchText.ts`.
- Verificar se a tela está usando `normalizeSearchText` ou `includesNormalizedText`.
- Procurar uso antigo de:

```ts
toLowerCase().includes(...)
```

- Substituir por helper normalizado.

#### Pessoa não salva

- Verificar `cleanPersonPayload`.
- Verificar `atualizarPessoa` / `adicionarPessoa` em `dataService.ts`.
- Verificar se campos novos foram incluídos em `PESSOA_COLUMNS`.
- Verificar se há migration aplicada para campos novos.
- Verificar erro de RLS no console.

#### Pessoa salva, mas campo novo não persiste

- Verificar se o campo está:
  - no tipo `Pessoa`;
  - no estado do formulário;
  - no payload limpo;
  - nas colunas do service;
  - no banco via migration.
- Campos que exigem atenção:
  - `falecido`
  - `local_nascimento_exterior`
  - `local_falecimento_exterior`
  - `rede_social`
  - `instagram_usuario`

#### Formulário perde dados ao visualizar arquivo ou sair da página

- Verificar rascunho em `AdminPessoaForm.tsx`.
- Conferir chaves:
  - `admin-pessoa-form-draft:new`
  - `admin-pessoa-form-draft:edit:{id}`
- Confirmar se `ArquivosHistoricos` não chama `onChange` ao abrir/fechar preview.
- Confirmar se botões internos têm `type="button"`.
- Verificar `useUnsavedChanges`.

#### Modal de adicionar relacionamento trava

- Verificar se `ConfirmDialog` não está sendo usado para formulário de relacionamento.
- O fluxo de adicionar relacionamento deve usar `Dialog` ou painel inline.
- `ConfirmDialog` deve ficar restrito à confirmação de saída com alterações não salvas.
- Confirmar se botões de cancelar/adicionar usam `type="button"`.

---

## 5. Privacidade, redes sociais e notificações do usuário

### Arquivos envolvidos

```txt
src/app/pages/MeusDados.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/Notificacoes.tsx
src/app/pages/admin/AdminPessoaForm.tsx
src/app/services/userEngagementService.ts
src/app/services/memberProfileService.ts
src/app/services/dataService.ts
src/app/utils/personFields.ts
src/app/components/person/SocialProfilesEditor.tsx
```

### Se der erro

#### Campos de privacidade vêm desmarcados para novo usuário

- Verificar defaults em:
  - `personFields.ts`
  - `AdminPessoaForm.tsx`
  - `MeusDados.tsx`
  - `MinhaArvore.tsx`

#### Preferências de notificação não aparecem

- Verificar `Notificacoes.tsx`.
- Verificar `userEngagementService.ts`.
- Verificar se `preferencias_notificacao` existe e está com RLS correta.
- Verificar fallback local em caso de erro de Supabase.

#### Preferências antigas são sobrescritas

- Conferir se o código diferencia:

```txt
valor ausente → default true
valor existente false → preservar false
```

#### Redes sociais aparecem diferentes no admin e em Meus Dados

- Verificar se ambos usam `SocialProfilesEditor`.
- Verificar helpers:
  - `buildSocialProfilesFromPerson`
  - `syncFirstSocialProfileToPersonFields`
- Verificar se o rascunho preserva `socialProfiles`.

#### Primeira rede social não salva

- Verificar sincronização com campos legados:
  - `rede_social`
  - `instagram_usuario`
- Verificar `cleanPersonPayload`.
- Verificar `PESSOA_COLUMNS`.

---

## 6. Histórico de atividades

### Arquivos envolvidos

```txt
src/app/services/activityLogService.ts
src/app/pages/admin/AdminAtividades.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/personEventsService.ts
src/app/services/userEngagementService.ts
src/app/types/index.ts
supabase/migrations/20260513143000_create_activity_logs.sql
```

### Se der erro

#### Nenhum log é criado

- Verificar se `createActivityLog` está sendo chamado no fluxo.
- Verificar se `actor_user_id` está preenchido.
- Verificar RLS da tabela `activity_logs`.
- Verificar se o erro está sendo engolido em `catch`.

#### Log falha para usuário comum

- Conferir que `createActivityLog` usa:

```ts
insert(activityPayload)
```

- Não deve usar:

```ts
.select('*').single()
```

- Verificar policy de INSERT para authenticated.

#### Admin não vê logs

- Verificar policy SELECT para admin.
- Verificar `is_admin_user(auth.uid())`.
- Verificar se a rota `/admin/atividades` está protegida corretamente.

#### Metadata contém dados sensíveis

- Corrigir sanitização em `activityLogService.ts`.
- Não salvar:
  - URL completa;
  - base64;
  - telefone;
  - endereço;
  - e-mail;
  - token;
  - secrets.

#### Logs de eventos pessoais não aparecem

- Verificar `personEventsService.ts`.
- Verificar ações:
  - `person_event.added`
  - `person_event.updated`
  - `person_event.removed`
- Verificar tipos em `types/index.ts`.

---

## 7. Storage / Uploads

### Arquivos envolvidos

```txt
src/app/services/storageService.ts
src/app/components/FotoUpload.tsx
src/app/components/ArquivosHistoricos.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/memberProfileService.ts
src/app/services/dataService.ts
supabase/migrations/20260513160000_create_storage_upload_buckets.sql
```

### Se der erro

#### Foto nova salva como base64

- Verificar `FotoUpload.tsx`.
- Verificar `uploadPersonAvatar` ou função equivalente em `storageService.ts`.

#### Arquivo histórico novo salva como base64

- Verificar `ArquivosHistoricos.tsx`.
- Verificar `uploadHistoricalFile`.
- Verificar se arquivo foi enviado para bucket `historical-files`.

#### Upload falha por permissão

- Verificar policies de Storage em:

```txt
person-avatars
historical-files
```

- Confirmar usuário autenticado.
- Confirmar se deleção é restrita a admin.

#### Imagem antiga base64 não aparece

- Não converter automaticamente.
- A visualização deve aceitar `data:` legado.
- Confirmar que preview não assume apenas URL pública.

#### Upload abandonado deixa arquivo órfão

- Verificar fluxo de upload antes do salvamento final.
- Verificar se existe limpeza de objetos não vinculados.
- Se não existir, registrar pendência técnica.
- Evitar correção destrutiva automática sem auditoria.

---

## 8. Arquivos históricos de pessoas

### Arquivos envolvidos

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/MeusDados.tsx
src/app/pages/MeusVinculos.tsx
src/app/pages/PersonProfile.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
src/app/services/notificationTriggersService.ts
```

### Se der erro

#### Usuário não consegue adicionar arquivo ao próprio perfil

- Verificar se `ArquivosHistoricos` está presente em `MinhaArvore.tsx` ou `MeusDados.tsx`.
- Verificar se `pessoaId` está sendo passado.
- Verificar RLS de `arquivos_historicos`.
- Verificar Storage.

#### Arquivo aparece no admin, mas não no perfil

- Verificar `PersonProfile.tsx`.
- Verificar `listarArquivosHistoricosPorPessoa`.
- Verificar se o perfil está anexando `arquivos_historicos` à pessoa.

#### Remoção falha

- Verificar RLS de `arquivos_historicos`.
- Verificar se o usuário está vinculado à pessoa.
- Verificar se deleção física do Storage é admin-only.

#### Preview de arquivo limpa formulário

- Verificar `ArquivosHistoricos.tsx`.
- Abrir/fechar preview não deve chamar `onChange`.
- Botões devem ter `type="button"`.

#### Download não funciona

- Verificar função de download em `ArquivosHistoricos.tsx`.
- Conferir se URL é:
  - `data:`;
  - URL pública do Storage;
  - URL externa.
- Se cross-origin impedir download, fallback deve abrir em nova aba.

#### Notificação de novo arquivo histórico não dispara

- Verificar `notifyHistoricalFileAdded` em `notificationTriggersService.ts`.
- Verificar chamada em `arquivosHistoricosService.ts`.
- Verificar logs em `notification_dispatch_logs`.
- Verificar destinatários em `notificationRecipientsService.ts`.

---

## 9. Arquivos históricos de relacionamentos

### Arquivos envolvidos

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/components/RelacionamentoManager.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
src/app/services/notificationTriggersService.ts
src/app/types/index.ts
supabase/migrations/20260514120000_add_relationship_historical_files.sql
```

### Se der erro

#### Arquivo de relacionamento não salva

- Verificar se `relacionamentoId` está sendo passado para `ArquivosHistoricos`.
- Verificar `adicionarArquivoHistoricoAoRelacionamento`.
- Verificar se usuário é admin.
- Verificar RLS de `arquivos_historicos`.

#### Arquivo salva sem `relacionamento_id`

- Corrigir chamada do componente no `ViewMarriageModal.tsx`, `MarriageDetailsEditor` ou `RelacionamentoManager`.
- Confirmar que o objeto usa:

```txt
relacionamento_id
```

- Confirmar que `pessoa_id` fica nulo em arquivo de relacionamento.

#### Usuário comum consegue adicionar arquivo de relacionamento

- Verificar `readOnly={!isAdmin}` no modal.
- Verificar guarda admin no service.
- Verificar se `/meus-vinculos` não expõe upload de arquivo de casamento para usuário comum.

#### Arquivo de casamento não aparece no modal do anel

- Verificar `listarArquivosHistoricosDoRelacionamento`.
- Verificar se o relacionamento correto está sendo usado.
- Verificar se o relacionamento inverso não está causando ID diferente.

#### Notificação de novo arquivo de relacionamento não dispara

- Verificar `notifyHistoricalFileAdded`.
- Verificar se `relacionamento_id` chega ao trigger.
- Verificar helper de destinatários para pessoas envolvidas no relacionamento.
- Verificar logs de dispatch.

---

## 10. Genealogia / Visão Completa

### Arquivos envolvidos

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/ViewModeToggle.tsx
src/app/pages/Home.tsx
src/app/utils/searchText.ts
```

### Se der erro

#### Visão Completa não aparece

- Verificar `TreeViewMode`.
- Verificar `ViewModeToggle.tsx`.
- Verificar `Home.tsx`.

#### Genealogia mostra pessoas demais

- Verificar filtro de escopo pessoal.
- Verificar `filterPersonalTreeScope.ts`.

#### Visão Completa mostra poucas pessoas

- Verificar se está usando grafo completo, não escopo pessoal.

#### Minha Árvore mudou visualmente

- Verificar se `directFamilyDistributedLayout` não foi alterado indevidamente.

#### Busca na árvore não encontra nomes com acento

- Verificar `searchText.ts`.
- Confirmar uso de `includesNormalizedText`.

---

## 11. Conectores pais-filhos na Genealogia

### Arquivos envolvidos

```txt
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx
```

### Se der erro

#### Linha diagonal entre pais e filho

- Verificar regra de filho único em `GenealogyFamilyConnectorNode.tsx`.
- Filho único desalinhado deve usar conector ortogonal.

#### Barramentos verticais sobrepostos

- Verificar cálculo de lanes em `genealogyColumnsLayout.ts`.
- Verificar `FAMILY_CONNECTOR_LANE_GAP`.

#### Cônjuge aparece como filho

- Verificar `childrenByCouple`, `childrenByParent` e filtragem de filhos reais.

#### Linha solta após filtro

- Verificar `getPlacementFilterKey`.
- Conectores só devem ser criados se pais e filhos estiverem visíveis.

---

## 12. Anel 💍 entre cônjuges

### Arquivos envolvidos

```txt
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/utils/personFields.ts
```

### Se der erro

#### Anel não aparece

- Verificar criação da edge `genealogySpouseEdge`.
- Verificar `spousePairKeys`.
- Verificar `spouseRelationshipByPairKey`.

#### Anel aparece, mas não abre modal

- Verificar `onMarriageClick`.
- Verificar se `marriageDetails` está em `edge.data`.

#### Clique no anel arrasta a tela

- Verificar `event.stopPropagation()`.
- Verificar `onMouseDown`.

#### Status visual errado

- Verificar `getGenealogyMarriageStatus`.
- Verificar campos:
  - `subtipo_relacionamento`
  - `data_separacao`
  - `ativo`
  - `data_falecimento`
  - `falecido`
- Verificar `isPersonDeceased`.

---

## 13. Modal de relacionamento conjugal

### Arquivos envolvidos

```txt
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/ArquivosHistoricos.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/services/arquivosHistoricosService.ts
src/app/pages/Home.tsx
```

### Se der erro

#### Modal mostra casal errado

- Verificar `MarriageNodeDetails`.
- Verificar `person1Id`, `person2Id` e `relationship`.

#### Modal não mostra observações para admin

- Verificar prop `isAdmin` em `Home.tsx`.
- Verificar `ViewMarriageModal.tsx`.
- Verificar `MarriageDetailsEditor`.

#### Usuário comum vê observações

- Corrigir renderização condicional:

```tsx
{isAdmin && ...}
```

- Conferir payload de `/meus-vinculos` para garantir que não envia `observacoes`.

#### Admin não consegue salvar arquivos

- Verificar `salvarArquivosHistoricosDoRelacionamento`.
- Verificar RLS.
- Verificar `relacionamentoId`.

#### Dados de casamento não aparecem

- Verificar campos:
  - `data_casamento`
  - `local_casamento`
  - `data_separacao`
  - `local_separacao`
  - `ativo`
  - `observacoes`
- Verificar se `RELACIONAMENTO_COLUMNS` inclui esses campos.
- Verificar se `obterTodosRelacionamentos` retorna os campos.

---

## 14. Relacionamentos admin / status conjugal

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminRelacionamentos.tsx
src/app/pages/admin/AdminRelacionamentoForm.tsx
src/app/components/RelacionamentoManager.tsx
src/app/components/RelacionamentoManagerWrapper.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/services/dataService.ts
src/app/types/index.ts
src/app/services/activityLogService.ts
```

### Se der erro

#### Status conjugal não salva

- Verificar `RELACIONAMENTO_COLUMNS` em `dataService.ts`.
- Conferir campos:
  - `ativo`
  - `data_casamento`
  - `local_casamento`
  - `data_separacao`
  - `local_separacao`
  - `observacoes`

#### Inverso não atualiza

- Verificar função de atualização com inverso em `dataService.ts`.
- Verificar se não está recriando relacionamento indevidamente.
- Verificar se relacionamento inverso mantém dados conjugais coerentes.

#### Genealogia não reflete separação

- Verificar se `obterTodosRelacionamentos` traz os campos novos.
- Verificar `getGenealogyMarriageStatus`.

#### `RelacionamentoManagerWrapper` quebra build

- Verificar props obrigatórias:
  - `pessoaId`
  - `pessoaNome`
- Conferir chamada em `AdminPessoaForm`.

---

## 15. Solicitações de vínculos

### Arquivos envolvidos

```txt
src/app/services/relationshipChangeRequestService.ts
src/app/pages/admin/AdminSolicitacoesVinculos.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/MeusVinculos.tsx
src/app/components/FamilyTree/modals/AddConnectionModal.tsx
src/app/components/relationships/MarriageDetailsEditor.tsx
src/app/routes.tsx
src/app/types/index.ts
supabase/migrations/20260513173000_create_relationship_change_requests.sql
```

### Se der erro

#### Usuário comum ainda altera relacionamento real

- Verificar `MinhaArvore.tsx`.
- Verificar `MeusVinculos.tsx`.
- Verificar se está chamando `createRelationshipChangeRequest`, não `adicionarRelacionamentoComInverso`.
- Verificar RLS de `relacionamentos`.

#### Solicitação não aparece no admin

- Verificar `listAllRelationshipChangeRequests`.
- Verificar RLS de `relationship_change_requests`.
- Verificar se status está como `pending`.

#### Aprovação não altera relacionamento

- Verificar `approveRelationshipChangeRequest`.
- Verificar chamadas para `dataService`.

#### Rejeição altera relacionamento

- Corrigir service: rejeitar deve apenas mudar status.

#### Solicitação duplicada

- Verificar helper de deduplicação no service.
- Se persistir, considerar constraint única parcial no banco futuramente.

#### Dados conjugais de usuário comum não viram solicitação

- Verificar `MeusVinculos.tsx`.
- Verificar payload enviado para `relationship_change_requests`.
- Confirmar que dados conjugais não são aplicados diretamente.

---

## 16. RLS de relacionamentos

### Arquivos envolvidos

```txt
supabase/migrations/20260513170000_restrict_relationship_writes_to_admins.sql
supabase/migrations/20260512121000_allow_member_family_relationship_edits.sql
src/app/services/dataService.ts
src/app/services/permissionService.ts
```

### Se der erro

#### Usuário comum consegue gravar em `relacionamentos`

- Verificar se a migration corretiva foi aplicada com:

```bash
supabase db push
```

- Conferir policies no Supabase.
- Confirmar que policy permissiva antiga não ficou ativa.

#### Admin não consegue editar relacionamentos

- Verificar policy admin.
- Verificar `public.is_admin_user(auth.uid())`.

#### Usuário comum não consegue ler árvore

- Verificar se SELECT para authenticated foi preservado.

---

## 17. Cache/refetch da Home

### Arquivos envolvidos

```txt
src/app/services/treeDataCache.ts
src/app/pages/Home.tsx
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/personEventsService.ts
```

### Se der erro

#### Dados editados não aparecem na Home

- Verificar se o service chama `emitTreeDataChanged`.
- Verificar se `Home.tsx` assina `subscribeTreeDataChanged`.

#### Loop infinito de carregamento

- Verificar dependências do `useEffect` em `Home.tsx`.
- Verificar se o evento de cache não é emitido durante render.

#### Filtros resetam após edição

- Verificar se o refetch só atualiza dados, não estado de filtros/modo.

---

## 18. Tela `/admin/atividades`

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminAtividades.tsx
src/app/services/activityLogService.ts
src/app/routes.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/types/index.ts
```

### Se der erro

#### Tela vazia mesmo com logs

- Verificar `listActivityLogs`.
- Verificar RLS SELECT admin.
- Verificar se usuário logado é admin.

#### Filtro não funciona

- Verificar estados locais de filtro em `AdminAtividades.tsx`.
- Verificar se novos actions foram incluídos no tipo `ActivityLogAction`.

#### Dados sensíveis aparecem

- Corrigir `getActivitySummary` ou sanitização no service.

---

## 19. Tela `/admin/integridade`

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminIntegridade.tsx
src/app/routes.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/lib/supabaseClient.ts
```

### Se der erro

#### Tela não abre

- Verificar rota em `routes.tsx`.
- Verificar import/export de `AdminIntegridade`.

#### Usuário comum acessa

- Verificar `ProtectedRoute`.

#### Dados não carregam

- Verificar consultas diretas em `AdminIntegridade.tsx`.
- Verificar RLS das tabelas consultadas.

#### Diagnóstico acusa erro demais

- Verificar função de classificação.
- Separar “legado” de “erro crítico”.

#### Fica pesado/lento

- Adicionar paginação/filtros.
- Reduzir volume em `listActivityLogs`.

---

## 20. Types globais

### Arquivos envolvidos

```txt
src/app/types/index.ts
```

### Se der erro

#### Build quebra por campos ausentes

- Verificar tipos:
  - `Pessoa`
  - `Relacionamento`
  - `ArquivoHistorico`
  - `PersonEvent`
  - `ActivityLog`
  - `RelationshipChangeRequest`
  - `MarriageNodeDetails`
  - `NotificacaoUsuario`
  - `PreferenciaNotificacao`
  - `NotificationDispatchLog`
  - `NotificationIntent`

#### Campo existe no banco, mas não no frontend

- Atualizar `types/index.ts`.
- Atualizar colunas selecionadas no service correspondente.
- Atualizar payloads e fallback em mapeadores.

---

## 21. Migrations Supabase

### Arquivos envolvidos

```txt
supabase/migrations/20260509100000_add_forum_schema.sql
supabase/migrations/20260509100100_add_google_calendar_schema.sql
supabase/migrations/20260509100200_enable_rls_core_family_tables.sql
supabase/migrations/20260509100300_use_profile_role_for_forum_admin.sql
supabase/migrations/20260509100400_remove_legacy_public_core_policies.sql
supabase/migrations/20260509100500_migrate_legacy_pessoas_arquivos_historicos.sql
supabase/migrations/20260509100600_remove_legacy_relacionamentos_policies.sql
supabase/migrations/20260509100700_align_relacionamentos_schema.sql
supabase/migrations/20260509100800_version_pessoa_social_profiles.sql
supabase/migrations/20260513143000_create_activity_logs.sql
supabase/migrations/20260513160000_create_storage_upload_buckets.sql
supabase/migrations/20260513170000_restrict_relationship_writes_to_admins.sql
supabase/migrations/20260513173000_create_relationship_change_requests.sql
supabase/migrations/20260514120000_add_relationship_historical_files.sql
supabase/migrations/20260514130000_add_falecido_to_pessoas.sql
supabase/migrations/20260514133000_add_exterior_location_flags_to_pessoas.sql
supabase/migrations/20260514165000_create_person_events.sql
supabase/migrations/20260514190000_create_notification_dispatch_logs.sql
supabase/migrations/20260514193000_allow_own_notification_dispatch_log_insert.sql
supabase/migrations/20260514200000_create_notification_recipient_helpers.sql
supabase/migrations/20260514201000_create_notification_dispatch_rpc.sql
supabase/migrations/20260514203000_create_notification_occurrences.sql
```

### Se der erro

#### Funciona local, mas não no remoto

- Antes de aplicar qualquer alteração, verificar o histórico:

```bash
supabase migration list
```

- Se houver migration local pendente e ela realmente precisar ser aplicada, rodar:

```bash
supabase db push
```

- Se o schema remoto já refletir os efeitos e apenas o histórico estiver desalinhado, verificar com dump/SQL administrativo antes de considerar `supabase migration repair --status applied`.

#### Drift remoto x migrations antigas

- Verificar se o problema envolve uma divergência histórica de 09/05:
  - policies legadas permissivas em `public.pessoas`, `public.arquivos_historicos` ou `public.relacionamentos`;
  - schema de `public.relacionamentos` sem campos conjugais;
  - `public.pessoa_social_profiles` presente no remoto, mas sem uso runtime;
  - `public.imagens_pessoa` citada em legado, mas sem tabela/runtime atual;
  - view `public.pessoas_com_estatisticas` presente apenas no remoto;
  - coluna `public.pessoas.arquivos_historicos` ainda existente por compatibilidade.
- Não criar migration apenas para igualar objeto legado sem consumidor real.
- Não remover coluna ou view legada sem dump recente, validação SQL administrativa e validação visual no app.

#### RLS inesperada

- Verificar policies no SQL Editor:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Verificar também se RLS está habilitado nas tabelas públicas:

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

#### Migration já aplicada

- `supabase db push` deve informar que o remoto está atualizado.
- Se o CLI indicar divergência de histórico, confirmar se os efeitos existem no remoto antes de reparar.
- Não usar `repair` para mascarar migration não aplicada.

#### Migration criou tabela, mas frontend não lê

- Verificar se RLS permite SELECT.
- Verificar se o service usa a tabela correta.
- Verificar se o tipo TypeScript foi criado.
- Verificar se o service foi importado no lugar certo.

#### Coluna legada `pessoas.arquivos_historicos`

- Se houver plano de remoção futura, confirmar primeiro no SQL Editor:

```sql
select count(*) as pessoas_com_json_legado
from public.pessoas
where arquivos_historicos is not null
  and arquivos_historicos::text not in ('[]', 'null');
```

- Confirmar visualmente no app se arquivos históricos esperados aparecem via `public.arquivos_historicos`.
- Gerar dump recente antes de qualquer migration destrutiva.
- Se `total_arquivos_relacionais = 0` aparecer em diagnóstico remoto, tratar como alerta de validação, não como autorização automática para remover dados.

#### Objetos legados citados em dumps antigos

- `public.imagens_pessoa`: verificar se ainda existe consumidor runtime antes de criar ou remover qualquer coisa.
- `public.pessoas_com_estatisticas`: verificar se alguma tela passou a depender da view antes de versionar ou remover.
- `supabase/forum-schema.sql` e `supabase/google-calendar-schema.sql`: tratar como arquivos legados até revisão formal; a fonte operacional deve ser `supabase/migrations`.

---

## 22. Pessoa falecida

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminPessoaForm.tsx
src/app/pages/MeusDados.tsx
src/app/pages/admin/AdminPessoas.tsx
src/app/pages/admin/AdminDashboard.tsx
src/app/components/FamilyTree/PersonNode.tsx
src/app/components/FamilyTree/utils/personCardText.ts
src/app/components/person/PersonDataView.tsx
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/utils/personFields.ts
src/app/types/index.ts
supabase/migrations/20260514130000_add_falecido_to_pessoas.sql
```

### Se der erro

#### Pessoa marcada como falecida volta desmarcada

- Verificar se `falecido` está em `PESSOA_COLUMNS`.
- Verificar `toPessoa`.
- Verificar `cleanPersonPayload`.
- Verificar se migration foi aplicada.

#### Pessoa com data de falecimento não conta como falecida

- Verificar helper `isPersonDeceased`.
- Confirmar que considera:
  - `falecido`
  - `data_falecimento`
  - `local_falecimento`

#### Local atual aparece para pessoa falecida

- Verificar lógica condicional em formulários e visualizações.
- Verificar `isPersonDeceased`.

---

## 23. Locais no exterior

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminPessoaForm.tsx
src/app/pages/MeusDados.tsx
src/app/pages/MeusVinculos.tsx
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/utils/personFields.ts
src/app/types/index.ts
supabase/migrations/20260514133000_add_exterior_location_flags_to_pessoas.sql
```

### Se der erro

#### `Cidade (País)` é rejeitado mesmo com checkbox marcado

- Verificar `validateLocationByMode`.
- Verificar flag:
  - `local_nascimento_exterior`
  - `local_falecimento_exterior`
- Verificar se o formulário passa `international: true`.

#### `Cidade/UF` é aceito quando exterior está marcado

- Corrigir validação internacional.
- Exterior deve aceitar `Cidade (País)`, não `Cidade/UF`.

#### Checkbox não persiste

- Verificar se flags estão em:
  - tipo `Pessoa`;
  - estado do formulário;
  - payload;
  - `PESSOA_COLUMNS`;
  - migration aplicada.

#### Placeholder não muda

- Verificar `PersonDatesLocationsFields`.
- Verificar prop de modo exterior.

---

## 24. Eventos pessoais

### Arquivos envolvidos

```txt
src/app/services/personEventsService.ts
src/app/components/person/PersonEventsEditor.tsx
src/app/components/person/PersonEventsList.tsx
src/app/pages/admin/AdminPessoaForm.tsx
src/app/pages/PersonProfile.tsx
src/app/types/index.ts
src/app/services/activityLogService.ts
supabase/migrations/20260514165000_create_person_events.sql
```

### Se der erro

#### Evento pessoal não salva

- Verificar `salvarEventosDaPessoa`.
- Verificar RLS de `person_events`.
- Verificar se pessoa já tem ID ao salvar eventos em nova pessoa.
- Verificar se eventos locais são salvos depois de criar pessoa.

#### Evento duplica ao editar

- Verificar lógica de UUID em `personEventsService.ts`.
- Evento com UUID só deve atualizar se já existir para aquela pessoa.
- IDs locais não devem ser tratados como eventos reais.

#### Evento não aparece no perfil

- Verificar `PersonProfile.tsx`.
- Verificar `listarEventosDaPessoa`.
- Verificar `PersonEventsList`.

#### Reordenação não persiste

- Verificar campo `ordem`.
- Verificar se service salva nova ordem.
- Verificar ordenação ao listar.

---

## 25. Preview e download de arquivos históricos

### Arquivos envolvidos

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/pages/PersonProfile.tsx
src/app/components/person/PersonDataView.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
```

### Se der erro

#### PDF não abre no preview

- Verificar se `iframe` recebe URL correta.
- Verificar se URL é pública ou acessível.
- Verificar se Storage bloqueia embed por policy.
- Oferecer fallback “Abrir em nova aba”.

#### Imagem não aparece no preview

- Verificar se tipo é `imagem`.
- Verificar URL.
- Confirmar compatibilidade com `data:` legado.

#### Botão baixar não funciona

- Verificar helper de download.
- Verificar nome sanitizado.
- Verificar extensão derivada.
- Se cross-origin bloquear, abrir em nova aba como fallback.

#### Visualizar arquivo limpa formulário

- Verificar se preview não chama `onChange`.
- Verificar se `novoArquivo` só é limpo ao adicionar/cancelar explicitamente.

---

## 26. Notificações — Central do usuário

### Arquivos envolvidos

```txt
src/app/pages/Notificacoes.tsx
src/app/services/userEngagementService.ts
src/app/services/notificationDispatchService.ts
src/app/types/index.ts
```

### Se der erro

#### Notificações não aparecem

- Verificar `listarNotificacoesSupabase`.
- Verificar RLS de `notificacoes_usuario`.
- Verificar se `user_id` da notificação corresponde ao usuário logado.
- Verificar fallback local.

#### Marcar como lida não funciona

- Verificar função de update em `userEngagementService.ts`.
- Verificar RLS para update do próprio usuário.

#### Preferências não salvam

- Verificar `salvarPreferenciasNotificacao`.
- Verificar tabela `preferencias_notificacao`.
- Verificar logs de `notification_preferences.updated`.

#### Preferência desligada não é respeitada

- Verificar `shouldSendNotificationChannel` em `notificationDispatchService.ts`.
- Verificar mapeamento por tipo:
  - aniversários;
  - datas de memória;
  - eventos;
  - avisos gerais;
  - fórum;
  - registros históricos.

---

## 27. Notificações — Painel admin

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminNotificacoes.tsx
src/app/services/notificationAdminService.ts
src/app/services/notificationDispatchService.ts
src/app/routes.tsx
src/app/pages/admin/AdminDashboard.tsx
```

### Se der erro

#### `/admin/notificacoes` não abre

- Verificar rota em `routes.tsx`.
- Verificar import/export de `AdminNotificacoes`.
- Verificar `ProtectedRoute`.

#### Usuário comum acessa `/admin/notificacoes`

- Verificar `ProtectedRoute`.
- Verificar `permissionService.ts`.

#### Cards de resumo vazios

- Verificar `getNotificationAdminSummary`.
- Verificar RLS de:
  - `notificacoes_usuario`
  - `preferencias_notificacao`
  - `notification_dispatch_logs`

#### Logs não aparecem

- Verificar `listRecentNotificationDispatchLogs`.
- Verificar tabela `notification_dispatch_logs`.
- Verificar policies admin.

#### Botão “Teste interno” não cria notificação

- Verificar `dispatchNotification`.
- Verificar canal `interna`.
- Verificar RPCs de criação de notificação/log.
- Verificar console e logs de dispatch.

---

## 28. Notificações — Dispatch central

### Arquivos envolvidos

```txt
src/app/services/notificationDispatchService.ts
src/app/services/userEngagementService.ts
src/app/services/notificationAdminService.ts
src/app/types/index.ts
supabase/migrations/20260514190000_create_notification_dispatch_logs.sql
supabase/migrations/20260514193000_allow_own_notification_dispatch_log_insert.sql
supabase/migrations/20260514201000_create_notification_dispatch_rpc.sql
```

### Se der erro

#### Canal interno não cria notificação

- Verificar `createInternalNotification`.
- Verificar RPC de criação.
- Verificar tabela `notificacoes_usuario`.
- Verificar RLS.

#### Email falha e quebra tudo

- Corrigir para que falha de email não impeça canal interno.
- `dispatchNotification` deve retornar resultado por canal.

#### Push/WhatsApp tentam envio real

- Nesta etapa, devem retornar:
  - `not_configured`
  - ou `skipped`
- Não deve haver integração real sem implementação própria.

#### Metadata sensível em dispatch log

- Verificar `sanitizeNotificationMetadata`.
- Não permitir:
  - telefone;
  - endereço;
  - email completo;
  - base64;
  - URL completa de arquivo;
  - token;
  - secrets.

#### Link WhatsApp no perfil não aparece

- Verificar se a pessoa possui telefone com DDD e formato válido.
- Verificar a normalização em `src/app/utils/whatsapp.ts`.
- Verificar se `permitir_exibir_telefone` ou `permitir_mensagens_whatsapp` está verdadeiro.
- Verificar se `PersonDataView.tsx` usa `canUseWhatsAppContact`.

#### Link WhatsApp quebra ou abre número incorreto

- Verificar `normalizePhoneForWhatsApp` e `buildWhatsAppUrl` em `src/app/utils/whatsapp.ts`.
- Confirmar se o telefone tem DDD ou DDI plausível.
- Não montar URL `wa.me` manualmente fora do helper.

#### Telefone aparece indevidamente no perfil

- Verificar a regra `canUseWhatsAppContact`.
- Verificar o uso em `src/app/components/person/PersonDataView.tsx`.
- Lembrar que a regra atual protege a UI; RLS forte para ocultar telefone no banco exige frente própria.

---

## 29. Notificações — Destinatários e gatilhos

### Arquivos envolvidos

```txt
src/app/services/notificationRecipientsService.ts
src/app/services/notificationTriggersService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/memberProfileService.ts
src/app/services/forumService.ts
src/app/services/notificationDispatchService.ts
supabase/migrations/20260514200000_create_notification_recipient_helpers.sql
```

### Se der erro

#### Upload histórico não notifica

- Verificar chamada para `notifyHistoricalFileAdded`.
- Verificar se há destinatários relevantes.
- Verificar se ator foi excluído corretamente.
- Verificar `notification_dispatch_logs`.

#### Novo vínculo/primeiro acesso não notifica admins

- Verificar `notifyNewUserLinked`.
- Verificar integração em `memberProfileService.ts`.
- Verificar helper de admins.

#### Fórum não notifica participantes

- Verificar `notifyForumReplyCreated`.
- Verificar `notifyForumCommentCreated`.
- Verificar `forumService.ts`.
- Verificar se autor da ação está sendo excluído.

#### Notificação duplica para mesmo usuário

- Verificar `uniqueUserIds`.
- Verificar `excludeActor`.
- Verificar se participantes são agregados sem duplicidade.

---

## 30. Notificações — Aniversários e datas de memória

### Arquivos envolvidos

```txt
src/app/services/notificationScheduledService.ts
src/app/utils/notificationDateRules.ts
src/app/services/notificationDispatchService.ts
src/app/services/notificationRecipientsService.ts
src/app/pages/admin/AdminNotificacoes.tsx
supabase/migrations/20260514203000_create_notification_occurrences.sql
```

### Se der erro

#### Botão de rotina manual não aparece

- Verificar `AdminNotificacoes.tsx`.
- Verificar import de `runDailyNotificationChecks`.

#### Rotina quebra quando uma pessoa tem dado inválido

- Verificar `notificationScheduledService.ts`.
- A rotina não deve quebrar inteira por um candidato.
- Cada candidato deve ser tratado com isolamento.

#### Notificação duplica ao rodar rotina duas vezes

- Verificar `occurrence_key`.
- Verificar unique constraint em `notification_occurrences`.
- Verificar reserva de ocorrência antes do dispatch.
- Padrão esperado:

```txt
tipo:YYYY-MM-DD:userId:pessoaId
```

#### Datas com ano puro são tratadas como aniversário

- Verificar `notificationDateRules.ts`.
- Ano puro deve ser ignorado para recorrência diária.
- Apenas datas com dia/mês completo devem entrar.

#### Preferência desligada não bloqueia

- Verificar `dispatchNotification(... respectPreferences: true)`.
- Verificar campos:
  - `receber_aniversarios`
  - `receber_datas_memoria`

#### Não há destinatário

- Deve retornar skipped/sem destinatário.
- Não deve quebrar a rotina.

---

## 31. Notificações — Edge Functions e email

### Arquivos envolvidos

```txt
supabase/functions/send-notification-email
supabase/functions/run-daily-notifications
src/app/services/notificationDispatchService.ts
src/app/pages/admin/AdminNotificacoes.tsx
docs/NOTIFICACOES.md
```

### Se der erro

#### Edge Function não existe

- Rodar:

```bash
supabase functions list
```

- Verificar pasta em `supabase/functions`.

#### Function não foi deployada

- Rodar:

```bash
supabase functions deploy send-notification-email
supabase functions deploy run-daily-notifications
```

#### Email real não envia

- Verificar provider configurado.
- Verificar secrets:
  - API key do provider;
  - remetente;
  - reply-to;
  - site URL.
- Verificar logs de function.
- Verificar `notification_dispatch_logs`.

#### Email envia mesmo com preferência desligada

- Verificar `shouldSendNotificationChannel`.
- Verificar `receber_email`.
- Verificar preferência específica do tipo.

#### Service role aparece no frontend

- P0.
- Remover imediatamente.
- Service role deve existir apenas em ambiente seguro/Edge Function.

---

## 32. Checklist rápido de investigação por sintoma

### Usuário comum conseguiu fazer algo que não deveria

Verificar:

```txt
ProtectedRoute
permissionService.ts
RLS da tabela
service chamado pela UI
RPC security definer
policies antigas permissivas
```

### Algo salva no banco, mas não aparece na tela

Verificar:

```txt
service de leitura
cache/refetch
treeDataCache
colunas selecionadas no dataService
types/index.ts
RLS de SELECT
```

### Algo aparece para admin, mas não para usuário comum

Verificar:

```txt
RLS
isAdmin
renderização condicional
readOnly
```

### Algo aparece para usuário comum, mas deveria ser admin-only

Verificar:

```txt
isAdmin em Home.tsx
ViewMarriageModal.tsx
MarriageDetailsEditor.tsx
ArquivosHistoricos.tsx
Admin routes
ProtectedRoute
RLS
```

### Upload falha

Verificar:

```txt
storageService.ts
bucket
Storage policies
URL salva no banco
activity logs
notification triggers
```

### Relacionamento aparece errado

Verificar:

```txt
dataService.ts
RELACIONAMENTO_COLUMNS
genealogyColumnsLayout.ts
relationshipChangeRequestService.ts
AdminRelacionamentos.tsx
RelacionamentoManager.tsx
```

### Dados digitados somem

Verificar:

```txt
sessionStorage draft
useUnsavedChanges
onOpenChange de Dialog
botões sem type="button"
preview de arquivos
efeitos assíncronos sobrescrevendo estado local
```

### Busca não encontra com acento

Verificar:

```txt
src/app/utils/searchText.ts
includesNormalizedText
normalizeSearchText
usos antigos de toLowerCase().includes
```

### Notificação não chega

Verificar:

```txt
notificationTriggersService.ts
notificationRecipientsService.ts
notificationDispatchService.ts
notificacoes_usuario
notification_dispatch_logs
preferencias_notificacao
RLS/RPC
```

### Notificação duplica

Verificar:

```txt
notification_occurrences
occurrence_key
unique constraint
deduplicação de destinatários
excludeActor
```

### Linha do tempo não aparece no perfil

Referência detalhada:

```txt
docs/TIMELINE.md
```

Verificar:

```txt
src/app/pages/PersonProfile.tsx
src/app/components/Timeline/PersonTimeline.tsx
src/app/utils/buildPersonTimeline.ts
pessoa.data_nascimento
pessoa.data_falecimento
person_events
arquivos_historicos
```

Se o componente aparece vazio, confirmar se a pessoa possui ao menos uma data ou evento derivável. O estado vazio esperado é:

```txt
Ainda não há eventos suficientes para montar a linha do tempo desta pessoa.
```

### Casamento ou união não aparece na linha do tempo

Verificar:

```txt
src/app/pages/PersonProfile.tsx
src/app/services/dataService.ts
src/app/utils/buildPersonTimeline.ts
obterRelacionamentosDetalhadosDaPessoa
tipo_relacionamento = conjuge
data_casamento
subtipo_relacionamento
```

Se o usuário comum não vê o relacionamento, conferir RLS/leitura de `relacionamentos` antes de tratar como bug visual.

### Separação aparece duplicada na linha do tempo

Verificar:

```txt
src/app/utils/buildPersonTimeline.ts
dedupeTimelineItems
relationship-separation:{minPessoaId}:{maxPessoaId}:{dateValue || unknown}
relacionamentos inversos
data_separacao
ativo
subtipo_relacionamento = separado
```

Duplicação geralmente indica que a chave de deduplicação deixou de normalizar o par de pessoas.

### Arquivos históricos não aparecem na linha do tempo

Verificar:

```txt
src/app/pages/PersonProfile.tsx
src/app/services/arquivosHistoricosService.ts
listarArquivosHistoricosPorPessoa
listarArquivosHistoricosDoRelacionamento
src/app/utils/buildPersonTimeline.ts
```

Arquivos de relacionamento dependem dos relacionamentos conjugais detalhados carregados no perfil. Erros ao carregar arquivos de relacionamento devem gerar apenas aviso no console e não quebrar o perfil.

### Eventos pessoais não aparecem na linha do tempo

Verificar:

```txt
src/app/pages/PersonProfile.tsx
src/app/services/personEventsService.ts
listarEventosDaPessoa
src/app/utils/buildPersonTimeline.ts
PersonEventsList.tsx
```

Eventos com `tipo = memoria` devem aparecer como memória. Os demais tipos de `person_events` aparecem como evento pessoal.

### Datas aparecem fora de ordem na linha do tempo

Verificar:

```txt
src/app/utils/buildPersonTimeline.ts
parseTimelineDate
sortTimelineItems
precision
dateValue
year
month
day
```

Ano puro deve manter precisão `year`; não deve ser convertido visualmente para `01/01/AAAA`. Itens com data desconhecida devem ficar no final.

### Linha do tempo expõe dado sensível

Verificar:

```txt
src/app/components/Timeline/PersonTimeline.tsx
src/app/utils/buildPersonTimeline.ts
sanitizeTimelineMetadata
metadata
arquivo.url
base64
telefone
endereco
email
token
secret
```

O componente não deve renderizar metadata bruta, IDs técnicos ou URLs de arquivos. Ações de abrir/baixar arquivo não fazem parte da primeira versão da timeline.

### Build quebra

Verificar primeiro:

```bash
npm run build
git diff --check
```

Depois conferir:

```txt
types/index.ts
imports em routes.tsx
exports de novos componentes/services
campos de banco usados no frontend
tipos de ActivityLogAction
tipos de notificações
tipos de eventos pessoais
```

### Supabase remoto não reflete alterações

Verificar:

```bash
supabase db push
supabase migration list
```

E conferir:

```txt
migrations novas
RLS
policies
RPCs
Edge Functions
secrets
```
