# Booking με Μέρες & Ώρες Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coarse named-Slot booking with per-day availability (admin-configured open days + hours), fixed durations with options, concrete start times, an `hours` allowance unit, and timed Google-synced Filmings — without disturbing the existing Google Calendar engine.

**Architecture:** A pure, I/O-free engine (`src/lib/booking.ts`, minutes-from-midnight arithmetic) computes availability; server actions gather DB inputs and feed it; an atomic `book_filming` RPC enforces capacity (time-overlap) + allowance (days/slots/hours) under a per-day advisory lock; approving a Hold writes a **timed** `calendar_events` row and pushes it through the **existing** `syncEntityToGoogle('custom','filming')` path. Admin config lives in a Settings → Booking tab plus a dedicated `/admin/availability` month editor.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript 5, Supabase (Postgres + RLS + RPC), Zod 4, Vitest, next-intl.

## Global Constraints

- **Migrations are sequential from 00065** (disk + cloud in sync at 00064). Cloud apply is **user-gated** — never apply to cloud yourself; only add files under `supabase/migrations/`.
- **Do NOT break the Google Calendar interconnection** (webhook `google-calendar/route.ts`, crons `google-*-renew` + `google-sync-retry`, `google-calendar.ts`, `google-sync-helper.ts`, the 230 live `google_calendar_sync` mappings + sync token). No new `entity_type`, no webhook/cron edits. Filming rides the existing `calendar_events` (`entity_type='custom'`) path only.
- **ActionResult pattern**: every server action returns `{ data: T; error: null } | { data: null; error: string }`. There is no `.success`.
- **Auth**: admin actions use `requireAdmin()`; Client-facing reads use `requireUser()`; admin-RLS-locked config is read via `createAdminClient()` **after** authenticating the user. No client-side RLS on booking config.
- **Pure module rule**: `src/lib/booking.ts` has no I/O, no `Date`, no Supabase — callers supply wall-clock Athens values. Mirror `src/lib/finance.ts` / `finance.test.ts`.
- **Times in the pure module are minutes-from-midnight (int).** SQL stores `time`/`date`; conversions happen at the action boundary.
- **Greek-first product**: new i18n keys go in both `messages/el.json` and `messages/en.json`.
- Run from the worktree `C:\Users\ntont\Desktop\devre\devremedia-booking` (branch `feat/booking-days-and-hours`). Never touch the main worktree.
- Commands: tests `pnpm vitest run <file>`, all tests `pnpm test`, types `pnpm type-check`, build `pnpm build`, lint `pnpm lint`.

---

## File Structure

**Created:**
- `supabase/migrations/00065_booking_durations.sql` — durations table + `slot_interval_minutes`.
- `supabase/migrations/00066_booking_schedule.sql` — weekly template + per-day availability.
- `supabase/migrations/00067_filming_time_window.sql` — time-window columns; drop `slot_id` + `booking_time_slots`.
- `supabase/migrations/00068_package_allowance_hours.sql` — allowance unit `hours`.
- `supabase/migrations/00069_book_filming.sql` — `book_filming` RPC; drop `book_slot`.
- `supabase/tests/00069_book_filming_test.sql` — SQL parity test.
- `src/lib/booking.test.ts` — Vitest for the pure engine.
- `src/lib/actions/book-filming.test.ts` — Vitest for the book action (mocked RPC).
- `src/app/admin/availability/page.tsx` — month availability editor page.
- `src/components/admin/availability/availability-editor.tsx` — month grid client component.

**Modified:**
- `src/lib/booking.ts` — rewritten pure engine.
- `src/lib/schemas/booking.ts` — `bookFilmingSchema` replaces `bookSlotSchema`.
- `src/lib/schemas/booking-config.ts` — duration/interval/template/day schemas.
- `src/lib/actions/booking-config.ts` — duration CRUD, interval, weekly template, month availability.
- `src/lib/actions/booking-availability.ts` — rewritten to read open days + durations + interval.
- `src/lib/actions/book-slot.ts` → renamed export `bookFilming` (keep filename `book-slot.ts`).
- `src/lib/actions/filming-requests.ts` — `approveHold` writes timed event + Google push; `rejectHold` selects new columns.
- `src/lib/actions/sync-project-filming.ts` — emit `end_date` for timed filmings.
- `src/components/admin/settings/booking-settings.tsx` — durations/interval/capacity/weekly template.
- `src/components/client/book/availability-view.tsx` — days → durations → start times.
- `src/components/admin/sidebar.tsx` — add `/admin/availability` nav entry.
- `messages/el.json`, `messages/en.json` — `booking.*`, `settings.*`, `availability.*` keys.

---

## Phase 1 — Data model migrations

### Task 1: Durations table + start-interval setting (00065)

**Files:**
- Create: `supabase/migrations/00065_booking_durations.sql`

**Interfaces:**
- Produces: table `booking_durations(id, minutes, position, ...)` with `unique(minutes)`, seeded 60/120/240; column `booking_settings.slot_interval_minutes int default 30`.

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- 00065 — Booking durations + start-time interval
-- Fixed durations the Client picks from (admin-managed, like the old slots),
-- plus the start-time granularity used to enumerate candidate start times.
-- =====================================================================

create table if not exists public.booking_durations (
  id          uuid        primary key default gen_random_uuid(),
  minutes     int         not null check (minutes > 0 and minutes <= 24 * 60),
  position    int         not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists uniq_booking_durations_minutes
  on public.booking_durations (minutes);

insert into public.booking_durations (minutes, position) values
  (60, 0), (120, 1), (240, 2)
  on conflict (minutes) do nothing;

alter table public.booking_settings
  add column if not exists slot_interval_minutes int not null default 30
    check (slot_interval_minutes between 5 and 240);

-- updated_at trigger (reuse cost_model_touch_updated_at from 00037, as 00062 did)
drop trigger if exists trg_booking_durations_updated_at on public.booking_durations;
create trigger trg_booking_durations_updated_at
  before update on public.booking_durations
  for each row execute function public.cost_model_touch_updated_at();

-- RLS — admin / super_admin only (mirrors 00062)
alter table public.booking_durations enable row level security;

create policy "Admins full access to booking_durations"
  on public.booking_durations for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));
```

- [ ] **Step 2: Sanity-check the SQL parses**

Run: `pnpm exec prettier --check supabase/migrations/00065_booking_durations.sql || true`
Expected: file present; no TS/build impact (DDL only).

- [ ] **Step 3: Verify build is unaffected**

Run: `pnpm type-check`
Expected: PASS (no code references the new objects yet).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00065_booking_durations.sql
git commit -m "feat(booking): add booking_durations + slot_interval_minutes (00065)"
```

