# Deploy E Operacao

## Pre-requisitos

- Node.js compativel com Vite 6.
- Projeto Supabase criado.
- Variaveis de ambiente configuradas.

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Opcional para rotinas server/API:

```env
OPENAI_API_KEY=sua-chave
```

## Build

```bash
npm install
npm run build
```

O artefato fica em `dist/`.

## Supabase

Use `supabase/migrations` como fonte da verdade do banco.

Nao use `database-schema.sql` como schema principal para novos ambientes. Ele permanece como referencia historica e pode divergir das migrations atuais.

Scripts soltos:

- `supabase/forum-schema.sql`: historico/referencia; forum agora tambem esta versionado em migration.
- `supabase/google-calendar-schema.sql`: historico/referencia; Google Calendar agora tambem esta versionado em migration.
- `diagnostico-*.sql`, `verificar-irmaos.sql`, `corrigir-pessoa-isolada.sql`: scripts operacionais/diagnostico, nao migrations.

Antes de aplicar migrations em staging/producao:

1. Revisar SQL.
2. Fazer backup.
3. Aplicar primeiro em ambiente local/staging.
4. Testar login, admin, arvore, forum, arquivos historicos e Google Calendar.

Nao rode `supabase db push` em banco remoto sem autorizacao explicita.

## Admin

Admin deve ser promovido no banco:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-id>';
```

Durante a transicao ainda existe fallback temporario por e-mail no frontend. Remover quando todos os admins tiverem `profiles.role = 'admin'`.

## Ferramentas Destrutivas

`/admin/migrar-dados` apaga pessoas e relacionamentos antes de importar seed.

Em producao, a ferramenta fica bloqueada por padrao. Para liberar em ambiente controlado:

```env
VITE_ENABLE_DESTRUCTIVE_ADMIN_TOOLS=true
```

A tela ainda exige digitar `MIGRAR DADOS`.

## Deploy Estático

Configure as variaveis acima no provedor (Vercel, Netlify ou equivalente) e publique `dist`.

Exemplo:

```bash
npm run build
```

Depois configure fallback SPA para `index.html`, se o provedor exigir.
