-- Add team member assignment to calendar events (primarily for filming-type events).
-- Addresses client feedback vol1 items C2/D2: "who is responsible for this filming?"
-- Design: calendar_events is the source of truth for filming schedule (see also
-- filming-availability.ts). Keeping assignment here supports multiple filmings per
-- project with different assignees, unlike a single projects.filming_assigned_to.

ALTER TABLE public.calendar_events
  ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for "events assigned to me" lookups (employee dashboards).
CREATE INDEX idx_calendar_events_assigned_to
  ON public.calendar_events(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- RLS: employees can SELECT calendar events assigned to them.
-- Existing policy "admins_all_calendar_events" remains unchanged; this is additive.
CREATE POLICY "employees_select_assigned_calendar_events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );
