-- =====================================================
-- GOOGLE CALENDAR INTEGRATION
-- =====================================================
-- Execute este SQL no Supabase SQL Editor.
-- Tokens ficam acessiveis apenas por Edge Functions usando service_role.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_email TEXT,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.google_calendar_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.google_calendar_synced_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('aniversario', 'memoria')),
  family_event_key TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  event_month INT NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day INT NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, family_event_key)
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user_id
  ON public.google_calendar_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_user_id
  ON public.google_calendar_oauth_states(user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_expires_at
  ON public.google_calendar_oauth_states(expires_at);

CREATE INDEX IF NOT EXISTS idx_google_calendar_synced_events_user_id
  ON public.google_calendar_synced_events(user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_synced_events_pessoa_id
  ON public.google_calendar_synced_events(pessoa_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_synced_events_type
  ON public.google_calendar_synced_events(event_type);

CREATE OR REPLACE FUNCTION public.google_calendar_update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_google_calendar_connections_updated_at
  ON public.google_calendar_connections;
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.google_calendar_update_updated_at();

DROP TRIGGER IF EXISTS update_google_calendar_synced_events_updated_at
  ON public.google_calendar_synced_events;
CREATE TRIGGER update_google_calendar_synced_events_updated_at
  BEFORE UPDATE ON public.google_calendar_synced_events
  FOR EACH ROW
  EXECUTE FUNCTION public.google_calendar_update_updated_at();

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_synced_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Google Calendar connections blocked from frontend"
  ON public.google_calendar_connections;
CREATE POLICY "Google Calendar connections blocked from frontend"
  ON public.google_calendar_connections
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE OR REPLACE VIEW public.google_calendar_connection_status AS
SELECT
  id,
  user_id,
  google_account_email,
  google_calendar_id,
  ativo,
  last_sync_at,
  connected_at,
  updated_at
FROM public.google_calendar_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.google_calendar_connection_status TO authenticated;

DROP POLICY IF EXISTS "Google Calendar oauth states blocked from frontend"
  ON public.google_calendar_oauth_states;
CREATE POLICY "Google Calendar oauth states blocked from frontend"
  ON public.google_calendar_oauth_states
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Users can read own synced Google Calendar metadata"
  ON public.google_calendar_synced_events;
CREATE POLICY "Users can read own synced Google Calendar metadata"
  ON public.google_calendar_synced_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Synced Google Calendar writes blocked from frontend"
  ON public.google_calendar_synced_events;
CREATE POLICY "Synced Google Calendar writes blocked from frontend"
  ON public.google_calendar_synced_events
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Synced Google Calendar updates blocked from frontend"
  ON public.google_calendar_synced_events;
CREATE POLICY "Synced Google Calendar updates blocked from frontend"
  ON public.google_calendar_synced_events
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Synced Google Calendar deletes blocked from frontend"
  ON public.google_calendar_synced_events;
CREATE POLICY "Synced Google Calendar deletes blocked from frontend"
  ON public.google_calendar_synced_events
  FOR DELETE
  TO authenticated
  USING (FALSE);

COMMENT ON TABLE public.google_calendar_connections IS 'Conexao OAuth do usuario com Google Calendar. Tokens somente por Edge Function service_role.';
COMMENT ON TABLE public.google_calendar_oauth_states IS 'States temporarios do fluxo OAuth Google Calendar.';
COMMENT ON TABLE public.google_calendar_synced_events IS 'Metadados para evitar duplicidade de eventos familiares sincronizados no Google Calendar.';
