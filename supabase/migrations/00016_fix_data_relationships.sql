-- Fix broken data relationships between admin-created data and client visibility

-- 1a. Add missing invoice columns (referenced by updateInvoiceStatus)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- 1b. Add explicit FK from leads.assigned_to → user_profiles
--     (current FK points to auth.users, PostgREST can't resolve hint to user_profiles)
ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_user_profiles_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);

-- 1c. Update handle_new_user() trigger to auto-link clients by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );

  -- Auto-link client record by email match
  UPDATE public.clients
  SET user_id = new.id
  WHERE email = new.email
  AND user_id IS NULL;

  RETURN new;
END;
$$;

-- 1d. Backfill existing unlinked clients
UPDATE public.clients c
SET user_id = u.id
FROM auth.users u
WHERE c.email = u.email
AND c.user_id IS NULL;
