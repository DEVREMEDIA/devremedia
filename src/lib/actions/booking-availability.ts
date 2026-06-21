'use server';

import { requireUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeAvailability,
  type Allowance,
  type Booking,
  type DayAvailability,
  type OpenDay,
} from '@/lib/booking';
import type { ActionResult } from '@/types';

export type ClientAvailability = {
  package_name: string;
  allowance: Allowance;
  remaining_allowance: number;
  durations: number[];
  interval: number;
  days: DayAvailability[];
};

const ATHENS_TZ = 'Europe/Athens';

/** Today's date in Athens, YYYY-MM-DD. */
const todayInAthens = (): string => new Date().toLocaleDateString('en-CA', { timeZone: ATHENS_TZ });

/** Minutes-from-midnight now in Athens. */
const nowMinutesInAthens = (): number => {
  const hm = new Date().toLocaleTimeString('en-GB', {
    timeZone: ATHENS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/** "HH:MM[:SS]" → minutes-from-midnight. */
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

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
    if (!clientRecord) return { data: null, error: null };

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
    ) as {
      name: string;
      allowance_count: number | null;
      allowance_unit: 'days' | 'slots' | 'hours';
    } | null;

    if (!pkg || pkg.allowance_count === null) return { data: null, error: null };

    const today = todayInAthens();
    const monthStart = `${today.slice(0, 7)}-01`;

    const [
      { data: durationsRows, error: durErr },
      { data: settings, error: settingsError },
      { data: dayRows, error: daysError },
      { data: holds, error: holdsError },
    ] = await Promise.all([
      admin.from('booking_durations').select('minutes').order('position', { ascending: true }),
      admin
        .from('booking_settings')
        .select('capacity, slot_interval_minutes')
        .eq('id', 1)
        .maybeSingle(),
      admin
        .from('booking_day_availability')
        .select('date, open_time, close_time')
        .eq('is_open', true)
        .gte('date', today)
        .order('date', { ascending: true }),
      admin
        .from('filming_requests')
        .select('client_id, booking_date, start_time, duration_minutes')
        .not('booking_date', 'is', null)
        .not('start_time', 'is', null)
        .neq('status', 'declined')
        .gte('booking_date', monthStart),
    ]);

    if (durErr) return { data: null, error: durErr.message };
    if (settingsError) return { data: null, error: settingsError.message };
    if (daysError) return { data: null, error: daysError.message };
    if (holdsError) return { data: null, error: holdsError.message };

    const allowance: Allowance = { count: pkg.allowance_count, unit: pkg.allowance_unit };
    const durations = (durationsRows ?? []).map((d) => d.minutes as number);
    const interval = settings?.slot_interval_minutes ?? 30;

    const openDays: OpenDay[] = (dayRows ?? []).map((d) => ({
      date: d.date as string,
      open: timeToMinutes(d.open_time as string),
      close: timeToMinutes(d.close_time as string),
    }));

    const toBooking = (h: {
      booking_date: unknown;
      start_time: unknown;
      duration_minutes: unknown;
    }): Booking => ({
      date: h.booking_date as string,
      start: timeToMinutes(h.start_time as string),
      duration: (h.duration_minutes as number) ?? 0,
    });

    const bookings: Booking[] = (holds ?? []).map(toBooking);
    const clientUsage: Booking[] = (holds ?? [])
      .filter((h) => h.client_id === clientRecord.id)
      .map(toBooking);

    const result = computeAvailability({
      openDays,
      durations,
      interval,
      capacity: settings?.capacity ?? 1,
      bookings,
      allowance,
      clientUsage,
      month: today.slice(0, 7),
      today,
      nowMinutes: nowMinutesInAthens(),
    });

    return {
      data: {
        package_name: pkg.name,
        allowance,
        remaining_allowance: result.remaining_allowance,
        durations,
        interval,
        days: result.days,
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
