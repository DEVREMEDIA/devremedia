// User Roles
export const USER_ROLES = ['super_admin', 'admin', 'client', 'employee', 'salesman'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Client Status
export const CLIENT_STATUSES = ['active', 'inactive', 'lead'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

// Project Types
export const PROJECT_TYPES = [
  'corporate_video',
  'event_coverage',
  'social_media_content',
  'commercial',
  'documentary',
  'music_video',
  'podcast',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

// Project Statuses (Kanban columns)
export const PROJECT_STATUSES = [
  'briefing',
  'pre_production',
  'filming',
  'editing',
  'review',
  'revisions',
  'delivered',
  'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Priority
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

// Task Statuses
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Deliverable Statuses
export const DELIVERABLE_STATUSES = [
  'pending_review',
  'approved',
  'revision_requested',
  'final',
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

// Invoice Statuses
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Contract Statuses
export const CONTRACT_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'signed',
  'expired',
  'cancelled',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const isContractSignable = (status: string) => status === 'sent' || status === 'viewed';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  card: 'Credit / Debit Card',
  installments: 'Installments',
};

// Filming Request Statuses
export const FILMING_REQUEST_STATUSES = [
  'pending',
  'reviewed',
  'accepted',
  'declined',
  'converted',
] as const;
export type FilmingRequestStatus = (typeof FILMING_REQUEST_STATUSES)[number];

// Shot Types
export const SHOT_TYPES = [
  'wide',
  'medium',
  'close_up',
  'detail',
  'aerial',
  'pov',
  'tracking',
  'other',
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'equipment',
  'travel',
  'location',
  'talent',
  'post_production',
  'software',
  'marketing',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Lead Stages (CRM pipeline)
export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

// Lead Sources
export const LEAD_SOURCES = [
  'referral',
  'website',
  'social_media',
  'cold_call',
  'event',
  'advertisement',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// Lead Activity Types
export const LEAD_ACTIVITY_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
  'stage_change',
  'other',
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

// Equipment Categories
export const EQUIPMENT_CATEGORIES = [
  'camera',
  'microphone',
  'drone',
  'gimbal',
  'lights',
  'tripod',
  'computer',
  'storage',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

// Knowledge Base Article Statuses
export const KB_ARTICLE_STATUSES = ['draft', 'published'] as const;
export type KbArticleStatus = (typeof KB_ARTICLE_STATUSES)[number];

// Calendar Event Types
export const CALENDAR_EVENT_TYPES = [
  'meeting',
  'reminder',
  'filming',
  'deadline',
  'custom',
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

// Greek VAT rate
export const DEFAULT_TAX_RATE = 24.0;
export const DEFAULT_CURRENCY = 'EUR';

// Invoice numbering prefix
export const INVOICE_PREFIX = 'DMS';

// Storage bucket names
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  deliverables: 'deliverables',
  attachments: 'attachments',
  receipts: 'receipts',
  contracts: 'contracts',
} as const;

// Max file sizes (in bytes)
export const MAX_FILE_SIZES = {
  avatar: 5 * 1024 * 1024, // 5MB
  deliverable: 5 * 1024 * 1024 * 1024, // 5GB
  attachment: 50 * 1024 * 1024, // 50MB
  receipt: 10 * 1024 * 1024, // 10MB
  contract: 10 * 1024 * 1024, // 10MB
} as const;
