# Arquitetura Atual

## Stack

- React 18 + TypeScript + Vite.
- React Router 7.
- Supabase Auth e Supabase Postgres.
- Tailwind CSS v4 e componentes locais em `src/app/components/ui`.
- ReactFlow/Dagre para visualizacao da arvore.

## Estrutura

```text
src/app/
  components/        componentes reutilizaveis
  components/FamilyTree/
  contexts/          AuthContext com Supabase Auth
  lib/               cliente Supabase
  pages/             telas publicas, membro, forum e admin
  services/          acesso a dados e regras de negocio
  types/             contratos TypeScript
  routes.tsx         definicao de rotas e guards
supabase/
  migrations/        fonte da verdade do schema
  functions/         Edge Functions
```

## Autenticacao E Guards

- `AuthContext` usa `supabase.auth.getSession`, `onAuthStateChange`, `signInWithPassword`, `signUpWithPassword` e `signOut`.
- `MemberRoute` exige usuario autenticado.
- `TreeAccessRoute` exige login recente e vinculo confirmado em `user_person_links`.
- `ProtectedRoute` verifica admin via RPC `is_admin_user(user.id)`.
- Existe fallback temporario por e-mail em `permissionService` com TODO para remocao depois que `profiles.role` estiver garantido em producao.

## Services

- `dataService`: CRUD de `pessoas` e `relacionamentos`, importacao de seed e regra centralizada de relacionamento inverso.
- `arquivosHistoricosService`: CRUD relacional de `public.arquivos_historicos`.
- `memberProfileService`: perfis, vinculo usuario-pessoa e fluxo de primeiro acesso.
- `forumService`: acesso a tabelas/RPCs `forum_*`.
- `googleCalendarService`: invocacao de Edge Functions e leitura da view `google_calendar_connection_status`.
- `permissionService`: autorizacao de admin e edicao por pessoa vinculada.

## Modelagem Principal

- `pessoas`: dados cadastrais e biograficos.
- `relacionamentos`: arestas entre pessoas. Fluxos admin criam inversos quando a regra e deterministica.
- `arquivos_historicos`: tabela relacional por `pessoa_id`; nao e coluna JSON em `pessoas`.
- `profiles`: perfil de usuario e role admin/member.
- `user_person_links`: vinculo entre `auth.users` e `pessoas`.
- `forum_*`: categorias, topicos, respostas, comentarios, reacoes e denuncias.
- `google_calendar_*`: conexao OAuth e metadados de eventos sincronizados.

## Banco

`supabase/migrations` e a fonte da verdade. Scripts soltos como `database-schema.sql`, `supabase/forum-schema.sql` e `supabase/google-calendar-schema.sql` sao historico/referencia quando equivalentes ja existem em migrations.

As migrations recentes consolidam:

- Forum.
- Google Calendar.
- RLS das tabelas core.

Nao aplicar schema por SQL solto em ambiente novo.

## Regras De Relacionamento

- `conjuge`: A -> B cria B -> A.
- `irmao`: A -> B cria B -> A.
- `pai`/`mae`: filho -> pai/mae cria pai/mae -> filho.
- `filho`: inverso so e criado quando o fluxo informa se o inverso deve ser `pai` ou `mae`; caso contrario nao se inventa genero/tipo.

## Ferramentas De Risco

`/admin/migrar-dados` e destrutiva. Em producao fica bloqueada salvo `VITE_ENABLE_DESTRUCTIVE_ADMIN_TOOLS=true` e exige digitar `MIGRAR DADOS`.
