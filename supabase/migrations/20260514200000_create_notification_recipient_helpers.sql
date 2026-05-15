-- =====================================================
-- NOTIFICATION RECIPIENT HELPERS
-- Data: 2026-05-14
-- Objetivo: permitir que fluxos autenticados notifiquem admins sem expor profiles completos.
-- =====================================================

create or replace function public.list_admin_user_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(id), array[]::uuid[])
  from public.profiles
  where role = 'admin';
$$;

grant execute on function public.list_admin_user_ids() to authenticated;
