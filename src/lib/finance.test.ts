import { describe, it, expect } from 'vitest';
import { bucketMonthlyFinance, sumFinance, REVENUE_STATUSES, type FinanceInvoice } from './finance';

const invoice = (overrides: Partial<FinanceInvoice>): FinanceInvoice => ({
  total: 100,
  status: 'sent',
  issue_date: '2026-01-15',
  paid_at: null,
  ...overrides,
});

describe('bucketMonthlyFinance', () => {
  it('returns an empty array for empty input', () => {
    expect(bucketMonthlyFinance([])).toEqual([]);
  });

  it('counts an issued-then-paid invoice in Revenue by issue month and Collections by paid month', () => {
    const result = bucketMonthlyFinance([
      invoice({ status: 'paid', issue_date: '2026-01-20', paid_at: '2026-03-05', total: 500 }),
    ]);

    expect(result).toEqual([
      { month: '2026-01', revenue: 500, collections: 0 },
      { month: '2026-03', revenue: 0, collections: 500 },
    ]);
  });

  it('excludes draft and cancelled invoices from Revenue', () => {
    const result = bucketMonthlyFinance([
      invoice({ status: 'draft', issue_date: '2026-02-10', total: 999 }),
      invoice({ status: 'cancelled', issue_date: '2026-02-11', total: 999 }),
    ]);

    expect(result).toEqual([]);
  });

  it('counts unpaid sent/overdue invoices in Revenue but not Collections', () => {
    const result = bucketMonthlyFinance([
      invoice({ status: 'sent', issue_date: '2026-02-01', paid_at: null, total: 200 }),
      invoice({ status: 'overdue', issue_date: '2026-02-15', paid_at: null, total: 300 }),
    ]);

    expect(result).toEqual([{ month: '2026-02', revenue: 500, collections: 0 }]);
  });

  it('buckets across multiple months and sorts chronologically', () => {
    const result = bucketMonthlyFinance([
      invoice({ status: 'paid', issue_date: '2026-03-10', paid_at: '2026-03-10', total: 100 }),
      invoice({ status: 'paid', issue_date: '2026-01-10', paid_at: '2026-01-10', total: 50 }),
      invoice({ status: 'sent', issue_date: '2026-02-10', paid_at: null, total: 25 }),
    ]);

    expect(result).toEqual([
      { month: '2026-01', revenue: 50, collections: 50 },
      { month: '2026-02', revenue: 25, collections: 0 },
      { month: '2026-03', revenue: 100, collections: 100 },
    ]);
  });

  it('treats a null total as zero and ignores invoices with missing dates', () => {
    const result = bucketMonthlyFinance([
      invoice({ status: 'paid', issue_date: '2026-01-05', paid_at: '2026-01-05', total: null }),
      invoice({ status: 'paid', issue_date: null, paid_at: null, total: 100 }),
    ]);

    expect(result).toEqual([{ month: '2026-01', revenue: 0, collections: 0 }]);
  });
});

describe('sumFinance', () => {
  it('returns zeroed totals for empty input', () => {
    expect(sumFinance([])).toEqual({ revenue: 0, collections: 0 });
  });

  it('sums Revenue from issued invoices and Collections from paid invoices', () => {
    const result = sumFinance([
      invoice({ status: 'paid', paid_at: '2026-02-01', total: 100 }), // revenue + collections
      invoice({ status: 'sent', paid_at: null, total: 50 }), // revenue only
      invoice({ status: 'overdue', paid_at: null, total: 25 }), // revenue only
    ]);

    expect(result).toEqual({ revenue: 175, collections: 100 });
  });

  it('excludes draft and cancelled from Revenue', () => {
    const result = sumFinance([
      invoice({ status: 'draft', total: 999 }),
      invoice({ status: 'cancelled', total: 999 }),
      invoice({ status: 'sent', paid_at: null, total: 10 }),
    ]);

    expect(result).toEqual({ revenue: 10, collections: 0 });
  });

  it('treats null totals as zero', () => {
    expect(sumFinance([invoice({ status: 'paid', total: null })])).toEqual({
      revenue: 0,
      collections: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Shared fixture — the single source of truth for the Revenue/Collections rule
//
// These fixtures and expected values are the contract between the TS
// bucketMonthlyFinance/sumFinance functions and the get_monthly_revenue /
// get_profit_margin SQL RPCs (migration 00053).  If the rule changes, update
// ALL THREE places and keep this describe block passing.
//
// ADR-0002: Revenue (Τζίρος) = status in REVENUE_STATUSES, bucketed by
//           issue_date.  Collections (Εισπράξεις) = status 'paid', bucketed
//           by paid_at.
// ---------------------------------------------------------------------------

// Canonical invoices — the same rows the SQL RPC would receive.
const SHARED_FIXTURES: FinanceInvoice[] = [
  { total: 500, status: 'sent', issue_date: '2026-01-10', paid_at: null },
  { total: 300, status: 'paid', issue_date: '2026-01-15', paid_at: '2026-01-20' },
  { total: 200, status: 'overdue', issue_date: '2026-02-05', paid_at: null },
  { total: 100, status: 'viewed', issue_date: '2026-02-10', paid_at: null },
  { total: 999, status: 'draft', issue_date: '2026-01-01', paid_at: null }, // excluded from Revenue
  { total: 50, status: 'paid', issue_date: '2026-01-25', paid_at: '2026-03-01' }, // Revenue Jan, Collections Mar
];

describe('REVENUE_STATUSES — ADR-0002 contract', () => {
  it('is exactly the four non-terminal statuses (sent, viewed, paid, overdue)', () => {
    expect([...REVENUE_STATUSES].sort()).toEqual(['overdue', 'paid', 'sent', 'viewed']);
  });
});

describe('Shared fixture — bucketMonthlyFinance matches get_monthly_revenue RPC', () => {
  it('produces canonical monthly Revenue + Collections series', () => {
    // Jan: revenue = 500 (sent) + 300 (paid) + 50 (paid, issued Jan) = 850
    //      collections = 300 (paid Jan 20)
    // Feb: revenue = 200 (overdue) + 100 (viewed) = 300
    //      collections = 0
    // Mar: revenue = 0
    //      collections = 50 (paid Mar 1)
    // draft (999) excluded from all buckets.
    expect(bucketMonthlyFinance(SHARED_FIXTURES)).toEqual([
      { month: '2026-01', revenue: 850, collections: 300 },
      { month: '2026-02', revenue: 300, collections: 0 },
      { month: '2026-03', revenue: 0, collections: 50 },
    ]);
  });
});

describe('Shared fixture — sumFinance matches get_profit_margin RPC', () => {
  it('produces canonical Revenue + Collections totals', () => {
    // Revenue = 500 + 300 + 200 + 100 + 50 = 1150 (draft 999 excluded)
    // Collections = 300 + 50 = 350
    expect(sumFinance(SHARED_FIXTURES)).toEqual({ revenue: 1150, collections: 350 });
  });
});
