'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { createCalendarEventSchema, updateCalendarEventSchema } from '@/lib/schemas/calendar-event';
import { revalidatePath } from 'next/cache';
import type { ActionResult, CalendarEventRecord } from '@/types';
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { getGoogleColorId } from '@/lib/google-calendar';

export async function createCalendarEvent(
  input: unknown,
): Promise<ActionResult<CalendarEventRecord>> {
  try {
    const validated = createCalendarEventSchema.parse(input);
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ ...validated, created_by: user.id })
      .select(
        'id, title, description, start_date, end_date, all_day, color, event_type, assigned_to, project_id, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: data.id,
      operation: 'create',
      eventData: {
        title: data.title,
        description: data.description ?? undefined,
        startDate: data.start_date,
        endDate: data.end_date ?? undefined,
        allDay: data.all_day,
        colorId: getGoogleColorId('custom', null, data.event_type),
      },
    });
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create event' };
  }
}

export async function updateCalendarEvent(
  id: string,
  input: unknown,
): Promise<ActionResult<CalendarEventRecord>> {
  try {
    const validated = updateCalendarEventSchema.parse(input);
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, title, description, start_date, end_date, all_day, color, event_type, assigned_to, project_id, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: data.id,
      operation: 'update',
      eventData: {
        title: data.title,
        description: data.description ?? undefined,
        startDate: data.start_date,
        endDate: data.end_date ?? undefined,
        allDay: data.all_day,
        colorId: getGoogleColorId('custom', null, data.event_type),
      },
    });
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to update event' };
  }
}

export async function deleteCalendarEvent(id: string): Promise<ActionResult<null>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: id,
      operation: 'delete',
    });
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Failed to delete event' };
  }
}
