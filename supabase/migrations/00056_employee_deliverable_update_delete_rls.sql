-- Employees got edit (PR #58) and delete (PR #59) for deliverables in the UI,
-- but the matching RLS policies were never added: only SELECT and INSERT exist
-- (00006 / 00025). UPDATE and DELETE were silently blocked by RLS — 0 rows
-- affected, no error — so edits never persisted and deletions never removed the
-- row while the UI reported success. Add the two missing policies, mirroring the
-- same "employee assigned to the project (via task or project)" condition.

-- Employees can update deliverables for projects they are assigned to
DROP POLICY IF EXISTS "employees_update_deliverables" ON public.deliverables;

CREATE POLICY "employees_update_deliverables" ON public.deliverables
  FOR UPDATE TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );

-- Employees can delete deliverables for projects they are assigned to.
-- Deleting only removes the record/link; the underlying Drive/YouTube/Vimeo
-- video is never touched.
DROP POLICY IF EXISTS "employees_delete_deliverables" ON public.deliverables;

CREATE POLICY "employees_delete_deliverables" ON public.deliverables
  FOR DELETE TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );
