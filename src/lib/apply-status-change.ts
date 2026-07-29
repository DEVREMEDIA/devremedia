import { revalidatePath } from 'next/cache';
import {
  createNotificationForMany,
  getClientUserIdFromProject,
  getClientUserIdFromClientId,
  getAdminUserIds,
} from '@/lib/notification-helpers';
import { triggerInvoiceSentEmail } from '@/lib/email/triggers/invoice-sent';
import { triggerProjectDeliveredEmail } from '@/lib/email/triggers/project-delivered';
import { syncProjectFilmingToCalendar } from '@/lib/actions/sync-project-filming';
import { decideStatusEffects, type StatusChange, type Recipient } from '@/lib/status-effects';

async function resolveRecipient(recipient: Recipient): Promise<string[]> {
  switch (recipient.kind) {
    case 'user':
      return [recipient.id];
    case 'admins':
      return getAdminUserIds();
    case 'clientByProject': {
      const id = await getClientUserIdFromProject(recipient.projectId);
      return id ? [id] : [];
    }
    case 'clientByClient': {
      const id = await getClientUserIdFromClientId(recipient.clientId);
      return id ? [id] : [];
    }
  }
}

/**
 * Executes every side-effect implied by a status change. The "what" lives in the
 * pure decideStatusEffects; this layer only does I/O and has no branching of its
 * own. Notifications are awaited (createNotification swallows its own errors);
 * emails stay fire-and-forget; calendar sync stays awaited.
 */
export async function applyStatusChange(change: StatusChange): Promise<void> {
  const effects = decideStatusEffects(change);

  for (const n of effects.notifications) {
    const userIds = await resolveRecipient(n.recipient);
    if (userIds.length === 0) continue;
    await createNotificationForMany(userIds, {
      type: n.type,
      title: n.title,
      body: n.body,
      actionUrl: n.actionUrl,
    });
  }

  if (effects.email) {
    switch (effects.email.trigger) {
      case 'invoice_sent':
        triggerInvoiceSentEmail(effects.email.payload);
        break;
      case 'project_delivered':
        triggerProjectDeliveredEmail(effects.email.payload);
        break;
    }
  }

  if (effects.calendarSync) {
    await syncProjectFilmingToCalendar(change.ctx.entityId);
  }

  for (const path of effects.revalidate) {
    revalidatePath(path);
  }
}
