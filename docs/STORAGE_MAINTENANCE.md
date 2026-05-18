# Manutencao de Storage

Os scripts abaixo sao seguros por padrao: geram relatorio em dry-run e nao removem nem migram dados sem flag explicita.

## Variaveis necessarias

Defina no ambiente ou em `.env.local`:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Use service role somente em ambiente administrativo local/CI protegido.
Os scripts falham com mensagem explicita se `SUPABASE_SERVICE_ROLE_KEY` nao estiver definida.

## Diagnostico de orfaos

```bash
node scripts/storage-diagnose-orphans.mjs --output=/tmp/storage-orphans.json
```

O script compara objetos dos buckets `person-avatars` e `historical-files` com referencias em:

- `public.pessoas.foto_principal_url`;
- `public.arquivos_historicos.url`;
- `public.arquivos_historicos.storage_bucket` e `storage_path`, quando existirem.

Para deletar orfaos, revise o relatorio e execute explicitamente:

```bash
node scripts/storage-diagnose-orphans.mjs --delete-confirmed --output=/tmp/storage-orphans-delete.json
```

`--delete-confirmed` e a unica flag que habilita remocao. Sem ela, o script apenas gera relatorio.

## Migracao de base64 legado

```bash
node scripts/migrate-legacy-base64-files.mjs --output=/tmp/base64-migration.json
```

Em dry-run, o script detecta `data:*;base64,...` em `public.arquivos_historicos.url`, calcula MIME type, nome seguro e destino no bucket `historical-files`.

Para executar a escrita depois de revisar o relatorio:

```bash
node scripts/migrate-legacy-base64-files.mjs --write-confirmed --output=/tmp/base64-migration-write.json
```

`--write-confirmed` e a unica flag que habilita upload no Storage e update no banco. Sem ela, o script apenas planeja a migracao.

Opcionalmente incluir avatars legados:

```bash
node scripts/migrate-legacy-base64-files.mjs --include-avatars --output=/tmp/base64-migration-with-avatars.json
```

O script nao remove automaticamente dados antigos e nao dropa `public.pessoas.arquivos_historicos`.

## Dependencias de produto

Upload de arquivos historicos de casamento por usuario comum continua sem UI ativa. Antes de liberar, definir moderacao/aprovacao e confirmar se o usuario pode anexar arquivos a qualquer casamento em que sua pessoa participa ou apenas aos eventos proprios.
