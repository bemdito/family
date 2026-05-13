-- =====================================================
-- STORAGE BUCKETS FOR USER UPLOADS
-- Data: 2026-05-13
-- Objetivo: padronizar uploads de fotos e arquivos historicos no Supabase Storage.
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'person-avatars',
    'person-avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'historical-files',
    'historical-files',
    true,
    20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users can read family storage files" on storage.objects;
create policy "authenticated users can read family storage files"
on storage.objects
for select
to authenticated
using (bucket_id in ('person-avatars', 'historical-files'));

drop policy if exists "authenticated users can upload family storage files" on storage.objects;
create policy "authenticated users can upload family storage files"
on storage.objects
for insert
to authenticated
with check (
  auth.uid() is not null
  and bucket_id in ('person-avatars', 'historical-files')
);

drop policy if exists "authenticated users can update family storage files" on storage.objects;
create policy "authenticated users can update family storage files"
on storage.objects
for update
to authenticated
using (
  auth.uid() is not null
  and bucket_id in ('person-avatars', 'historical-files')
)
with check (
  auth.uid() is not null
  and bucket_id in ('person-avatars', 'historical-files')
);

drop policy if exists "admins can delete family storage files" on storage.objects;
create policy "admins can delete family storage files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('person-avatars', 'historical-files')
  and public.is_admin_user(auth.uid())
);
