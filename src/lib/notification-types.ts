export const NOTIFICATION_TYPES = {
  PROJECT_STATUS: 'project_status',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_PAID: 'invoice_paid',
  CONTRACT_SENT: 'contract_sent',
  CONTRACT_SIGNED: 'contract_signed',
  DELIVERABLE_UPLOADED: 'deliverable_uploaded',
  DELIVERABLE_REVIEWED: 'deliverable_reviewed',
  FILMING_REQUEST_STATUS: 'filming_request_status',
  NEW_MESSAGE: 'new_message',
  BOOKING_SUBMITTED: 'booking_submitted',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
} as const;

// Map notification types to preference keys for checking user preferences
export const TYPE_TO_PREFERENCE: Record<string, string> = {
  [NOTIFICATION_TYPES.PROJECT_STATUS]: 'project_updates',
  [NOTIFICATION_TYPES.INVOICE_SENT]: 'invoice_reminders',
  [NOTIFICATION_TYPES.INVOICE_PAID]: 'invoice_reminders',
  [NOTIFICATION_TYPES.CONTRACT_SENT]: 'project_updates',
  [NOTIFICATION_TYPES.CONTRACT_SIGNED]: 'project_updates',
  [NOTIFICATION_TYPES.DELIVERABLE_UPLOADED]: 'new_deliverables',
  [NOTIFICATION_TYPES.DELIVERABLE_REVIEWED]: 'new_deliverables',
  [NOTIFICATION_TYPES.FILMING_REQUEST_STATUS]: 'filming_reminders',
  [NOTIFICATION_TYPES.NEW_MESSAGE]: 'messages',
  [NOTIFICATION_TYPES.BOOKING_SUBMITTED]: 'project_updates',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'project_updates',
  [NOTIFICATION_TYPES.TASK_UPDATED]: 'project_updates',
};