---

### Task 2: Weekly template + per-day availability (00066)

**Files:**
- Create: `supabase/migrations/00066_booking_schedule.sql`

**Interfaces:**
- Produces: table `booking_weekly_template(weekday pk, is_open, open_time, close_time)` seeded 7 rows (Mon–Fri 09:00–17:00 open, Sat/Sun closed); table `booking_day_availability(date pk, is_open, open_time, close_time)` — the bookable-day source of truth.

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- 00066 — Booking schedule: weekly template (base) + per-day availability
-- A day is bookable ONLY if booking_day_availability has a row with is_open.
-- The weekly template is just the base that "apply to month" copies from.
-- =====================================================================

create table if not exists public.booking_weekly_template (
  weekday     int  primary key check (weekday between 0 and 6), -- 0=Sunday … 6=Saturday
  is_open     boolean not null default false,
  open_time   time,
  close_time  time,
  updated_at  timestamptz not null default now(),
  check (not is_open or (open_time is not null and close_time is not null and open_time < close_time))
);

insert into public.booking_weekly_template (weekday, is_open, open_time, close_time) values
  (0, false, null,     null),
  (1, true,  '09:00',  '17:00'),
  (2, true,  '09:00',  '17:00'),
  (3, true,  '09:00',  '17:00'),
  (4, true,  '09:00',  '17:00'),
  (5, true,  '09:00',  '17:00'),
  (6, false, null,     null)
  on conflict (weekday) do nothing;

create table if not exists public.booking_day_availability (
  date        date primary key,
  is_open     boolean not null default true,
  open_time   time not null,
  close_time  time not null,
  updated_at  timestamptz not null default now(),
  check (open_time < close_time)
);

drop trigger if exists trg_booking_weekly_template_updated_at on public.booking_weekly_template;
create trigger trg_booking_weekly_template_updated_at
  before update on public.booking_weekly_template
  for each row execute function public.cost_model_touch_updated_at();

drop trigger if exists trg_booking_day_availability_updated_at on public.booking_day_availability;
create trigger trg_booking_day_availability_updated_at
  before update on public.booking_day_availability
  for each row execute function public.cost_model_touch_updated_at();

alter table public.booking_weekly_template  enable row level security;
alter table public.booking_day_availability enable row level security;

create policy "Admins full access to booking_weekly_template"
  on public.booking_weekly_template for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));

create policy "Admins full access to booking_day_availability"
  on public.booking_day_availability for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));
```

- [ ] **Step 2: Verify build is unaffected**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00066_booking_schedule.sql
git commit -m "feat(booking): weekly template + per-day availability tables (00066)"
```

---

### Task 3: Time-window columns; drop slot_id + booking_time_slots (00067)

**Files:**
- Create: `supabase/migrations/00067_filming_time_window.sql`

**Interfaces:**
- Produces: `filming_requests.start_time time`, `filming_requests.duration_minutes int`; index `idx_filming_requests_booking_date`; **removes** `filming_requests.slot_id` and table `booking_time_slots`.

- [ ] **Step 1: Write the migration (with a safety guard)**

```sql
-- =====================================================================
-- 00067 — Filming time window; retire named Time Slots
-- A Hold now carries (booking_date, start_time, duration_minutes).
-- slot_id + booking_time_slots are dropped — verified 0 rows use them
-- (the hold-based flow has never run in production). Guard re-checks.
-- =====================================================================

-- Safety: abort if any real Hold data exists on slot_id (must be 0 — see PRD #87 §4).
do $$
begin
  if exists (select 1 from public.filming_requests where slot_id is not null) then
    raise exception 'Refusing to drop slot_id: % rows still reference it',
      (select count(*) from public.filming_requests where slot_id is not null);
  end if;
end $$;

alter table public.filming_requests
  add column if not exists start_time       time,
  add column if not exists duration_minutes int check (duration_minutes is null or duration_minutes > 0);

comment on column public.filming_requests.start_time is 'Hold: filming start (wall-clock Athens). With booking_date + duration_minutes identifies the time window.';
comment on column public.filming_requests.duration_minutes is 'Hold: filming duration in minutes (one of booking_durations.minutes).';

-- Overlap counts key off the date; the per-slot index is obsolete.
drop index if exists idx_filming_requests_date_slot;
create index if not exists idx_filming_requests_booking_date
  on public.filming_requests (booking_date)
  where booking_date is not null;

alter table public.filming_requests drop column if exists slot_id;
drop table if exists public.booking_time_slots cascade;
```

- [ ] **Step 2: Verify build is unaffected by the SQL**

