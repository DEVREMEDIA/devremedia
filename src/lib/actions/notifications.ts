'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, Notification } from '@/types/index';
import { revalidatePath } from 'next/cache';
import { TYPE_TO_PREFERENCE } from '@/lib/notification-types';

// --- Helper functions ---

export async function getClientUserIdFromProject(projectId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single();

  if (!project?.client_id) return null;

  return getClientUserIdFromClientId(project.client_id);
}

export async function getClientUserIdFromClientId(clientId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single();

  return client?.user_id ?? null;
}

export async function getAdminUserIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .in('role', ['super_admin', 'admin']);

  return (data ?? []).map((p) => p.id);
}

// --- Core notification functions ---

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
}: CreateNotificationInput): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Check user preferences before creating notification
    const preferenceKey = TYPE_TO_PREFERENCE[type];
    if (preferenceKey) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      const notifications = (profile?.preferences as Record<string, unknown>)?.notifications as
        | Record<string, boolean>
        | undefined;
      if (notifications && notifications[preferenceKey] === false) {
        return; // User has disabled this notification type
      }
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      action_url: actionUrl ?? null,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export async function createNotificationForMany(
  userIds: string[],
  params: Omit<CreateNotificationInput, 'userId'>,
): Promise<void> {
  await Promise.all(userIds.map((userId) => createNotification({ ...params, userId })));
}

export async function getMyNotifications(): Promise<ActionResult<Notification[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, read, action_url, created_at')
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

export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/dashboard');
    revalidatePath('/client/dashboard');
    revalidatePath('/employee/dashboard');
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/dashboard');
    revalidatePath('/client/dashboard');
    revalidatePath('/employee/dashboard');
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

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
