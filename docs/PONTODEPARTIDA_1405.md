Baseado no conteúdo que você enviou para transformar em Markdown. 

````md
# Plano de retomada dos testes e próximas implementações

## Objetivo deste documento

Este documento organiza a retomada dos trabalhos após as implementações realizadas em 13/05, com foco em:

- validar manualmente as funcionalidades recém-implementadas;
- registrar bugs e observações;
- priorizar correções;
- mapear próximas implementações;
- indicar arquivos prováveis relacionados a cada frente;
- manter uma ordem racional para desenvolvimento.

---

# 1. Preparação inicial

Antes de iniciar novos ajustes, revisar os documentos já criados:

```txt
docs/IMPLEMENTACOES_1305.md
docs/SEDERERRO_1305.md
```

## Checklist técnico inicial

Executar no terminal:

```bash
git status
npm run build
git diff --check
supabase db push
```

## Resultado esperado

- `git status` sem alterações pendentes, salvo se houver novos registros de teste.
- `npm run build` passando.
- `git diff --check` sem erros.
- `supabase db push` informando que o remoto está atualizado.

## Se algo falhar

- Se o build falhar: corrigir antes de qualquer teste manual.
- Se houver migration pendente: aplicar antes dos testes.
- Se houver diff inesperado: revisar antes de começar nova implementação.

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
```

## Comandos úteis

```bash
git log --oneline -5
git status
npm run build
git diff --check
supabase db push
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

---

# 3. Ordem racional dos testes manuais

A ordem abaixo evita testar uma funcionalidade dependente antes de confirmar suas bases.

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

### Arquivos prováveis

```txt
src/app/pages/Home.tsx
src/app/components/ProtectedRoute.tsx
src/app/services/permissionService.ts
src/app/routes.tsx
```

---

## 3.2 Minha Árvore

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

### Arquivos prováveis

```txt
src/app/pages/MinhaArvore.tsx
src/app/services/relationshipChangeRequestService.ts
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/components/FamilyTree/modals/AddConnectionModal.tsx
```

---

## 3.3 Genealogia

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

### Arquivos prováveis

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx
src/app/components/FamilyTree/GenealogySpouseEdge.tsx
src/app/components/FamilyTree/layouts/filterPersonalTreeScope.ts
src/app/pages/Home.tsx
```

---

## 3.4 Visão Completa

### Objetivo

Confirmar que a view Visão Completa mostra todas as pessoas cadastradas usando o layout de Genealogia.

### Checklist

- [ ] Abrir view Visão Completa.
- [ ] Confirmar que mostra a base completa.
- [ ] Confirmar que não está limitada ao escopo pessoal.
- [ ] Confirmar conectores pais-filhos.
- [ ] Confirmar anéis entre cônjuges.
- [ ] Confirmar filtros funcionando.

### Arquivos prováveis

```txt
src/app/components/FamilyTree/FamilyTree.tsx
src/app/components/FamilyTree/ViewModeToggle.tsx
src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts
src/app/pages/Home.tsx
```

---

## 3.5 Modal do anel 💍

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
- [ ] Confirmar que URL salva é Storage, não base64.
- [ ] Confirmar `historical_file.added` em `activity_logs`.

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
src/app/pages/Home.tsx
```

---

## 3.6 Upload de arquivo histórico de relacionamento

### Objetivo

Confirmar que arquivos históricos ligados a relacionamentos são salvos corretamente.

### Checklist

- [ ] Adicionar arquivo pelo modal conjugal como admin.
- [ ] Confirmar que o arquivo aparece no modal após salvar.
- [ ] Confirmar que a URL salva aponta para `historical-files`.
- [ ] Confirmar que `relacionamento_id` está preenchido.
- [ ] Confirmar que `pessoa_id` não foi usado indevidamente.
- [ ] Confirmar log `historical_file.added`.
- [ ] Testar edição de título/descrição/ano.
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

### Arquivos prováveis

```txt
src/app/components/ArquivosHistoricos.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/services/arquivosHistoricosService.ts
src/app/services/storageService.ts
supabase/migrations/20260514120000_add_relationship_historical_files.sql
```

---

## 3.7 Solicitações de vínculos

### Objetivo

Confirmar que usuários comuns criam solicitações e admins revisam.

### Checklist usuário comum

