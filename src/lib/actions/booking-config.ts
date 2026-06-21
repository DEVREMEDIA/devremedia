'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import {
  createDurationSchema,
  reorderDurationsSchema,
  slotIntervalSchema,
  capacitySchema,
  weekdayHoursSchema,
  dayAvailabilitySchema,
  monthSchema,
} from '@/lib/schemas/booking-config';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

export type Duration = { id: string; minutes: number; position: number };
export type WeekdayHours = {
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};
export type DayRow = { date: string; is_open: boolean; open_time: string; close_time: string };
export type BookingConfig = { durations: Duration[]; capacity: number; interval: number };

const DURATION_COLUMNS = 'id, minutes, position';

export async function getBookingConfig(): Promise<ActionResult<BookingConfig>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: durations, error: dErr } = await supabase
      .from('booking_durations')
      .select(DURATION_COLUMNS)
      .order('position', { ascending: true });
    if (dErr) return { data: null, error: dErr.message };

    const { data: settings, error: sErr } = await supabase
      .from('booking_settings')
      .select('capacity, slot_interval_minutes')
      .eq('id', 1)
      .single();
    if (sErr && sErr.code !== 'PGRST116') return { data: null, error: sErr.message };

    return {
      data: {
        durations: (durations as Duration[]) ?? [],
        capacity: settings?.capacity ?? 1,
        interval: settings?.slot_interval_minutes ?? 30,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load booking config',
    };
  }
}

export async function createDuration(input: unknown): Promise<ActionResult<Duration>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { minutes } = createDurationSchema.parse(input);

    const { data: last } = await supabase
      .from('booking_durations')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from('booking_durations')
      .insert({ minutes, position })
      .select(DURATION_COLUMNS)
      .single();
    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings');
    return { data: data as Duration, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to add duration' };
  }
}

export async function removeDuration(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { error } = await supabase.from('booking_durations').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/settings');
    return { data: { id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to remove duration' };
  }
}

export async function reorderDurations(input: unknown): Promise<ActionResult<Duration[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { ordered_ids } = reorderDurationsSchema.parse(input);
    for (let position = 0; position < ordered_ids.length; position++) {
      const { error } = await supabase
        .from('booking_durations')
        .update({ position })
        .eq('id', ordered_ids[position]);
      if (error) return { data: null, error: error.message };
    }
    const { data, error } = await supabase
      .from('booking_durations')
      .select(DURATION_COLUMNS)
      .order('position', { ascending: true });
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/settings');
    return { data: (data as Duration[]) ?? [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to reorder durations',
    };
  }
}

export async function setSlotInterval(input: unknown): Promise<ActionResult<{ interval: number }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { interval } = slotIntervalSchema.parse(input);
    const { data, error } = await supabase
      .from('booking_settings')
      .upsert({ id: 1, slot_interval_minutes: interval, updated_at: new Date().toISOString() })
      .select('slot_interval_minutes')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/settings');
    return { data: { interval: data.slot_interval_minutes }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to set interval' };
  }
}

export async function setCapacity(input: unknown): Promise<ActionResult<{ capacity: number }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { capacity } = capacitySchema.parse(input);
    const { data, error } = await supabase
      .from('booking_settings')
      .upsert({ id: 1, capacity, updated_at: new Date().toISOString() })
      .select('capacity')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/settings');
    return { data: { capacity: data.capacity }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to set capacity' };
  }
}

export async function getWeeklyTemplate(): Promise<ActionResult<WeekdayHours[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const { data, error } = await supabase
      .from('booking_weekly_template')
      .select('weekday, is_open, open_time, close_time')
      .order('weekday', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data as WeekdayHours[]) ?? [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load template' };
  }
}

export async function setWeekdayHours(input: unknown): Promise<ActionResult<WeekdayHours>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const v = weekdayHoursSchema.parse(input);
    const { data, error } = await supabase
      .from('booking_weekly_template')
      .update({
        is_open: v.is_open,
        open_time: v.is_open ? v.open_time : null,
        close_time: v.is_open ? v.close_time : null,
        updated_at: new Date().toISOString(),
      })
      .eq('weekday', v.weekday)
      .select('weekday, is_open, open_time, close_time')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/settings');
    return { data: data as WeekdayHours, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to save weekday' };
  }
}

export async function getMonthAvailability(month: string): Promise<ActionResult<DayRow[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const m = monthSchema.parse(month);
    const start = `${m}-01`;
    const [y, mm] = m.split('-').map(Number);
    const end = `${mm === 12 ? y + 1 : y}-${String(mm === 12 ? 1 : mm + 1).padStart(2, '0')}-01`;
    const { data, error } = await supabase
      .from('booking_day_availability')
      .select('date, is_open, open_time, close_time')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data as DayRow[]) ?? [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load month' };
  }
}

export async function applyTemplateToMonth(
  month: string,
): Promise<ActionResult<{ written: number }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const m = monthSchema.parse(month);
    const [y, mm] = m.split('-').map(Number);
    const lastDay = new Date(y, mm, 0).getDate();

    const { data: template, error: tErr } = await supabase
      .from('booking_weekly_template')
      .select('weekday, is_open, open_time, close_time');
    if (tErr) return { data: null, error: tErr.message };

    const byWeekday = new Map((template ?? []).map((t) => [t.weekday as number, t]));
    const rows: { date: string; is_open: boolean; open_time: string; close_time: string }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = `${m}-${String(d).padStart(2, '0')}`;
      const weekday = new Date(`${date}T00:00:00`).getDay(); // 0=Sun..6=Sat
      const t = byWeekday.get(weekday);
      if (t?.is_open && t.open_time && t.close_time) {
        rows.push({ date, is_open: true, open_time: t.open_time, close_time: t.close_time });
      }
    }
    // on conflict do nothing → never clobber manual edits (PRD #87 §7.1)
    const { error } = await supabase
      .from('booking_day_availability')
      .upsert(rows, { onConflict: 'date', ignoreDuplicates: true });
    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/availability');
    return { data: { written: rows.length }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to apply template' };
  }
}

export async function setDayAvailability(input: unknown): Promise<ActionResult<DayRow>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };
    const v = dayAvailabilitySchema.parse(input);
    const { data, error } = await supabase
      .from('booking_day_availability')
      .upsert(
        {
          date: v.date,
          is_open: v.is_open,
          open_time: v.open_time,
          close_time: v.close_time,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date' },
      )
      .select('date, is_open, open_time, close_time')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/availability');
    return { data: data as DayRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to set day' };
  }
}
