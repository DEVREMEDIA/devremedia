-- Create sales-resources storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sales-resources',
  'sales-resources',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/read/delete all files in sales-resources bucket
CREATE POLICY "Admins full access to sales-resources bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'sales-resources'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'sales-resources'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Storage RLS: salesmen can read files from sales-resources bucket
CREATE POLICY "Salesmen read sales-resources bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sales-resources'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'salesman'
  )
);