Run: `pnpm type-check`
Expected: PASS — TS does not read DB schema. (Code still references `booking_time_slots`/`slot_id`; those references are removed in Phase 4. They compile because Supabase table/column names are untyped strings.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00067_filming_time_window.sql
git commit -m "feat(booking): time-window columns; drop slot_id + booking_time_slots (00067)"
```

---

### Task 4: Allowance unit `hours` (00068)

**Files:**
- Create: `supabase/migrations/00068_package_allowance_hours.sql`

**Interfaces:**
- Produces: `proposal_packages.allowance_unit` CHECK extended to `('days','slots','hours')`.

- [ ] **Step 1: Confirm the existing constraint name**

Run: search migration `supabase/migrations/00061_proposal_package_allowance.sql` for the `allowance_unit` check.
Expected: an inline CHECK; constraint auto-named `proposal_packages_allowance_unit_check`. If the name differs, use the real one in Step 2.

- [ ] **Step 2: Write the migration**

```sql
-- =====================================================================
-- 00068 — Package allowance unit: add 'hours'
-- allowance_count semantics per unit:
--   days  = distinct dates per month
--   slots = bookings per month
--   hours = hours per month
-- =====================================================================

alter table public.proposal_packages
  drop constraint if exists proposal_packages_allowance_unit_check;

alter table public.proposal_packages
  add constraint proposal_packages_allowance_unit_check
    check (allowance_unit in ('days', 'slots', 'hours'));
```

- [ ] **Step 3: Verify build is unaffected**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00068_package_allowance_hours.sql
git commit -m "feat(booking): allow proposal package allowance unit hours (00068)"
```

---

## Phase 2 — Pure booking engine

### Task 5: Rewrite `src/lib/booking.ts` (minutes, durations, hours)

**Files:**
- Modify (full rewrite): `src/lib/booking.ts`
- Test: `src/lib/booking.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 8, 11, and the SQL parity test as the reference logic):

```ts
export type BookingUnit = 'days' | 'slots' | 'hours';
export type Booking = { date: string; start: number; duration: number }; // minutes
export type OpenDay = { date: string; open: number; close: number };     // minutes
export type Allowance = { count: number; unit: BookingUnit };
export type Reason = 'available' | 'capacity_full' | 'allowance_exhausted' | 'past';
export type StartOption = { start: number; available: boolean; reason: Reason };
export type DurationGroup = { duration: number; starts: StartOption[] };
export type DayAvailability = { date: string; open: number; close: number; durations: DurationGroup[] };
export type AvailabilityResult = { days: DayAvailability[]; remaining_allowance: number };
export type AvailabilityInput = {
  openDays: OpenDay[]; durations: number[]; interval: number; capacity: number;
  bookings: Booking[]; allowance: Allowance | null; clientUsage: Booking[];
  month: string; today: string; nowMinutes: number;
};
export function candidateStarts(open: number, close: number, duration: number, interval: number): number[];
export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean;
export function concurrentAt(date: string, start: number, duration: number, bookings: Booking[]): number;
export function isCapacityFree(date: string, start: number, duration: number, capacity: number, bookings: Booking[]): boolean;
export function remainingAllowance(allowance: Allowance, monthUsage: Booking[]): number;
export function wouldFitAllowance(date: string, duration: number, allowance: Allowance, monthUsage: Booking[]): boolean;
export function computeAvailability(input: AvailabilityInput): AvailabilityResult;
```

- [ ] **Step 1: Write the failing test** (`src/lib/booking.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import {
  candidateStarts, overlaps, concurrentAt, isCapacityFree,
  remainingAllowance, wouldFitAllowance, computeAvailability,
  type Booking, type Allowance,
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
    expect(overlaps(540, 120, 600, 60)).toBe(true);  // 9-11 vs 10-11
    expect(overlaps(540, 60, 600, 60)).toBe(false);  // 9-10 vs 10-11 (touch, no overlap)
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
    expect(remainingAllowance({ count: 5, unit: 'hours' }, usage)).toBe(0.75); // 4h15m used
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
    expect(wouldFitAllowance('2026-07-02', 30, { count: 2, unit: 'hours' }, usage)).toBe(true);  // 1.5h + 0.5h = 2h, fits
  });
});

