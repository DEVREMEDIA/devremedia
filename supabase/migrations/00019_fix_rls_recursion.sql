-- =============================================================================
-- FIX: RLS Infinite Recursion on user_profiles
-- =============================================================================
-- Converts admin policies to use SECURITY DEFINER helper functions
-- to prevent infinite recursion when RLS policies query user_profiles.
-- =============================================================================

-- 1. Helper functions (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
$$;

-- 2. FIX user_profiles policies
DROP POLICY IF EXISTS "Admins can read all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Admins can read all user profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. FIX clients policies
DROP POLICY IF EXISTS "Admins full access to clients" ON public.clients;
CREATE POLICY "Admins full access to clients"
  ON public.clients FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. FIX projects policies
DROP POLICY IF EXISTS "Admins full access to projects" ON public.projects;
CREATE POLICY "Admins full access to projects"
  ON public.projects FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. FIX tasks policies
DROP POLICY IF EXISTS "Admins full access to tasks" ON public.tasks;
CREATE POLICY "Admins full access to tasks"
  ON public.tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. FIX deliverables policies
DROP POLICY IF EXISTS "Admins full access to deliverables" ON public.deliverables;
CREATE POLICY "Admins full access to deliverables"
  ON public.deliverables FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. FIX video_annotations policies
DROP POLICY IF EXISTS "Admins full access to video annotations" ON public.video_annotations;
CREATE POLICY "Admins full access to video annotations"
  ON public.video_annotations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. FIX invoices policies
DROP POLICY IF EXISTS "Admins full access to invoices" ON public.invoices;
CREATE POLICY "Admins full access to invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. FIX expenses policies
DROP POLICY IF EXISTS "Admins full access to expenses" ON public.expenses;
CREATE POLICY "Admins full access to expenses"
  ON public.expenses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. FIX messages policies
DROP POLICY IF EXISTS "Admins full access to messages" ON public.messages;
CREATE POLICY "Admins full access to messages"
  ON public.messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 11. FIX contract_templates policies
DROP POLICY IF EXISTS "Admins full access to contract templates" ON public.contract_templates;
CREATE POLICY "Admins full access to contract templates"
  ON public.contract_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 12. FIX contracts policies
DROP POLICY IF EXISTS "Admins full access to contracts" ON public.contracts;
CREATE POLICY "Admins full access to contracts"
  ON public.contracts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 13. FIX filming_requests policies
DROP POLICY IF EXISTS "Admins full access to filming requests" ON public.filming_requests;
CREATE POLICY "Admins full access to filming requests"
  ON public.filming_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 14. FIX equipment_lists policies
DROP POLICY IF EXISTS "Admins full access to equipment lists" ON public.equipment_lists;
CREATE POLICY "Admins full access to equipment lists"
  ON public.equipment_lists FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 15. FIX shot_lists policies
DROP POLICY IF EXISTS "Admins full access to shot lists" ON public.shot_lists;
CREATE POLICY "Admins full access to shot lists"
  ON public.shot_lists FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 16. FIX concept_notes policies
DROP POLICY IF EXISTS "Admins full access to concept notes" ON public.concept_notes;
CREATE POLICY "Admins full access to concept notes"
  ON public.concept_notes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 17. FIX activity_log policies
DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.activity_log;
CREATE POLICY "Admins can read all activity logs"
  ON public.activity_log FOR SELECT
  USING (public.is_admin() OR auth.uid() = user_id);
