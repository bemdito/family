-- =====================================================
-- REFINE PERSON EVENTS AND HISTORICAL FILE METADATA
-- Data: 2026-05-16
-- Objetivo: permitir eventos da propria pessoa vinculada e guardar metadados
-- de Storage em arquivos_historicos sem remover colunas legadas.
-- =====================================================

alter table public.arquivos_historicos
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_arquivos_historicos_storage
  on public.arquivos_historicos (storage_bucket, storage_path);

create index if not exists idx_arquivos_historicos_created_by
  on public.arquivos_historicos (created_by);

alter table public.arquivos_historicos
  alter column created_by set default auth.uid();

drop policy if exists "linked users can insert own person events" on public.person_events;
create policy "linked users can insert own person events"
on public.person_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = person_events.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can update own person events" on public.person_events;
create policy "linked users can update own person events"
on public.person_events
for update
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = person_events.pessoa_id
      and upl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = person_events.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can delete own person events" on public.person_events;
create policy "linked users can delete own person events"
on public.person_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = person_events.pessoa_id
      and upl.user_id = auth.uid()
  )
);
