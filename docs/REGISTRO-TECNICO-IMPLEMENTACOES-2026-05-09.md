# Registro técnico do projeto ArvoreFamilia

**Arquivo sugerido:** `docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md`  
**Projeto:** `tuliust/arvorefamilia`  
**Data de consolidação:** 2026-05-09  
**Status:** consolidação técnica após auditoria, correções de admin, RLS, migrations, relacionamentos, arquivos históricos e dump remoto.

> Este documento registra o que foi analisado, ajustado e implementado durante a rodada de diagnóstico e correção do projeto. Ele deve ser usado como referência operacional para manutenção, onboarding técnico e próximas etapas de desenvolvimento.

---

## 1. Visão geral do projeto

O projeto é uma SPA em **React + TypeScript + Vite** para uma árvore genealógica familiar, com autenticação, área de membro, painel administrativo, fórum, calendário familiar, Google Calendar, favoritos, notificações, arquivos históricos e integração de IA.

### Stack principal

| Camada | Tecnologia |
|---|---|
| Front-end | React 18 + TypeScript |
| Build/dev server | Vite |
| Roteamento | React Router |
| Backend/BaaS | Supabase |
| Auth | Supabase Auth |
| Banco | Supabase PostgreSQL |
| Segurança | RLS + RPCs |
| UI | Tailwind CSS, Radix/shadcn-like components, Lucide |
| Árvore visual | ReactFlow |
| Layout de árvore | Algoritmos internos + Dagre instalado |
| Notificações UI | Sonner |
| Edge/server functions | Supabase Functions, API local `/api/ai` |
| Integrações externas | Google Calendar, OpenAI API |

---

## 2. Estrutura principal do projeto

### Pastas principais

```text
src/
  app/
    components/
    contexts/
    data/
    lib/
    pages/
    services/
    types/
    utils/
  styles/

supabase/
  migrations/
  functions/
  dumps/          # ignorado no Git
  forum-schema.sql
  google-calendar-schema.sql

api/
  ai.ts

README.md
ARCHITECTURE.md
DEPLOYMENT.md
MIGRATION-GUIDE.md
```

### Arquivos-chave

| Arquivo | Função |
|---|---|
| `src/main.tsx` | Entrada da aplicação |
| `src/app/App.tsx` | Configuração global com providers e router |
| `src/app/routes.tsx` | Mapa central das rotas |
| `src/app/contexts/AuthContext.tsx` | Sessão e autenticação Supabase |
| `src/app/components/ProtectedRoute.tsx` | Proteção de rotas admin |
| `src/app/components/MemberRoute.tsx` | Proteção de rotas de membro |
| `src/app/components/TreeAccessRoute.tsx` | Proteção da árvore principal |
| `src/app/services/permissionService.ts` | Checagem de admin e permissões de edição |
| `src/app/services/dataService.ts` | CRUD de pessoas/relacionamentos e funções legadas de importação |
| `src/app/services/arquivosHistoricosService.ts` | Serviço relacional de arquivos históricos |
| `src/app/services/memberProfileService.ts` | Perfis, vínculos e primeiro acesso |
| `src/app/services/forumService.ts` | Fórum familiar |
| `src/app/services/googleCalendarService.ts` | Integração com Google Calendar |
| `src/app/lib/supabaseClient.ts` | Cliente Supabase oficial do app |
| `supabase/migrations/` | Fonte versionada do schema Supabase |

---

## 3. Rotas e fluxos de acesso

### Rotas públicas

| Rota | Componente | Observação |
|---|---|---|
| `/entrar` | `Entrar` | Login, cadastro, primeiro acesso, recuperação de senha |
| `/admin/login` | `AdminLogin` | Tela ponte para login real |

### Rotas protegidas por `TreeAccessRoute`

| Rota | Componente | Regra |
|---|---|---|
| `/` | `Home` | Exige autenticação, vínculo e confirmação de acesso/dados |

### Rotas protegidas por `MemberRoute`

| Rota | Componente |
|---|---|
| `/minha-arvore` | `MinhaArvore` |
| `/meus-dados` | `MeusDados` |
| `/meus-vinculos` | `MeusVinculos` |
| `/vincular-perfil` | `VincularPerfil` |
| `/pessoa/:id` | `PersonProfile` |
| `/pessoas/:id` | `PersonProfile` |
| `/calendario-familiar` | `CalendarioFamiliar` |
| `/meus-favoritos` | `MeusFavoritos` |
| `/notificacoes` | `CentralNotificacoes` |
| `/forum` | `ForumHome` |
| `/forum/novo` | `ForumNovoTopico` |
| `/forum/topico/:id` | `ForumTopico` |
| `/forum/topico/:id/editar` | `ForumEditarTopico` |

