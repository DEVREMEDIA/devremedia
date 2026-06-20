/**
 * Pure booking-availability logic — the single source of truth for what a
 * Client may book. Modelled on src/lib/finance.ts: no I/O, no Date, no
 * Supabase. Callers gather the inputs and feed them in; the view renders the
 * result.
 *
 * Given the candidate dates × Time Slots, the global Capacity, the existing
 * Holds + confirmed Filmings (which occupy Capacity), the Client's Package
 * Allowance, and the Client's own Holds + Filmings, it returns per-date /
 * per-Slot availability and the Client's remaining monthly Allowance.
 *
 * A Slot is unavailable when either:
 *   - Holds + confirmed Filmings on that date+Slot have reached Capacity, or
 *   - booking it would exceed the Client's remaining monthly Allowance.
 *
 * Allowance is counted per the Package unit and resets on the 1st of each
 * calendar month:
 *   - 'days'  = distinct dates used in the month
 *   - 'slots' = individual date+Slot pairs used in the month
 */

export type BookingUnit = 'days' | 'slots';

/** One occupied (or candidate) date+Slot pair. A Hold and a confirmed Filming
 * are indistinguishable here — both occupy Capacity the same way. */
export type Booking = {
  date: string; // YYYY-MM-DD
  slot_id: string;
};

export type TimeSlot = {
  id: string;
  name: string;
};

export type Allowance = {
  count: number;
  unit: BookingUnit;
};

export type SlotUnavailableReason = 'available' | 'capacity_full' | 'allowance_exhausted';

export type SlotAvailability = {
  slot_id: string;
  slot_name: string;
  available: boolean;
  reason: SlotUnavailableReason;
};

export type DateAvailability = {
  date: string;
  slots: SlotAvailability[];
};

export type AvailabilityResult = {
  dates: DateAvailability[];
  remaining_allowance: number;
};

export type AvailabilityInput = {
  /** Candidate dates to show (YYYY-MM-DD). */
  dates: string[];
  /** The ordered Time Slot list for the Client's Package. */
  slots: TimeSlot[];
  /** Global crew Capacity per date+Slot. */
  capacity: number;
  /** All Holds + confirmed Filmings (any Client) — they occupy Capacity. */
  bookings: Booking[];
  /** The Client's Package Allowance, or null when there is no active Agreement. */
  allowance: Allowance | null;
  /** The Client's own Holds + Filmings, across any month. */
  clientUsage: Booking[];
  /** The calendar month whose Allowance applies (YYYY-MM). */
  month: string;
};

const monthOf = (date: string): string => date.substring(0, 7); // YYYY-MM

/** The Client's Holds + Filmings that fall in the given calendar month. */
const usageInMonth = (usage: Booking[], month: string): Booking[] =>
  usage.filter((u) => monthOf(u.date) === month);

/**
 * How much of the Allowance the Client has already consumed this month,
 * counted per the Package unit.
 */
export function remainingAllowance(allowance: Allowance, monthUsage: Booking[]): number {
  const used =
    allowance.unit === 'days' ? new Set(monthUsage.map((u) => u.date)).size : monthUsage.length;
  return Math.max(0, allowance.count - used);
}

/** Holds + confirmed Filmings on this date+Slot have reached Capacity. */
const isCapacityFull = (
  date: string,
  slotId: string,
  capacity: number,
  bookings: Booking[],
): boolean => bookings.filter((b) => b.date === date && b.slot_id === slotId).length >= capacity;

/**
 * Would booking this date+Slot stay within the Client's monthly Allowance?
 * Under 'days', a Slot on a date the Client already uses this month costs no
 * extra day; under 'slots', a pair the Client already holds costs no extra slot.
 */
const isWithinAllowance = (
  date: string,
  slotId: string,
  allowance: Allowance,
  monthUsage: Booking[],
): boolean => {
  if (allowance.unit === 'days') {
    const usedDates = new Set(monthUsage.map((u) => u.date));
    const cost = usedDates.has(date) ? 0 : 1;
    return usedDates.size + cost <= allowance.count;
  }
  const alreadyHeld = monthUsage.some((u) => u.date === date && u.slot_id === slotId);
  const cost = alreadyHeld ? 0 : 1;
  return monthUsage.length + cost <= allowance.count;
};

export function computeAvailability(input: AvailabilityInput): AvailabilityResult {
  const { dates, slots, capacity, bookings, allowance, clientUsage, month } = input;

  // No active Agreement → no booking surface at all.
  if (!allowance) {
    return { dates: [], remaining_allowance: 0 };
  }

  const monthUsage = usageInMonth(clientUsage, month);

  const dateAvailability: DateAvailability[] = dates.map((date) => ({
    date,
    slots: slots.map((slot) => {
      let reason: SlotUnavailableReason = 'available';
      if (isCapacityFull(date, slot.id, capacity, bookings)) {
        reason = 'capacity_full';
      } else if (!isWithinAllowance(date, slot.id, allowance, monthUsage)) {
        reason = 'allowance_exhausted';
      }
      return {
        slot_id: slot.id,
        slot_name: slot.name,
        available: reason === 'available',
        reason,
      };
    }),
  }));

  return {
    dates: dateAvailability,
    remaining_allowance: remainingAllowance(allowance, monthUsage),
  };
}