describe('computeAvailability', () => {
  const base = {
    openDays: [{ date: '2026-07-01', open: 540, close: 660 }], // 09:00-11:00
    durations: [60], interval: 60, capacity: 1,
    bookings: [] as Booking[],
    clientUsage: [] as Booking[],
    month: '2026-07', today: '2026-06-30', nowMinutes: 0,
  };
  it('returns empty when allowance is null', () => {
    expect(computeAvailability({ ...base, allowance: null }))
      .toEqual({ days: [], remaining_allowance: 0 });
  });
  it('marks capacity_full starts unavailable', () => {
    const r = computeAvailability({
      ...base, allowance: { count: 10, unit: 'slots' } as Allowance,
      bookings: [{ date: '2026-07-01', start: 540, duration: 60 }],
    });
    const start9 = r.days[0].durations[0].starts.find((s) => s.start === 540)!;
    expect(start9.available).toBe(false);
    expect(start9.reason).toBe('capacity_full');
  });
  it('marks past starts for today', () => {
    const r = computeAvailability({
      ...base, openDays: [{ date: '2026-06-30', open: 540, close: 660 }],
      today: '2026-06-30', nowMinutes: 600, allowance: { count: 10, unit: 'slots' },
    });
    const start9 = r.days[0].durations[0].starts.find((s) => s.start === 540)!;
    expect(start9.reason).toBe('past');
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm vitest run src/lib/booking.test.ts`
Expected: FAIL (old `booking.ts` exports `slot_id`-based types; new functions undefined).

- [ ] **Step 3: Rewrite `src/lib/booking.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/booking.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking.ts src/lib/booking.test.ts
git commit -m "feat(booking): pure availability engine with durations + hours unit"
```

> NOTE: `pnpm type-check` is expected to FAIL after this task because `booking-availability.ts` still imports the old types. That consumer is fixed in Task 8 (same phase boundary). Do not run a full build gate until Task 8 lands.

---

## Phase 3 — Atomic RPC

### Task 6: `book_filming` RPC + drop `book_slot` (00069)

**Files:**
- Create: `supabase/migrations/00069_book_filming.sql`

**Interfaces:**
- Produces: `book_filming(p_date date, p_start time, p_duration int, p_location text, p_note text) returns uuid`. Sentinel errors: `not_a_client`, `no_agreement`, `invalid_duration`, `day_closed`, `outside_hours`, `capacity_full`, `allowance_exceeded`.

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- 00069 — book_filming: atomic Hold on a (date, start, duration) window
-- Replaces book_slot. Capacity is an overlap check; the per-day advisory
-- lock serialises concurrent same-day claims. Allowance counted per unit
-- (days/slots/hours). security definer. (PRD #87)
-- =====================================================================

create or replace function public.book_filming(
  p_date     date,
  p_start    time,
  p_duration int,
  p_location text default null,
  p_note     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id       uuid;
  v_allowance_count int;
  v_allowance_unit  text;
  v_capacity        int;
  v_occupied        int;
  v_is_open         boolean;
  v_open            time;
  v_close           time;
  v_interval        int;
  v_start_min       int := floor(extract(epoch from p_start) / 60);
  v_open_min        int;
  v_close_min       int;
  v_month_start     date := date_trunc('month', p_date)::date;
  v_month_end       date := (date_trunc('month', p_date) + interval '1 month')::date;
  v_used            numeric;
  v_cost            numeric;
  v_new_id          uuid;
begin
  -- 1. caller is a Client
  select id into v_client_id from public.clients where user_id = auth.uid();
  if v_client_id is null then raise exception 'not_a_client'; end if;

  -- 2. active Agreement → Package Allowance
  select pp.allowance_count, pp.allowance_unit
  into v_allowance_count, v_allowance_unit
  from public.client_agreements ca
  join public.proposal_packages pp on pp.id = ca.package_id
  where ca.client_id = v_client_id and ca.active;
  if v_allowance_count is null then raise exception 'no_agreement'; end if;

  -- 3. duration is one we offer
  if not exists (select 1 from public.booking_durations where minutes = p_duration) then
    raise exception 'invalid_duration';
  end if;

  -- 4. the day is explicitly open
  select is_open, open_time, close_time
  into v_is_open, v_open, v_close
  from public.booking_day_availability where date = p_date;
  if v_is_open is null or not v_is_open then raise exception 'day_closed'; end if;

  -- 5. inside the open window + aligned to the interval
  select slot_interval_minutes into v_interval from public.booking_settings where id = 1;
  v_interval  := coalesce(v_interval, 30);
  v_open_min  := floor(extract(epoch from v_open) / 60);
  v_close_min := floor(extract(epoch from v_close) / 60);
  if v_start_min < v_open_min
     or v_start_min + p_duration > v_close_min
     or ((v_start_min - v_open_min) % v_interval) <> 0 then
    raise exception 'outside_hours';
  end if;

  -- 6. serialise concurrent claims on this day
  perform pg_advisory_xact_lock(hashtextextended(p_date::text, 0));

  -- 7. Capacity = overlapping non-declined windows on this date
  select capacity into v_capacity from public.booking_settings where id = 1;
  v_capacity := coalesce(v_capacity, 1);

  select count(*) into v_occupied
  from public.filming_requests
  where booking_date = p_date
    and status <> 'declined'
    and start_time is not null and duration_minutes is not null
    and floor(extract(epoch from start_time) / 60) < (v_start_min + p_duration)
    and v_start_min < floor(extract(epoch from start_time) / 60) + duration_minutes;

  if v_occupied >= v_capacity then raise exception 'capacity_full'; end if;

  -- 8. Allowance per unit
  if v_allowance_unit = 'days' then
    select count(distinct booking_date) into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := case when exists (
      select 1 from public.filming_requests
      where client_id = v_client_id and status <> 'declined' and booking_date = p_date
    ) then 0 else 1 end;
  elsif v_allowance_unit = 'hours' then
    select coalesce(sum(duration_minutes), 0) / 60.0 into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := p_duration / 60.0;
  else -- slots
    select count(*) into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := 1;
  end if;

  if v_used + v_cost > v_allowance_count then raise exception 'allowance_exceeded'; end if;

  -- 9. create the pending Hold
  insert into public.filming_requests
    (client_id, title, booking_date, start_time, duration_minutes, location, description, status)
  values
    (v_client_id, 'Booking ' || to_char(p_date, 'YYYY-MM-DD'),
     p_date, p_start, p_duration, p_location, p_note, 'pending')
  returning id into v_new_id;

  return v_new_id;
end;
$$;

comment on function public.book_filming(date, time, int, text, text) is
  'Atomically create a pending Hold on a (date, start, duration) window: enforces open hours, '
  'Capacity (overlap, advisory-locked per day) and the Client''s monthly Allowance. (PRD #87)';

grant execute on function public.book_filming(date, time, int, text, text) to authenticated;

-- Retire the named-slot RPC.
drop function if exists public.book_slot(date, uuid, text, text);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00069_book_filming.sql
git commit -m "feat(booking): book_filming atomic RPC; drop book_slot (00069)"
```

---

### Task 7: SQL parity test for `book_filming`

**Files:**
- Create: `supabase/tests/00069_book_filming_test.sql`

**Interfaces:**
- Consumes: the `book_filming` body (copied verbatim from 00069 — keep in sync).

- [ ] **Step 1: Write the self-contained parity test**

Mirror `supabase/tests/00064_book_slot_test.sql` exactly (begin … rollback; redefine `auth.uid()` from a GUC; year-2099 fixtures). Assert:
1. Capacity 1: two Clients claim **overlapping** windows on the same date → exactly one succeeds, the other raises `capacity_full`.
2. Non-overlapping windows on the same date both succeed (adjacent 09:00–10:00 and 10:00–11:00).
3. Unit `hours`: a Client with a 2-hour monthly budget books 90 min, then a 60-min window is rejected with `allowance_exceeded` (1.5h + 1h > 2h); a 30-min window succeeds.
4. `day_closed` when no `booking_day_availability` row; `outside_hours` when start is before open or unaligned to the interval; `invalid_duration` for a duration absent from `booking_durations`.

```sql
-- =====================================================================
-- SQL parity test for migration 00069 — book_filming atomic claim (PRD #87)
-- Paste into Supabase SQL Editor and Run. Self-contained, ends in ROLLBACK,
-- touches no production rows (year-2099 fixtures). Raises on any failure.
-- The book_filming body below is copied VERBATIM from 00069 — keep in sync.
-- =====================================================================
begin;

-- 1) function under test (verbatim from 00069)
--    <<< paste the full create-or-replace book_filming body from 00069 here >>>

-- 2) auth.uid() reads a settable GUC so we can switch acting user per call.
create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- 3) year-2099 fixtures + assertions
do $$
declare
  u1 uuid := '99990001-0001-4001-8001-000000000011';
  u2 uuid := '99990002-0002-4002-8002-000000000012';
  c1 uuid; c2 uuid; p_days uuid; p_hours uuid;
  d1 date := '2099-03-10';
  ok boolean; err text;
begin
  insert into auth.users (id, email) values
    (u1, 'test-00069-1@example.test'), (u2, 'test-00069-2@example.test');
  insert into public.clients (user_id, contact_name, email)
    values (u1, 'T1', 'test-00069-c1@example.test') returning id into c1;
  insert into public.clients (user_id, contact_name, email)
    values (u2, 'T2', 'test-00069-c2@example.test') returning id into c2;

  insert into public.proposal_packages (name, allowance_count, allowance_unit)
    values ('Test 00069 days', 10, 'days') returning id into p_days;   -- C2: not the blocker
  insert into public.proposal_packages (name, allowance_count, allowance_unit)
    values ('Test 00069 hours', 2, 'hours') returning id into p_hours; -- C1: 2h/month

  insert into public.client_agreements (client_id, package_id, agreed_monthly_price, active)
    values (c1, p_hours, 0, true), (c2, p_days, 0, true);

  insert into public.booking_durations (minutes, position) values (30, 90), (60, 91), (90, 92)
    on conflict (minutes) do nothing;
  update public.booking_settings set capacity = 1, slot_interval_minutes = 30 where id = 1;
  insert into public.booking_day_availability (date, is_open, open_time, close_time)
    values (d1, true, '09:00', '17:00')
    on conflict (date) do update set is_open = true, open_time = '09:00', close_time = '17:00';

  -- (1a) C1 books 09:00 for 90m → ok (uses 1.5h of 2h)
  perform set_config('test.uid', u1::text, true);
  if public.book_filming(d1, '09:00', 90) is null then raise exception 'FAIL 1a'; end if;

  -- (1b) C2 books an OVERLAPPING window 09:30 at Capacity 1 → capacity_full
  perform set_config('test.uid', u2::text, true);
  ok := false; err := null;
  begin perform public.book_filming(d1, '09:30', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'capacity_full' then raise exception 'FAIL 1b: %', err; end if;

  -- (2) C2 books a NON-overlapping window 11:00 → ok (no overlap with 09:00-10:30)
  if public.book_filming(d1, '11:00', 60) is null then raise exception 'FAIL 2'; end if;

  -- (3) C1 hours budget: +60m would be 1.5h+1h=2.5h > 2h → allowance_exceeded
  perform set_config('test.uid', u1::text, true);
  ok := false; err := null;
  begin perform public.book_filming(d1, '13:00', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'allowance_exceeded' then raise exception 'FAIL 3: %', err; end if;
  -- but a 30m window fits exactly (1.5h + 0.5h = 2h)
  if public.book_filming(d1, '13:00', 30) is null then raise exception 'FAIL 3b'; end if;

  -- (4) closed day / outside hours / invalid duration
  ok := false; err := null;
  begin perform public.book_filming('2099-03-11', '09:00', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'day_closed' then raise exception 'FAIL 4a: %', err; end if;

  ok := false; err := null;
  begin perform public.book_filming(d1, '08:45', 60); -- before open + unaligned
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'outside_hours' then raise exception 'FAIL 4b: %', err; end if;

  ok := false; err := null;
  begin perform public.book_filming(d1, '15:00', 45); -- 45 not in durations
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'invalid_duration' then raise exception 'FAIL 4c: %', err; end if;

  raise notice '✅ ALL ASSERTIONS PASSED — overlap capacity, hours allowance, day/hours/duration guards';
end $$;

rollback;
```

- [ ] **Step 2: Verify by running in Supabase SQL Editor**

Run: paste the whole file (with the verbatim `book_filming` body filled in) into Supabase Dashboard → SQL Editor → Run.
Expected: `✅ ALL ASSERTIONS PASSED`. (This is a manual gate — note it in the commit message.)

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/00069_book_filming_test.sql
git commit -m "test(booking): SQL parity test for book_filming (overlap + hours allowance)"
```

---

## Phase 4 — Server actions

### Task 8: Rewrite `booking-availability.ts` (restores the build)

**Files:**
- Modify (full rewrite): `src/lib/actions/booking-availability.ts`

**Interfaces:**
- Consumes: `computeAvailability`, `OpenDay`, `Booking`, `Allowance` from `@/lib/booking` (Task 5).
- Produces: `getMyAvailability(): Promise<ActionResult<ClientAvailability | null>>` where
  `ClientAvailability = { package_name: string; allowance: Allowance; remaining_allowance: number; durations: number[]; interval: number; days: DayAvailability[] }`.

- [ ] **Step 1: Write the rewrite**

```ts
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
const todayInAthens = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: ATHENS_TZ });

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
      admin.from('booking_settings').select('capacity, slot_interval_minutes').eq('id', 1).maybeSingle(),
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

    const toBooking = (h: { booking_date: unknown; start_time: unknown; duration_minutes: unknown }): Booking => ({
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
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm type-check`
Expected: PASS for `booking.ts` + `booking-availability.ts`. (`booking-config.ts`, `book-slot.ts`, `availability-view.tsx`, `filming-requests.ts` may still error — fixed in Tasks 9–12. If you are doing strict task-by-task gating, expect remaining errors only in those four files.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/booking-availability.ts
git commit -m "feat(booking): availability action reads open days + durations + interval"
```

---

### Task 9: Booking config schemas + actions (durations, interval, template, month)

**Files:**
- Modify: `src/lib/schemas/booking-config.ts`
- Modify (rewrite): `src/lib/actions/booking-config.ts`

**Interfaces:**
- Produces (consumed by Tasks 13–14 UI):
  - `getBookingConfig(): ActionResult<{ durations: Duration[]; capacity: number; interval: number }>` where `Duration = { id: string; minutes: number; position: number }`.
  - `createDuration(input)`, `removeDuration(id)`, `reorderDurations(input)`.
  - `setSlotInterval(input)`, `setCapacity(input)` (existing).
  - `getWeeklyTemplate(): ActionResult<WeekdayHours[]>`, `setWeekdayHours(input)`.
  - `getMonthAvailability(month): ActionResult<DayRow[]>`, `applyTemplateToMonth(month)`, `setDayAvailability(input)`.

- [ ] **Step 1: Replace the schemas**

```ts
import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createDurationSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(24 * 60),
});
export type CreateDurationInput = z.infer<typeof createDurationSchema>;

export const reorderDurationsSchema = z.object({
  ordered_ids: z.array(z.string().uuid()).min(1),
});
export type ReorderDurationsInput = z.infer<typeof reorderDurationsSchema>;

export const slotIntervalSchema = z.object({
  interval: z.coerce.number().int().min(5).max(240),
});
export type SlotIntervalInput = z.infer<typeof slotIntervalSchema>;

export const capacitySchema = z.object({
  capacity: z.coerce.number().int().min(1),
});
export type CapacityInput = z.infer<typeof capacitySchema>;

export const weekdayHoursSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string().regex(TIME).nullable(),
    close_time: z.string().regex(TIME).nullable(),
  })
  .refine((v) => !v.is_open || (v.open_time && v.close_time && v.open_time < v.close_time), {
    message: 'Open days need an open time before the close time',
  });
export type WeekdayHoursInput = z.infer<typeof weekdayHoursSchema>;

export const dayAvailabilitySchema = z
  .object({
    date: z.string().regex(DATE),
    is_open: z.boolean(),
    open_time: z.string().regex(TIME),
    close_time: z.string().regex(TIME),
  })
  .refine((v) => v.open_time < v.close_time, { message: 'Open time must precede close time' });
export type DayAvailabilityInput = z.infer<typeof dayAvailabilitySchema>;

export const monthSchema = z.string().regex(MONTH, 'Expected YYYY-MM');
```

- [ ] **Step 2: Rewrite `booking-config.ts`**

Replace the time-slot CRUD with the actions below. Keep the `requireAdmin()` + ActionResult + `revalidatePath('/admin/settings')` shape from the existing file. Add `revalidatePath('/admin/availability')` to the month-availability actions.

```ts
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
export type WeekdayHours = { weekday: number; is_open: boolean; open_time: string | null; close_time: string | null };
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
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load booking config' };
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
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reorder durations' };
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

export async function applyTemplateToMonth(month: string): Promise<ActionResult<{ written: number }>> {
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
        { date: v.date, is_open: v.is_open, open_time: v.open_time, close_time: v.close_time, updated_at: new Date().toISOString() },
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
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: errors now only in `book-slot.ts`, `availability-view.tsx`, `filming-requests.ts` (fixed next). `booking-config.ts` is clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/booking-config.ts src/lib/actions/booking-config.ts
git commit -m "feat(booking): admin config actions for durations, interval, template, month availability"
```

---

### Task 10: `bookFilming` action + schema

**Files:**
- Modify: `src/lib/schemas/booking.ts`
- Modify (rewrite): `src/lib/actions/book-slot.ts` (keep filename; export `bookFilming`)
- Test: `src/lib/actions/book-filming.test.ts`

**Interfaces:**
- Consumes: RPC `book_filming` (Task 6).
- Produces: `bookFilming(input): Promise<ActionResult<{ id: string }>>`; `bookFilmingSchema`.

- [ ] **Step 1: Replace the schema**

```ts
import { z } from 'zod';

/** A Client's request to book a (date, start time, duration) window — a Hold. */
export const bookFilmingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A valid date is required'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'A valid start time is required'),
  duration_minutes: z.coerce.number().int().positive('A valid duration is required'),
  location: z.string().trim().max(500, 'Location is too long').optional(),
  note: z.string().trim().max(1000, 'Note is too long').optional(),
});

export type BookFilmingInput = z.infer<typeof bookFilmingSchema>;
```

- [ ] **Step 2: Write the failing action test** (`src/lib/actions/book-filming.test.ts`)

Mirror the existing `src/lib/actions/book-slot.test.ts` (mock `@/lib/auth-helpers`, `@/lib/actions/notifications`, `next/cache`). Assert the action maps each sentinel error and calls the RPC with the parsed window.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/auth-helpers', () => ({
  requireUser: vi.fn(async () => ({ supabase: { rpc }, user: { id: 'u1' }, error: null })),
}));
vi.mock('@/lib/actions/notifications', () => ({
  getAdminUserIds: vi.fn(async () => []),
  createNotificationForMany: vi.fn(async () => {}),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { bookFilming } from './book-slot';

const valid = { date: '2026-07-01', start_time: '09:00', duration_minutes: 60 };

beforeEach(() => rpc.mockReset());

describe('bookFilming', () => {
  it('returns the new id on success', async () => {
    rpc.mockResolvedValue({ data: 'hold-1', error: null });
    const r = await bookFilming(valid);
    expect(r).toEqual({ data: { id: 'hold-1' }, error: null });
    expect(rpc).toHaveBeenCalledWith('book_filming', {
      p_date: '2026-07-01', p_start: '09:00', p_duration: 60, p_location: undefined, p_note: undefined,
    });
  });
  it('maps capacity_full to a friendly message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'capacity_full' } });
    expect((await bookFilming(valid)).error).toMatch(/no longer available/i);
  });
  it('maps outside_hours and day_closed', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'outside_hours' } });
    expect((await bookFilming(valid)).error).toMatch(/outside/i);
    rpc.mockResolvedValue({ data: null, error: { message: 'day_closed' } });
    expect((await bookFilming(valid)).error).toMatch(/closed/i);
  });
  it('rejects an invalid window at the schema boundary', async () => {
    expect((await bookFilming({ date: 'nope', start_time: '99:99', duration_minutes: 0 })).error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run src/lib/actions/book-filming.test.ts`
Expected: FAIL (`bookFilming` not exported).

- [ ] **Step 4: Rewrite `book-slot.ts`**

```ts
'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth-helpers';
import { bookFilmingSchema } from '@/lib/schemas/booking';
import { getAdminUserIds, createNotificationForMany } from '@/lib/actions/notifications';
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
    revalidatePath('/admin/filming-requests');

    const adminIds = await getAdminUserIds();
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
      title: 'New booking request submitted',
      body: `${parsed.date} ${parsed.start_time}`,
      actionUrl: '/admin/filming-requests',
    });

    return { data: { id }, error: null };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { data: null, error: err.issues[0]?.message ?? 'Invalid booking details' };
    }
    return { data: null, error: err instanceof Error ? err.message : 'Failed to book filming' };
  }
}
```

- [ ] **Step 5: Run the test**

Run: `pnpm vitest run src/lib/actions/book-filming.test.ts`
Expected: PASS.

- [ ] **Step 6: Remove the obsolete book-slot test if present**

If `src/lib/actions/book-slot.test.ts` exists, delete it (its `bookSlot`/`slot_id` contract is gone).
Run: `pnpm vitest run` to confirm nothing else references `bookSlot`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/booking.ts src/lib/actions/book-slot.ts src/lib/actions/book-filming.test.ts
git rm --ignore-unmatch src/lib/actions/book-slot.test.ts
git commit -m "feat(booking): bookFilming action over time windows; map new sentinel errors"
```

