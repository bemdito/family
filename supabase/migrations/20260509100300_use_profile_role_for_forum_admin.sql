-- =====================================================
-- FORUM ADMIN AUTHORIZATION VIA PROFILES ROLE
-- Data: 2026-05-09
-- Objetivo: remover autorizacao admin do forum baseada em e-mail fixo.
-- =====================================================

create or replace function public.forum_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user(auth.uid());
$$;
