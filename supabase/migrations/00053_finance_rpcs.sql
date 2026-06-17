-- =====================================================================
-- Migration 00053 — Finance RPCs (Phase 5 / issue #36)
-- Purpose: Make the SQL RPCs the single owner of the Revenue/Collections
--          rule, so that reports.ts can drop its inline filter and call
--          these functions instead.  Removes the "third copy" of the rule.
--
-- ADR-0002: Revenue (Τζίρος) = invoices with status IN ('sent','viewed',
--           'paid','overdue'), bucketed by issue_date.
--           Collections (Εισπράξεις) = paid invoices, bucketed by paid_at.
--
--   get_monthly_revenue(p_from, p_to)
--     Returns: jsonb array [{month:"YYYY-MM", revenue:n, collections:n}]
--     Mirrors the TS: bucketMonthlyFinance(invoices) filtered to range.
--     paid_at grouped using UTC to match the TS substring(0,7) behaviour.
--
--   get_profit_margin(p_from, p_to)
--     Returns: jsonb {revenue:n, expenses:n, profit:n, margin:n}
--     Mirrors the TS: sumFinance(invoices).revenue + expense aggregation.
--     Revenue filtered by issue_date only (accrual vs accrual, per ADR-0002).
--
-- Risk: low — read-only, additive, reversible by DROP FUNCTION.
-- Security: SECURITY DEFINER + is_admin() guard (same as 00045/00052).
-- Created: 2026-06-18
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_monthly_revenue(p_from, p_to)
-- Equivalent TS:
--   const data = await supabase.from('invoices')
--     .select('total, status, issue_date, paid_at')
--     .in('status', REVENUE_STATUSES)
--     .or(`and(issue_date.gte.${from},issue_date.lte.${to}),
--          and(paid_at.gte.${from},paid_at.lte.${to})`);
--   const monthly = bucketMonthlyFinance(data);
--   return monthly.filter(m => m.month >= fromMonth && m.month <= toMonth);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH candidates AS (
    -- Invoices that touch the date range (issued in range OR paid in range).
    -- paid_at cast to UTC date to match the TS substring(0,7) behaviour.
    SELECT
      COALESCE(total, 0)::numeric AS total,
      status,
      issue_date,
      (paid_at AT TIME ZONE 'UTC')::date AS paid_date
    FROM public.invoices
    WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
      AND (
        p_from IS NULL OR p_to IS NULL
        OR (issue_date IS NOT NULL AND issue_date >= p_from AND issue_date <= p_to)
        OR ((paid_at AT TIME ZONE 'UTC')::date >= p_from AND (paid_at AT TIME ZONE 'UTC')::date <= p_to)
      )
  ),
  -- Revenue (Τζίρος): issued invoices bucketed by issue_date month
  revenue_buckets AS (
    SELECT to_char(issue_date, 'YYYY-MM') AS month,
           SUM(total) AS revenue
    FROM candidates
    WHERE issue_date IS NOT NULL
    GROUP BY to_char(issue_date, 'YYYY-MM')
  ),
  -- Collections (Εισπράξεις): paid invoices bucketed by paid_at month
  collections_buckets AS (
    SELECT to_char(paid_date, 'YYYY-MM') AS month,
           SUM(total) AS collections
    FROM candidates
    WHERE status = 'paid' AND paid_date IS NOT NULL
    GROUP BY to_char(paid_date, 'YYYY-MM')
  ),
  -- Full-outer-join so months with only Revenue or only Collections appear
  merged AS (
    SELECT
      COALESCE(r.month, c.month) AS month,
      COALESCE(r.revenue, 0)::numeric     AS revenue,
      COALESCE(c.collections, 0)::numeric AS collections
    FROM revenue_buckets r
    FULL OUTER JOIN collections_buckets c ON r.month = c.month
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('month', month, 'revenue', revenue, 'collections', collections)
      ORDER BY month
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM merged
  -- Drop stray buckets outside the requested range (an invoice issued in-range
  -- but paid out-of-range, or vice versa, can create an extra bucket).
  WHERE p_from IS NULL OR p_to IS NULL
    OR (month >= to_char(p_from, 'YYYY-MM') AND month <= to_char(p_to, 'YYYY-MM'));

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_revenue IS
  'Monthly Revenue (Τζίρος, by issue_date) + Collections (Εισπράξεις, by paid_at). '
  'Single owner of the ADR-0002 Revenue/Collections rule for the reports page. '
  'Mirrors finance.ts bucketMonthlyFinance. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_monthly_revenue(date, date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_profit_margin(p_from, p_to)
-- Equivalent TS:
--   const invoices = await supabase.from('invoices')
--     .select('total, status, issue_date, paid_at')
--     .in('status', REVENUE_STATUSES)
--     .gte('issue_date', from).lte('issue_date', to);
--   const { revenue } = sumFinance(invoices);
--   const expenses = sum(await supabase.from('expenses').select('amount')...);
--   const profit = revenue - expenses;
--   const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
-- Note: issue_date filter only (accrual vs accrual), not paid_at — per ADR-0002.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profit_margin(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue  numeric;
  v_expenses numeric;
  v_profit   numeric;
  v_margin   numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Revenue (Τζίρος): issued invoices filtered by issue_date
  -- issue_date IS NOT NULL mirrors the sumFinance(invoice.issue_date &&) check
  SELECT COALESCE(SUM(total), 0)
  INTO v_revenue
  FROM public.invoices
  WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
    AND issue_date IS NOT NULL
    AND (p_from IS NULL OR p_to IS NULL OR (issue_date >= p_from AND issue_date <= p_to));

  -- Expenses for the same period (date column is a date, no tz conversion needed)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM public.expenses
  WHERE (p_from IS NULL OR p_to IS NULL OR (date >= p_from AND date <= p_to));

  v_profit := v_revenue - v_expenses;
  v_margin := CASE WHEN v_revenue > 0 THEN (v_profit / v_revenue) * 100 ELSE 0 END;

  RETURN jsonb_build_object(
    'revenue',  v_revenue,
    'expenses', v_expenses,
    'profit',   v_profit,
    'margin',   v_margin
  );
END;
$$;

COMMENT ON FUNCTION public.get_profit_margin IS
  'Profit margin: Revenue (Τζίρος, by issue_date) minus Expenses for the same period. '
  'Mirrors finance.ts sumFinance + the getProfitMargin query. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_profit_margin(date, date) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
