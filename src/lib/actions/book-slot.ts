'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth-helpers';
import { bookSlotSchema } from '@/lib/schemas/booking';
import { getAdminUserIds, createNotificationForMany } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Maps a raised book_slot error to a clear, user-facing message. The atomic
 * capacity + Allowance enforcement lives in the SQL function (migration 00063);
 * this just translates its sentinel errors. Unknown errors pass through.
 */
function bookingErrorMessage(raw: string): string {
  if (raw.includes('capacity_full')) return 'That time slot is no longer available.';
  if (raw.includes('allowance_exceeded'))
    return "This booking would exceed your package's monthly allowance.";
  if (raw.includes('no_agreement')) return 'You do not have an active booking agreement.';
  if (raw.includes('not_a_client')) return 'Only clients can book a slot.';
  if (raw.includes('invalid_slot')) return 'That time slot does not exist.';
  if (raw.includes('already_booked')) return 'You have already booked this date and time slot.';
  return raw;
}

/**
 * Book a single date + Time Slot as a pending Hold. Capacity and the Client's
 * remaining monthly Allowance are enforced atomically inside the book_slot RPC
 * (DB-level, not a read-then-write here), so two concurrent claims on the last
 * spot cannot both succeed.
 */
export async function bookSlot(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = bookSlotSchema.parse(input);

    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase.rpc('book_slot', {
      p_date: parsed.date,
      p_slot_id: parsed.slot_id,
      p_location: parsed.location,
      p_note: parsed.note,
    });

    if (error) return { data: null, error: bookingErrorMessage(error.message) };

    const id = data as string;

    revalidatePath('/client/book');
    revalidatePath('/admin/filming-requests');

    // Notify admins of the new Hold (best-effort, never blocks the booking).
    const adminIds = await getAdminUserIds();
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
      title: 'New booking request submitted',
      body: `${parsed.date}`,
      actionUrl: '/admin/filming-requests',
    });

    return { data: { id }, error: null };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      // Surface the first field's friendly message, not the raw issues JSON.
      return { data: null, error: err.issues[0]?.message ?? 'Invalid booking details' };
    }
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to book slot',
    };
  }
}
