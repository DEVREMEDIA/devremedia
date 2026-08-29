// Server-only helpers for creating notifications.
//
// These run on the admin client (RLS bypass) and take a user id straight from the
// caller, so they must never be reachable from the browser. They used to live in
// `src/lib/actions/notifications.ts`, which carries the `'use server'` directive —
// that turns every export of the file into a publicly callable Server Action
// endpoint, so anyone could mint notifications for any user or enumerate admin ids
// (audit 2026-07-29 §2.2). This module deliberately has NO `'use server'`: it is a
// plain module that only server code imports.

import { createAdminClient } from '@/lib/supabase/admin';
import { TYPE_TO_PREFERENCE } from '@/lib/notification-types';

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

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  actionType?: string;
  actionData?: unknown;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
  actionType,
  actionData,
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
      action_type: actionType ?? null,
      action_data: actionData ?? null,
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
