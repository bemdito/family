-- =====================================================
-- NOTIFICATION DISPATCH DIAGNOSTICS
-- Data: 2026-05-14
-- Objetivo: habilitar diagnostico administrativo de notificacoes sem disparo client-side.
-- =====================================================

create table if not exists public.notification_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid null references public.notificacoes_usuario(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  tipo text not null,
  canal text not null,
  status text not null default 'pending',
  provider text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_dispatch_logs_status_check check (
    status in (
      'pending',
      'sent',
      'failed',
      'skipped',
      'disabled_by_preferences',
      'missing_destination',
      'not_configured'
    )
  )
);

create index if not exists idx_notification_dispatch_logs_created_at
on public.notification_dispatch_logs(created_at desc);

create index if not exists idx_notification_dispatch_logs_user_id
on public.notification_dispatch_logs(user_id);

create index if not exists idx_notification_dispatch_logs_notification_id
on public.notification_dispatch_logs(notification_id);

create index if not exists idx_notification_dispatch_logs_status
on public.notification_dispatch_logs(status);

alter table public.notification_dispatch_logs enable row level security;

drop policy if exists "admins can read notification preferences"
on public.preferencias_notificacao;

create policy "admins can read notification preferences"
on public.preferencias_notificacao
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "admins can read user notifications"
on public.notificacoes_usuario;

create policy "admins can read user notifications"
on public.notificacoes_usuario
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "admins can read notification dispatch logs"
on public.notification_dispatch_logs;

create policy "admins can read notification dispatch logs"
on public.notification_dispatch_logs
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "admins can insert notification dispatch logs"
on public.notification_dispatch_logs;

create policy "admins can insert notification dispatch logs"
on public.notification_dispatch_logs
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update notification dispatch logs"
on public.notification_dispatch_logs;

create policy "admins can update notification dispatch logs"
on public.notification_dispatch_logs
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop trigger if exists trg_notification_dispatch_logs_updated_at
on public.notification_dispatch_logs;

create trigger trg_notification_dispatch_logs_updated_at
before update on public.notification_dispatch_logs
for each row
execute function public.set_updated_at();
