# PRD: Revenue (Τζίρος) by issue date, alongside Collections (Εισπράξεις)

> Domain language: see `CONTEXT.md` → Finance. Decision record: `docs/adr/0002-revenue-by-issue-date-vs-collections-by-paid-date.md`.

## Problem Statement

Every revenue figure in the app (dashboard MTD card + 30-day sparkline, business
velocity, reports monthly chart, top-clients, profit margin) sums only `paid` invoices
bucketed by `paid_at`. Because `paid_at` is stamped with `now()` the moment an invoice
is marked paid (`src/lib/actions/invoices.ts`), an invoice issued in an earlier month
lands in the **current** month's turnover.

Admins (reported by Angelos) read "τζίρος του μήνα" as the accrual figure recognised
when the invoice is *cut* (`issue_date`, matching myDATA/ΑΑΔΕ), so the cash-basis number
reads as wrong. The app currently has no accrual figure at all.

## Solution

Split the single revenue number into two distinct metrics and surface both wherever
revenue is shown retrospectively:

- **Revenue (Τζίρος)** — `SUM(total)` of invoices with status in
  `sent | viewed | paid | overdue` (excludes `draft`, `cancelled`), bucketed by
  `issue_date`. New metric.
- **Collections (Εισπράξεις)** — `SUM(total)` of `paid` invoices bucketed by `paid_at`.
  The existing logic, renamed.

No change to how `paid_at` is set; no data backfill required (`issue_date` is already
required on every invoice).

## User Stories

- As an admin, when I issue an invoice, I see it counted in the **Revenue** of its
  issue month — even if it is not yet paid.
- As an admin, I can still see **Collections** (cash actually received) per month, side
  by side with Revenue, so I can tell accrued turnover apart from cash in.
- As an admin viewing the monthly reports chart, I see two series (Revenue and
  Collections) over the selected date range.
- As an admin, the profit margin I see is computed from **Revenue** (accrual) minus
  expenses of the same period.

## Implementation Decisions

- **Pure aggregation helpers**: extract the bucketing/filtering logic into pure
  functions (new `src/lib/finance.ts`) — given a list of `{ total, status, issue_date,
  paid_at }`, return month-bucketed Revenue and Collections. `reports.ts` and the RPC
  consumers call these helpers; no grouping logic stays inlined.
- **Dashboard RPCs** (new migration, supersedes the revenue blocks of `00045`):
  `get_dashboard_financials` and `get_business_velocity` return both a Revenue figure
  (issued invoices by `issue_date`) and the existing Collections figure (paid by
  `paid_at`) — current, previous period, and daily sparkline buckets for each.
- **`src/lib/queries/reports.ts`**:
  - `getMonthlyRevenue` → returns both series per month.
  - `getTopClientsByRevenue` → both Revenue and Collections per client.
  - `getProfitMargin` → revenue side uses **Revenue (Τζίρος)** only; single margin.
- **UI**: dashboard financial card + business velocity + reports chart + top-clients
  render both metrics with clear labels. Add EL/EN strings to `messages/el.json` and
  `messages/en.json` (Τζίρος / Revenue, Εισπράξεις / Collections).
- **Status filter is fixed in code**, not configurable: `draft`/`cancelled` excluded
  from Revenue.

## Testing Decisions

- **Seam: pure helpers, unit-tested with Vitest** (new test runner for the repo — first
  unit seam, introduced at the highest point: `src/lib/finance.ts`).
- Cases: invoice issued and paid in different months counts in Revenue's issue month and
  Collections' paid month; `draft`/`cancelled` excluded from Revenue; unpaid
  `sent`/`overdue` counted in Revenue but not Collections; multi-month bucketing;
  empty input.
- Add `test` / `test:unit` script + `vitest.config.ts`. Existing Playwright E2E
  (`e2e/invoice-payment.spec.ts`, `e2e/admin-dashboard.spec.ts`) is unchanged.
- SQL inside the RPCs is **not** covered by unit tests (no DB harness) — kept thin and
  mirroring the helper logic.

## Out of Scope

- **Revenue forecast** (`get_revenue_forecast`) — forward-looking (future `due_date` +
  leads), unrelated to the issue/paid attribution. Unchanged.
- **Payment-method breakdown** (`getPaymentMethodBreakdown`) — intrinsically cash; an
  unpaid invoice has no payment method. Stays Collections-only.
- Changing `paid_at` semantics, or any data backfill.
- Making the Revenue status filter admin-configurable.

## Further Notes

- Revenue ≥ Collections for any period by construction; the two diverge when issued
  invoices are unpaid. This is intended, not a bug.
- Cancelling an issued invoice removes it from Revenue for its issue month retroactively.
