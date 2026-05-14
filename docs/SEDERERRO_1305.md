Use um bloco externo com **quatro crases** para manter tudo em uma única caixa, mesmo contendo blocos internos de código. Conteúdo baseado no texto que você enviou. 

````md
# Mapa de investigação por tema

Abaixo está um mapa operacional: **tema → arquivos envolvidos → onde olhar se der erro → direcionamento de correção**.

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

#### Admin não vê o botão

- Verificar `permissionService.ts`.
- Conferir se a RPC `is_admin_user` retorna `true`.
- Conferir `public.profiles.role = 'admin'`.

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

#### Admin é redirecionado indevidamente

- Verificar `isAdminUser`.
- Verificar sessão Supabase.
- Verificar se `profiles.role` está correto.

#### Nova rota admin não abre

- Conferir import em `routes.tsx`.
- Conferir se o componente foi exportado corretamente.

---

## 3. Dashboard administrativo

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminDashboard.tsx
src/app/services/activityLogService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/services/dataService.ts
```

### Se der erro

#### Cards/atalhos não aparecem

- Verificar array `quickActions` em `AdminDashboard.tsx`.

#### Contagem de solicitações pendentes errada

- Verificar `listPendingRelationshipChangeRequests`.

#### Histórico recente vazio

- Verificar `listRecentActivityLogs`.
- Verificar RLS de `activity_logs`.

---

## 4. Gerenciar Pessoas

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminPessoas.tsx
src/app/pages/admin/AdminPessoaForm.tsx
src/app/services/dataService.ts
src/app/utils/personFields.ts
```

### Se der erro

#### Campo “Lado” voltou a aparecer

- Remover do JSX em `AdminPessoaForm.tsx`.
- Manter apenas fallback técnico no payload, se necessário.

#### Filtros não funcionam

- Verificar estado dos filtros avançados em `AdminPessoas.tsx`.
- Conferir se busca textual, humano/pet e filtros do modal estão sendo combinados.

#### Pessoa não salva

- Verificar `cleanPersonPayload`.
- Verificar `atualizarPessoa` / `adicionarPessoa` em `dataService.ts`.

---

## 5. Privacidade e notificações

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

#### Preferências antigas são sobrescritas

- Conferir se o código diferencia:

```txt
valor ausente → default true
valor existente false → preservar false
```

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
src/app/services/userEngagementService.ts
src/app/types/index.ts
supabase/migrations/20260513143000_create_activity_logs.sql
```

### Se der erro

#### Nenhum log é criado

- Verificar se `createActivityLog` está sendo chamado no fluxo.
- Verificar se `actor_user_id` está preenchido.
- Verificar RLS da tabela `activity_logs`.

#### Log falha para usuário comum

- Conferir que `createActivityLog` usa:

```ts
insert(activityPayload)
```

- Não deve usar:

```ts
.select('*').single()
```

#### Admin não vê logs

- Verificar policy SELECT para admin.
- Verificar `is_admin_user(auth.uid())`.

#### Metadata contém dados sensíveis

- Corrigir sanitização em `activityLogService.ts`.

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

#### Upload falha por permissão

- Verificar policies de Storage em:

```txt
person-avatars
historical-files
```

#### Imagem antiga base64 não aparece

- Não converter automaticamente.
- A visualização deve aceitar `data:` legado.

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
```

### Se der erro

#### Usuário não consegue adicionar arquivo ao próprio perfil

- Verificar se `ArquivosHistoricos` está presente em `MinhaArvore.tsx` ou `MeusDados.tsx`.
- Verificar se `pessoaId` está sendo passado.

#### Arquivo aparece no admin, mas não no perfil

- Verificar `PersonProfile.tsx`.
- Verificar `listarArquivosHistoricosPorPessoa`.

#### Remoção falha

- Verificar RLS de `arquivos_historicos`.
- Verificar se o usuário está vinculado à pessoa.

---

## 9. Arquivos históricos de relacionamentos

### Arquivos envolvidos

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
src/app/types/index.ts
supabase/migrations/20260514120000_add_relationship_historical_files.sql
```

### Se der erro

#### Arquivo de relacionamento não salva

- Verificar se `relacionamentoId` está sendo passado para `ArquivosHistoricos`.
- Verificar `adicionarArquivoHistoricoAoRelacionamento`.
- Verificar se usuário é admin.

#### Arquivo salva sem `relacionamento_id`

- Corrigir chamada do componente no `ViewMarriageModal.tsx`.
- Confirmar que o objeto usa:

```txt
relacionamento_id
```

#### Usuário comum consegue adicionar arquivo de relacionamento

- Verificar `readOnly={!isAdmin}` no modal.
- Verificar guarda admin no service.

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

---

## 13. Modal de relacionamento conjugal

### Arquivos envolvidos

```txt
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/ArquivosHistoricos.tsx
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

