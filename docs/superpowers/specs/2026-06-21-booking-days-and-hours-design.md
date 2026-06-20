# Booking με Μέρες & Ώρες — Design Spec

- **Date:** 2026-06-21
- **Status:** Approved (brainstorming) → pending spec review
- **Issue/PRD:** Follow-up στο PRD #70 (Per-Client Agreements + Hold-based booking)
- **Related ADR:** ADR-0006 (hold/reservation model) — διατηρείται

---

## 1. Πρόβλημα

Το booking που shipped με το PRD #70 είναι πολύ «χοντρό»: η διαθεσιμότητα είναι
απλώς **named slots** (π.χ. «Πρωί», «Απόγευμα») με ένα global capacity, και οι
διαθέσιμες μέρες υπολογίζονται αυτόματα ως «όλες οι υπόλοιπες μέρες του μήνα».

Συνέπειες που ανέφερε ο χρήστης:
- **Ο admin δεν έχει πουθενά** να ορίσει ποιες μέρες/ώρες είναι ανοιχτές — δεν
  υπάρχει τέτοια οθόνη, by design του current implementation.
- **Ο πελάτης δεν μπορεί να διαλέξει καμία μέρα** όταν δεν υπάρχουν time slots
  (ο πίνακας `booking_time_slots` φεύγει άδειος από το migration 00062).
- Δεν είναι «επαγγελματικό»: δηλώνει μόνο ζώνες, όχι πραγματικές ώρες.

## 2. Στόχος

Ο πελάτης πρέπει να μπορεί να διαλέξει **συγκεκριμένη μέρα + ώρα έναρξης + διάρκεια**
μέσα στο ανοιχτό παράθυρο που έχει ορίσει ο admin (π.χ. «Τετάρτη 10:00–12:00»).

Ο admin πρέπει να μπορεί να **στήσει τον μήνα** μία φορά (ποιες μέρες ανοιχτές +
ώρες), να μένει σταθερό, και να το πειράζει όποτε θέλει.

## 3. Αποφάσεις (κλειδωμένες στο brainstorming)

| # | Απόφαση |
|---|---------|
| D1 | **Διαθεσιμότητα = μηνιαία**, με εβδομαδιαίο template ως βάση + per-day override (on/off + ώρες). Source of truth = per-date εγγραφές. |
| D2 | **Σταθερή διάρκεια με επιλογές**: ο admin ορίζει λίστα διαρκειών (π.χ. 60΄/120΄/240΄)· ο πελάτης διαλέγει μία. |
| D3 | **Granularity έναρξης** ρυθμιζόμενο (default 30΄). |
| D4 | **Allowance ανά πακέτο**: προστίθεται τρίτη μονάδα `hours` δίπλα στα `days`/`slots`. Ο admin αποφασίζει ανά πακέτο. |
| D5 | **Capacity**: global αριθμός παράλληλων συνεργείων· έλεγχος με **επικάλυψη χρονικών παραθύρων**. |
| D6 | **Ροή έγκρισης**: αμετάβλητη — Hold → admin εγκρίνει/απορρίπτει → Filming (ADR-0006). |

## 4. Precondition / Παραδοχή

**Δεν υπάρχουν πραγματικές κρατήσεις σε production** (το PRD #70 shipped πρόσφατα,
καμία ζωντανή κράτηση). Αυτό επιτρέπει να **καταργήσουμε** το named-slots μοντέλο
(`booking_time_slots` + `filming_requests.slot_id`) αντί να το κρατήσουμε για
back-compat. → **Να επιβεβαιωθεί πριν το migration** (`select count(*) from
filming_requests where slot_id is not null`).

---

## 5. Μοντέλο δεδομένων (νέο)

### 5.1 Διάρκειες — `booking_durations`
```sql
create table public.booking_durations (
  id               uuid primary key default gen_random_uuid(),
  minutes          int  not null check (minutes > 0 and minutes <= 24*60),
  position         int  not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
```
- Fully dynamic (add/remove/reorder), όπως τα παλιά time slots.
- Seed: 60, 120, 240 (1ω, 2ω, μισή μέρα). Η ετικέτα στο UI παράγεται από τα λεπτά.

### 5.2 Ρυθμίσεις — `booking_settings` (επέκταση)
```sql
alter table public.booking_settings
  add column slot_interval_minutes int not null default 30
    check (slot_interval_minutes between 5 and 240);
```
- `capacity` παραμένει (global παράλληλα συνεργεία).

