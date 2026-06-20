import { describe, it, expect } from 'vitest';
import {
  computeAvailability,
  remainingAllowance,
  type AvailabilityInput,
  type Booking,
} from './booking';

const baseInput = (overrides: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  dates: ['2026-06-20'],
  slots: [{ id: 'morning', name: 'Morning' }],
  capacity: 1,
  bookings: [],
  allowance: { count: 4, unit: 'days' },
  clientUsage: [],
  month: '2026-06',
  ...overrides,
});

describe('computeAvailability', () => {
  it('marks an empty slot as available for a client with allowance', () => {
    const result = computeAvailability(baseInput());

    expect(result.dates).toEqual([
      {
        date: '2026-06-20',
        slots: [{ slot_id: 'morning', slot_name: 'Morning', available: true, reason: 'available' }],
      },
    ]);
    expect(result.remaining_allowance).toBe(4);
  });

  it('marks a slot unavailable once Holds + confirmed Filmings reach Capacity', () => {
    // Capacity 2, filled exactly: one Hold + one confirmed Filming on the same
    // date+Slot. They count identically, so the Slot is full.
    const result = computeAvailability(
      baseInput({
        capacity: 2,
        bookings: [
          { date: '2026-06-20', slot_id: 'morning' }, // a Hold
          { date: '2026-06-20', slot_id: 'morning' }, // a confirmed Filming
        ],
      }),
    );

    expect(result.dates[0].slots[0]).toEqual({
      slot_id: 'morning',
      slot_name: 'Morning',
      available: false,
      reason: 'capacity_full',
    });
  });

  it('keeps a slot available below Capacity (a single booking does not fill Capacity 2)', () => {
    const result = computeAvailability(
      baseInput({
        capacity: 2,
        bookings: [{ date: '2026-06-20', slot_id: 'morning' }],
      }),
    );

    expect(result.dates[0].slots[0].available).toBe(true);
  });

  it('shows slots beyond the remaining Allowance as unavailable', () => {
    // 'slots' unit, count 1, already used one slot this month → remaining 0, so
    // a new candidate slot is allowance-exhausted.
    const result = computeAvailability(
      baseInput({
        dates: ['2026-06-21'],
        slots: [{ id: 'afternoon', name: 'Afternoon' }],
        allowance: { count: 1, unit: 'slots' },
        clientUsage: [{ date: '2026-06-20', slot_id: 'morning' }],
      }),
    );

    expect(result.dates[0].slots[0]).toEqual({
      slot_id: 'afternoon',
      slot_name: 'Afternoon',
      available: false,
      reason: 'allowance_exhausted',
    });
    expect(result.remaining_allowance).toBe(0);
  });

  it('returns no booking surface for a Client with no active Agreement', () => {
    const result = computeAvailability(baseInput({ allowance: null }));

    expect(result.dates).toEqual([]);
    expect(result.remaining_allowance).toBe(0);
  });
});

describe('remainingAllowance — days vs slots counting and month reset', () => {
  it('counts two Slots on the same day as 1 under "days"', () => {
    const usage: Booking[] = [
      { date: '2026-06-20', slot_id: 'morning' },
      { date: '2026-06-20', slot_id: 'afternoon' },
    ];

    expect(remainingAllowance({ count: 4, unit: 'days' }, usage)).toBe(3); // 4 - 1 day
  });

  it('counts two Slots on the same day as 2 under "slots"', () => {
    const usage: Booking[] = [
      { date: '2026-06-20', slot_id: 'morning' },
      { date: '2026-06-20', slot_id: 'afternoon' },
    ];

    expect(remainingAllowance({ count: 4, unit: 'slots' }, usage)).toBe(2); // 4 - 2 slots
  });

  it('never goes negative when usage exceeds the count', () => {
    const usage: Booking[] = [
      { date: '2026-06-20', slot_id: 'morning' },
      { date: '2026-06-21', slot_id: 'morning' },
    ];

    expect(remainingAllowance({ count: 1, unit: 'days' }, usage)).toBe(0);
  });
});

describe('computeAvailability — month boundary reset', () => {
  it('ignores prior-month usage so the Allowance resets on the 1st', () => {
    // Client used the whole 'days' allowance in May, but it is now June.
    const result = computeAvailability(
      baseInput({
        allowance: { count: 1, unit: 'days' },
        clientUsage: [
          { date: '2026-05-10', slot_id: 'morning' },
          { date: '2026-05-12', slot_id: 'morning' },
        ],
        month: '2026-06',
      }),
    );

    expect(result.remaining_allowance).toBe(1);
    expect(result.dates[0].slots[0].available).toBe(true);
  });

  it('still counts the same date in the current month against the Allowance', () => {
    const result = computeAvailability(
      baseInput({
        dates: ['2026-06-25'],
        allowance: { count: 1, unit: 'days' },
        clientUsage: [{ date: '2026-06-10', slot_id: 'morning' }],
        month: '2026-06',
      }),
    );

    expect(result.remaining_allowance).toBe(0);
    expect(result.dates[0].slots[0].reason).toBe('allowance_exhausted');
  });
});
