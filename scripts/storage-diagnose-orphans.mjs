import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BUCKETS = ['person-avatars', 'historical-files'];

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
    buckets: DEFAULT_BUCKETS,
    deleteConfirmed: false,
    output: '',
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--delete-confirmed') args.deleteConfirmed = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--buckets=')) args.buckets = arg.slice('--buckets='.length).split(',').map((item) => item.trim()).filter(Boolean);
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length);
    else throw new Error(`Argumento desconhecido: ${arg}. Use --help para ver as opcoes.`);
  }

  if (!args.buckets.length) {
    throw new Error('Informe ao menos um bucket em --buckets=person-avatars,historical-files.');
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
  process.stdout.write(`Diagnostica objetos orfaos no Storage.

Uso:
  node scripts/storage-diagnose-orphans.mjs [--output=/tmp/orphans.json] [--buckets=person-avatars,historical-files]

Padrao:
  dry-run. Nenhum arquivo e removido.

Flags destrutivas:
  --delete-confirmed    remove os objetos orfaos encontrados apos revisao do relatorio.

Variaveis:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function parseStoragePathFromUrl(url) {
  if (!url || url.startsWith('data:')) return null;

  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;

    const rest = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    const [bucket, ...pathParts] = rest.split('/');
    const objectPath = pathParts.join('/');

    return bucket && objectPath ? { bucket, path: objectPath } : null;
  } catch {
    return null;
  }
}

async function listAllObjects(supabase, bucket, prefix = '') {
  const objects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw new Error(`Erro ao listar bucket ${bucket}: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        objects.push({ bucket, path: objectPath, size: item.metadata?.size ?? null, updated_at: item.updated_at ?? null });
      } else {
        objects.push(...await listAllObjects(supabase, bucket, objectPath));
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return objects;
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

async function collectReferences(supabase) {
  const referenced = new Map(DEFAULT_BUCKETS.map((bucket) => [bucket, new Set()]));
  const addReference = (bucket, objectPath) => {
    if (!bucket || !objectPath) return;
    if (!referenced.has(bucket)) referenced.set(bucket, new Set());
    referenced.get(bucket).add(objectPath);
  };

  const pessoas = await collectPaged(supabase, 'pessoas', 'id,foto_principal_url');
  for (const pessoa of pessoas) {
    const parsed = parseStoragePathFromUrl(pessoa.foto_principal_url);
    if (parsed) addReference(parsed.bucket, parsed.path);
  }

  const arquivos = await collectPaged(supabase, 'arquivos_historicos', 'id,url,storage_bucket,storage_path');
  for (const arquivo of arquivos) {
    if (arquivo.storage_bucket && arquivo.storage_path) {
      addReference(arquivo.storage_bucket, arquivo.storage_path);
      continue;
    }

    const parsed = parseStoragePathFromUrl(arquivo.url);
    if (parsed) addReference(parsed.bucket, parsed.path);
  }

  return referenced;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const supabase = createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const referenced = await collectReferences(supabase);
  const report = {
    dryRun: !args.deleteConfirmed,
    checkedAt: new Date().toISOString(),
    destructiveFlagRequired: '--delete-confirmed',
    buckets: {},
  };

  for (const bucket of args.buckets) {
    const objects = await listAllObjects(supabase, bucket);
    const refs = referenced.get(bucket) ?? new Set();
    const orphans = objects.filter((object) => !refs.has(object.path));

    report.buckets[bucket] = {
      objectCount: objects.length,
      referencedCount: refs.size,
      orphanCount: orphans.length,
      orphans,
      deleted: [],
      deleteErrors: [],
    };

    if (args.deleteConfirmed && orphans.length > 0) {
      const { data, error } = await supabase.storage.from(bucket).remove(orphans.map((object) => object.path));
      report.buckets[bucket].deleted = data ?? [];
      if (error) report.buckets[bucket].deleteErrors.push(error.message);
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