### Rotas protegidas por `ProtectedRoute`

| Rota | Componente |
|---|---|
| `/admin` | `AdminDashboard` |
| `/admin/dashboard` | `AdminDashboard` |
| `/admin/pessoas` | `AdminPessoas` |
| `/admin/pessoas/nova` | `AdminPessoaForm` |
| `/admin/pessoas/:id/editar` | `AdminPessoaForm` |
| `/admin/pessoas/:id` | `AdminPessoaForm` |
| `/admin/relacionamentos` | `AdminRelacionamentos` |
| `/admin/relacionamentos/novo` | `AdminRelacionamentoForm` |
| `/admin/importacao` | `AdminImportacao` |
| `/admin/migrar-dados` | `AdminMigrarDados` |
| `/admin/diagnostico` | `AdminDiagnostico` |

---

## 4. Principais fluxos funcionais

### 4.1 Autenticação

O projeto usa **Supabase Auth**. O `AuthContext` centraliza:

- sessão atual;
- usuário atual;
- loading de autenticação;
- login;
- cadastro;
- logout;
- listener de mudanças de sessão.

O fluxo de login principal ocorre em `/entrar`.

### 4.2 Primeiro acesso e vínculo de pessoa

O projeto usa um fluxo de primeiro acesso para vincular uma conta autenticada a uma pessoa da árvore.

Objetos relevantes:

- `profiles`;
- `user_person_links`;
- `validate_first_access_code`;
- `ensure_first_access_person_link`;
- `TreeAccessRoute`;
- `MemberRoute`;
- `memberProfileService`.

### 4.3 Admin

O admin é acessado por `/admin` e subrotas.

A autorização deixou de depender de e-mail fixo no frontend. O fluxo atual usa:

```ts
supabase.rpc('is_admin_user', { target_user_id: user.id })
```

A função no banco consulta `profiles.role = 'admin'`.

Para promover um usuário admin no Supabase:

```sql
update public.profiles
set role = 'admin'
where id = '<auth_user_id>';
```

> Não registrar IDs reais de usuários em documentação pública do repositório.

### 4.4 Árvore genealógica

A árvore é renderizada em `Home` e componentes dentro de `FamilyTree`.

Funcionalidades existentes:

- busca de pessoas;
- visualização por árvore;
- filtros;
- modos de visualização;
- modais de relacionamento;
- preferências locais;
- integração com IA em fluxo específico.

### 4.5 Perfil de pessoa

`PersonProfile` exibe dados individuais, relacionamentos, arquivos históricos, permissões de edição, favoritos e tópicos relacionados.

Após os ajustes, permissões de admin passam a depender de checagem assíncrona por RPC/role.

### 4.6 Fórum

O fórum tem categorias, tópicos, respostas, comentários, reações, denúncias e marcação de solução.

Objetos principais:

- `forum_categorias`;
- `forum_topicos`;
- `forum_respostas`;
- `forum_comentarios`;
- `forum_reacoes`;
- `forum_denuncias`;
- RPC `forum_increment_topic_view`;
- RPC `forum_mark_solution`;
- helper `forum_is_admin`.

`forum_is_admin()` foi corrigida para usar:

```sql
select public.is_admin_user(auth.uid());
```

### 4.7 Google Calendar

Integração versionada em migrations, com:

- `google_calendar_connections`;
- `google_calendar_oauth_states`;
- `google_calendar_synced_events`;
- view `google_calendar_connection_status`;
- Edge Functions para OAuth/sync.

Tokens devem ficar restritos a Edge Functions/service role, sem exposição no frontend.

### 4.8 Arquivos históricos

A modelagem correta passou a ser **tabela relacional**, não JSON dentro de `pessoas`.

Tabela oficial:

```text
public.arquivos_historicos
```

Campos principais:

- `id`;
- `pessoa_id`;
- `tipo`;
- `url`;
- `titulo`;
- `descricao`;
- `ano`;
- `ordem`;
- timestamps.

A coluna antiga `public.pessoas.arquivos_historicos jsonb` ainda existe no banco remoto, mas os dados relevantes foram migrados para a tabela relacional. A coluna antiga não foi removida para evitar perda acidental.

### 4.9 Relacionamentos

A lógica de relacionamentos inversos foi centralizada.

Funções relevantes mencionadas nos ajustes:

