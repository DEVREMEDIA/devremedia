'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { updateGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar';
import type { ActionResult } from '@/types';
import type {
  GoogleNewEventData,
  GoogleEventChangedData,
  GoogleEventDeletedData,
} from '@/types/entities';

// --- Handle new Google event ---

export async function createFromGoogleEvent(
  notificationId: string,
  targetType: 'custom' | 'task',
  actionData: GoogleNewEventData,
): Promise<ActionResult<null>> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) return { data: null, error: authError ?? 'Unauthorized' };

    const supabase = createAdminClient();

    if (targetType === 'custom') {
      // Create calendar_event
      const { data: event, error } = await supabase
        .from('calendar_events')
        .insert({
          title: actionData.title,
          description: actionData.description ?? null,
          start_date: actionData.start,
          end_date: actionData.end ?? null,
          all_day: !actionData.start.includes('T'),
          event_type: 'custom',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) return { data: null, error: error.message };

      // Create sync mapping
      await supabase.from('google_calendar_sync').insert({
        entity_type: 'custom',
        entity_id: event.id,
        google_event_id: actionData.google_event_id,
        sync_status: 'synced',
        sync_direction: 'from_google',
        last_synced_at: new Date().toISOString(),
      });
    } else if (targetType === 'task') {
      // Task creation requires a project_id — for now create as custom event
      // TODO: Add project selection UI if needed
      const { data: event, error } = await supabase
        .from('calendar_events')
        .insert({
          title: actionData.title,
          description: actionData.description ?? null,
          start_date: actionData.start,
          end_date: actionData.end ?? null,
          all_day: !actionData.start.includes('T'),
          event_type: 'meeting',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) return { data: null, error: error.message };

      await supabase.from('google_calendar_sync').insert({
        entity_type: 'custom',
        entity_id: event.id,
        google_event_id: actionData.google_event_id,
        sync_status: 'synced',
        sync_direction: 'from_google',
        last_synced_at: new Date().toISOString(),
      });
    }

    // Mark notification as read
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    revalidatePath('/admin/calendar');
    return { data: null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create from Google event',
    };
  }
}

export async function ignoreGoogleEvent(
  notificationId: string,
  googleEventId: string,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const supabase = createAdminClient();

    // Create ignored mapping to prevent re-notification
    await supabase.from('google_calendar_sync').insert({
      entity_type: 'custom',
      entity_id: null,
      google_event_id: googleEventId,
      sync_status: 'ignored',
      sync_direction: 'from_google',
    });

    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to ignore event' };
  }
}

// --- Handle changed Google event ---

export async function acceptGoogleChange(
  notificationId: string,
  actionData: GoogleEventChangedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const supabase = createAdminClient();

    // Apply changes based on entity type
    if (actionData.entity_type === 'custom') {
      // Custom events: apply all changed fields directly
      const updateData: Record<string, unknown> = {};
      for (const [field, change] of Object.entries(actionData.changes)) {
        updateData[field] = change.to;
      }
      await supabase.from('calendar_events').update(updateData).eq('id', actionData.entity_id);
    } else if (actionData.entity_type === 'project') {
      // Projects: map the date change to the correct field based on subtype
      const dateChange = actionData.changes.date;
      if (dateChange) {
        const field = actionData.subtype === 'start' ? 'start_date' : 'deadline';
        await supabase
          .from('projects')
          .update({ [field]: dateChange.to })
          .eq('id', actionData.entity_id);
      }
    } else if (actionData.entity_type === 'task') {
      const dateChange = actionData.changes.date;
      if (dateChange) {
        await supabase
          .from('tasks')
          .update({ due_date: dateChange.to })
          .eq('id', actionData.entity_id);
      }
    } else if (actionData.entity_type === 'invoice') {
      const dateChange = actionData.changes.date;
      if (dateChange) {
        await supabase
          .from('invoices')
          .update({ due_date: dateChange.to })
          .eq('id', actionData.entity_id);
      }
    }

    // Update sync mapping
    await supabase
      .from('google_calendar_sync')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('google_event_id', actionData.google_event_id);

    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    revalidatePath('/admin/calendar');
    revalidatePath('/admin/productions');
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to accept change' };
  }
}

export async function rejectGoogleChange(
  notificationId: string,
  actionData: GoogleEventChangedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const supabase = createAdminClient();

    // Revert Google event to match Supabase data
    // Fetch current Supabase data and push it back to Google
    let currentData: Record<string, unknown> | null = null;

    if (actionData.entity_type === 'custom') {
      const { data } = await supabase
        .from('calendar_events')
        .select('title, description, start_date, end_date, all_day')
        .eq('id', actionData.entity_id)
        .single();
      currentData = data;
    } else if (actionData.entity_type === 'project') {
      const { data } = await supabase
        .from('projects')
        .select('title, start_date, deadline')
        .eq('id', actionData.entity_id)
        .single();
      currentData = data;
    } else if (actionData.entity_type === 'task') {
      const { data } = await supabase
        .from('tasks')
        .select('title, due_date')
        .eq('id', actionData.entity_id)
        .single();
      currentData = data;
    } else if (actionData.entity_type === 'invoice') {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number, due_date')
        .eq('id', actionData.entity_id)
        .single();
      currentData = data;
    }

    if (currentData) {
      const title =
        actionData.entity_type === 'invoice'
          ? `Invoice Due: ${currentData.invoice_number}`
          : actionData.entity_type === 'task'
            ? `Task: ${currentData.title}`
            : actionData.entity_type === 'project' && actionData.subtype === 'start'
              ? `Start: ${currentData.title}`
              : actionData.entity_type === 'project' && actionData.subtype === 'deadline'
                ? `Deadline: ${currentData.title}`
                : (currentData.title as string);

      const startDate =
        actionData.entity_type === 'project'
          ? ((actionData.subtype === 'start'
              ? currentData.start_date
              : currentData.deadline) as string)
          : actionData.entity_type === 'custom'
            ? (currentData.start_date as string)
            : (currentData.due_date as string);

      await updateGoogleEvent(actionData.google_event_id, {
        title,
        description:
          actionData.entity_type === 'custom'
            ? (currentData.description as string | undefined)
            : undefined,
        startDate,
        endDate:
          actionData.entity_type === 'custom'
            ? (currentData.end_date as string | undefined)
            : undefined,
        allDay: actionData.entity_type === 'custom' ? (currentData.all_day as boolean) : true,
      });
    }

    await supabase
      .from('google_calendar_sync')
      .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
      .eq('google_event_id', actionData.google_event_id);

    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reject change' };
  }
}

// --- Handle deleted Google event ---

export async function confirmGoogleDelete(
  notificationId: string,
  actionData: GoogleEventDeletedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const supabase = createAdminClient();

    // Delete the Supabase entity
    if (actionData.entity_type === 'custom') {
      await supabase.from('calendar_events').delete().eq('id', actionData.entity_id);
    }
    // For project/task/invoice: we don't delete the entity, just remove the mapping

    await supabase
      .from('google_calendar_sync')
      .delete()
      .eq('google_event_id', actionData.google_event_id);

    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    revalidatePath('/admin/calendar');
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to confirm delete' };
  }
}

export async function keepAfterGoogleDelete(
  notificationId: string,
  googleEventId: string,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const supabase = createAdminClient();

    // Remove mapping — entity stays in Supabase
    await supabase.from('google_calendar_sync').delete().eq('google_event_id', googleEventId);

    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to keep event' };
  }
}
