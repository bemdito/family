-- =====================================================
-- ADD RELATIONSHIP HISTORICAL FILES
-- Data: 2026-05-14
-- Objetivo: permitir arquivos historicos vinculados a relacionamentos conjugais.
-- =====================================================

alter table public.arquivos_historicos
  add column if not exists relacionamento_id uuid references public.relacionamentos(id) on delete cascade;

create index if not exists idx_arquivos_historicos_relacionamento_id
  on public.arquivos_historicos (relacionamento_id);

create index if not exists idx_arquivos_historicos_relacionamento_ordem
  on public.arquivos_historicos (relacionamento_id, ordem);

drop policy if exists "linked users can insert own arquivos historicos" on public.arquivos_historicos;
create policy "linked users can insert own arquivos historicos"
on public.arquivos_historicos
for insert
to authenticated
with check (
  relacionamento_id is null
  and exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can update own arquivos historicos" on public.arquivos_historicos;
create policy "linked users can update own arquivos historicos"
on public.arquivos_historicos
for update
to authenticated
using (
  relacionamento_id is null
  and exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
)
with check (
  relacionamento_id is null
  and exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can delete own arquivos historicos" on public.arquivos_historicos;
create policy "linked users can delete own arquivos historicos"
on public.arquivos_historicos
for delete
to authenticated
using (
  relacionamento_id is null
  and exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
);