- `getRelacionamentoInversoPayload`;
- `adicionarRelacionamentoComInverso`;
- `encontrarRelacionamentoInverso`;
- `excluirRelacionamentoComInverso`;
- `excluirRelacionamentoPorPayloadComInverso`.

Regras:

| Relação | Inverso esperado |
|---|---|
| `conjuge` A → B | `conjuge` B → A |
| `pai` / `mae` filho → pai/mãe | pai/mãe → filho |
| `irmao` A → B | `irmao` B → A |
| `filho` | só cria inverso se houver informação suficiente para `pai` ou `mae` |

Limitação documentada: relação `filho` não deve inventar `pai` ou `mae` sem contexto.

---

## 5. Banco de dados e Supabase

### 5.1 Tabelas principais

#### Core familiar

- `pessoas`;
- `relacionamentos`;
- `imagens_pessoa`;
- `arquivos_historicos`.

#### Auth/perfil/membros

- `profiles`;
- `user_person_links`.

#### Engajamento/eventos

- `user_favorites`;
- `notification_preferences`;
- `notifications`;
- `family_events`;
- `event_attendees`.

#### Fórum

- `forum_categorias`;
- `forum_topicos`;
- `forum_respostas`;
- `forum_comentarios`;
- `forum_reacoes`;
- `forum_denuncias`.

#### Google Calendar

- `google_calendar_connections`;
- `google_calendar_oauth_states`;
- `google_calendar_synced_events`;
- view `google_calendar_connection_status`.

### 5.2 RLS

Foi confirmado que RLS está habilitado em tabelas centrais, fórum, Google Calendar, perfis, favoritos, notificações e vínculos.

Tabelas confirmadas com RLS habilitado:

- `arquivos_historicos`;
- `event_attendees`;
- `family_events`;
- `forum_categorias`;
- `forum_comentarios`;
- `forum_denuncias`;
- `forum_reacoes`;
- `forum_respostas`;
- `forum_topicos`;
- `google_calendar_connections`;
- `google_calendar_oauth_states`;
- `google_calendar_synced_events`;
- `notification_preferences`;
- `notifications`;
- `pessoa_social_profiles`;
- `pessoas`;
- `profiles`;
- `relacionamentos`;
- `user_favorites`;
- `user_person_links`.

### 5.3 Policies corrigidas

Foram removidas policies antigas permissivas de:

#### `public.pessoas`

- `"Permitir leitura pública de pessoas"`;
- `"Permitir inserção de pessoas via service role"`;
- `"Permitir atualização de pessoas via service role"`;
- `"Permitir deleção de pessoas via service role"`.

#### `public.arquivos_historicos`

- `"Permitir leitura pública de arquivos históricos"`;
- `"Permitir inserção de arquivos via service role"`;
- `"Permitir atualização de arquivos via service role"`;
- `"Permitir deleção de arquivos via service role"`.

Depois da correção, ficaram policies baseadas em:

- role `authenticated`;
- `is_admin_user(auth.uid())`;
- vínculo em `user_person_links`.

### 5.4 Funções/RPCs importantes

| Função | Finalidade |
|---|---|
| `is_admin_user(target_user_id uuid)` | Verifica se `profiles.role = 'admin'` |
| `forum_is_admin()` | Admin do fórum via `is_admin_user(auth.uid())` |
| `forum_increment_topic_view(topic_id uuid)` | Incrementa visualização de tópico |
| `forum_mark_solution(target_topico_id uuid, target_resposta_id uuid)` | Marca solução no fórum |
| `validate_first_access_code(access_code uuid)` | Valida primeiro acesso |
| `ensure_first_access_person_link(target_pessoa_id uuid)` | Cria vínculo usuário-pessoa |

---

## 6. Migrations criadas/adicionadas durante a rodada

| Migration | Objetivo |
|---|---|
| `20260509100000_add_forum_schema.sql` | Versionar schema do fórum |
| `20260509100100_add_google_calendar_schema.sql` | Versionar Google Calendar |
| `20260509100200_enable_rls_core_family_tables.sql` | Habilitar RLS core e policies seguras |
| `20260509100300_use_profile_role_for_forum_admin.sql` | Remover admin de fórum por e-mail fixo |
| `20260509100400_remove_legacy_public_core_policies.sql` | Remover policies antigas/permissivas |
| `20260509100500_migrate_legacy_pessoas_arquivos_historicos.sql` | Migrar JSONB legado para tabela relacional |

---

## 7. Ajustes implementados

### 7.1 Rotas

- Criada rota `/admin/relacionamentos/novo`.
- Criado/registrado `AdminRelacionamentoForm`.
- Protegidas com `MemberRoute`:
  - `/calendario-familiar`;
  - `/meus-favoritos`;
  - `/notificacoes`.

