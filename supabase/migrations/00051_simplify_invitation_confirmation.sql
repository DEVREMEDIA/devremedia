-- Issue #29 — simplify the Invitation → Confirmation flow.
--
-- 1) The Confirmation gate now keys off the `invited_by` metadata flag, NOT a null
--    display_name. The admin pre-fills the name, so the old handle_new_user() behaviour
--    (display_name = NULL for invited users, from migration 00020) now erases the
--    admin-entered name. Always populate display_name from the invite metadata instead.
-- 2) Support the public, rate-limited self-service resend endpoint: allow an
--    'invite_resend' row in email_logs and index by recipient_email for the throttle.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'role', 'client'),
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.email)
  );

  -- Auto-link an invited user's client record by email.
  IF new.raw_user_meta_data ->> 'invited_by' IS NOT NULL THEN
    UPDATE public.clients
    SET user_id = new.id
    WHERE email = new.email
    AND user_id IS NULL;
  END IF;

  RETURN new;
END;
$$;

-- Allow the self-service resend endpoint to log to email_logs (used for the throttle).
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'filming_reminder', 'invoice_sent', 'project_delivered', 'holiday_greeting', 'invite_resend'
  ));

-- Index supporting audit queries / lookups of resends by recipient.
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email_created
  ON email_logs (recipient_email, created_at);

-- Durable, serverless-safe rate limiter for public auth endpoints (the self-service invite
-- resend). Keyed per IP and per email; evaluated before any admin work so the expensive
-- pending-user lookup cannot be amplified and the response cost is uniform across all states.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- service_role only (the admin client bypasses RLS); no public policies.
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
