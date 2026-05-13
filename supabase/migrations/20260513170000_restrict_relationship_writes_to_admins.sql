-- =====================================================
-- RESTRICT RELATIONSHIP WRITES TO ADMINS
-- Data: 2026-05-13
-- Objetivo: impedir escrita direta de relacionamentos por membros comuns.
-- =====================================================

alter table public.relacionamentos enable row level security;

drop policy if exists "members can insert own linked relationships" on public.relacionamentos;
drop policy if exists "members can update own linked relationships" on public.relacionamentos;
drop policy if exists "members can delete own linked relationships" on public.relacionamentos;

drop policy if exists "authenticated users can read relacionamentos" on public.relacionamentos;
create policy "authenticated users can read relacionamentos"
on public.relacionamentos
for select
to authenticated
using (true);

drop policy if exists "admins can insert relacionamentos" on public.relacionamentos;
create policy "admins can insert relacionamentos"
on public.relacionamentos
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update relacionamentos" on public.relacionamentos;
create policy "admins can update relacionamentos"
on public.relacionamentos
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can delete relacionamentos" on public.relacionamentos;
create policy "admins can delete relacionamentos"
on public.relacionamentos
for delete
to authenticated
using (public.is_admin_user(auth.uid()));