---

## Phase 5 — Google Calendar timed events

### Task 11: `approveHold` writes a timed event + pushes to Google

**Files:**
- Modify: `src/lib/actions/filming-requests.ts` (`approveHold`, and `rejectHold` select list)

**Interfaces:**
- Consumes: `syncEntityToGoogle` + `getGoogleColorId` (same call shape as `calendar-events.ts`).
- Produces: on approval, a `calendar_events` row (`all_day=false`, real `end_date`, `event_type='filming'`, `project_id`) pushed to Google via `entityType:'custom', eventType:'filming'`.

- [ ] **Step 1: Add an Athens-offset helper at the top of the actions for timed events**

Reuse the proven `athensOffsetFor` logic from `sync-project-filming.ts`. Add a small local helper near the imports of `filming-requests.ts`:

```ts
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { getGoogleColorId } from '@/lib/google-calendar';

/** ISO Athens offset (e.g. "+03:00") for a date — copy of sync-project-filming.athensOffsetFor. */
function athensOffsetFor(filmingDate: string): string {
  const [y, m, d] = filmingDate.split('-').map(Number);
  try {
    const probe = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
    const fmt = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Athens', timeZoneName: 'longOffset' });
    const part = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value;
    if (part?.startsWith('GMT')) return part.replace('GMT', '').trim() || '+00:00';
  } catch { /* fall through */ }
  return '+02:00';
}

/** "HH:MM" + minutes → "HH:MM" (same day; durations never cross midnight here). */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Replace the Hold-fetch select and the calendar-insert block in `approveHold`**

Change the select to read the time window instead of `slot_id`:

```ts
const { data: hold, error: fetchError } = await supabase
  .from('filming_requests')
  .select('id, client_id, title, description, status, booking_date, start_time, duration_minutes, location')
  .eq('id', id)
  .single();
