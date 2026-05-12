-- =====================================================
-- ALLOW MEMBER FAMILY RELATIONSHIP EDITS
-- Data: 2026-05-12
-- Objetivo: permitir que membros autenticados editem vinculos que envolvem
-- sua pessoa principal, sem conceder escrita global em relacionamentos.
-- =====================================================

drop policy if exists "members can insert simple family people" on public.pessoas;
create policy "members can insert simple family people"
on public.pessoas
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "members can insert own linked relationships" on public.relacionamentos;
create policy "members can insert own linked relationships"
on public.relacionamentos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = auth.uid()
      and upl.pessoa_id in (
        relacionamentos.pessoa_origem_id,
        relacionamentos.pessoa_destino_id
      )
  )
);

drop policy if exists "members can update own linked relationships" on public.relacionamentos;
create policy "members can update own linked relationships"
on public.relacionamentos
for update
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = auth.uid()
      and upl.pessoa_id in (
        relacionamentos.pessoa_origem_id,
        relacionamentos.pessoa_destino_id
      )
  )
)
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = auth.uid()
      and upl.pessoa_id in (
        relacionamentos.pessoa_origem_id,
        relacionamentos.pessoa_destino_id
      )
  )
);

drop policy if exists "members can delete own linked relationships" on public.relacionamentos;
create policy "members can delete own linked relationships"
on public.relacionamentos
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = auth.uid()
      and upl.pessoa_id in (
        relacionamentos.pessoa_origem_id,
        relacionamentos.pessoa_destino_id
      )
  )
);