- [ ] Solicitar criação de vínculo.
- [ ] Solicitar remoção de vínculo.
- [ ] Solicitar correção de vínculo conjugal.
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
src/app/services/dataService.ts
src/app/services/activityLogService.ts
src/app/routes.tsx
supabase/migrations/20260513173000_create_relationship_change_requests.sql
```

---

## 3.8 Histórico de atividades

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
- [ ] Confirmar logs de solicitações de vínculo.
- [ ] Confirmar que metadata não contém URL completa, base64, telefone, endereço ou e-mail.

### Arquivos prováveis

```txt
src/app/pages/admin/AdminAtividades.tsx
src/app/services/activityLogService.ts
src/app/services/dataService.ts
src/app/services/memberProfileService.ts
src/app/services/arquivosHistoricosService.ts
src/app/services/userEngagementService.ts
src/app/services/relationshipChangeRequestService.ts
src/app/types/index.ts
supabase/migrations/20260513143000_create_activity_logs.sql
```

---

## 3.9 Tela de integridade

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
- Permite usuário comum acessar/admin ou alterar dados restritos.
- Causa perda de dados.

### P1 - Alto

- Fluxo principal falha.
- Solicitação de vínculo não registra.
- Histórico não registra.
- Upload falha.
- Modal conjugal não abre.
- Admin não consegue aprovar/rejeitar solicitação.

### P2 - Médio

- Problema visual relevante.
- Diagnóstico incorreto.
- Filtro não funciona.
- Status visual inconsistente.
- Toast/feedback confuso.

### P3 - Baixo

- Texto.
- Ajuste fino de layout.
- Pequeno ruído em log.
- Melhorias de usabilidade.

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

## Pendências técnicas

- [ ] Verificar se upload abandonado no modal deixa objeto órfão no Storage.
- [ ] Criar controle para evitar uploads órfãos no Storage.
- [ ] Refinar `/admin/integridade` com filtros por severidade.
- [ ] Remover campo técnico `lado` dos `changed_fields` do histórico.
- [ ] Implementar lazy loading das rotas admin e bibliotecas pesadas.
- [ ] Avaliar limpeza ou migração futura de arquivos antigos em base64 para Storage.

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

## 6.2 Segundo: fluxos principais

1. Modal do anel 💍.
2. Upload de arquivo histórico de relacionamento.
3. Solicitações de vínculo.
4. Histórico de atividades.
5. Tela de integridade.

## 6.3 Terceiro: melhorias técnicas

1. Uploads órfãos.
2. Lazy loading.
3. Filtros na integridade.
4. Limpeza de metadata.
5. Migração futura de base64 legado.

---

# 7. Próximas implementações desejadas

## 7.1 Notificações

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

### Arquivos prováveis

```txt
src/app/pages/Notificacoes.tsx
src/app/services/userEngagementService.ts
src/app/services/activityLogService.ts
src/app/types/index.ts
supabase/migrations
```

### Sugestões

- Criar painel admin para visualizar filas/estado das notificações.
- Registrar logs quando notificações forem disparadas.
- Diferenciar notificação interna, e-mail, push e WhatsApp.
- Verificar se já existe cron/edge function ou se será necessário implementar.

---

## 7.2 Astrologia e acontecimentos do nascimento

### Objetivo

Verificar se áreas de astrologia e acontecimentos do dia de nascimento estão sendo geradas automaticamente por IA e armazenadas no Supabase.

### Regra desejada

- O conteúdo deve ser gerado uma vez.
- Depois deve ser persistido no Supabase.
- Não deve ser recriado a cada acesso ao perfil.

### Pontos a verificar

- Onde o conteúdo aparece no perfil.
- Se existe tabela ou campo para armazenar o conteúdo.
- Se existe flag de geração.
- Se existe data da última geração.
- Se há fallback quando não existe data de nascimento.

### Arquivos prováveis

```txt
src/app/pages/PersonProfile.tsx
src/app/services/dataService.ts
src/app/types/index.ts
src/app/lib/supabaseClient.ts
supabase/migrations
```

### Sugestões

- Criar tabela `person_generated_insights`.
- Campos possíveis:
  - `pessoa_id`
  - `tipo`
  - `conteudo`
  - `fonte`
  - `generated_at`
  - `updated_at`
- Tipos possíveis:
  - `astrology`
  - `birth_date_events`
  - `historical_context`
- Criar botão admin para “regenerar conteúdo”.
- Evitar gerar IA automaticamente em todo carregamento de perfil.

---

## 7.3 Linha do tempo do usuário

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

### Arquivos prováveis

```txt
src/app/pages/PersonProfile.tsx
src/app/components/FamilyTree/modals/ViewMarriageModal.tsx
src/app/services/dataService.ts
src/app/services/arquivosHistoricosService.ts
src/app/types/index.ts
```

### Sugestões

- Criar componente:

```txt
src/app/components/Timeline/PersonTimeline.tsx
```

- Criar função utilitária:

```txt
src/app/utils/buildPersonTimeline.ts
```

- Não criar tabela inicialmente, se a timeline puder ser derivada dos dados existentes.
- Criar persistência apenas para eventos manuais/customizados.

### Primeira versão sugerida

- Timeline derivada automaticamente.
- Eventos ordenados por data.
- Cards simples.
- Sem edição manual.

### Versão futura

- Eventos manuais.
- Uploads por evento.
- Privacidade por evento.
- Exportação em PDF.

---

## 7.4 Entrar em contato por WhatsApp

### Objetivo

Permitir que usuários entrem em contato com familiares via WhatsApp quando permitido.

### Regras

- Mostrar botão apenas se:
  - telefone existir;
  - `permitir_exibir_telefone` ou `permitir_mensagens_whatsapp` permitir;
  - o usuário estiver autenticado, se essa for a regra desejada.

### Arquivos prováveis

```txt
src/app/pages/PersonProfile.tsx
src/app/components/PersonDataView.tsx
src/app/components/FamilyTree/PersonNode.tsx
src/app/types/index.ts
src/app/utils/personFields.ts
```

### Sugestões

- Criar helper:

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

---

## 7.5 Grau de parentesco/vínculo

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

### Exemplos de retorno esperado

```txt
Tulius → mãe → avó → bisavô
Grau: bisavô
```

---

## 7.6 Selecionar área para PDF/impressão

### Objetivo

Implementar funcionalidade para selecionar área que o usuário deseja salvar como PDF ou imprimir.

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
src/app/pages/Home.tsx
src/app/services
src/app/utils
```

