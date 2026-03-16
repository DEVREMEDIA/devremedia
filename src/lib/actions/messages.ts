'use server';

import { createClient } from '@/lib/supabase/server';
import { createMessageSchema } from '@/lib/schemas/message';
import type { ActionResult, Message } from '@/types/index';
import { revalidatePath } from 'next/cache';

export async function getMessagesByProject(projectId: string): Promise<ActionResult<Message[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, project_id, sender_id, content, attachments, read_by, created_at, sender:user_profiles(id, role, display_name, avatar_url, preferences, created_at)',
      )
      .eq('project_id', projectId)
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
        'id, project_id, sender_id, content, attachments, read_by, created_at, sender:user_profiles(id, role, display_name, avatar_url, preferences, created_at)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${validated.project_id}`);
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

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .is('read_at', null)
      .neq('sender_id', user.id);

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${projectId}`);
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to mark messages as read',
    };
  }
}
