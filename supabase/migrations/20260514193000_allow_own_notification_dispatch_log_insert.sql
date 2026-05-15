-- =====================================================
-- NOTIFICATION DISPATCH CLIENT LOGS
-- Data: 2026-05-14
-- Objetivo: permitir diagnostico client-side sem expor leitura/escrita global.
-- =====================================================

drop policy if exists "users can insert own notification dispatch logs"
on public.notification_dispatch_logs;

create policy "users can insert own notification dispatch logs"
on public.notification_dispatch_logs
for insert
to authenticated
with check (user_id = auth.uid());
