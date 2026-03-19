'use server';

import { createClient } from '@/lib/supabase/server';
import { createMessageSchema } from '@/lib/schemas/message';
import type { ActionResult, Message } from '@/types/index';
import { revalidatePath } from 'next/cache';
import {
  createNotification,
  createNotificationForMany,
  getClientUserIdFromProject,
  getAdminUserIds,
} from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export async function getMessagesByProject(
  projectId: string,
  channel: 'client' | 'team' = 'client',
): Promise<ActionResult<Message[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, project_id, sender_id, content, attachments, read_by, channel, created_at, sender:user_profiles!messages_sender_id_user_profiles_fkey(id, display_name, avatar_url)',
      )
      .eq('project_id', projectId)
      .eq('channel', channel)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch messages' };
  }
}

export async function createMessage(input: unknown): Promise<ActionResult<Message>> {
  try {
    const validated = createMessageSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...validated,
        sender_id: user.id,
      })
      .select(
        'id, project_id, sender_id, content, attachments, read_by, channel, created_at, sender:user_profiles!messages_sender_id_user_profiles_fkey(id, display_name, avatar_url)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${validated.project_id}`);
    revalidatePath(`/client/projects/${validated.project_id}`);
    revalidatePath(`/employee/projects/${validated.project_id}`);

    // Notify the other party about new message
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

    if (isAdmin) {
      // Admin sent message -> notify client
      const clientUserId = await getClientUserIdFromProject(validated.project_id);
      if (clientUserId) {
        createNotification({
          userId: clientUserId,
          type: NOTIFICATION_TYPES.NEW_MESSAGE,
          title: 'New message in your project',
          actionUrl: `/client/projects/${validated.project_id}?tab=messages`,
        });
      }
    } else {
      // Client sent message -> notify admins
      const adminIds = await getAdminUserIds();
      createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: 'New message from client',
        actionUrl: `/admin/projects/${validated.project_id}?tab=messages`,
      });
    }

    return { data, error: null };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { data: null, error: err.message };
    }
    return { data: null, error: 'Failed to create message' };
  }
}

export async function markMessagesAsRead(projectId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    // Fetch messages not yet read by this user
    const { data: unread, error: fetchError } = await supabase
      .from('messages')
      .select('id, read_by')
      .eq('project_id', projectId)
      .neq('sender_id', user.id)
      .not('read_by', 'cs', JSON.stringify([user.id]));

    if (fetchError) return { data: null, error: fetchError.message };
    if (!unread || unread.length === 0) return { data: undefined, error: null };

    // Append user ID to read_by array for each unread message
    await Promise.all(
      unread.map((msg) =>
        supabase
          .from('messages')
          .update({ read_by: [...((msg.read_by as string[]) ?? []), user.id] })
          .eq('id', msg.id),
      ),
    );

    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to mark messages as read',
    };
  }
}