### Sugestões

- Criar modo “Selecionar área”.
- Permitir arrastar retângulo sobre a árvore.
- Exportar apenas área selecionada.
- Oferecer opções:
  - PNG;
  - PDF;
  - impressão.
- Atenção a performance em árvores grandes.

---

## 7.7 Legendas visuais da árvore

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
- Admin Dashboard.
- Admin Integridade.
- Admin Solicitações de Vínculos.
- Admin Atividades.

### Arquivos prováveis

```txt
src/app/pages/Home.tsx
src/app/pages/MinhaArvore.tsx
src/app/pages/MeusDados.tsx
src/app/pages/MeusVinculos.tsx
src/app/pages/PersonProfile.tsx
src/app/pages/admin/AdminDashboard.tsx
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
| Criar relacionamento | Sim | Solicita | Não |
| Upload arquivo pessoa | Sim | Própria pessoa | Não |
| Upload arquivo relacionamento | Sim | Não | Não |
| Ver histórico global | Sim | Não | Não |
```

---

## 8.4 Criar painel de saúde técnica

Futuro painel admin com:

- última migration aplicada;
- versão/commit atual;
- status de Storage;
- contagem de logs;
- contagem de solicitações pendentes;
- últimas falhas registradas;
- tamanho aproximado de dados legados base64.

---

## 8.5 Criar testes automatizados mínimos

Sugestão inicial:

- teste de `getGenealogyMarriageStatus`;
- teste de deduplicação de solicitações;
- teste de sanitização de activity logs;
- teste de classificação de URLs Storage/base64;
- teste de build de timeline futura.

---

# 9. Ordem sugerida para desenvolvimento após QA

## Fase 1 - Correções críticas pós-teste

1. Corrigir bugs do modal 💍.
2. Corrigir bugs de `/admin/integridade`.
3. Corrigir bugs de solicitações de vínculos.
4. Corrigir logs ausentes ou metadata sensível.
5. Corrigir problemas de RLS/permissão.

## Fase 2 - Estabilização técnica

1. Evitar uploads órfãos no Storage.
2. Remover `lado` dos `changed_fields`.
3. Refinar `/admin/integridade` com filtros.
4. Implementar lazy loading.
5. Criar checklist de QA permanente.

## Fase 3 - Funcionalidades de engajamento

1. Notificações.
2. Favoritos.
3. Página de favoritos.
4. WhatsApp.

## Fase 4 - Funcionalidades de conteúdo/perfil

1. Astrologia e acontecimentos do nascimento.
2. Linha do tempo.
3. Grau de parentesco.
4. Legendas visuais.
5. Exportação PDF/impressão.

## Fase 5 - Mobile

1. Ajustes mobile das páginas públicas.
2. Ajustes mobile da árvore.
3. Ajustes mobile de modais.
4. Ajustes mobile do admin.

---

# 10. Checklist final para encerrar a rodada de testes

- [ ] `npm run build` passou.
- [ ] `git diff --check` passou.
- [ ] Supabase remoto atualizado.
- [ ] Login admin testado.
- [ ] Login usuário comum testado.
- [ ] Genealogia testada.
- [ ] Visão Completa testada.
- [ ] Modal 💍 testado.
- [ ] Upload de arquivo histórico de relacionamento testado.
- [ ] Solicitações de vínculos testadas.
- [ ] Histórico de atividades testado.
- [ ] Integridade testada.
- [ ] Bugs registrados.
- [ ] Prioridades definidas.
- [ ] Próximo prompt definido.
````
