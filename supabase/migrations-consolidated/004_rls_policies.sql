-- =====================================================================
-- Migration 004: Row Level Security Policies (final state)
-- Consolidated from: 00001, 00003, 00006-00009, 00012, 00015, 00017,
--   00019-00021, 00024-00026, 20260211
-- =====================================================================
-- Uses is_admin() SECURITY DEFINER helper to prevent RLS recursion

-- =====================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filming_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- USER_PROFILES
-- =====================================================================

-- Admins see all profiles; users see their own
CREATE POLICY "Admins can read all user profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (role changes, deactivation)
CREATE POLICY "Admins can update all user profiles"
  ON public.user_profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- INSERT handled by trigger only (no user insert policy)

-- =====================================================================
-- ACTIVITY_LOG
-- =====================================================================

-- Admins read all; users read their own
CREATE POLICY "Admins can read all activity logs"
  ON public.activity_log FOR SELECT
  USING (public.is_admin() OR auth.uid() = user_id);

-- Inserts done via service role / security definer functions

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- CLIENTS
-- =====================================================================

CREATE POLICY "Admins full access to clients"
  ON public.clients FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own record"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================================
-- PROJECTS
-- =====================================================================

CREATE POLICY "Admins full access to projects"
  ON public.projects FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Employees: see projects they have tasks in OR are assigned to
CREATE POLICY "employees_select_projects_with_tasks"
  ON public.projects FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.project_id = projects.id
        AND tasks.assigned_to = auth.uid()
      )
      OR projects.assigned_to = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- TASKS
-- =====================================================================

CREATE POLICY "Admins full access to tasks"
  ON public.tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_select_own_tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

CREATE POLICY "employees_update_own_tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- DELIVERABLES
-- =====================================================================

CREATE POLICY "Admins full access to deliverables"
  ON public.deliverables FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own deliverables"
  ON public.deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = deliverables.project_id
      AND c.user_id = auth.uid()
    )
  );

-- Employees: see deliverables for projects they work on or are assigned to
CREATE POLICY "employees_select_deliverables"
  ON public.deliverables FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

CREATE POLICY "employees_insert_deliverables"
  ON public.deliverables FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- VIDEO_ANNOTATIONS
-- =====================================================================

CREATE POLICY "Admins full access to video annotations"
  ON public.video_annotations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own video annotations"
  ON public.video_annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      JOIN public.clients c ON c.id = p.client_id
      WHERE d.id = video_annotations.deliverable_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create video annotations"
  ON public.video_annotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      JOIN public.clients c ON c.id = p.client_id
      WHERE d.id = video_annotations.deliverable_id
      AND c.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- =====================================================================
-- INVOICES
-- =====================================================================

CREATE POLICY "Admins full access to invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Clients see non-draft invoices only
CREATE POLICY "Clients can view own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = invoices.client_id
      AND clients.user_id = auth.uid()
    )
    AND status != 'draft'
  );

-- =====================================================================
-- EXPENSES
-- =====================================================================

CREATE POLICY "Admins full access to expenses"
  ON public.expenses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- MESSAGES
-- =====================================================================

CREATE POLICY "Admins full access to messages"
  ON public.messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SELECT: channel-aware (client channel visible to clients, team channel to employees)
CREATE POLICY "Users can read messages from their projects"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = messages.project_id
      AND (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_id
          AND c.user_id = auth.uid()
        )
        OR p.assigned_to = auth.uid()
      )
    )
    AND (
      channel = 'client'
      OR (
        channel = 'team'
        AND (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.projects p2
            WHERE p2.id = messages.project_id
            AND p2.assigned_to = auth.uid()
          )
        )
      )
    )
  );

-- UPDATE: only for read receipts, with proper access check
CREATE POLICY "Users can update message read status"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = messages.project_id
      AND (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_id
          AND c.user_id = auth.uid()
        )
        OR p.assigned_to = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = messages.project_id
      AND (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_id
          AND c.user_id = auth.uid()
        )
        OR p.assigned_to = auth.uid()
      )
    )
  );

-- Clients can send messages to their projects (client channel)
CREATE POLICY "Clients can create project messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = messages.project_id
      AND c.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
    AND channel = 'client'
  );

-- Employees can send team messages for projects assigned to them
CREATE POLICY "employees_insert_team_messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    channel = 'team'
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.assigned_to = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- CONTRACT_TEMPLATES
-- =====================================================================

