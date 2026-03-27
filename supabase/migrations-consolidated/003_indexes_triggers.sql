-- =====================================================================
-- Migration 003: Indexes, Triggers & Realtime
-- Consolidated from: 00001, 00004, 00007-00009, 00012, 00015, 00025,
--   00026, 20240209
-- Must run AFTER 002 (functions must exist)
-- =====================================================================

-- =====================================================================
-- AUTH TRIGGER: Auto-create user profile on signup
-- =====================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================================
-- UPDATED_AT TRIGGERS
-- =====================================================================

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_lists_updated_at
  BEFORE UPDATE ON public.equipment_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_lists_updated_at
  BEFORE UPDATE ON public.shot_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concept_notes_updated_at
  BEFORE UPDATE ON public.concept_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_kb_categories_updated_at
  BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_chat_knowledge_updated_at
  BEFORE UPDATE ON public.chat_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- INDEXES: user_profiles, activity_log, notifications
-- =====================================================================

CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================================
-- INDEXES: clients
-- =====================================================================

CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

-- =====================================================================
-- INDEXES: projects
-- =====================================================================

CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_priority ON public.projects(priority);
CREATE INDEX idx_projects_deadline ON public.projects(deadline);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_projects_assigned_to ON public.projects(assigned_to);

-- =====================================================================
-- INDEXES: tasks
-- =====================================================================

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_sort_order ON public.tasks(project_id, sort_order);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

-- =====================================================================
-- INDEXES: deliverables
-- =====================================================================

CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX idx_deliverables_uploaded_by ON public.deliverables(uploaded_by);
CREATE INDEX idx_deliverables_status ON public.deliverables(status);
CREATE INDEX idx_deliverables_created_at ON public.deliverables(created_at DESC);

-- =====================================================================
-- INDEXES: video_annotations
-- =====================================================================

CREATE INDEX idx_video_annotations_deliverable_id ON public.video_annotations(deliverable_id);
CREATE INDEX idx_video_annotations_user_id ON public.video_annotations(user_id);
CREATE INDEX idx_video_annotations_timestamp ON public.video_annotations(deliverable_id, timestamp_seconds);
CREATE INDEX idx_video_annotations_resolved ON public.video_annotations(deliverable_id, resolved);
CREATE INDEX idx_video_annotations_created_at ON public.video_annotations(created_at DESC);

-- =====================================================================
-- INDEXES: invoices
-- =====================================================================

CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);

-- =====================================================================
-- INDEXES: expenses
-- =====================================================================

CREATE INDEX idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

-- =====================================================================
-- INDEXES: messages
-- =====================================================================

CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(project_id, created_at DESC);
CREATE INDEX idx_messages_channel ON public.messages(project_id, channel);
-- =====================================================================
-- INDEXES: contract_templates, contracts, contract_reminders
-- =====================================================================

CREATE INDEX idx_contract_templates_created_at ON public.contract_templates(created_at DESC);

CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_template_id ON public.contracts(template_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_created_at ON public.contracts(created_at DESC);

CREATE INDEX idx_contract_reminders_contract_id ON public.contract_reminders(contract_id);
CREATE INDEX idx_contract_reminders_sent_at ON public.contract_reminders(sent_at);

-- =====================================================================
-- INDEXES: filming_requests, equipment, shots, concepts
-- =====================================================================

CREATE INDEX idx_filming_requests_client_id ON public.filming_requests(client_id);
CREATE INDEX idx_filming_requests_status ON public.filming_requests(status);
CREATE INDEX idx_filming_requests_converted_project_id ON public.filming_requests(converted_project_id);
CREATE INDEX idx_filming_requests_created_at ON public.filming_requests(created_at DESC);

CREATE INDEX idx_equipment_lists_project_id ON public.equipment_lists(project_id);
CREATE INDEX idx_equipment_lists_created_at ON public.equipment_lists(created_at DESC);

CREATE INDEX idx_shot_lists_project_id ON public.shot_lists(project_id);
CREATE INDEX idx_shot_lists_created_at ON public.shot_lists(created_at DESC);

CREATE INDEX idx_concept_notes_project_id ON public.concept_notes(project_id);
CREATE INDEX idx_concept_notes_created_at ON public.concept_notes(created_at DESC);

-- =====================================================================
-- INDEXES: leads, lead_activities
-- =====================================================================

CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_expected_close_date ON public.leads(expected_close_date);

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_user_id ON public.lead_activities(user_id);

-- =====================================================================
-- INDEXES: knowledge base
-- =====================================================================

CREATE INDEX idx_kb_articles_fts ON public.kb_articles
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
CREATE INDEX idx_kb_articles_category_id ON public.kb_articles(category_id);
CREATE INDEX idx_kb_articles_published ON public.kb_articles(published);
CREATE INDEX idx_kb_categories_slug ON public.kb_categories(slug);
CREATE INDEX idx_kb_articles_slug ON public.kb_articles(slug);

-- =====================================================================
-- INDEXES: sales resources
-- =====================================================================

CREATE INDEX idx_sales_resources_category_id ON public.sales_resources(category_id);

-- =====================================================================
-- INDEXES: chatbot
-- =====================================================================

CREATE INDEX idx_chat_knowledge_embedding ON public.chat_knowledge
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_chat_knowledge_category ON public.chat_knowledge(category);

CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_created ON public.chat_conversations(created_at DESC);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);

-- =====================================================================
-- INDEXES: calendar
-- =====================================================================

CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX idx_calendar_events_created_by ON public.calendar_events(created_by);

-- =====================================================================
-- REALTIME PUBLICATIONS
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =====================================================================
-- END
-- =====================================================================