#### Usuário comum vê observações

- Corrigir renderização condicional:

```tsx
{isAdmin && ...}
```

#### Admin não consegue salvar arquivos

- Verificar `salvarArquivosHistoricosDoRelacionamento`.
- Verificar RLS.
- Verificar `relacionamentoId`.

---

## 14. Relacionamentos admin / status conjugal

### Arquivos envolvidos

```txt
src/app/pages/admin/AdminRelacionamentos.tsx
src/app/pages/admin/AdminRelacionamentoForm.tsx
src/app/components/RelacionamentoManager.tsx
src/app/services/dataService.ts
src/app/types/index.ts
src/app/services/activityLogService.ts
```

### Se der erro

#### Status conjugal não salva

- Verificar `RELACIONAMENTO_COLUMNS` em `dataService.ts`.
- Conferir campos:
  - `ativo`
  - `data_separacao`
  - `local_separacao`
  - `observacoes`

#### Inverso não atualiza

- Verificar função de atualização com inverso em `dataService.ts`.

#### Genealogia não reflete separação

- Verificar se `obterTodosRelacionamentos` traz os campos novos.
- Verificar `getGenealogyMarriageStatus`.

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
src/app/routes.tsx
src/app/types/index.ts
supabase/migrations/20260513173000_create_relationship_change_requests.sql
```

### Se der erro

#### Usuário comum ainda altera relacionamento real

- Verificar `MinhaArvore.tsx`.
- Verificar se está chamando `createRelationshipChangeRequest`, não `adicionarRelacionamentoComInverso`.

#### Solicitação não aparece no admin

- Verificar `listAllRelationshipChangeRequests`.
- Verificar RLS de `relationship_change_requests`.

#### Aprovação não altera relacionamento

- Verificar `approveRelationshipChangeRequest`.
- Verificar chamadas para `dataService`.

#### Rejeição altera relacionamento

- Corrigir service: rejeitar deve apenas mudar status.

#### Solicitação duplicada

- Verificar helper de deduplicação no service.
- Se persistir, considerar constraint única parcial no banco futuramente.

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
  - `Relacionamento`
  - `ArquivoHistorico`
  - `ActivityLog`
  - `RelationshipChangeRequest`
  - `MarriageNodeDetails`

#### Campo existe no banco, mas não no frontend

- Atualizar `types/index.ts`.
- Atualizar colunas selecionadas no service correspondente.

---

## 21. Migrations Supabase

### Arquivos envolvidos

```txt
supabase/migrations/20260513143000_create_activity_logs.sql
supabase/migrations/20260513160000_create_storage_upload_buckets.sql
supabase/migrations/20260513170000_restrict_relationship_writes_to_admins.sql
supabase/migrations/20260513173000_create_relationship_change_requests.sql
supabase/migrations/20260514120000_add_relationship_historical_files.sql
```

### Se der erro

#### Funciona local, mas não no remoto

- Rodar:

```bash
supabase db push
```

#### RLS inesperada

- Verificar policies no SQL Editor:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

#### Migration já aplicada

- `supabase db push` deve informar que o remoto está atualizado.

---

## 22. Checklist rápido de investigação por sintoma

### Usuário comum conseguiu fazer algo que não deveria

Verificar:

```txt
ProtectedRoute
permissionService.ts
RLS da tabela
service chamado pela UI
```

### Algo salva no banco, mas não aparece na tela

Verificar:

```txt
service de leitura
cache/refetch
treeDataCache
colunas selecionadas no dataService
types/index.ts
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
ArquivosHistoricos.tsx
Admin routes
ProtectedRoute
```

### Upload falha

Verificar:

```txt
storageService.ts
bucket
Storage policies
URL salva no banco
activity logs
```

### Relacionamento aparece errado

Verificar:

```txt
dataService.ts
RELACIONAMENTO_COLUMNS
genealogyColumnsLayout.ts
relationshipChangeRequestService.ts
AdminRelacionamentos.tsx
```

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
```
````
