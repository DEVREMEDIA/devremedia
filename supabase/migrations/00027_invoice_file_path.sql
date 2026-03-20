-- Add file_path column to invoices for uploaded PDF storage
ALTER TABLE invoices ADD COLUMN file_path TEXT;

-- Create private storage bucket for invoice PDFs (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/read/delete all invoice files
-- WITH CHECK required for INSERT/UPDATE operations
CREATE POLICY "Admins full access to invoices bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Storage RLS: clients can read their own invoice files
CREATE POLICY "Clients read own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM clients
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
