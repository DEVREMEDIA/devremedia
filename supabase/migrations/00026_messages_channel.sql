-- Add channel column to messages (client vs team communication)
ALTER TABLE public.messages
  ADD COLUMN channel text NOT NULL DEFAULT 'client'
  CHECK (channel IN ('client', 'team'));

CREATE INDEX idx_messages_channel ON public.messages(project_id, channel);

-- Fix: Replace the "Users can read messages" policy to use is_admin() and avoid RLS recursion
DROP POLICY IF EXISTS "Users can read messages from their projects" ON public.messages;

CREATE POLICY "Users can read messages from their projects"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = messages.project_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = p.client_id
        AND c.user_id = auth.uid()
      )
      OR p.assigned_to = auth.uid()
    )
  )
  -- Client channel: visible to admins + client
  -- Team channel: visible to admins + assigned employee (not client)
  AND (
    channel = 'client'
    OR (
      channel = 'team'
      AND (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM projects p2
          WHERE p2.id = messages.project_id
          AND p2.assigned_to = auth.uid()
        )
      )
    )
  )
);

-- Employees can send team messages for projects assigned to them
CREATE POLICY "employees_insert_team_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    channel = 'team'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id
      AND projects.assigned_to = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );
