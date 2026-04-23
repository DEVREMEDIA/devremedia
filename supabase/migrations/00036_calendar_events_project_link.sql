-- Link calendar events back to the project that spawned them, so filming events
-- auto-created when a project enters status='filming' can be upserted idempotently
-- (update the same event on subsequent status / filming_date changes instead of
-- spawning duplicates).
--
-- Nullable because not every calendar event is tied to a project (user-created
-- meetings, reminders, holidays etc.).

ALTER TABLE public.calendar_events
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Index for the common lookup "does this project already have a synced event?"
CREATE INDEX idx_calendar_events_project_id
  ON public.calendar_events(project_id)
  WHERE project_id IS NOT NULL;

-- At most one auto-synced filming event per project, so upsert logic is safe.
-- (A user can still create additional custom calendar events referencing the same
-- project via project_id if a future workflow needs it — partial unique on
-- event_type='filming' scopes the constraint tightly.)
CREATE UNIQUE INDEX uniq_calendar_events_project_filming
  ON public.calendar_events(project_id)
  WHERE project_id IS NOT NULL AND event_type = 'filming';
