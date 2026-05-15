-- =====================================================
-- NOTIFICATION DISPATCH RPC
-- Data: 2026-05-14
-- Objetivo: permitir gatilhos client-side criarem notificacoes internas para destinatarios resolvidos.
-- =====================================================

create or replace function public.create_internal_notification_for_user(
  target_user_id uuid,
  notification_title text,
  notification_message text,
  notification_type text default 'notificacao',
  notification_link text default null,
  notification_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.notificacoes_usuario (
    user_id,
    titulo,
    mensagem,
    tipo,
    canal,
    link,
    metadata
  )
  values (
    target_user_id,
    notification_title,
    notification_message,
    coalesce(notification_type, 'notificacao'),
    'interna',
    notification_link,
    coalesce(notification_metadata, '{}'::jsonb)
  )
  returning id into created_id;

  return created_id;
end;
$$;

grant execute on function public.create_internal_notification_for_user(uuid, text, text, text, text, jsonb)
to authenticated;

create or replace function public.insert_notification_dispatch_log_for_user(
  target_notification_id uuid,
  target_user_id uuid,
  notification_type text,
  notification_channel text,
  dispatch_status text,
  dispatch_provider text default null,
  dispatch_error_message text default null,
  dispatch_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.notification_dispatch_logs (
    notification_id,
    user_id,
    tipo,
    canal,
    status,
    provider,
    error_message,
    metadata
  )
  values (
    target_notification_id,
    target_user_id,
    coalesce(notification_type, 'notificacao'),
    notification_channel,
    dispatch_status,
    dispatch_provider,
    dispatch_error_message,
    coalesce(dispatch_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.insert_notification_dispatch_log_for_user(uuid, uuid, text, text, text, text, text, jsonb)
to authenticated;
