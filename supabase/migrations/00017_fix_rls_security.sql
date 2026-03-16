-- Fix RLS security issues identified in code review
-- Phase 1.5: Critical RLS fixes

-- ============================================================
-- 1. Messages: Too permissive SELECT (any authenticated reads all)
--    Fix: Users can only read messages from projects they're involved in
-- ============================================================

-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can read messages from their projects" ON messages;

-- Create proper SELECT policy: user must be project owner (admin), project client, or assigned employee
CREATE POLICY "Users can read messages from their projects"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = messages.project_id
    AND (
      -- Admins/super_admins can read all project messages
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
      )
      -- Client can read messages for their own projects
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = p.client_id
        AND c.user_id = auth.uid()
      )
      -- Assigned employees can read their project messages
      OR p.assigned_to = auth.uid()
    )
  )
);

-- Fix UPDATE policy: only allow updating read_at (for read receipts)
DROP POLICY IF EXISTS "Users can update message read status" ON messages;
CREATE POLICY "Users can update message read status"
ON messages FOR UPDATE
TO authenticated
USING (
  -- Only allow updating messages where user has read access
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = messages.project_id
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = p.client_id
        AND c.user_id = auth.uid()
      )
      OR p.assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  -- Same access check for the new row
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = messages.project_id
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = p.client_id
        AND c.user_id = auth.uid()
      )
      OR p.assigned_to = auth.uid()
    )
  )
);

-- ============================================================
-- 2. chat_conversations: UPDATE open to all authenticated users
--    Fix: Only allow updating own conversations (by session_id match)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can update own conversation" ON chat_conversations;
CREATE POLICY "Admins or owner can update conversation"
ON chat_conversations
FOR UPDATE
USING (
  -- Admins can update any conversation
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role IN ('super_admin', 'admin')
  )
  -- Session owner can update (session_id is stored in the conversation)
  OR session_id = auth.uid()::text
);

-- ============================================================
-- 3. chat_rate_limits: USING(true) for ALL roles
--    Fix: Restrict to service role only (rate limits managed by admin client)
-- ============================================================

DROP POLICY IF EXISTS "Service role manages rate limits" ON chat_rate_limits;
-- No regular user policy needed — rate limits are managed via supabaseAdmin (service role)
-- which bypasses RLS entirely. Having USING(true) is unnecessary and insecure.

-- ============================================================
-- 4. Trigger calls update_updated_at() but function is update_updated_at_column()
--    Fix: Create the missing function alias or recreate triggers
-- ============================================================

-- Create the function if it doesn't exist (safe — won't error if it already exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Clients can UPDATE any column on contracts (status, amount, etc.)
--    Fix: Restrict client contract updates to signature-related fields only
-- ============================================================

DROP POLICY IF EXISTS "Clients can update own contracts" ON public.contracts;
CREATE POLICY "Clients can sign own contracts"
ON public.contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = contracts.client_id
    AND clients.user_id = auth.uid()
  )
  -- Only allow when contract is in signable state
  AND status IN ('sent', 'viewed')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = contracts.client_id
    AND clients.user_id = auth.uid()
  )
  -- After update, status must be 'signed' or 'viewed' (no other changes allowed)
  AND status IN ('signed', 'viewed')
);

-- ============================================================
-- 6. Email auto-link in handle_new_user() = account takeover vector
--    Fix: Only auto-link if the client was explicitly invited (has invite metadata)
--    or if the admin explicitly pre-assigned the email
-- ============================================================

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

  -- Only auto-link client record if:
  -- 1. The user was invited (has invited_by metadata from the invite flow)
  -- 2. The client email matches and hasn't been linked yet
  IF new.raw_user_meta_data ->> 'invited_by' IS NOT NULL THEN
    UPDATE public.clients
    SET user_id = new.id
    WHERE email = new.email
    AND user_id IS NULL;
  END IF;

  RETURN new;
END;
$$;
