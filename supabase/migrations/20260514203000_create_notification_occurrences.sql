-- =====================================================
-- NOTIFICATION OCCURRENCES
-- Data: 2026-05-14
-- Objetivo: deduplicar notificacoes recorrentes geradas por rotinas manuais/agendadas.
-- =====================================================

create table if not exists public.notification_occurrences (
  id uuid primary key default gen_random_uuid(),
  occurrence_key text not null unique,
  tipo text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  occurrence_date date not null,
  notification_id uuid null references public.notificacoes_usuario(id) on delete set null,
  status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_occurrences_user_id
on public.notification_occurrences(user_id);

create index if not exists idx_notification_occurrences_date
on public.notification_occurrences(occurrence_date);

create index if not exists idx_notification_occurrences_tipo
on public.notification_occurrences(tipo);

create index if not exists idx_notification_occurrences_entity
on public.notification_occurrences(entity_type, entity_id);

alter table public.notification_occurrences enable row level security;

drop policy if exists "admins can read notification occurrences"
on public.notification_occurrences;

create policy "admins can read notification occurrences"
on public.notification_occurrences
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "admins can insert notification occurrences"
on public.notification_occurrences;

create policy "admins can insert notification occurrences"
on public.notification_occurrences
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update notification occurrences"
on public.notification_occurrences;

create policy "admins can update notification occurrences"
on public.notification_occurrences
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
