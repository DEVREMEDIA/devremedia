-- Phase 0 (security) of the 2026-07-29 platform audit — see docs/audit/2026-07-29-platform-audit.md §2.
--
-- WHY THE FILENAME: migrations apply in lexicographic filename order. `20240209_messaging_webhook.sql`
-- and `20260211_contract_reminders.sql` sort AFTER every `000xx_*.sql` file ('2' > '0'), so
-- `20240209_...` silently re-opens the scoped `messages` policies created in 00017 / 00026 on every
-- fresh environment. A `00065_`-style fix would be overridden again — this file is named so it sorts
-- LAST. The old migration is left untouched (history).
--
-- Everything here is additive: DROP + CREATE of policies only. No table, column or data is changed.
-- Policies use the `(select auth.uid())` / `(select public.is_admin())` initplan form so the call is
-- evaluated once per query instead of once per row.

-- ============================================================================
-- 1. messages — reinstate the scoped policies (audit §2.1)
--    Restores the logic of 00026_messages_channel.sql (SELECT, channel-aware)
--    and 00017_fix_rls_security.sql (UPDATE), which 20240209 overrode with
--    "the project exists" / USING (true) WITH CHECK (true).
--
--    One deliberate extension over 00026: employees assigned via tasks
--    (multi-member assignment, PRs #86/#88 — tasks.assigned_to) count as team
--    members too, not just the single projects.assigned_to owner. 00026
--    predates multi-member assignment; restoring it verbatim would cut
--    task-assigned employees off from their project's messages.
-- ============================================================================

-- SELECT: admin, the project's client, or the assigned employee.
-- Channel split: 'client' messages are visible to all three; 'team' messages
-- are hidden from the client.
DROP POLICY IF EXISTS "Users can read messages from their projects" ON public.messages;

CREATE POLICY "Users can read messages from their projects"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      (select public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = p.client_id
        AND c.user_id = (select auth.uid())
      )
      OR p.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.assigned_to = (select auth.uid())
      )
    )
  )
  AND (
    channel = 'client'
    OR (
      channel = 'team'
      AND (
        (select public.is_admin())
        OR EXISTS (
          SELECT 1 FROM public.projects p2
          WHERE p2.id = messages.project_id
          AND p2.assigned_to = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.tasks t2
          WHERE t2.project_id = messages.project_id
          AND t2.assigned_to = (select auth.uid())
        )
      )
    )
  )
);

-- INSERT: 20240209 also widened this to "any authenticated user, any project".
-- Reinstate the sender scope: you must be the sender, and admin / the project's
-- client (client channel only) / the assigned employee.
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;

CREATE POLICY "Authenticated users can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      (select public.is_admin())
      OR (
        channel = 'client'
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_id
          AND c.user_id = (select auth.uid())
        )
      )
      OR p.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.assigned_to = (select auth.uid())
      )
    )
  )
);

-- UPDATE (read receipts): only rows the user is allowed to read.
DROP POLICY IF EXISTS "Users can update message read status" ON public.messages;

CREATE POLICY "Users can update message read status"
ON public.messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      (select public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = p.client_id
        AND c.user_id = (select auth.uid())
      )
      OR p.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.assigned_to = (select auth.uid())
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      (select public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = p.client_id
        AND c.user_id = (select auth.uid())
      )
      OR p.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.assigned_to = (select auth.uid())
      )
    )
  )
);

-- ============================================================================
-- 2. annotation_seen — scope the read receipts (audit §2.3)
--    00059 shipped `using (auth.uid() is not null)`, which exposes who saw which
--    annotation across every client. Scope it through
--    video_annotations → deliverables → projects, mirroring the access rules of
--    video_annotations itself (admin / the project's client) plus the assigned
--    employee, who needs it for the bidirectional read receipts on the employee
--    deliverables page.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read annotation_seen" ON public.annotation_seen;

CREATE POLICY "Users can read annotation_seen for their deliverables"
ON public.annotation_seen FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.video_annotations va
    JOIN public.deliverables d ON d.id = va.deliverable_id
    JOIN public.projects p ON p.id = d.project_id
    WHERE va.id = annotation_seen.annotation_id
    AND (
      (select public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = p.client_id
        AND c.user_id = (select auth.uid())
      )
      OR p.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.assigned_to = (select auth.uid())
      )
    )
  )
);

-- ============================================================================
-- 3. deliverables — employees may not delete approved/final work (audit §2.3)
--    00056 gave employees DELETE on any deliverable of a project they are
--    assigned to. Keep that, but exclude deliverables the client has already
--    approved or that are marked final. Admins are unaffected (separate
--    "Admins full access" policy).
-- ============================================================================

DROP POLICY IF EXISTS "employees_delete_deliverables" ON public.deliverables;

CREATE POLICY "employees_delete_deliverables" ON public.deliverables
  FOR DELETE TO authenticated
  USING (
    status NOT IN ('approved', 'final')
    AND (
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = (select auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = (select auth.uid())
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role = 'employee'
    )
  );

-- ============================================================================
-- Verification (run against the live database after applying):
--
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where tablename in ('messages', 'annotation_seen', 'deliverables')
--   order by tablename, policyname;
--
-- NOT changed here, deliberately (see docs/audit/phase-0-review.md):
--   * the `attachments` storage bucket is still public (20240209:58-74) — flipping
--     it would break existing message-attachment URLs; needs its own decision.
--   * `idx_messages_project_created_recent` still has a frozen NOW() predicate.
-- ============================================================================
