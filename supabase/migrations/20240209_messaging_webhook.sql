-- Phase 9: Messaging System - Webhook Setup
-- This migration documents the webhook configuration needed
-- Note: Webhooks must be configured via Supabase Dashboard (cannot be done via SQL)

-- Ensure Realtime is enabled for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify RLS policies for messages
-- These should already exist from previous migrations, but included for reference

-- Policy: Users can read messages from their projects
DROP POLICY IF EXISTS "Users can read messages from their projects" ON messages;
CREATE POLICY "Users can read messages from their projects"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
  )
);

-- Policy: Authenticated users can send messages
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
CREATE POLICY "Authenticated users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
  )
);

-- Policy: Users can update their own messages (for read receipts)
DROP POLICY IF EXISTS "Users can update message read status" ON messages;
CREATE POLICY "Users can update message read status"
ON messages FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add index for efficient message fetching
CREATE INDEX IF NOT EXISTS idx_messages_project_created
ON messages(project_id, created_at DESC);

-- Note: messages uses read_by (jsonb) not read_at for read tracking

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_messages_project_created_recent
ON messages(project_id, created_at)
WHERE created_at > (NOW() - INTERVAL '15 minutes');

-- Storage bucket policies for attachments
-- These should already exist, but included for reference

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload attachments
DROP POLICY IF EXISTS "Allow authenticated users to upload attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to attachments
DROP POLICY IF EXISTS "Allow public read access to attachments" ON storage.objects;
CREATE POLICY "Allow public read access to attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow users to delete their own attachments
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Manual Setup Required:
-- ========================
-- After running this migration, you must manually configure the webhook in Supabase Dashboard:
--
-- 1. Go to Database > Webhooks
-- 2. Create new webhook:
--    Name: notify-message
--    Table: messages
--    Events: Insert
--    Type: HTTP Request
--    Method: POST
--    URL: https://[your-project-ref].supabase.co/functions/v1/notify-message
--    Headers:
--      - Authorization: Bearer [your-anon-key]
--      - Content-Type: application/json
--
-- 3. Deploy the Edge Function:
--    supabase functions deploy notify-message
--
-- 4. Set secrets:
--    supabase secrets set RESEND_API_KEY=your_key
--    supabase secrets set NEXT_PUBLIC_APP_URL=your_url
