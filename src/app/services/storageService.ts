import { supabase } from '../lib/supabaseClient';

export const PERSON_AVATARS_BUCKET = 'person-avatars';
export const HISTORICAL_FILES_BUCKET = 'historical-files';

type UploadOptions = {
  pessoaId?: string | null;
  relacionamentoId?: string | null;
};

type StorageUploadResult = {
  bucket: string;
  path: string;
  url: string;
};

const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function getMissingBucketMessage(bucket: string) {
  return `Bucket de Storage "${bucket}" não encontrado. Aplique a migration de buckets antes de enviar arquivos.`;
}

function isMissingStorageBucketError(message: string) {
  const normalized = message.toLocaleLowerCase('pt-BR');
  return normalized.includes('bucket not found') || (normalized.includes('bucket') && normalized.includes('not found'));
}

function getSafeFileName(fileName: string) {
  const normalized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'arquivo';
}

function getExtension(file: File | Blob, fallback = 'bin') {
  if ('name' in file && file.name) {
    const extension = file.name.split('.').pop()?.trim().toLowerCase();
    if (extension) return extension;
  }

  return IMAGE_EXTENSION_BY_TYPE[file.type] ?? (file.type === 'application/pdf' ? 'pdf' : fallback);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Não foi possível identificar o usuário autenticado para enviar o arquivo.');
  }

  return data.user.id;
}

async function uploadPublicFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType: string
): Promise<StorageUploadResult> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    if (isMissingStorageBucketError(error.message)) {
      throw new Error(getMissingBucketMessage(bucket));
    }

    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    bucket,
    path,
    url: data.publicUrl,
  };
}

export async function uploadPersonAvatarFile(file: File | Blob, options: UploadOptions = {}) {
  const userId = await getCurrentUserId();
  const extension = getExtension(file, 'jpg');
  const pessoaSegment = options.pessoaId || 'pending';
  const storagePath = `${pessoaSegment}/${userId}-${Date.now()}.${extension}`;

  return uploadPublicFile(PERSON_AVATARS_BUCKET, storagePath, file, file.type || 'image/jpeg');
}

export async function uploadHistoricalFile(file: File, options: UploadOptions = {}) {
  const userId = await getCurrentUserId();
  const ownerSegment = options.relacionamentoId
    ? `relacionamentos/${options.relacionamentoId}`
    : `pessoas/${options.pessoaId || 'pending'}`;
  const storagePath = `${ownerSegment}/${userId}-${Date.now()}-${getSafeFileName(file.name)}`;

  return uploadPublicFile(HISTORICAL_FILES_BUCKET, storagePath, file, file.type || 'application/octet-stream');
}
