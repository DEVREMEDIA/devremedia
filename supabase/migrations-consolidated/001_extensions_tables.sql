-- =====================================================================
-- Migration 001: Extensions & All Tables (final column state)
-- Consolidated from: 00001, 00002, 00005, 00007-00016, 00018, 00023,
--   00025-00027, 00029, 20240209, 20260211
-- =====================================================================

-- pgvector for AI chatbot embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- =====================================================================
-- AUTH & SYSTEM TABLES
-- =====================================================================

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client'
    CHECK (role IN ('super_admin', 'admin', 'client', 'employee', 'salesman')),
  display_name text,
  avatar_url text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- CORE BUSINESS TABLES
-- =====================================================================

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text,
  contact_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  vat_number text,
  avatar_url text,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  project_type text CHECK (project_type IN (
    'corporate_video', 'event_coverage', 'social_media_content',
    'commercial', 'documentary', 'music_video', 'other'
  )),
  status text DEFAULT 'briefing' CHECK (status IN (
    'briefing', 'pre_production', 'filming', 'editing',
    'review', 'revisions', 'delivered', 'archived'
  )),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date date,
  deadline date,
  budget numeric(10,2),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  version integer DEFAULT 1,
  status text DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'revision_requested', 'final'
  )),
  download_count integer DEFAULT 0,
  expires_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.video_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES public.deliverables(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp_seconds numeric(10,2) NOT NULL,
  content text NOT NULL,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'
  )),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 24.00,
  tax_amount numeric(10,2),
  total numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  notes text,
  line_items jsonb NOT NULL,
  payment_method text,
  paid_at timestamptz,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  viewed_at timestamptz,
  file_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL,
  receipt_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  read_by jsonb DEFAULT '[]',
  channel text NOT NULL DEFAULT 'client' CHECK (channel IN ('client', 'team')),
  created_at timestamptz DEFAULT now()
);

-- Extra FK: PostgREST needs this to resolve joins with user_profiles
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_user_profiles_fkey
  FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id);

-- =====================================================================
-- CONTRACTS
-- =====================================================================

CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  placeholders jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled'
  )),
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signature_data jsonb,
  pdf_path text,
  expires_at timestamptz,
  service_type text,
  agreed_amount numeric(12,2),
  payment_method text CHECK (
    payment_method IS NULL OR payment_method IN ('bank_transfer', 'cash', 'card', 'installments')
  ),
  scope_description text,
  special_terms text,
  signed_pdf_path text,
  locale text NOT NULL DEFAULT 'el',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.contract_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  days_before_expiry integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, days_before_expiry)
);

-- =====================================================================
-- FILMING & PRE-PRODUCTION
-- =====================================================================

CREATE TABLE public.filming_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  preferred_dates jsonb,
  location text,
  project_type text,
  budget_range text,
  reference_links jsonb DEFAULT '[]',
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'accepted', 'declined', 'converted'
  )),
  admin_notes text,
  converted_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  selected_package text,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_company text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.equipment_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shot_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  shots jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.concept_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- CRM / LEADS
-- =====================================================================

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  source text NOT NULL DEFAULT 'other'
    CHECK (source IN ('referral', 'website', 'social_media', 'cold_call', 'event', 'advertisement', 'other')),
  stage text NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  deal_value numeric(12,2),
  probability integer NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  notes text,
  assigned_to uuid REFERENCES auth.users(id),
  lost_reason text,
  expected_close_date date,
  last_contacted_at timestamptz,
  converted_to_client_id uuid REFERENCES public.clients(id),
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Extra FK: PostgREST needs this to resolve joins with user_profiles
ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_user_profiles_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  activity_type text NOT NULL
    CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'stage_change', 'other')),
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- KNOWLEDGE BASE (UNIVERSITY)
-- =====================================================================

CREATE TABLE public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  summary text,
  video_urls jsonb NOT NULL DEFAULT '[]',
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- SALES RESOURCES
-- =====================================================================

CREATE TABLE public.sales_resource_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.sales_resource_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- AI CHATBOT (pgvector RAG)
-- =====================================================================

CREATE TABLE public.chat_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_en text,
  content_el text,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  page_url text,
  user_agent text,
  message_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  token_count int,
  context_chunks jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_rate_limits (
  session_id text PRIMARY KEY,
  message_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- CALENDAR
-- =====================================================================

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  all_day boolean NOT NULL DEFAULT true,
  color text,
  event_type text NOT NULL DEFAULT 'custom'
    CHECK (event_type IN ('meeting', 'reminder', 'filming', 'deadline', 'custom')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- END
-- =====================================================================