### 7.2 Admin

- Logout do admin passou a usar `signOut()`.
- Removido fallback por e-mail no frontend.
- Admin passa a depender de RPC/role.
- `/admin/migrar-dados` foi protegido.
- `AdminDiagnostico` foi marcado como legado e recebeu tratamento melhor de erros.
- `AdminRelacionamentos` passou a usar fluxo com inversos.

### 7.3 Ferramenta destrutiva de migração

A tela `/admin/migrar-dados` deixou de ser uma operação simples de clique.

Proteções adicionadas:

- exige digitar `MIGRAR DADOS`;
- bloqueia em produção, salvo `VITE_ENABLE_DESTRUCTIVE_ADMIN_TOOLS=true`;
- exibe avisos explícitos;
- `migrarDados` foi marcado como `@deprecated`;
- fluxo destrutivo não deve ser considerado operação normal.

### 7.4 Arquivos históricos

- `arquivos_historicos` removido do payload de `pessoas`.
- Criado `arquivosHistoricosService`.
- `AdminPessoaForm`, `MeusVinculos` e `PersonProfile` passaram a usar a tabela relacional.
- Migration criada para copiar dados legados de `pessoas.arquivos_historicos`.
- Campo antigo não foi removido.

### 7.5 Segurança

- `ProtectedRoute` agora valida admin via RPC.
- `permissionService.isAdminUser()` usa `supabase.rpc('is_admin_user')`.
- `isMainAdmin` e `MAIN_ADMIN_EMAIL` foram removidos.
- `forum_is_admin()` passou a usar role no banco.
- Policies antigas permissivas foram removidas.

### 7.6 Dump remoto

Foi gerado dump real do schema remoto em:

```text
supabase/dumps/supabase_schema_remote_20260509043321.sql
```

O arquivo tem conteúdo real de schema. Dois dumps anteriores vazios foram identificados.

`supabase/dumps/*.sql` foi adicionado ao `.gitignore` para evitar commit acidental de dumps.

---

## 8. Comandos úteis

### Rodar projeto

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Git

```bash
git status
git add .
git commit -m "Mensagem do commit"
git push origin main
```

### Colima/Docker

```bash
colima start
docker ps
```

### Gerar dump remoto

```bash
mkdir -p supabase/dumps
supabase db dump --db-url "COLE_A_CONNECTION_STRING_DO_SUPABASE_AQUI" --schema public > supabase/dumps/supabase_schema_remote_$(date +%Y%m%d%H%M%S).sql
```

### Auditar RLS habilitado

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

### Auditar policies

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

### Auditar funções sensíveis

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_admin_user',
    'forum_is_admin',
    'forum_increment_topic_view',
    'forum_mark_solution',
    'validate_first_access_code',
    'ensure_first_access_person_link'
  )
