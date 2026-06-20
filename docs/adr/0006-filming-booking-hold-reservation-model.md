# Filming booking is a Hold-based reservation bounded by per-Package Allowance and global Capacity

A signed-in Client books a Filming by picking a date + Time Slot for the Package in
their Agreement. The request immediately creates a **Hold**: it is not on the final
schedule, but it blocks the same date+Slot from others up to a configurable **Capacity**.
An admin approves a Hold into a confirmed Filming, or rejects it back to Free. A Client
can only book within their Package's **Allowance** for the calendar month. Prices never
appear on the Client side; the Client sees only their own Agreement.

## Context

The client (Angelos) reported three coupled needs:

1. **Prices are negotiated per Client**, so the hardcoded public price list
   (`SERVICE_CATEGORIES` in `src/lib/constants/services.ts`, shown in the booking wizard
   and public form) is misleading and must leave the Client-facing surfaces.
2. He must be able to **record each Client's monthly Agreement** (their Package + the
   price agreed with them specifically), even when no Contract exists.
3. In booking, a Client should **just see available dates for the Package they closed** —
   no package picking, no prices.

Two pre-existing facts shaped the design:

- A **dynamic, admin-managed package table already exists** (`proposal_packages`, with a
  `shooting_days` field) alongside the hardcoded `SERVICE_CATEGORIES`. Keeping both means
  two sources of truth.
- The **public form already creates a `lead`**, not a `filming_request`; the authenticated
  Client flow is what creates `filming_requests`. The old glossary said the opposite.

The genuinely hard, surprising part is the **availability semantics**. A naive design
("a day is taken if a confirmed Filming exists") loses the deal the moment two Clients
request the same day before the admin acts. Angelos explicitly asked for an in-between
state that reserves the slot while he decides.

## Decision

- **One package list.** Unify on the dynamic `proposal_packages`; remove the hardcoded
  `SERVICE_CATEGORIES` price list from Client-facing code. Admin picks a ready Package or
  creates a custom one. Prices stay only in admin tooling (proposals, cost model,
  pricing-health); they are never rendered Client-side.
- **Agreement per Client** = the Package they hold + the price agreed for them. Set by
  admin, pre-fillable from a signed Contract but not requiring one. It is what booking
  reads to know which Package a Client may book.
- **Three states for a date+Slot**: Free → **Hold** (Client requested, awaiting approval)
  → confirmed Filming. A Hold blocks others; a rejection releases it. The existing
  `filming_requests` (`pending` → `accepted`/`declined` → `converted`) carries these states.
- **Time Slots** are a single admin-managed list, editable anytime — not hardcoded and
  not a per-period schedule (a per-period schedule is explicitly deferred).
- **Blocking is per Slot**, not per whole day, so two Clients can share a day in different
  Slots.
- **Capacity** is one admin-set global number (default 1 = one crew). A date+Slot stops
  accepting Holds once `Holds + confirmed Filmings` in it reaches Capacity. Per-day /
  per-Slot capacity is deferred.
- **Allowance** is per Package: a number + a unit that is **either `days` or `slots`**
  (only those two — they are the only units the calendar can count). It resets each
  **calendar month**. A Client with no active Agreement cannot book (sees a "contact us"
  message).
- **On approval, keep creating a new Production per Filming** (current behavior). Grouping
  a Client's monthly Filmings into one "month Production" is explicitly **deferred** to a
  later phase to avoid reworking the Production/Deliverable/Invoice wiring now.

## Consequences

- Availability checks must count **both** Holds and confirmed Filmings against Capacity —
  the current `checkFilmingAvailability` (counts only confirmed `calendar_events`, whole
  day) is replaced by per-Slot, Hold-aware logic.
- A pending request now has scheduling weight: future readers should not "clean up" by
  ignoring `pending` rows in availability — that is the whole point of the Hold.
- The unit choice (`days` vs `slots`) is a fixed two-value enum by design; making it
  free-text would leave the calendar unable to count. New units require code, not config.
- Removing `SERVICE_CATEGORIES` from Client surfaces means the **filming-reminder cron**
  (which derives monthly packages from `SERVICE_CATEGORIES` IDs via `contracts.service_type`)
  must move to the Agreement / `proposal_packages` source of truth.
- Monthly recurring Clients will keep generating one Production per Filming until the
  deferred "month Production" phase lands; the Production list stays noisy in the interim,
  accepted as a conscious trade-off to ship the rest sooner.
- Glossary terms added/corrected in `CONTEXT.md`: Package, Allowance, Agreement, Time Slot,
  Capacity, Hold; Filming Request and Lead redefined to match actual behavior.
