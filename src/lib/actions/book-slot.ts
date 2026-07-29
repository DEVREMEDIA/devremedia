'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth-helpers';
import { bookFilmingSchema } from '@/lib/schemas/booking';
import { getAdminUserIds, createNotificationForMany } from '@/lib/notification-helpers';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

/** Translate a book_filming sentinel error into a clear, user-facing message. */
function bookingErrorMessage(raw: string): string {
  if (raw.includes('capacity_full')) return 'That time is no longer available.';
  if (raw.includes('allowance_exceeded'))
    return "This booking would exceed your package's monthly allowance.";
  if (raw.includes('no_agreement')) return 'You do not have an active booking agreement.';
  if (raw.includes('not_a_client')) return 'Only clients can book a filming.';
  if (raw.includes('invalid_duration')) return 'That duration is not available.';
  if (raw.includes('day_closed')) return 'That day is closed for booking.';
  if (raw.includes('outside_hours')) return 'That time is outside the available hours.';
  return raw;
}

/**
 * Book a (date, start time, duration) window as a pending Hold. Open hours,
 * Capacity (time overlap) and the Client's monthly Allowance are enforced
 * atomically inside the book_filming RPC, so concurrent same-day claims for an
 * overlapping window cannot both succeed.
 */
export async function bookFilming(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = bookFilmingSchema.parse(input);

    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase.rpc('book_filming', {
      p_date: parsed.date,
      p_start: parsed.start_time,
      p_duration: parsed.duration_minutes,
      p_location: parsed.location,
      p_note: parsed.note,
    });

    if (error) return { data: null, error: bookingErrorMessage(error.message) };

    const id = data as string;

    revalidatePath('/client/book');
    revalidatePath('/admin/productions');

    // Best-effort: the Hold already exists at this point. A notification failure
    // must NOT surface as a booking error to the client (they would re-book and
    // burn allowance/capacity a second time).
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
        title: 'New booking request submitted',
        body: `${parsed.date} ${parsed.start_time}`,
        actionUrl: '/admin/filming-requests',
      });
    } catch {
      // swallow — notification is non-critical
    }

    return { data: { id }, error: null };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { data: null, error: err.issues[0]?.message ?? 'Invalid booking details' };
    }
    return { data: null, error: err instanceof Error ? err.message : 'Failed to book filming' };
  }
}