order by p.proname;
```

---

## 9. Validações já feitas

- `npm run build` passou após as rodadas de alteração.
- Aviso conhecido do Vite sobre chunk grande permaneceu, sem bloquear.
- `git status` final indicou working tree limpo.
- Dump remoto real foi gerado com 65 KB.
- Dump não entrou no Git.
- RLS está habilitado nas tabelas listadas.
- Admin foi promovido no banco via `profiles.role = 'admin'`.
- `forum_is_admin()` foi validado usando `is_admin_user(auth.uid())`.
- Policies antigas de `pessoas` e `arquivos_historicos` foram removidas.
- Um arquivo histórico legado foi migrado para a tabela relacional.

---

## 10. Testes manuais ainda necessários

Antes de tratar como produção estável, executar os testes abaixo.

### Admin

- usuário com `profiles.role = 'admin'` acessa `/admin`;
- usuário comum é bloqueado em `/admin`;
- fallback por e-mail não libera acesso;
- `/admin/dashboard` carrega métricas;
- logout encerra sessão.

### RLS

- usuário anônimo não lê `pessoas`;
- usuário autenticado lê `pessoas`;
- usuário comum não cria/deleta `pessoas`;
- usuário comum não cria/deleta `relacionamentos`;
- admin cria/edita/deleta;
- usuário vinculado edita apenas a própria pessoa.

### Relacionamentos

- criar cônjuge cria inverso;
- excluir cônjuge remove inverso;
- criar pai/mãe cria filho inverso;
- irmão cria inverso;
- relação `filho` sem contexto não inventa `pai`/`mae`;
- duplicidade é tratada sem quebrar UX.

### Arquivos históricos

- perfil exibe arquivo migrado;
- admin adiciona/remove arquivo;
- usuário vinculado edita arquivo próprio;
- usuário comum não edita arquivo de outro;
- coluna antiga `pessoas.arquivos_historicos` não é mais usada pelo frontend.

### Fórum

- listar categorias;
- criar tópico;
- editar tópico próprio;
- responder;
- comentar;
- reagir;
- marcar solução;
- admin modera;
- usuário comum não acessa dados de denúncia admin.

### Google Calendar

- view `google_calendar_connection_status` responde;
- fluxo de OAuth funciona;
- sync funciona;
- tokens não aparecem no frontend.

### Migração destrutiva

- `/admin/migrar-dados` fica bloqueado em produção;
- local só libera com frase exata e variável adequada;
- ferramenta não é executada acidentalmente.

---

## 11. Pendências técnicas futuras

### Alta prioridade, se o recurso continuar existindo

- Tornar `migrarDados` transacional via RPC ou Edge Function.
- Evitar rotina destrutiva client-side.
- Criar backup/restore documentado para migrações.

### Média prioridade

- Remover coluna antiga `pessoas.arquivos_historicos` após validação total.
- Migrar favoritos de `localStorage` para Supabase.
- Migrar notificações de `localStorage` para Supabase.
- Remover `DEFAULT_USER_ID = demo-user`, se ainda existir.
- Migrar upload admin para Supabase Storage.
- Comparar dump remoto com migrations para identificar drift residual.
- Atualizar `MIGRATION-GUIDE.md` de ponta a ponta.
- Arquivar scripts SQL legados em pasta histórica.

### Baixa/média prioridade

- Refatorar `dataService.ts`.
- Refatorar `forumService.ts`.
- Refatorar `memberProfileService.ts`.
- Reduzir acoplamento de `Home.tsx`.
- Separar componentes inline do fórum.
- Criar matriz de funcionalidades: público / membro / admin / legado / experimental.
- Padronizar tratamento de erro dos services.
- Criar testes automatizados.

---

## 12. Pontos de atenção

### 12.1 Duplicidade semântica em rotas admin

Ainda existem:

```text
/admin/pessoas/:id
/admin/pessoas/:id/editar
```

Ambas usam `AdminPessoaForm`. Isso não é necessariamente bug, mas pode ser padronizado futuramente.

### 12.2 Coluna antiga de arquivos históricos

A coluna `pessoas.arquivos_historicos jsonb` ainda existe. Não apagar até concluir validação em staging/produção.

### 12.3 Scripts legados

Existem scripts como:

- `database-schema.sql`;
- `supabase/forum-schema.sql`;
- `supabase/google-calendar-schema.sql`;
- arquivos de diagnóstico.

Esses devem ser tratados como referência histórica ou movidos futuramente para `docs/legacy` / `sql/legacy`.

### 12.4 Dumps

Não commitar dumps do Supabase. Manter `supabase/dumps/*.sql` no `.gitignore`.

### 12.5 Dados sensíveis

Não registrar em docs públicas:

- senha do banco;
- service role key;
- tokens Google;
- tokens OpenAI;
- connection strings completas;
- IDs reais de usuários, salvo em documentação privada.

---

## 13. Recomendações de onde manter esta documentação

Sugestão principal:

```text
docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md
```

Motivo:

- separa documentação operacional de arquivos soltos na raiz;
- cria histórico técnico da rodada;
- evita poluir README;
- facilita consulta futura.

Se a pasta `docs/` ainda não existir, criar:

```bash
mkdir -p docs
```

Depois adicionar o arquivo:

```bash
docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md
```

Comitar:

```bash
git add docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md
git commit -m "Documenta registro técnico das implementações"
git push origin main
```

---

## 14. Resumo executivo final

Durante esta rodada, o projeto saiu de um estado com documentação desatualizada, admin por e-mail fixo, scripts SQL soltos, policies antigas permissivas, arquivos históricos ambíguos e ferramenta destrutiva frágil para um estado mais consistente:

- admin baseado em `profiles.role`;
- RLS habilitado e policies antigas removidas;
- fórum e Google Calendar versionados em migrations;
- arquivos históricos tratados como tabela relacional;
- dados legados migrados;
- rotas pessoais protegidas;
- rota de novo relacionamento criada;
- relacionamentos inversos centralizados;
- dump remoto gerado;
- documentação principal atualizada;
- ferramenta destrutiva bloqueada/protegida.

Ainda não considerar produção final sem executar os testes manuais de admin, RLS, relacionamentos, arquivos históricos, fórum e Google Calendar.
