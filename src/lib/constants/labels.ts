import type {
  ProjectStatus,
  Priority,
  TaskStatus,
  InvoiceStatus,
  ClientStatus,
  ContractStatus,
  DeliverableStatus,
  FilmingRequestStatus,
  ProjectType,
  ShotType,
  ExpenseCategory,
  UserRole,
  LeadStage,
  LeadSource,
  LeadActivityType,
  KbArticleStatus,
  CalendarEventType,
} from './enums';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  briefing: 'Briefing',
  pre_production: 'Pre-Production',
  filming: 'Filming',
  editing: 'Editing',
  review: 'Review',
  revisions: 'Revisions',
  delivered: 'Delivered',
  archived: 'Archived',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  lead: 'Lead',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  revision_requested: 'Revision Requested',
  final: 'Final',
};

export const FILMING_REQUEST_STATUS_LABELS: Record<FilmingRequestStatus, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  declined: 'Declined',
  converted: 'Converted',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  corporate_video: 'Corporate Video',
  event_coverage: 'Event Coverage',
  social_media_content: 'Social Media Content',
  commercial: 'Commercial',
  documentary: 'Documentary',
  music_video: 'Music Video',
  podcast: 'Podcast',
  other: 'Other',
};

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  wide: 'Wide',
  medium: 'Medium',
  close_up: 'Close-Up',
  detail: 'Detail',
  aerial: 'Aerial',
  pov: 'POV',
  tracking: 'Tracking',
  other: 'Other',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipment: 'Equipment',
  travel: 'Travel',
  location: 'Location',
  talent: 'Talent',
  post_production: 'Post-Production',
  software: 'Software',
  marketing: 'Marketing',
  other: 'Other',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  client: 'Client',
  employee: 'Employee',
  salesman: 'Salesman',
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: 'Referral',
  website: 'Website',
  social_media: 'Social Media',
  cold_call: 'Cold Call',
  event: 'Event',
  advertisement: 'Advertisement',
  other: 'Other',
};

export const LEAD_ACTIVITY_TYPE_LABELS: Record<LeadActivityType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  stage_change: 'Stage Change',
  other: 'Other',
};

export const KB_ARTICLE_STATUS_LABELS: Record<KbArticleStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  meeting: 'hsl(262 83% 58%)',
  reminder: 'hsl(199 89% 48%)',
  filming: 'hsl(var(--primary))',
  deadline: 'hsl(var(--destructive))',
  custom: 'hsl(280 60% 55%)',
};

// Calendar event type i18n keys
export const EVENT_TYPE_KEYS: Record<string, string> = {
  meeting: 'eventTypeMeeting',
  reminder: 'eventTypeReminder',
  filming: 'eventTypeFilming',
  deadline: 'eventTypeDeadline',
  custom: 'eventTypeCustom',
};
