# Revenue counts by issue date; Collections stay by paid date

We split the single "revenue" figure into two metrics. **Revenue (Τζίρος)** is the
accrual turnover: the sum of issued invoices (status `sent`/`viewed`/`paid`/`overdue`,
excluding `draft`/`cancelled`) bucketed by `issue_date`. **Collections (Εισπράξεις)**
is the cash figure the app already computed: `paid` invoices bucketed by `paid_at`.

## Context

Originally every revenue number — dashboard MTD card + sparkline, business velocity,
reports monthly chart, top-clients, profit margin — summed only `paid` invoices by
`paid_at`. Because `paid_at` is stamped with `now()` the moment an invoice is marked
paid (`invoices.ts`), an invoice issued in an earlier month lands in the **current**
month's turnover. Admins read "τζίρος του μήνα" as the Greek/myDATA accrual figure
(recognised when the invoice is *cut*), so the cash-basis number looked wrong.

## Decision

- Keep the cash figure, renamed **Collections (Εισπράξεις)** — unchanged logic.
- Add **Revenue (Τζίρος)** = issued invoices by `issue_date`, regardless of payment.
- Show **both** in every retrospective revenue widget (dashboard financials, business
  velocity, reports monthly chart, top-clients).
- **Profit margin** pairs expenses (by `date`) with **Revenue** only — accrual matches
  accrual. Single margin, not two.
- **Out of scope / unchanged**: revenue *forecast* (forward-looking, driven by future
  `due_date` + leads) and the *payment-method* breakdown (intrinsically cash — an
  unpaid invoice has no payment method).

## Consequences

- "Revenue" now includes unpaid (sent/overdue) invoices — by design, but it means
  Revenue ≥ Collections for any period, and the two can diverge sharply.
- No `paid_at` semantics change and no backfill: `issue_date` is already required on
  every invoice, so historical Revenue is computable retroactively.
- Cancelling an issued invoice removes it from Revenue retroactively for its issue month.
