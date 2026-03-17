-- ============================================================
-- Migration: AI Chatbot with pgvector RAG
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- Knowledge Base for RAG
-- ============================================================
CREATE TABLE chat_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  content_el TEXT,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast vector similarity search (better for small-medium datasets)
CREATE INDEX idx_chat_knowledge_embedding ON chat_knowledge
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chat_knowledge_category ON chat_knowledge(category);

-- ============================================================
-- Conversations
-- ============================================================
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  page_url TEXT,
  user_agent TEXT,
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_session ON chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_created ON chat_conversations(created_at DESC);

-- ============================================================
-- Messages
-- ============================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INT,
  context_chunks JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);

-- ============================================================
-- Rate Limiting
-- ============================================================
CREATE TABLE chat_rate_limits (
  session_id TEXT PRIMARY KEY,
  message_count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Vector Similarity Search Function
-- ============================================================
CREATE OR REPLACE FUNCTION match_knowledge(
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
  FROM chat_knowledge ck
  WHERE ck.embedding IS NOT NULL
    AND 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Updated_at Triggers
-- ============================================================
CREATE TRIGGER handle_chat_knowledge_updated_at
  BEFORE UPDATE ON chat_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS Policies
-- ============================================================

-- chat_knowledge: admins manage, anon can read (for vector search via admin client)
ALTER TABLE chat_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage knowledge"
  ON chat_knowledge
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- chat_conversations: anon can insert, admins can read all
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create conversations"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own conversation"
  ON chat_conversations
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can read all conversations"
  ON chat_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- chat_messages: anon can insert, admins can read all
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read all messages"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- chat_rate_limits: open for the rate-limiting system (uses admin client)
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON chat_rate_limits
  FOR ALL
  USING (true);