```

Remove the `booking_time_slots` name lookup entirely. Set `filming_time` from `start_time`:

```ts
const filmingDate = hold.booking_date as string | null;
const startTime = hold.start_time as string | null;        // "HH:MM"
const duration = hold.duration_minutes as number | null;
```

Use `filming_time: startTime` on the `projects` insert (replacing `filming_time: slotName`).

Replace the all-day calendar insert with a **timed** event pushed to Google:

```ts
if (filmingDate && startTime && duration) {
  const offset = athensOffsetFor(filmingDate);
  const startIso = `${filmingDate}T${startTime}:00${offset}`;
  const endIso = `${filmingDate}T${addMinutes(startTime, duration)}:00${offset}`;

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .insert({
      title: `🎬 ${hold.title}`,
      description: hold.location ? `📍 ${hold.location}` : null,
      start_date: startIso,
      end_date: endIso,
      all_day: false,
      event_type: 'filming',
      project_id: project.id,
      created_by: user.id,
    })
    .select('id, title, description, start_date, end_date, all_day, event_type')
    .single();

  if (!eventError && event) {
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: event.id,
      operation: 'create',
      eventData: {
        title: event.title,
        description: event.description ?? undefined,
        startDate: event.start_date,
        endDate: event.end_date ?? undefined,
        allDay: event.all_day,
        colorId: getGoogleColorId('custom', null, event.event_type),
      },
    });
  }
}
```

Keep the rest of `approveHold` (status→'converted', revalidatePaths, notify) unchanged.

- [ ] **Step 3: Fix `rejectHold`'s select list**

Change `rejectHold`'s select from `'id, client_id, title, status, booking_date, slot_id'` to `'id, client_id, title, status, booking_date, start_time, duration_minutes'` (drop the now-missing `slot_id`).

- [ ] **Step 4: Verify types compile**

Run: `pnpm type-check`
Expected: PASS for `filming-requests.ts` (no `slot_id` / `booking_time_slots` references remain anywhere — grep to confirm: `git grep -n "booking_time_slots\|slot_id" src/` should return nothing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/filming-requests.ts
git commit -m "feat(booking): approveHold writes a timed Google-synced filming event"
```