### 5.3 Εβδομαδιαίο template — `booking_weekly_template`
```sql
create table public.booking_weekly_template (
  weekday    int  primary key check (weekday between 0 and 6), -- 0=Κυριακή … 6=Σάββατο
  is_open    boolean not null default false,
  open_time  time,    -- null όταν is_open=false
  close_time time,
  updated_at timestamptz not null default now(),
  check (not is_open or (open_time is not null and close_time is not null and open_time < close_time))
);
```
- 7 σταθερές γραμμές (seed: Δευτ–Παρ ανοιχτά 09:00–17:00, ΣΚ κλειστά — αρχικές
  τιμές, ο admin τις αλλάζει).
- Είναι **μόνο βάση** για το «εφαρμογή στον μήνα». Δεν διαβάζεται απευθείας από
  τη μηχανή διαθεσιμότητας.

### 5.4 Διαθεσιμότητα ανά μέρα — `booking_day_availability` (source of truth)
```sql
create table public.booking_day_availability (
  date       date primary key,
  is_open    boolean not null default true,
  open_time  time not null,
  close_time time not null,
  updated_at timestamptz not null default now(),
  check (open_time < close_time)
);
```
- **Μια μέρα είναι bookable ΜΟΝΟ αν έχει εδώ εγγραφή με `is_open = true`.** Καμία
  εγγραφή → κλειστή. Έτσι ο admin «στήνει τον μήνα» ρητά και μένει σταθερό.
- Το «εφαρμογή template στον μήνα» γράφει μία γραμμή ανά μέρα του μήνα από το
  template (upsert· δεν πατάει μέρες που ο admin άλλαξε χειροκίνητα — βλ. §7.1).

### 5.5 Hold/Filming χρονικό παράθυρο — `filming_requests` (επέκταση)
```sql
alter table public.filming_requests
  add column start_time       time,
  add column duration_minutes int;
-- slot_id: καταργείται (drop column) — βλ. precondition §4
```
- Το Hold πλέον = `(booking_date, start_time, duration_minutes)`.
- Index: `(booking_date)` για τα overlap counts (το παλιό date+slot index φεύγει).

### 5.6 Allowance unit `hours` — `proposal_packages`
```sql
-- Το υπάρχον CHECK ορίστηκε inline στο 00061 → auto-named
-- (proposal_packages_allowance_unit_check). Επιβεβαίωση ονόματος με
-- \d proposal_packages πριν το drop.
alter table public.proposal_packages
  drop constraint proposal_packages_allowance_unit_check,
  add  constraint proposal_packages_allowance_unit_check
       check (allowance_unit in ('days','slots','hours'));
```
- `allowance_count` σημασία ανά unit: `days`=διακριτές μέρες/μήνα,
  `slots`=αριθμός κρατήσεων/μήνα, `hours`=ώρες/μήνα.

---

## 6. Καθαρή λογική — `src/lib/booking.ts` (rewrite)

Παραμένει pure (no I/O, no Date, no Supabase), όπως `finance.ts`. Οι ώρες
αναπαρίστανται ως **λεπτά από τα μεσάνυχτα** (int) ώστε η αριθμητική να είναι
καθαρή και ανεξάρτητη tz (ο caller δίνει wall-clock Athens).

### Τύποι
```ts
export type BookingUnit = 'days' | 'slots' | 'hours';

export type Booking = {              // ένα κατειλημμένο παράθυρο
  date: string;                      // YYYY-MM-DD
  start: number;                     // λεπτά από μεσάνυχτα
  duration: number;                  // λεπτά
};

export type OpenDay = {
  date: string;
  open: number;                      // λεπτά
  close: number;                     // λεπτά
};

export type Allowance = { count: number; unit: BookingUnit };

export type StartOption  = { start: number; available: boolean; reason: Reason };
export type DurationGroup = { duration: number; starts: StartOption[] };
export type DayAvailability = { date: string; open: number; close: number; durations: DurationGroup[] };
export type AvailabilityResult = { days: DayAvailability[]; remaining_allowance: number };
export type Reason = 'available' | 'capacity_full' | 'allowance_exhausted' | 'past';
```

### Συναρτήσεις (κάθε μία < ~30 γραμμές, testable μεμονωμένα)
- `candidateStarts(open, close, duration, interval): number[]` — όλες οι έναρξεις
  σε βήματα `interval` όπου `start + duration <= close`.
- `overlaps(aStart, aDur, bStart, bDur): boolean` — `aStart < bEnd && bStart < aEnd`.
- `concurrentAt(date, start, duration, bookings): number` — πόσα υπάρχοντα Holds
  επικαλύπτονται.
- `isCapacityFree(date, start, duration, capacity, bookings): boolean`.
- `remainingAllowance(allowance, monthUsage): number` — `days`→distinct dates,
  `slots`→count, `hours`→`count − sum(duration)/60`.
