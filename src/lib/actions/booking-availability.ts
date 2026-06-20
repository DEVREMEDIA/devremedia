'use server';

import { requireUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeAvailability,
  type Allowance,
  type Booking,
  type DateAvailability,
  type TimeSlot,
} from '@/lib/booking';
import type { ActionResult } from '@/types';

export type ClientAvailability = {
  package_name: string;
  allowance: Allowance;
  remaining_allowance: number;
  dates: DateAvailability[];
};

const ATHENS_TZ = 'Europe/Athens';

/** Today's date in Athens, as YYYY-MM-DD. */
const todayInAthens = (): string => new Date().toLocaleDateString('en-CA', { timeZone: ATHENS_TZ });

/** The remaining calendar dates of the current month, from `today` onward. */
function datesToMonthEnd(today: string): string[] {
  const [year, month, day] = today.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-based here
  const dates: string[] = [];
  for (let d = day; d <= lastDay; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/**
 * The signed-in Client's availability for the current month: the dates × Time
 * Slots they may book under their active Agreement's Package, with full Slots
 * and Allowance-exhausted Slots marked unavailable.
 *
 * Returns null when the Client has no active Agreement (the view shows a
 * "contact us" prompt instead of a booking surface).
 *
 * Uses the admin client to read admin-RLS-locked booking config + Agreement,
 * but authenticates the user first and returns only availability — never the
 * admin-internal agreed price.
 */
export async function getMyAvailability(): Promise<ActionResult<ClientAvailability | null>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError) return { data: null, error: clientError.message };
    if (!clientRecord) return { data: null, error: null }; // not a Client → no surface

    const admin = createAdminClient();

    const { data: agreement, error: agreementError } = await admin
      .from('client_agreements')
      .select('package:proposal_packages(name, allowance_count, allowance_unit)')
      .eq('client_id', clientRecord.id)
      .eq('active', true)
      .maybeSingle();

    if (agreementError) return { data: null, error: agreementError.message };

    const pkg = (
      Array.isArray(agreement?.package) ? agreement?.package[0] : agreement?.package
    ) as { name: string; allowance_count: number | null; allowance_unit: 'days' | 'slots' } | null;

    if (!pkg || pkg.allowance_count === null) {
      return { data: null, error: null }; // no active Agreement / no Allowance set
    }

    const [{ data: slots, error: slotsError }, { data: settings, error: settingsError }] =
      await Promise.all([
        admin.from('booking_time_slots').select('id, name').order('position', { ascending: true }),
        admin.from('booking_settings').select('capacity').eq('id', 1).maybeSingle(),
      ]);

    if (slotsError) return { data: null, error: slotsError.message };
    if (settingsError) return { data: null, error: settingsError.message };

    const allowance: Allowance = { count: pkg.allowance_count, unit: pkg.allowance_unit };
    const today = todayInAthens();

    // Holds + confirmed Filmings are introduced in a later slice of #70; until
    // then nothing occupies Capacity and the Client has no recorded usage.
    const bookings: Booking[] = [];
    const clientUsage: Booking[] = [];

    const result = computeAvailability({
      dates: datesToMonthEnd(today),
      slots: (slots as TimeSlot[]) ?? [],
      capacity: settings?.capacity ?? 1,
      bookings,
      allowance,
      clientUsage,
      month: today.slice(0, 7),
    });

    return {
      data: {
        package_name: pkg.name,
        allowance,
        remaining_allowance: result.remaining_allowance,
        dates: result.dates,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load availability',
    };
  }
}
