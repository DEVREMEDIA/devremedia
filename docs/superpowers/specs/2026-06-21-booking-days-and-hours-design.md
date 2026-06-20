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
| D6 | **Ροή έγκρισης**: Hold → admin εγκρίνει/απορρίπτει → Filming (ADR-0006). Η έγκριση παράγει πλέον **timed** calendar_event και συγχρονίζεται **αμφίδρομα** με Google μέσω της υπάρχουσας `calendar_events` διαδρομής (§8a). |
| D7 | **Google sync αμετάβλητο στον πυρήνα του** — καμία αλλαγή σε webhook/cron/entity_types· filming rides το `custom` calendar_events sync (§4a, §8a). |

## 4. Κατάσταση παραγωγής (επαληθευμένο στη βάση, 2026-06-21)

Project `fvionwamqfczqpvqxiha` (dms):

- **39 filming_requests** (18 converted, 10 pending, 7 accepted, 4 declined) — όλα
  από την **παλιά** δημόσια φόρμα (`preferred_dates` JSON).
- **0 filming_requests** έχουν `booking_date` ή `slot_id`. → Το hold-based booking
  του PRD #70 **δεν έχει τρέξει ποτέ** σε production. Τα 2 `booking_time_slots`
  είναι αχρησιμοποίητα.
- **16 filming `calendar_events`** (9 ολοήμερα, 7 με ώρα — μόνο 2 με `end_date`),
  συγχρονισμένα στο Google.
- **230 `google_calendar_sync`** εγγραφές (project 162, custom 64, invoice 3,
  task 1) — το sync είναι **ενεργό και λειτουργικό**.

**Συνέπεια:** Η κατάργηση `filming_requests.slot_id` + `booking_time_slots` είναι
**ασφαλής** — 0 κρατήσεις τα χρησιμοποιούν, η ροή δεν έχει τρέξει ποτέ. Τα 39 παλιά
requests δεν αγγίζουν αυτές τις στήλες, μένουν ανέπαφα. → Re-check πριν το migration:
`select count(*) from filming_requests where slot_id is not null or booking_date is not null` (πρέπει = 0).

## 4a. ⚠️ Σκληρός περιορισμός — να ΜΗΝ χαλάσει το Google sync

Το Google Calendar sync (webhook `google-calendar/route.ts`, cron `google-*-renew`
+ `google-sync-retry`, `google-calendar.ts`, `google-sync-helper.ts`, 230 mappings)
**δουλεύει αξιόπιστα και ΔΕΝ πρέπει να διαταραχθεί**. Αρχές:

- **Δεν** προστίθεται νέο `entity_type` στο `google_calendar_sync`, **δεν** αλλάζει
  το webhook reverse-path, **δεν** αγγίζονται τα cron / `google-calendar.ts` /
  `google-sync-helper.ts` core. Αυτά είναι το «μην το πειράξεις» κουτί.
- Το filming sync γίνεται **μέσω της υπάρχουσας, δοκιμασμένης διαδρομής
  `calendar_events` (`entity_type='custom'`)** — η ίδια που ήδη συγχρονίζει 64
  events αμφίδρομα. Έτσι παίρνουμε bidirectional χωρίς νέο κώδικα sync (βλ. §8a).
- Πριν & μετά το deploy: GCal regression check (βλ. §12) ώστε να επιβεβαιωθεί ότι
  τα 230 mappings + sync token παραμένουν ακέραια.

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
-- slot_id: καταργείται (drop column) — ασφαλές, 0 rows το χρησιμοποιούν (§4)
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

## 8a. Google Calendar — εγκεκριμένη κράτηση → timed event (bidirectional via calendar_events)

> Στόχος: αμφίδρομος συγχρονισμός **χωρίς** να πειραχτεί η υπάρχουσα μηχανή (§4a).
> Reference υπάρχοντος σχεδιασμού: `docs/superpowers/specs/2026-03-24-google-calendar-sync-design.md`.

**Σημερινή ροή (`approveHold`, `filming-requests.ts:358-416`):** διαβάζει
`hold.slot_id` → looks up `booking_time_slots.name` ως ψευτο-`filming_time`, και
κάνει insert `calendar_events` **ολοήμερο** (`all_day=true`, `start=end=date`) —
χάνει την ώρα και (κρίσιμο) **δεν** καλεί `syncEntityToGoogle`, άρα το filming
δεν φτάνει καν στο Google με σωστό τρόπο.

**Νέα ροή (έγκριση Hold):**
1. Διαβάζει `start_time` + `duration_minutes` απευθείας από το filming_request
   (τέλος το `booking_time_slots` lookup).
