-- =====================================================================
-- Migration 002: Helper Functions
-- Consolidated from: 00001, 00004, 00012, 00017, 00019, 00020, 00029
-- Must run AFTER 001 (tables must exist)
-- =====================================================================

-- Auto-update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alias (some triggers reference this name)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Get user role (SECURITY DEFINER — bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$$;

-- Check if current user is admin (SECURITY DEFINER — bypasses RLS)
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

-- Log user activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$;

-- Auto-create user profile on signup + auto-link invited clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'invited_by' IS NOT NULL THEN NULL
      ELSE COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
    END
  );

  -- Only auto-link client record if user was explicitly invited
  IF NEW.raw_user_meta_data ->> 'invited_by' IS NOT NULL THEN
    UPDATE public.clients
    SET user_id = NEW.id
    WHERE email = NEW.email
    AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Vector similarity search for RAG chatbot
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  content_en TEXT,
  content_el TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.category,
    ck.title,
    ck.content,
    ck.content_en,
    ck.content_el,
    ck.metadata,
    1 - (ck.embedding <=> query_embedding) AS similarity
  FROM public.chat_knowledge ck
  WHERE ck.embedding IS NOT NULL
    AND 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Get contract IDs for a user (used by storage RLS)
CREATE OR REPLACE FUNCTION public.get_user_contract_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ct.id FROM public.contracts ct
  JOIN public.clients c ON c.id = ct.client_id
  WHERE c.user_id = user_uuid;
$$;

-- =====================================================================
-- END
-- =====================================================================
