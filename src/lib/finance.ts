/**
 * Pure finance aggregation helpers — the single source of truth for the two
 * retrospective money metrics. See CONTEXT.md → Finance and
 * docs/adr/0002-revenue-by-issue-date-vs-collections-by-paid-date.md.
 *
 * - Revenue (Τζίρος): issued invoices (status in REVENUE_STATUSES, i.e. excluding
 *   draft/cancelled) bucketed by issue_date. Accrual turnover.
 * - Collections (Εισπράξεις): paid invoices bucketed by paid_at. Cash received.
 */

export const REVENUE_STATUSES = ['sent', 'viewed', 'paid', 'overdue'] as const;

export type FinanceInvoice = {
  total: number | null;
  status: string;
  issue_date: string | null;
  paid_at: string | null;
};

export type MonthlyFinance = {
  month: string; // YYYY-MM
  revenue: number; // Τζίρος
  collections: number; // Εισπράξεις
};

const isRevenueInvoice = (status: string): boolean =>
  (REVENUE_STATUSES as readonly string[]).includes(status);

const monthOf = (date: string): string => date.substring(0, 7); // YYYY-MM

/**
 * Buckets invoices into monthly Revenue and Collections series, merged on month
 * and sorted chronologically. An invoice can contribute to both series in
 * different months (issued one month, paid another).
 */
export function bucketMonthlyFinance(invoices: FinanceInvoice[]): MonthlyFinance[] {
  const buckets = new Map<string, { revenue: number; collections: number }>();

  const bucketFor = (month: string) => {
    let bucket = buckets.get(month);
    if (!bucket) {
      bucket = { revenue: 0, collections: 0 };
      buckets.set(month, bucket);
    }
    return bucket;
  };

  for (const invoice of invoices) {
    const total = invoice.total ?? 0;

    if (invoice.issue_date && isRevenueInvoice(invoice.status)) {
      bucketFor(monthOf(invoice.issue_date)).revenue += total;
    }

    if (invoice.status === 'paid' && invoice.paid_at) {
      bucketFor(monthOf(invoice.paid_at)).collections += total;
    }
  }

  return [...buckets.entries()]
    .map(([month, { revenue, collections }]) => ({ month, revenue, collections }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
