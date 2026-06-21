/**
 * Pure booking-availability engine — the single source of truth for what a
 * Client may book. No I/O, no Date, no Supabase (mirrors src/lib/finance.ts).
 * Times are minutes-from-midnight (Athens wall-clock supplied by the caller).
 *
 * A start time is unavailable when it is in the past, its window has reached
 * Capacity (overlapping Holds + Filmings), or booking it would exceed the
 * Client's remaining monthly Allowance. Allowance resets on the 1st and is
 * counted per Package unit: days = distinct dates, slots = bookings,
 * hours = summed duration / 60.
 */

export type BookingUnit = 'days' | 'slots' | 'hours';

/** One occupied (or candidate) time window. A Hold and a confirmed Filming are
 * indistinguishable here — both occupy Capacity the same way. */
export type Booking = { date: string; start: number; duration: number };

export type OpenDay = { date: string; open: number; close: number };

export type Allowance = { count: number; unit: BookingUnit };

export type Reason = 'available' | 'capacity_full' | 'allowance_exhausted' | 'past';
export type StartOption = { start: number; available: boolean; reason: Reason };
export type DurationGroup = { duration: number; starts: StartOption[] };
export type DayAvailability = {
  date: string;
  open: number;
  close: number;
  durations: DurationGroup[];
};
export type AvailabilityResult = { days: DayAvailability[]; remaining_allowance: number };

export type AvailabilityInput = {
  /** Open days for the Client's window, as minutes. */
  openDays: OpenDay[];
  /** Offered durations (minutes), ordered. */
  durations: number[];
  /** Start-time granularity (minutes). */
  interval: number;
  /** Global crew Capacity. */
  capacity: number;
  /** All non-declined Holds + Filmings (any Client) — they occupy Capacity. */
  bookings: Booking[];
  /** The Client's Package Allowance, or null when there is no active Agreement. */
  allowance: Allowance | null;
  /** The Client's own Holds + Filmings, across any month. */
  clientUsage: Booking[];
  /** The calendar month whose Allowance applies (YYYY-MM). */
  month: string;
  /** Today's date in Athens (YYYY-MM-DD) — used to mark past starts. */
  today: string;
  /** Minutes-from-midnight now in Athens — past threshold for `today`. */
  nowMinutes: number;
};

const monthOf = (date: string): string => date.substring(0, 7);

const usageInMonth = (usage: Booking[], month: string): Booking[] =>
  usage.filter((u) => monthOf(u.date) === month);

/** All start times in steps of `interval` where the whole window fits before close. */
export function candidateStarts(
  open: number,
  close: number,
  duration: number,
  interval: number,
): number[] {
  const starts: number[] = [];
  for (let s = open; s + duration <= close; s += interval) starts.push(s);
  return starts;
}

/** Two windows overlap when each starts before the other ends. Touching ≠ overlap. */
export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/** How many existing bookings on this date overlap the proposed window. */
export function concurrentAt(
  date: string,
  start: number,
  duration: number,
  bookings: Booking[],
): number {
  return bookings.filter((b) => b.date === date && overlaps(start, duration, b.start, b.duration))
    .length;
}

export function isCapacityFree(
  date: string,
  start: number,
  duration: number,
  capacity: number,
  bookings: Booking[],
): boolean {
  return concurrentAt(date, start, duration, bookings) < capacity;
}

/** Allowance already consumed this month, in the Package unit. */
const usedInUnit = (allowance: Allowance, monthUsage: Booking[]): number => {
  if (allowance.unit === 'days') return new Set(monthUsage.map((u) => u.date)).size;
  if (allowance.unit === 'slots') return monthUsage.length;
  return monthUsage.reduce((sum, u) => sum + u.duration, 0) / 60; // hours
};

export function remainingAllowance(allowance: Allowance, monthUsage: Booking[]): number {
  return Math.max(0, allowance.count - usedInUnit(allowance, monthUsage));
}

/** Cost of a new booking in the Package unit. */
const costInUnit = (
  date: string,
  duration: number,
  allowance: Allowance,
  monthUsage: Booking[],
): number => {
  if (allowance.unit === 'days') {
    return new Set(monthUsage.map((u) => u.date)).has(date) ? 0 : 1;
  }
  if (allowance.unit === 'slots') return 1;
  return duration / 60; // hours
};

export function wouldFitAllowance(
  date: string,
  duration: number,
  allowance: Allowance,
  monthUsage: Booking[],
): boolean {
  const used = usedInUnit(allowance, monthUsage);
  const cost = costInUnit(date, duration, allowance, monthUsage);
  return used + cost <= allowance.count + 1e-9; // epsilon guards float hours
}

export function computeAvailability(input: AvailabilityInput): AvailabilityResult {
  const { openDays, durations, interval, capacity, bookings, allowance, clientUsage, month } =
    input;

  if (!allowance) return { days: [], remaining_allowance: 0 };

  const monthUsage = usageInMonth(clientUsage, month);

  const days: DayAvailability[] = openDays.map((day) => ({
    date: day.date,
    open: day.open,
    close: day.close,
    durations: durations.map((duration) => ({
      duration,
      starts: candidateStarts(day.open, day.close, duration, interval).map((start) => {
        let reason: Reason = 'available';
        if (day.date === input.today && start < input.nowMinutes) {
          reason = 'past';
        } else if (!isCapacityFree(day.date, start, duration, capacity, bookings)) {
          reason = 'capacity_full';
        } else if (!wouldFitAllowance(day.date, duration, allowance, monthUsage)) {
          reason = 'allowance_exhausted';
        }
        return { start, available: reason === 'available', reason };
      }),
    })),
  }));

  return { days, remaining_allowance: remainingAllowance(allowance, monthUsage) };
}
