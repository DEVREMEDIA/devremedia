import type {
  UserRole,
  ClientStatus,
  ProjectType,
  ProjectStatus,
  Priority,
  TaskStatus,
  DeliverableStatus,
  InvoiceStatus,
  ContractStatus,
  FilmingRequestStatus,
  ShotType,
  ExpenseCategory,
  LeadStage,
  LeadSource,
  LeadActivityType,
  CalendarEventType,
} from '@/lib/constants';

export type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

export type UserProfile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
};

export type UserWithEmail = UserProfile & {
  email: string;
};

export type Client = {
  id: string;
  user_id: string | null;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  avatar_url: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  budget: number | null;
  deadline: string | null;
  start_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigned_to: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
};

export type Deliverable = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number;
  file_type: string;
  version: number;
  status: DeliverableStatus;
  uploaded_by: string;
  download_count: number;
  expires_at: string | null;
  created_at: string;
};

export type VideoAnnotation = {
  id: string;
  deliverable_id: string;
  user_id: string;
  timestamp_seconds: number;
  content: string;
  resolved: boolean;
  created_at: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
};

export type Invoice = {
  id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  file_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  project_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receipt_path: string | null;
  created_at: string;
};

export type MessageAttachment = {
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
};

export type Message = {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  attachments: MessageAttachment[];
  read_by: string[];
  channel: 'client' | 'team';
  created_at: string;
};

export type Contract = {
  id: string;
  project_id: string | null;
  client_id: string;
  template_id: string | null;
  title: string;
  content: string;
  status: ContractStatus;
  pdf_path: string | null;
  signature_data: Record<string, unknown> | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  service_type: string | null;
  agreed_amount: number | null;
  payment_method: string | null;
  created_by: string;
  created_at: string;
};

export type ContractTemplate = {
  id: string;
  title: string;
  content: string;
  placeholders: Record<string, unknown>;
  created_at: string;
};

export type FilmingRequest = {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  preferred_dates: Array<{ date?: string; time_slot?: string }> | null;
  location: string | null;
  project_type: string | null;
  budget_range: string | null;
  reference_links: string[] | null;
  selected_package: string | null;
  status: FilmingRequestStatus;
  admin_notes: string | null;
  converted_project_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  created_at: string;
};

export type EquipmentItem = {
  name: string;
  quantity: number;
  checked: boolean;
  notes: string | null;
};

export type EquipmentList = {
  id: string;
  project_id: string;
  items: EquipmentItem[];
  created_at: string;
  updated_at: string;
};

export type Shot = {
  number: number;
  description: string;
  shot_type: ShotType;
  location?: string;
  duration_est?: string;
  notes?: string;
  completed: boolean;
};

export type ShotList = {
  id: string;
  project_id: string;
  shots: Shot[];
  created_at: string;
  updated_at: string;
};

export type ConceptNote = {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  contact_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  source: LeadSource;
  stage: LeadStage;
  deal_value: number | null;
  probability: number;
  notes: string | null;
  assigned_to: string;
  lost_reason: string | null;
  expected_close_date: string | null;
  last_contacted_at: string | null;
  converted_to_client_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadActivity = {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: LeadActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type KbCategory = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  sort_order: number;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type KbArticle = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  video_urls: string[];
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SalesResourceCategory = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type SalesResource = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
};

export type ChatKnowledge = {
  id: string;
  category: string;
  title: string;
  content: string;
  content_en: string | null;
  content_el: string | null;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export type ChatConversation = {
  id: string;
  session_id: string;
  language: string;
  page_url: string | null;
  user_agent: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_count: number | null;
  context_chunks: Record<string, unknown>[] | null;
  created_at: string;
};

export type CalendarEventRecord = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string | null;
  event_type: CalendarEventType;
  created_by: string;
  created_at: string;
  updated_at: string;
};