---

### Task 12: Align `sync-project-filming` to emit `end_date`

**Files:**
- Modify: `src/lib/actions/sync-project-filming.ts`

**Interfaces:**
- Produces: timed filming events carry a real `end_date` when the project has a `filming_time` (additive; sync engine untouched).

- [ ] **Step 1: Compute a default end from `filming_time`**

In `syncProjectFilmingToCalendar`, when `!allDay`, set `end_date` to start + a default duration (60 min, since projects store only a start time). Add the same `addMinutes` helper used in Task 11 (or import a shared one) and change the payload:

```ts
const DEFAULT_FILMING_MINUTES = 60;
const endIso = allDay
  ? null
  : `${project.filming_date}T${addMinutes(project.filming_time as string, DEFAULT_FILMING_MINUTES)}:00${athensOffsetFor(project.filming_date)}`;

const payload = {
  project_id: projectId,
  title: `Γύρισμα: ${project.title}`,
  description: project.location ?? null,
  start_date: startIso,
  end_date: endIso, // was always null
  all_day: allDay,
  color: null,
  event_type: 'filming' as const,
  assigned_to: project.assigned_to ?? null,
};
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/sync-project-filming.ts
git commit -m "feat(calendar): timed filming events carry an end_date"
```

---

## Phase 6 — Admin UI

### Task 13: Settings → Booking tab (durations, interval, capacity, weekly template)

**Files:**
- Modify (rewrite): `src/components/admin/settings/booking-settings.tsx`
- Modify: `messages/el.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getBookingConfig`, `createDuration`, `removeDuration`, `setSlotInterval`, `setCapacity`, `getWeeklyTemplate`, `setWeekdayHours` (Task 9).

- [ ] **Step 1: Rewrite the component**

Replace the Time-Slots card with a **Durations** card (list of `minutes` rendered as a human label — `formatDuration(minutes)` → e.g. `1ω`, `2ω`, `4ω`; add via a number input + unit; remove via a trash button), keep the **Capacity** card, add a **Start interval** number input (calls `setSlotInterval`), and add a **Weekly template** card: 7 rows (Mon–Sun) each with an `is_open` toggle + open/close `time` inputs, saved per-row via `setWeekdayHours`. Match the existing card/Button/Input/toast patterns already in this file. Use `useTranslations('settings')` and the shared component APIs from `CLAUDE.md` (e.g. `ConfirmDialog` uses `confirmLabel`/`loading`/`destructive`).

Provide a local label helper:

```ts
const formatDuration = (minutes: number): string =>
  minutes % 60 === 0 ? `${minutes / 60}ω` : `${minutes}΄`;

const WEEKDAY_LABELS = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ']; // index 0=Sun..6=Sat
```

- [ ] **Step 2: Add i18n keys**

Add under `settings` in both `messages/el.json` and `messages/en.json`: `bookingDurations`, `addDuration`, `startInterval`, `intervalMinutes`, `capacity`, `weeklyTemplate`, `open`, `closed`, `from`, `to`, `save`. (Greek values for `el.json`, English for `en.json`.)