- `wouldFitAllowance(date, duration, allowance, monthUsage): boolean` — κόστος
  νέας κράτησης ανά unit (days: +1 αν νέα μέρα· slots: +1· hours: +duration).
- `computeAvailability(input): AvailabilityResult` — ενορχηστρώνει τα παραπάνω
  πάνω στις OpenDays × durations × candidateStarts.

`computeAvailability` επιστρέφει `{ days: [], remaining_allowance: 0 }` όταν
`allowance` είναι null (καμία επιφάνεια booking).

---

## 7. Server actions

### 7.1 Admin config — `src/lib/actions/booking-config.ts` (επέκταση)
Νέα actions (όλα `requireAdmin`, ActionResult pattern):
- Durations: `createDuration` / `removeDuration` / `reorderDurations`.
- Settings: `setSlotInterval` (το `setCapacity` υπάρχει).
- Weekly template: `getWeeklyTemplate` / `setWeekdayHours(weekday, {is_open, open, close})`.
- Month availability:
  - `getMonthAvailability(month)` → οι `booking_day_availability` του μήνα.
  - `applyTemplateToMonth(month)` → upsert μέρα-μέρα από το template. **Δεν
    πατάει** μέρες που έχουν ήδη `updated_at` νεότερο από το template apply
    (απλούστερη υλοποίηση: upsert με `on conflict do nothing` ώστε χειροκίνητες
    αλλαγές να μένουν· ο admin έχει ξεχωριστό «reset month» αν θέλει overwrite).
  - `setDayAvailability(date, {is_open, open, close})` — per-day override/toggle.
- Καταργείται το named-slots API (`createTimeSlot` κ.λπ.) και η αντίστοιχη UI.

### 7.2 Client availability — `src/lib/actions/booking-availability.ts` (rewrite)
- Αντί για `datesToMonthEnd`, διαβάζει τις **ανοιχτές** μέρες από
  `booking_day_availability` (`is_open = true`, `date >= today`).
- Διαβάζει durations + interval + capacity + allowance (με νέο unit `hours`).
- Διαβάζει υπάρχοντα Holds (non-declined) με `start_time` + `duration_minutes`.
- Καλεί `computeAvailability`. Επιστρέφει `ClientAvailability` με την νέα δομή
  (days → durations → starts). Ποτέ δεν επιστρέφει την agreed price.
- Φιλτράρει παρελθοντικές ώρες για τη σημερινή μέρα (reason `past`).

### 7.3 Book — `src/lib/actions/book-slot.ts` → `bookFilming`
- Νέο schema `bookFilmingSchema`: `date`, `start_time` (HH:MM), `duration_minutes`,
  optional `location`/`note`.
- Καλεί νέο RPC `book_filming` (§8). Mapping sentinel errors όπως σήμερα +
  νέα: `outside_hours`, `day_closed`, `invalid_duration`.
- Notifications προς admins αμετάβλητα.

---

## 8. Atomic RPC — `book_filming` (νέο migration)

Αντικαθιστά το `book_slot`. Υπογραφή:
```sql
book_filming(p_date date, p_start time, p_duration int,
             p_location text default null, p_note text default null) returns uuid
```
Έλεγχοι (με τη σειρά), `security definer`:
1. `not_a_client` — ο caller δεν είναι Client.
2. `no_agreement` — δεν υπάρχει ενεργό Agreement/Allowance.
3. `invalid_duration` — η `p_duration` δεν είναι στις `booking_durations`.
4. `day_closed` — δεν υπάρχει `booking_day_availability` row με `is_open` για `p_date`.
5. `outside_hours` — `p_start < open_time` ή `p_start + p_duration > close_time`·
   επίσης ευθυγράμμιση με `slot_interval_minutes`.
6. **Advisory lock ανά ημέρα** (`pg_advisory_xact_lock(hashtext(p_date))`) —
   σειριοποιεί ταυτόχρονες κρατήσεις της ίδιας μέρας (overlaps αφορούν όλη τη μέρα).
7. `capacity_full` — αριθμός non-declined Holds που **επικαλύπτονται** με
   `[p_start, p_start+p_duration)` ≥ `capacity`.
8. `allowance_exceeded` — κόστος ανά unit (days/slots/hours) > remaining.
9. Insert pending Hold με `booking_date`, `start_time`, `duration_minutes`.

Overlap σε SQL: `tstzrange`/`timerange` ή χειροκίνητα `p_start < existing_end AND
existing_start < p_end`.

---

## 9. UI

