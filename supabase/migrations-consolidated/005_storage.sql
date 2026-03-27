-- =====================================================================
-- Migration 005: Storage Buckets & Policies
-- Consolidated from: 00027, 00028, 00029, 20240209
-- =====================================================================

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================

-- Invoices bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Contracts bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Attachments bucket (public — for message attachments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- INVOICES BUCKET POLICIES
-- =====================================================================

-- Admins: full access to all invoice files
CREATE POLICY "Admins full access to invoices bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'invoices'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'invoices'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Clients: can read their own invoice files (folder = client_id)
CREATE POLICY "Clients read own invoices"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.clients
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- =====================================================================
-- CONTRACTS BUCKET POLICIES
-- =====================================================================

-- Clients: can upload signed PDFs for their own contracts
CREATE POLICY "Clients upload signed contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND (
      SELECT EXISTS (
        SELECT 1 FROM public.get_user_contract_ids(auth.uid()) cid
        WHERE name LIKE 'signed/' || cid || '/%'
      )
    )
  );

-- Clients: can view their own signed PDFs
CREATE POLICY "Clients view own signed contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND (
      SELECT EXISTS (
        SELECT 1 FROM public.get_user_contract_ids(auth.uid()) cid
        WHERE name LIKE 'signed/' || cid || '/%'
      )
    )
  );

-- Admins: can read all contract files
CREATE POLICY "Admins read all contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================================
-- ATTACHMENTS BUCKET POLICIES
-- =====================================================================

-- Authenticated users can upload attachments
CREATE POLICY "Allow authenticated users to upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Public read access to attachments
CREATE POLICY "Allow public read access to attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'attachments');

-- Users can delete their own attachments (folder = user_id)
CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- END
-- =====================================================================
