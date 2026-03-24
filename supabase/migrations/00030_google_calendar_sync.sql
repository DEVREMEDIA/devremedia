-- Google Calendar Bidirectional Sync
-- Creates config table (single-row, calendar-wide state) and sync mapping table.
-- Also adds action_type + action_data columns to notifications for sync conflict UI.

-- 1. Config table: stores syncToken, webhook channel metadata
CREATE TABLE google_calendar_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_token            TEXT,
  webhook_channel_id    TEXT,
  webhook_channel_token TEXT,
  webhook_resource_id   TEXT,
  webhook_expiration    TIMESTAMPTZ,
  last_sync_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin-only
ALTER TABLE google_calendar_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google_calendar_config"
  ON google_calendar_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- Seed a single config row
INSERT INTO google_calendar_config (id) VALUES (gen_random_uuid());

-- 2. Sync mapping table: links Supabase entities to Google Calendar events
CREATE TABLE google_calendar_sync (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'invoice', 'custom')),
  entity_id       UUID,
  subtype         TEXT CHECK (subtype IN ('start', 'deadline')),
  google_event_id TEXT UNIQUE,
  sync_status     TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'ignored')),
  sync_direction  TEXT NOT NULL DEFAULT 'to_google' CHECK (sync_direction IN ('to_google', 'from_google')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_google_sync_entity ON google_calendar_sync(entity_type, entity_id);
CREATE INDEX idx_google_sync_google_id ON google_calendar_sync(google_event_id);
CREATE INDEX idx_google_sync_status ON google_calendar_sync(sync_status);

-- Partial unique indexes to prevent duplicate mappings
CREATE UNIQUE INDEX idx_google_sync_project_subtype
  ON google_calendar_sync(entity_type, entity_id, subtype)
  WHERE subtype IS NOT NULL;

CREATE UNIQUE INDEX idx_google_sync_entity_no_subtype
  ON google_calendar_sync(entity_type, entity_id)
  WHERE subtype IS NULL AND entity_id IS NOT NULL;

-- RLS: admin-only
ALTER TABLE google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google_calendar_sync"
  ON google_calendar_sync
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- updated_at triggers
CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON google_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_config_updated_at
  BEFORE UPDATE ON google_calendar_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Add action columns to notifications for Google sync conflict UI
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS action_data JSONB;
