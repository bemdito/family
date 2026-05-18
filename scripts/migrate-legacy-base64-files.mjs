import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const HISTORICAL_BUCKET = 'historical-files';
const AVATAR_BUCKET = 'person-avatars';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function parseArgs(argv) {
  const args = {
    writeConfirmed: false,
    output: '',
    includeAvatars: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--write-confirmed') args.writeConfirmed = true;
    else if (arg === '--include-avatars') args.includeAvatars = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length);
    else throw new Error(`Argumento desconhecido: ${arg}. Use --help para ver as opcoes.`);
  }

  return args;
}

function getRequiredEnv(name) {
  const value = process.env[name] || process.env[`VITE_${name}`];
  if (!value) {
    const suffix = name === 'SUPABASE_SERVICE_ROLE_KEY'
      ? ' Este script e administrativo e precisa da service role key.'
      : '';
    throw new Error(`Defina ${name} no ambiente ou em .env.local.${suffix}`);
  }
  return value;
}

function printHelp() {
  process.stdout.write(`Migra arquivos legados em base64 para Storage.

Uso:
  node scripts/migrate-legacy-base64-files.mjs [--output=/tmp/base64-migration.json] [--include-avatars]

Padrao:
  dry-run. Nenhum upload ou update no banco e executado.

Flags destrutivas:
  --write-confirmed    faz upload no Storage e atualiza os registros correspondentes.

Variaveis:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function parseDataUrl(value) {
  const match = String(value ?? '').match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;

  const mimeType = match[1].trim().toLowerCase();
  const base64 = match[2].replace(/\s/g, '');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;

  return { mimeType, buffer };
}

function extensionForMime(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'bin';
}

function safeSegment(value, fallback) {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || fallback;
}

async function collectPaged(supabase, table, columns) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Erro ao consultar ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function uploadBuffer(supabase, bucket, objectPath, parsed) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, parsed.buffer, {
      contentType: parsed.mimeType,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function migrateHistoricalFile(supabase, row, dryRun) {
  const parsed = parseDataUrl(row.url);
  if (!parsed) return null;

  const extension = extensionForMime(parsed.mimeType);
  const owner = row.pessoa_id ? `pessoas/${row.pessoa_id}` : row.relacionamento_id ? `relacionamentos/${row.relacionamento_id}` : 'sem-vinculo';
  const fileName = `${safeSegment(row.titulo, 'arquivo-historico')}-${row.id}.${extension}`;
  const storagePath = `legacy/${owner}/${fileName}`;

  const result = {
    table: 'arquivos_historicos',
    id: row.id,
    bucket: HISTORICAL_BUCKET,
    path: storagePath,
    mimeType: parsed.mimeType,
    bytes: parsed.buffer.length,
    dryRun,
    status: dryRun ? 'planned' : 'pending',
  };

  if (dryRun) return result;

  const publicUrl = await uploadBuffer(supabase, HISTORICAL_BUCKET, storagePath, parsed);
  const { error } = await supabase
    .from('arquivos_historicos')
    .update({
      url: publicUrl,
      storage_bucket: HISTORICAL_BUCKET,
      storage_path: storagePath,
      mime_type: parsed.mimeType,
    })
    .eq('id', row.id);

  if (error) throw new Error(error.message);

  return { ...result, status: 'migrated' };
}

async function migrateAvatar(supabase, row, dryRun) {
  const parsed = parseDataUrl(row.foto_principal_url);
  if (!parsed) return null;

  const extension = extensionForMime(parsed.mimeType);
  const storagePath = `legacy/${row.id}/avatar-${Date.now()}.${extension}`;
  const result = {
    table: 'pessoas',
    id: row.id,
    field: 'foto_principal_url',
    bucket: AVATAR_BUCKET,
    path: storagePath,
    mimeType: parsed.mimeType,
    bytes: parsed.buffer.length,
    dryRun,
    status: dryRun ? 'planned' : 'pending',
  };

  if (dryRun) return result;

  const publicUrl = await uploadBuffer(supabase, AVATAR_BUCKET, storagePath, parsed);
  const { error } = await supabase
    .from('pessoas')
    .update({ foto_principal_url: publicUrl })
    .eq('id', row.id);

  if (error) throw new Error(error.message);

  return { ...result, status: 'migrated' };
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const dryRun = !args.writeConfirmed;
  const supabase = createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const report = {
    dryRun,
    checkedAt: new Date().toISOString(),
    destructiveFlagRequired: '--write-confirmed',
    migrated: [],
    failed: [],
    notes: [
      'Dados antigos nao sao removidos automaticamente; o campo original so e substituido quando --write-confirmed e usado.',
      'A coluna legada public.pessoas.arquivos_historicos nao e removida por este script.',
    ],
  };

  const arquivos = await collectPaged(supabase, 'arquivos_historicos', 'id,pessoa_id,relacionamento_id,tipo,url,titulo');
  for (const row of arquivos) {
    try {
      const result = await migrateHistoricalFile(supabase, row, dryRun);
      if (result) report.migrated.push(result);
    } catch (error) {
      report.failed.push({ table: 'arquivos_historicos', id: row.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (args.includeAvatars) {
    const pessoas = await collectPaged(supabase, 'pessoas', 'id,foto_principal_url');
    for (const row of pessoas) {
      try {
        const result = await migrateAvatar(supabase, row, dryRun);
        if (result) report.migrated.push(result);
      } catch (error) {
        report.failed.push({ table: 'pessoas', id: row.id, field: 'foto_principal_url', error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.output) {
    fs.writeFileSync(args.output, output);
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
