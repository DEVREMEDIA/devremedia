'use server';

// Every export of this file is a public Server Action endpoint, so each one must
// authenticate. The admin-client notification helpers live in
// `@/lib/notification-helpers` — a plain server module — for exactly that reason.

import { requireUser } from '@/lib/auth-helpers';
import type { ActionResult, Notification } from '@/types/index';
import { revalidatePath } from 'next/cache';

const NOTIFICATION_ROLES = ['admin', 'client', 'employee', 'salesman'] as const;

// Keep the bell (dashboard) and the dedicated Notifications page in sync after
// a read state change, across every role surface.
function revalidateNotificationSurfaces(): void {
  for (const role of NOTIFICATION_ROLES) {
    revalidatePath(`/${role}/dashboard`);
    revalidatePath(`/${role}/notifications`);
  }
}

export async function getMyNotifications(): Promise<ActionResult<Notification[]>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, user_id, type, title, body, read, action_url, action_type, action_data, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error: error.message };
    return { data: data as Notification[], error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch notifications',
    };
  }
}

export interface NotificationsPage {
  notifications: Notification[];
  hasMore: boolean;
}

interface GetNotificationsPageInput {
  offset?: number;
  limit?: number;
  filter?: 'all' | 'unread';
}

export async function getMyNotificationsPage({
  offset = 0,
  limit = 20,
  filter = 'all',
}: GetNotificationsPageInput = {}): Promise<ActionResult<NotificationsPage>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // Fetch one extra row to determine whether more pages exist.
    let query = supabase
      .from('notifications')
      .select(
        'id, user_id, type, title, body, read, action_url, action_type, action_data, created_at',
      )
      .eq('user_id', user.id);

    if (filter === 'unread') query = query.eq('read', false);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    if (error) return { data: null, error: error.message };

    const rows = (data ?? []) as Notification[];
    const hasMore = rows.length > limit;
    return {
      data: { notifications: hasMore ? rows.slice(0, limit) : rows, hasMore },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch notifications',
    };
  }
}

export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) return { data: null, error: error.message };
    return { data: count ?? 0, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch unread count',
    };
  }
}

export async function markAsRead(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { data: null, error: error.message };

    revalidateNotificationSurfaces();
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to mark notification as read',
    };
  }
}

export async function markAllAsRead(): Promise<ActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) return { data: null, error: error.message };

    revalidateNotificationSurfaces();
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to mark all notifications as read',
    };
  }
}

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>,
): Promise<ActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // Get current preferences
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPrefs = (profile?.preferences ?? {}) as Record<string, unknown>;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferences: {
          ...currentPrefs,
          notifications: preferences,
        },
      })
      .eq('id', user.id);

    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update preferences',
    };
  }
}

export async function getNotificationPreferences(): Promise<ActionResult<Record<string, boolean>>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const notifications = (profile?.preferences as Record<string, unknown>)?.notifications as
      | Record<string, boolean>
      | undefined;

    return {
      data: notifications ?? {
        project_updates: true,
        new_deliverables: true,
        invoice_reminders: true,
        messages: true,
        filming_reminders: true,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch preferences',
    };
  }
}
