import { describe, it, expect } from 'vitest';
import {
  candidateStarts,
  overlaps,
  concurrentAt,
  isCapacityFree,
  remainingAllowance,
  wouldFitAllowance,
  computeAvailability,
  type Booking,
  type Allowance,
} from './booking';

describe('candidateStarts', () => {
  it('steps from open while start+duration fits before close', () => {
    expect(candidateStarts(540, 1020, 120, 30)).toContain(540); // 09:00
    expect(candidateStarts(540, 1020, 120, 30).at(-1)).toBe(900); // 15:00 (+120=17:00)
  });
  it('returns [] when duration exceeds the window', () => {
    expect(candidateStarts(540, 600, 120, 30)).toEqual([]);
  });
});

describe('overlaps', () => {
  it('is true for overlapping windows and false for adjacent ones', () => {
    expect(overlaps(540, 120, 600, 60)).toBe(true); // 9-11 vs 10-11
    expect(overlaps(540, 60, 600, 60)).toBe(false); // 9-10 vs 10-11 (touch, no overlap)
  });
});

describe('concurrentAt / isCapacityFree', () => {
  const bookings: Booking[] = [{ date: '2026-07-01', start: 540, duration: 120 }];
  it('counts only overlapping same-date bookings', () => {
    expect(concurrentAt('2026-07-01', 600, 60, bookings)).toBe(1);
    expect(concurrentAt('2026-07-01', 660, 60, bookings)).toBe(0); // 11-12, no overlap
    expect(concurrentAt('2026-07-02', 600, 60, bookings)).toBe(0); // other day
  });
  it('is full at capacity', () => {
    expect(isCapacityFree('2026-07-01', 600, 60, 1, bookings)).toBe(false);
    expect(isCapacityFree('2026-07-01', 600, 60, 2, bookings)).toBe(true);
  });
});

describe('remainingAllowance', () => {
  const usage: Booking[] = [
    { date: '2026-07-01', start: 540, duration: 120 },
    { date: '2026-07-01', start: 720, duration: 60 },
    { date: '2026-07-03', start: 540, duration: 60 },
  ];
  it('days = distinct dates', () => {
    expect(remainingAllowance({ count: 5, unit: 'days' }, usage)).toBe(3); // 2 distinct used
  });
  it('slots = count', () => {
    expect(remainingAllowance({ count: 5, unit: 'slots' }, usage)).toBe(2);
  });
  it('hours = count minus summed duration/60', () => {
    expect(remainingAllowance({ count: 5, unit: 'hours' }, usage)).toBe(1); // 4h used (120+60+60=240min)
  });
});

describe('wouldFitAllowance', () => {
  it('days: a second window on an already-used date costs no extra day', () => {
    const usage: Booking[] = [{ date: '2026-07-01', start: 540, duration: 60 }];
    expect(wouldFitAllowance('2026-07-01', 120, { count: 1, unit: 'days' }, usage)).toBe(true);
    expect(wouldFitAllowance('2026-07-02', 120, { count: 1, unit: 'days' }, usage)).toBe(false);
  });
  it('hours: rejects a duration that would exceed the monthly hour budget', () => {
    const usage: Booking[] = [{ date: '2026-07-01', start: 540, duration: 90 }]; // 1.5h used
    expect(wouldFitAllowance('2026-07-02', 60, { count: 2, unit: 'hours' }, usage)).toBe(false); // 1.5h + 1h = 2.5h > 2h
    expect(wouldFitAllowance('2026-07-02', 30, { count: 2, unit: 'hours' }, usage)).toBe(true); // 1.5h + 0.5h = 2h, fits
  });
});

describe('computeAvailability', () => {
  const base = {
    openDays: [{ date: '2026-07-01', open: 540, close: 660 }], // 09:00-11:00
    durations: [60],
    interval: 60,
    capacity: 1,
    bookings: [] as Booking[],
    clientUsage: [] as Booking[],
    month: '2026-07',
    today: '2026-06-30',
    nowMinutes: 0,
  };
  it('returns empty when allowance is null', () => {
    expect(computeAvailability({ ...base, allowance: null })).toEqual({
      days: [],
      remaining_allowance: 0,
    });
  });
  it('marks capacity_full starts unavailable', () => {
    const r = computeAvailability({
      ...base,
      allowance: { count: 10, unit: 'slots' } as Allowance,
      bookings: [{ date: '2026-07-01', start: 540, duration: 60 }],
    });
    const start9 = r.days[0].durations[0].starts.find((s) => s.start === 540)!;
    expect(start9.available).toBe(false);
    expect(start9.reason).toBe('capacity_full');
  });
  it('marks past starts for today', () => {
    const r = computeAvailability({
      ...base,
      openDays: [{ date: '2026-06-30', open: 540, close: 660 }],
      today: '2026-06-30',
      nowMinutes: 600,
      allowance: { count: 10, unit: 'slots' },
    });
    const start9 = r.days[0].durations[0].starts.find((s) => s.start === 540)!;
    expect(start9.reason).toBe('past');
  });
});