### 9.1 Admin
**Δεδομένη ορατότητα** (ο χρήστης δεν έβρισκε πού να το ρυθμίσει):
- **Settings → Booking tab** (`booking-settings.tsx`, rewrite): κάρτες για
  *Durations* (αντί time slots), *Capacity*, *Start interval*, και *Weekly
  template* (7 γραμμές: open?/από/έως).
- **Νέα σελίδα `/admin/availability`** (dedicated, με nav entry): προβολή μήνα,
  κάθε μέρα **on/off** + επεξεργασία ωρών, κουμπί «Εφαρμογή template στον μήνα»,
  μετάβαση μήνα. Reuse `DataTable`/calendar patterns· FullCalendar μόνο αν χρειαστεί.

### 9.2 Client — `availability-view.tsx` (rewrite)
- Κάρτα πακέτου + remaining allowance (υποστηρίζει `hours`).
- Λίστα **ανοιχτών** ημερών. Κάθε μέρα: επιλογή **διάρκειας** (chips· κρυμμένες
  όσες δεν χωράνε στο allowance), μετά επιλογή **ώρας έναρξης** (chips διαθέσιμων
  starts· μη διαθέσιμες με reason badge).
- Confirm → `bookFilming`. Empty states: καμία ανοιχτή μέρα / allowance εξαντλημένο.

---

## 10. Migrations (νέα, σειριακά από 00065)

> Disk + cloud σε sync στο 00064.

1. **00065_booking_durations.sql** — πίνακας durations (+seed 60/120/240),
   `booking_settings.slot_interval_minutes`.
2. **00066_booking_schedule.sql** — `booking_weekly_template` (7 seeded rows),
   `booking_day_availability`. **RLS admin-only** (όπως 00062)· το availability τα
   διαβάζει μέσω `createAdminClient()` αφού authenticate-άρει τον χρήστη (§11) —
   καμία client-side RLS policy σε booking config.
3. **00067_filming_time_window.sql** — `start_time`+`duration_minutes` στο
   `filming_requests`· **drop `slot_id`**· νέο index `(booking_date)`· **drop
   `booking_time_slots`** (precondition §4).
4. **00068_package_allowance_hours.sql** — επέκταση CHECK σε `('days','slots','hours')`.
5. **00069_book_filming.sql** — νέο RPC `book_filming`· **drop `book_slot`**.

## 11. RLS / πρόσβαση

Σήμερα το availability διαβάζει admin-locked πίνακες μέσω `createAdminClient()`
αφού authenticate-άρει τον χρήστη. Διατηρούμε το ίδιο pattern για τους νέους
πίνακες — **δεν** ανοίγουμε client-side RLS σε booking config. Έτσι ο πελάτης δεν
βλέπει ποτέ raw config, μόνο το υπολογισμένο availability.

## 12. Testing

- **Vitest** στο `src/lib/booking.ts` (prior art `src/lib/finance.test.ts`):
  - `candidateStarts`: όρια παραθύρου, interval, duration > window → [].
  - `overlaps`/`concurrentAt`/`isCapacityFree`: επικαλύψεις, capacity boundary.
  - `remainingAllowance`/`wouldFitAllowance`: days/slots/**hours**, ίδια μέρα
    χωρίς διπλή χρέωση (days), εξάντληση.
  - `computeAvailability`: end-to-end pure, null allowance, past filtering.
- **SQL parity test** (όπως υπάρχει για PRD #70): η λογική του `book_filming`
  (capacity overlap + allowance ανά unit) να συμφωνεί με την pure.

## 13. Επηρεαζόμενα / να ελεγχθούν

- **Filming-reminder cron** (`src/lib/email/...`): διαβάζει agreements/allowance —
  να μη σπάει με unit `hours` (πιθανότατα απλό text, μόνο display).
- **Admin filming-requests** UI: εμφάνιση Hold τώρα με ώρα+διάρκεια αντί slot name.
- **Breadcrumbs / labels**: τυχόν αναφορές σε slot name.
- **i18n**: νέα κλειδιά `booking.*`, `settings.*` (el + en), αφαίρεση
  `allowanceUnit.slots`-only assumptions (πρόσθεση `hours`).

## 14. Εκτός scope (YAGNI)

- Πολλαπλά ανοιχτά παράθυρα ανά μέρα (π.χ. 09–13 & 17–20) — μία συνεχής ζώνη/μέρα.
- Per-crew/ανά πόρο capacity ή ανά-τοποθεσία διαθεσιμότητα.
- Recurring εξαιρέσεις/αργίες ως ξεχωριστό σύστημα (καλύπτεται με per-day override).
- Buffer χρόνου μεταξύ κρατήσεων / μετακινήσεις.
- Web Push (ήδη deferred, ADR-0007).
