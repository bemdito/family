-- =====================================================
-- ENABLE RLS ON CORE FAMILY TABLES
-- Data: 2026-05-09
-- Objetivo: proteger tabelas centrais com acesso autenticado e escrita administrativa.
-- =====================================================

alter table public.pessoas enable row level security;
alter table public.relacionamentos enable row level security;
alter table if exists public.imagens_pessoa enable row level security;
alter table public.arquivos_historicos enable row level security;

-- =====================================================
-- PESSOAS
-- =====================================================

drop policy if exists "authenticated users can read pessoas" on public.pessoas;
create policy "authenticated users can read pessoas"
on public.pessoas
for select
to authenticated
using (true);

drop policy if exists "admins can insert pessoas" on public.pessoas;
create policy "admins can insert pessoas"
on public.pessoas
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update pessoas" on public.pessoas;
create policy "admins can update pessoas"
on public.pessoas
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can delete pessoas" on public.pessoas;
create policy "admins can delete pessoas"
on public.pessoas
for delete
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "users can update own linked person" on public.pessoas;
create policy "users can update own linked person"
on public.pessoas
for update
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoas.id
      and upl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoas.id
      and upl.user_id = auth.uid()
  )
);

-- =====================================================
-- RELACIONAMENTOS
-- =====================================================

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

-- =====================================================
-- IMAGENS_PESSOA
-- =====================================================

do $$
begin
  if to_regclass('public.imagens_pessoa') is not null then
    drop policy if exists "authenticated users can read imagens pessoa" on public.imagens_pessoa;
    create policy "authenticated users can read imagens pessoa"
    on public.imagens_pessoa
    for select
    to authenticated
    using (true);

    drop policy if exists "admins can insert imagens pessoa" on public.imagens_pessoa;
    create policy "admins can insert imagens pessoa"
    on public.imagens_pessoa
    for insert
    to authenticated
    with check (public.is_admin_user(auth.uid()));

    drop policy if exists "admins can update imagens pessoa" on public.imagens_pessoa;
    create policy "admins can update imagens pessoa"
    on public.imagens_pessoa
    for update
    to authenticated
    using (public.is_admin_user(auth.uid()))
    with check (public.is_admin_user(auth.uid()));

    drop policy if exists "admins can delete imagens pessoa" on public.imagens_pessoa;
    create policy "admins can delete imagens pessoa"
    on public.imagens_pessoa
    for delete
    to authenticated
    using (public.is_admin_user(auth.uid()));
  end if;
end $$;

-- =====================================================
-- ARQUIVOS_HISTORICOS
-- =====================================================

drop policy if exists "authenticated users can read arquivos historicos" on public.arquivos_historicos;
create policy "authenticated users can read arquivos historicos"
on public.arquivos_historicos
for select
to authenticated
using (true);

drop policy if exists "admins can insert arquivos historicos" on public.arquivos_historicos;
create policy "admins can insert arquivos historicos"
on public.arquivos_historicos
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update arquivos historicos" on public.arquivos_historicos;
create policy "admins can update arquivos historicos"
on public.arquivos_historicos
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can delete arquivos historicos" on public.arquivos_historicos;
create policy "admins can delete arquivos historicos"
on public.arquivos_historicos
for delete
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "linked users can insert own arquivos historicos" on public.arquivos_historicos;
create policy "linked users can insert own arquivos historicos"
on public.arquivos_historicos
for insert
to authenticated
with check (
  exists (
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
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
)
with check (
  exists (
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
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = arquivos_historicos.pessoa_id
      and upl.user_id = auth.uid()
  )
);