- [ ] **Step 3: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/settings/booking-settings.tsx messages/el.json messages/en.json
git commit -m "feat(booking): Settings Booking tab — durations, interval, capacity, weekly template"
```

---

### Task 14: `/admin/availability` month editor + nav

**Files:**
- Create: `src/app/admin/availability/page.tsx`
- Create: `src/components/admin/availability/availability-editor.tsx`
- Modify: `src/components/admin/sidebar.tsx` (+ `src/components/admin/mobile-nav.tsx` if it carries its own list)
- Modify: `messages/el.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getMonthAvailability`, `applyTemplateToMonth`, `setDayAvailability` (Task 9).

- [ ] **Step 1: Server page**

`page.tsx` is a server component using `requireRole`/middleware-guarded `/admin/*`. It renders a `PageHeader` (action buttons via `children`, per `CLAUDE.md`) and the client `AvailabilityEditor`, seeding the current Athens month.

```tsx
import { PageHeader } from '@/components/shared/page-header';
import { AvailabilityEditor } from '@/components/admin/availability/availability-editor';

export default function AvailabilityPage() {
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).slice(0, 7);
  return (
    <div className="space-y-6">
      <PageHeader title="Διαθεσιμότητα" description="Ποιες μέρες & ώρες είναι ανοιχτές για κρατήσεις" />
      <AvailabilityEditor initialMonth={month} />
    </div>
  );
}
```

- [ ] **Step 2: Client editor**

`availability-editor.tsx` (`'use client'`): month state + prev/next buttons; loads rows via `getMonthAvailability(month)` in an effect; renders each day of the month as a row showing weekday + date, an open/closed toggle, and open/close `time` inputs (disabled when closed); an "Εφαρμογή template στον μήνα" button calling `applyTemplateToMonth(month)` then reloading; each row edit calls `setDayAvailability`. Use existing toast + Button/Input/Switch components. Build the day list locally:

```ts
const daysInMonth = (month: string): string[] => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};
```

A day with no row = closed (no inputs until toggled on, which creates a row via `setDayAvailability` defaulting to the weekly template's hours or `09:00`/`17:00`).

- [ ] **Step 3: Add the nav entry**

In `src/components/admin/sidebar.tsx`, add to `NAV_ITEMS` after the `filming-requests` entry:

```ts
{
  href: '/admin/availability',
  icon: CalendarClock, // import { CalendarClock } from 'lucide-react'
  label: t('availability'),
},
```

Add `availability` to the admin nav i18n namespace used by `t(...)` (check which namespace `sidebar.tsx` uses, mirror an existing label like `filmingRequests`). Mirror into `mobile-nav.tsx` if it has its own list.

- [ ] **Step 4: Verify build**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: PASS; `/admin/availability` compiles as a route.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/availability src/components/admin/availability src/components/admin/sidebar.tsx src/components/admin/mobile-nav.tsx messages/el.json messages/en.json
git commit -m "feat(booking): /admin/availability month editor + nav entry"
```

---

## Phase 7 — Client UI

### Task 15: Rewrite `availability-view.tsx` (days → durations → start times)

**Files:**
- Modify (rewrite): `src/components/client/book/availability-view.tsx`
- Modify: `src/components/client/book/booking-wizard.tsx` (only if it imports the old shape)
- Modify: `messages/el.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getMyAvailability` → `ClientAvailability` (Task 8); `bookFilming` (Task 10).

- [ ] **Step 1: Rewrite the view**

Render: a package card with remaining allowance (format by unit — `hours` shows e.g. `1.5ω`, `days`/`slots` show a count); for each open day, duration chips (hide a duration whose every start is `allowance_exhausted`); after a duration is chosen, start-time chips from `day.durations[d].starts` (available ones clickable; unavailable show a reason badge — `capacity_full` → «γεμάτο», `past` → «πέρασε»); confirm calls `bookFilming({ date, start_time, duration_minutes, location?, note? })`. Empty states: no open days, allowance exhausted, no active agreement (`data === null` → contact prompt). Convert minutes→`HH:MM` for display:

```ts
const toHHMM = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const formatDuration = (minutes: number): string =>
  minutes % 60 === 0 ? `${minutes / 60}ω` : `${minutes}΄`;
```

Never render any price (the action never returns it).

- [ ] **Step 2: Add i18n keys**

Add under `booking` in both message files: `chooseDuration`, `chooseTime`, `noOpenDays`, `allowanceExhausted`, `needAgreement`, `full`, `past`, `remaining`, `book`, `confirm`.

- [ ] **Step 3: Verify build**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/client/book/availability-view.tsx src/components/client/book/booking-wizard.tsx messages/el.json messages/en.json
git commit -m "feat(booking): client booking view — pick day, duration, start time"
```

---

## Phase 8 — Verification & cross-cutting

### Task 16: Filming-reminder cron tolerates `hours`; full regression

**Files:**
- Modify (if needed): `src/lib/email/...` filming-reminder path
- Modify (if needed): `src/components/admin/...` filming-requests display (Hold shows time + duration, not slot name)

**Interfaces:**
- Consumes: nothing new — this is a sweep for `allowance_unit`/`slot_id`/`booking_time_slots`/slot-name assumptions.

- [ ] **Step 1: Grep for stragglers**

Run: `git grep -n "booking_time_slots\|slot_id\|slot_name\|allowanceUnit\|'slots'" src/`
Expected: only intentional `'days' | 'slots' | 'hours'` unions remain; no `booking_time_slots`/`slot_id` table/column references; the filming-requests admin UI no longer renders a slot name.

- [ ] **Step 2: Fix the filming-reminder unit handling**

Where the cron formats a Package allowance for the email, ensure `hours` is handled (likely a display string). Confirm it does not assume `days`/`slots` only.

- [ ] **Step 3: Update the admin Hold display**

Where pending Holds are listed (admin filming-requests), show `start_time` + `duration_minutes` (e.g. `10:00 (2ω)`) instead of a slot name.

- [ ] **Step 4: Full gate**

Run: `pnpm test && pnpm type-check && pnpm lint && pnpm build`
Expected: all green. Then run the SQL parity test (Task 7) and the manual GCal smoke (below) before merge.

- [ ] **Step 5: Manual GCal regression smoke (pre/post)**

Per PRD #87 §12: before & after applying migrations on cloud, confirm `count(*)` of `google_calendar_sync` and the sync token are unchanged, and that approving a Hold produces a timed `calendar_event` with a `google_event_id`. Use `/api/admin/google-calendar-diag`. Record the result in the PR description.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(booking): sweep slot-name assumptions; handle hours in reminder + admin Hold display"
```

---

## Self-Review

**Spec coverage (PRD #87 / design spec sections):**
- §5.1 durations → Task 1; §5.2 interval → Task 1; §5.3 weekly template + §5.4 day availability → Task 2; §5.5 time-window columns + drops → Task 3; §5.6 `hours` unit → Task 4.
- §6 pure engine → Task 5 (all named functions covered, with tests).
- §8 `book_filming` RPC → Task 6; §12 SQL parity → Task 7.
- §7.1 config actions → Task 9; §7.2 availability action → Task 8; §7.3 `bookFilming` → Task 10.
- §8a Google timed event → Task 11; §13 sync alignment → Task 12.
- §9.1 admin UI → Tasks 13–14; §9.2 client UI → Task 15.
- §13 cron/admin display + §11 RLS (admin-only via `createAdminClient`, enforced in migrations) → Tasks 2/9/16; §10 migrations → Tasks 1–4, 6.
- §14 out-of-scope items are not implemented (correct).

**Placeholder scan:** core logic (pure engine, RPC, actions) has full code; UI tasks give the real helpers + precise contracts and defer styling to existing component patterns (per the skill's "follow established patterns"). No `TBD`/`handle edge cases`/`similar to`.

**Type consistency:** `Booking`/`OpenDay`/`Allowance`/`DayAvailability` are defined in Task 5 and consumed unchanged in Tasks 8/15; `book_filming` parameter names (`p_date,p_start,p_duration,p_location,p_note`) match between Task 6 (SQL), Task 7 (parity test), and Task 10 (action RPC call); `bookFilmingSchema` field names (`date,start_time,duration_minutes,location,note`) match the action and the test.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-21-booking-days-and-hours.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch execution with checkpoints.

**Which approach?**
