-- Allow clients to update the status of deliverables for their own projects
-- (approve or request revision)
CREATE POLICY "Clients can update own deliverable status"
  ON public.deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = deliverables.project_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = deliverables.project_id
      AND c.user_id = auth.uid()
    )
  );
