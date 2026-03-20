-- Add new columns to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS scope_description text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_terms text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_pdf_path text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'el';

-- Make content column default to empty string for new contracts
ALTER TABLE contracts ALTER COLUMN content SET DEFAULT '';

-- Helper function for contract ownership (used by storage RLS)
CREATE OR REPLACE FUNCTION get_user_contract_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ct.id FROM contracts ct
  JOIN clients c ON c.id = ct.client_id
  WHERE c.user_id = user_uuid;
$$;

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Clients can upload signed PDFs for their own contracts
CREATE POLICY "Clients upload signed contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM get_user_contract_ids(auth.uid()) cid
      WHERE name LIKE 'signed/' || cid || '/%'
    )
  )
);

-- Clients can view their own signed PDFs
CREATE POLICY "Clients view own signed contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM get_user_contract_ids(auth.uid()) cid
      WHERE name LIKE 'signed/' || cid || '/%'
    )
  )
);

-- Admins can read all contract files
CREATE POLICY "Admins read all contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
  )
);
