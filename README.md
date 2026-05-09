# Sistema de Arvore Genealogica

Aplicacao React + TypeScript + Vite para arvore genealogica familiar com area de membros, painel administrativo, forum e integracao opcional com Google Calendar.

## Estado Atual

- Frontend em React 18, React Router 7 e Tailwind CSS v4.
- Persistencia em Supabase Postgres via `@supabase/supabase-js`.
- Autenticacao real via Supabase Auth.
- Regras de acesso no frontend:
  - `TreeAccessRoute`: protege a arvore principal e direciona usuarios sem vinculo confirmado.
  - `MemberRoute`: protege paginas de membro.
  - `ProtectedRoute`: protege admin com verificacao de perfil admin no Supabase e fallback temporario por e-mail.
- `supabase/migrations` e a fonte principal do schema.
- Scripts SQL soltos existem como historico/referencia e nao devem substituir migrations.

## Variaveis De Ambiente

Crie `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Se usar rotinas server/API com OpenAI:

```env
OPENAI_API_KEY=sua-chave
```

Ferramentas destrutivas de admin ficam bloqueadas em producao. Para liberar em ambiente controlado:

```env
VITE_ENABLE_DESTRUCTIVE_ADMIN_TOOLS=true
```

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Rotas Principais

- `/entrar`: login/cadastro.
- `/`: arvore principal protegida por `TreeAccessRoute`.
- `/minha-arvore`, `/meus-dados`, `/meus-vinculos`, `/calendario-familiar`, `/meus-favoritos`, `/notificacoes`: area de membro.
- `/forum`: forum familiar.
- `/admin/login`: entrada admin.
- `/admin`, `/admin/dashboard`: dashboard admin.
- `/admin/pessoas`, `/admin/pessoas/nova`, `/admin/pessoas/:id/editar`: gestao de pessoas.
- `/admin/relacionamentos`, `/admin/relacionamentos/novo`: gestao de relacionamentos.
- `/admin/migrar-dados`: ferramenta destrutiva protegida por confirmacao e bloqueio em producao.

## Banco E Migrations

Use `supabase/migrations` como fonte da verdade. Nao aplique `database-schema.sql` como schema principal em novos ambientes.

Inclui migrations para:

- Tabelas core: `pessoas`, `relacionamentos`, `imagens_pessoa`, `arquivos_historicos`.
- Perfis e vinculos: `profiles`, `user_person_links`.
- Forum: `forum_*`.
- Google Calendar: `google_calendar_*` e view `google_calendar_connection_status`.
- RLS core e policies de acesso.

Nao rode `supabase db push` ou migrations em producao sem revisao e backup.

## Observacoes Operacionais

- `arquivos_historicos` e tratado como tabela relacional, nao como coluna JSON de `pessoas`.
- Relacionamentos criados pelos fluxos admin usam service centralizado para criar/remover inversos quando possivel.
- A ferramenta `/admin/migrar-dados` apaga dados antes de importar seed; use apenas em ambiente controlado.

## Documentacao

- `ARCHITECTURE.md`: arquitetura atual.
- `DEPLOYMENT.md`: deploy e Supabase.
- Relatorios antigos permanecem no repositorio como historico.
