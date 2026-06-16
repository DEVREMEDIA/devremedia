import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export type Recipient =
  | { kind: 'clientByProject'; projectId: string }
  | { kind: 'clientByClient'; clientId: string }
  | { kind: 'admins' }
  | { kind: 'user'; id: string };

export interface NotificationEffect {
  recipient: Recipient;
  type: string;
  title: string;
  body?: string;
  actionUrl: string;
}

export type EmailEffect =
  | {
      trigger: 'invoice_sent';
      payload: {
        invoiceId: string;
        clientId: string;
        invoiceNumber: string;
        total: number;
        currency: string;
        dueDate: string;
      };
    }
  | {
      trigger: 'project_delivered';
      payload: { projectId: string; projectTitle: string; clientId: string };
    };

export interface StatusEffects {
  notifications: NotificationEffect[];
  email: EmailEffect | null;
  calendarSync: boolean;
  revalidate: string[];
}

export interface StatusChangeContext {
  entityId: string;
  title?: string;
  projectId?: string | null;
  clientId?: string | null;
  actorId?: string;
  actorRole?: string;
  uploadedBy?: string | null;
  assignedTo?: string | null;
  invoiceNumber?: string;
  total?: number | null;
  currency?: string | null;
  dueDate?: string | null;
}

export interface StatusChange {
  entity: 'project' | 'invoice' | 'deliverable' | 'task';
  status: string;
  ctx: StatusChangeContext;
}

// --- Revalidate-path builders (pure string lists) ---

export function projectRevalidatePaths(id: string): string[] {
  return [
    '/admin/projects',
    `/admin/projects/${id}`,
    '/client/projects',
    `/client/projects/${id}`,
    '/client/dashboard',
  ];
}

// --- Per-entity decision functions ---

function decideProjectEffects(status: string, ctx: StatusChangeContext): StatusEffects {
  const id = ctx.entityId;
  const notifications: NotificationEffect[] = [
    {
      recipient: { kind: 'clientByProject', projectId: id },
      type: NOTIFICATION_TYPES.PROJECT_STATUS,
      title: `Project "${ctx.title ?? ''}" status updated to ${status}`,
      actionUrl: `/client/projects/${id}`,
    },
  ];

  const email: EmailEffect | null =
    status === 'delivered' && ctx.clientId
      ? {
          trigger: 'project_delivered',
          payload: { projectId: id, projectTitle: ctx.title ?? '', clientId: ctx.clientId },
        }
      : null;

  return {
    notifications,
    email,
    calendarSync: status === 'filming',
    revalidate: projectRevalidatePaths(id),
  };
}

const NO_EFFECTS = (): StatusEffects => ({
  notifications: [],
  email: null,
  calendarSync: false,
  revalidate: [],
});

export function decideStatusEffects(change: StatusChange): StatusEffects {
  switch (change.entity) {
    case 'project':
      return decideProjectEffects(change.status, change.ctx);
    default:
      return NO_EFFECTS();
  }
}