CREATE POLICY "Admins full access to contract templates"
  ON public.contract_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- CONTRACTS
-- =====================================================================

CREATE POLICY "Admins full access to contracts"
  ON public.contracts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Clients see non-draft contracts only
CREATE POLICY "Clients can view own contracts"
  ON public.contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = contracts.client_id
      AND clients.user_id = auth.uid()
    )
    AND status != 'draft'
  );

-- Clients can sign contracts (only when in signable state)
CREATE POLICY "Clients can sign own contracts"
  ON public.contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = contracts.client_id
      AND clients.user_id = auth.uid()
    )
    AND status IN ('sent', 'viewed')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = contracts.client_id
      AND clients.user_id = auth.uid()
    )
    AND status IN ('signed', 'viewed')
  );

-- =====================================================================
-- CONTRACT_REMINDERS
-- =====================================================================

-- Only service role can access (edge function uses supabaseAdmin)
CREATE POLICY "Service role can manage reminders"
  ON public.contract_reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- FILMING_REQUESTS
-- =====================================================================

CREATE POLICY "Admins full access to filming requests"
  ON public.filming_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own filming requests"
  ON public.filming_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = filming_requests.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create filming requests"
  ON public.filming_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = filming_requests.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- =====================================================================
-- EQUIPMENT_LISTS, SHOT_LISTS, CONCEPT_NOTES (admin-only)
-- =====================================================================

CREATE POLICY "Admins full access to equipment lists"
  ON public.equipment_lists FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins full access to shot lists"
  ON public.shot_lists FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins full access to concept notes"
  ON public.concept_notes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- LEADS
-- =====================================================================

CREATE POLICY "admins_all_leads"
  ON public.leads FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "salesmen_select_own_leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

CREATE POLICY "salesmen_insert_leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

CREATE POLICY "salesmen_update_own_leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

CREATE POLICY "salesmen_delete_own_leads"
  ON public.leads FOR DELETE TO authenticated
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

-- =====================================================================
-- LEAD_ACTIVITIES
-- =====================================================================

CREATE POLICY "admins_all_lead_activities"
  ON public.lead_activities FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "salesmen_select_lead_activities"
  ON public.lead_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_activities.lead_id
      AND leads.assigned_to = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

CREATE POLICY "salesmen_insert_lead_activities"
  ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_activities.lead_id
      AND leads.assigned_to = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

-- =====================================================================
-- KB_CATEGORIES
-- =====================================================================

CREATE POLICY "admins_all_kb_categories"
  ON public.kb_categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_select_kb_categories"
  ON public.kb_categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- KB_ARTICLES
-- =====================================================================

CREATE POLICY "admins_all_kb_articles"
  ON public.kb_articles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_select_published_articles"
  ON public.kb_articles FOR SELECT TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'employee'
    )
  );

-- =====================================================================
-- SALES_RESOURCE_CATEGORIES
-- =====================================================================

CREATE POLICY "admins_all_sales_resource_categories"
  ON public.sales_resource_categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "salesmen_select_sales_resource_categories"
  ON public.sales_resource_categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

-- =====================================================================
-- SALES_RESOURCES
-- =====================================================================

CREATE POLICY "admins_all_sales_resources"
  ON public.sales_resources FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "salesmen_select_sales_resources"
  ON public.sales_resources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'salesman'
    )
  );

-- =====================================================================
-- CHAT_KNOWLEDGE
-- =====================================================================

CREATE POLICY "Admins can manage knowledge"
  ON public.chat_knowledge FOR ALL
  USING (public.is_admin());

-- =====================================================================
-- CHAT_CONVERSATIONS
-- =====================================================================

CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (true);

-- Admins or session owner can update
CREATE POLICY "Admins or owner can update conversation"
  ON public.chat_conversations FOR UPDATE
  USING (
    public.is_admin()
    OR session_id = auth.uid()::text
  );

CREATE POLICY "Admins can read all conversations"
  ON public.chat_conversations FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- CHAT_MESSAGES
-- =====================================================================

CREATE POLICY "Anyone can create messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read all messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- CHAT_RATE_LIMITS
-- =====================================================================

-- No regular user policies — managed via supabaseAdmin (service role bypasses RLS)

-- =====================================================================
-- CALENDAR_EVENTS
-- =====================================================================

CREATE POLICY "admins_all_calendar_events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- END
-- =====================================================================
