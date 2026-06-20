'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import {
  createTimeSlotSchema,
  renameTimeSlotSchema,
  reorderTimeSlotsSchema,
  capacitySchema,
} from '@/lib/schemas/booking-config';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

export type TimeSlot = {
  id: string;
  name: string;
  position: number;
};

export type BookingConfig = {
  time_slots: TimeSlot[];
  capacity: number;
};

const SLOT_COLUMNS = 'id, name, position';

export async function getBookingConfig(): Promise<ActionResult<BookingConfig>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: slots, error: slotsError } = await supabase
      .from('booking_time_slots')
      .select(SLOT_COLUMNS)
      .order('position', { ascending: true });

    if (slotsError) return { data: null, error: slotsError.message };

    const { data: settings, error: settingsError } = await supabase
      .from('booking_settings')
      .select('capacity')
      .eq('id', 1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      return { data: null, error: settingsError.message };
    }

    return {
      data: {
        time_slots: (slots as TimeSlot[]) ?? [],
        capacity: settings?.capacity ?? 1,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch booking configuration',
    };
  }
}

export async function createTimeSlot(input: unknown): Promise<ActionResult<TimeSlot>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { name } = createTimeSlotSchema.parse(input);

    const { data: last } = await supabase
      .from('booking_time_slots')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = (last?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from('booking_time_slots')
      .insert({ name, position })
      .select(SLOT_COLUMNS)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings');
    return { data: data as TimeSlot, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create time slot',
    };
  }
}

export async function renameTimeSlot(id: string, input: unknown): Promise<ActionResult<TimeSlot>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { name } = renameTimeSlotSchema.parse(input);

    const { data, error } = await supabase
      .from('booking_time_slots')
      .update({ name })
      .eq('id', id)
      .select(SLOT_COLUMNS)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings');
    return { data: data as TimeSlot, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to rename time slot',
    };
  }
}

export async function removeTimeSlot(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { error } = await supabase.from('booking_time_slots').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings');
    return { data: { id }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to remove time slot',
    };
  }
}

export async function reorderTimeSlots(input: unknown): Promise<ActionResult<TimeSlot[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { ordered_ids } = reorderTimeSlotsSchema.parse(input);

    for (let position = 0; position < ordered_ids.length; position++) {
      const { error } = await supabase
        .from('booking_time_slots')
        .update({ position })
        .eq('id', ordered_ids[position]);

      if (error) return { data: null, error: error.message };
    }

    const { data, error } = await supabase
      .from('booking_time_slots')
      .select(SLOT_COLUMNS)
      .order('position', { ascending: true });

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/settings');
    return { data: (data as TimeSlot[]) ?? [], error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to reorder time slots',
    };
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
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update capacity',
    };
  }
}