2. Δημιουργεί `calendar_events` row με:
   - `start_date` = `booking_date` + `start_time` σε Athens-correct `timestamptz`
     (reuse `athensOffsetFor` από `sync-project-filming.ts`),
   - `end_date` = `start_date` + `duration_minutes` (πραγματική λήξη, όχι null),
   - `all_day = false`, `event_type = 'filming'`, `project_id` link όπως σήμερα.
3. **Περνάει στο Google μέσω της ΥΠΑΡΧΟΥΣΑΣ διαδρομής** — καλεί
   `syncEntityToGoogle({ entityType: 'custom', eventType: 'filming', entityId: <calendar_event.id>, ... })`,
   ακριβώς όπως κάνουν ήδη τα calendar-events server actions. **Καμία** αλλαγή σε
   `google-sync-helper.ts`, webhook, ή cron.

**Οπτική διάκριση:** το event είναι `event_type='filming'` → στην εφαρμογή
εμφανίζεται/χρωματίζεται ως γύρισμα, και στο Google παίρνει ξεχωριστό χρώμα μέσω
του υπάρχοντος `ENTITY_COLOR_MAP['custom_filming'] = '9'` (`google-calendar.ts:43`).
Προϋπόθεση: το sync call να περνάει `eventType: 'filming'` ώστε να πιάσει ο χάρτης.

**Bidirectional «τζάμπα»:** Επειδή το event ζει ως `calendar_events` (custom), ο
reverse webhook-path που ήδη ενημερώνει τα custom `calendar_events` από αλλαγές
Google **ισχύει αυτούσιος**. Αλλαγή ώρας στο Google → ενημερώνει το
`calendar_events` row (υπάρχουσα συμπεριφορά). Η κράτηση/filming_request
παραμένει η εγγραφή «ποιος έκλεισε»· το `calendar_events` είναι το κανονικό
scheduling artifact (όπως ήδη για τα 16 filming events).

**Εκτός scope (για να μη ρισκάρουμε τη μηχανή):** δεν προπαγανδίζουμε reverse
αλλαγές πέρα από το `calendar_events` πίσω στο `filming_requests.start_time` —
αν χρειαστεί αργότερα, μπαίνει ως ξεχωριστό, προσεκτικό follow-up.

**Διόρθωση συνέπειας:** οι άλλες δύο διαδρομές που γράφουν filming calendar events
(`sync-project-filming.ts`, `convert`) να παράγουν κι αυτές `end_date` και timed
events όπου υπάρχει ώρα — μικρή, additive ευθυγράμμιση, όχι αλλαγή sync μηχανής.

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
   `booking_time_slots`** (ασφαλές — §4).
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
- **GCal regression check** (§4a): πριν & μετά, επιβεβαίωση ότι
  `select count(*) from google_calendar_sync` + το sync token δεν αλλάζουν λόγω
  των migrations, και ότι μια έγκριση Hold παράγει timed calendar_event με
  `google_event_id` (χωρίς να σπάει τα 230 υπάρχοντα mappings). Χειροκίνητο smoke
  test στο staging/diag endpoint `/api/admin/google-calendar-diag`.

## 13. Επηρεαζόμενα / να ελεγχθούν

- **Filming-reminder cron** (`src/lib/email/...`): διαβάζει agreements/allowance —
  να μη σπάει με unit `hours` (πιθανότατα απλό text, μόνο display).
- **Admin filming-requests** UI: εμφάνιση Hold τώρα με ώρα+διάρκεια αντί slot name·
  `approveHold` (`filming-requests.ts:358-416`) — νέα timed calendar_event + push
  μέσω `syncEntityToGoogle` (§8a).
- **`sync-project-filming.ts` / `convert`**: ευθυγράμμιση ώστε filming events να
  έχουν `end_date` + timed start όπου υπάρχει ώρα (additive, χωρίς αλλαγή sync μηχανής).
- **`projects.filming_time`**: παραμένει ως πηγή για το calendar derivation· να
  γράφεται συνεπώς από τις διαδρομές approve/convert.
- **Breadcrumbs / labels**: τυχόν αναφορές σε slot name.
- **i18n**: νέα κλειδιά `booking.*`, `settings.*` (el + en), αφαίρεση
  `allowanceUnit.slots`-only assumptions (πρόσθεση `hours`).

## 14. Εκτός scope (YAGNI)

- Πολλαπλά ανοιχτά παράθυρα ανά μέρα (π.χ. 09–13 & 17–20) — μία συνεχής ζώνη/μέρα.
- Per-crew/ανά πόρο capacity ή ανά-τοποθεσία διαθεσιμότητα.
- Recurring εξαιρέσεις/αργίες ως ξεχωριστό σύστημα (καλύπτεται με per-day override).
- Buffer χρόνου μεταξύ κρατήσεων / μετακινήσεις.
- Web Push (ήδη deferred, ADR-0007).
