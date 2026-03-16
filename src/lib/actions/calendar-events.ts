'use server';

import { createClient } from '@/lib/supabase/server';
import { createCalendarEventSchema, updateCalendarEventSchema } from '@/lib/schemas/calendar-event';
import { revalidatePath } from 'next/cache';
import type { ActionResult, CalendarEventRecord } from '@/types';

export async function createCalendarEvent(
  input: unknown,
): Promise<ActionResult<CalendarEventRecord>> {
  try {
    const validated = createCalendarEventSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ ...validated, created_by: user.id })
      .select(
        'id, title, description, start_date, end_date, all_day, color, event_type, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, title, description, start_date, end_date, all_day, color, event_type, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to update event' };
  }
}

export async function deleteCalendarEvent(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/calendar');
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Failed to delete event' };
  }
}
