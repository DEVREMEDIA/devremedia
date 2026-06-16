-- =====================================================================
-- Migration 00052 — Reports aggregate RPCs (Phase 2 / issue #32)
-- Purpose: Move the four reports aggregations off "pull all rows, group in
--          memory" onto SQL aggregate RPCs, mirroring src/lib/queries/reports.ts
--          and src/lib/finance.ts exactly (ADR-0002). No number changes.
--          Pattern matches 00045/00050: SECURITY DEFINER + is_admin() guard,
--          jsonb result, additive CREATE OR REPLACE.
--
-- Date params are nullable `date` (null => no range). Callers pass yyyy-MM-dd
-- strings (see date-range-filter.tsx), so the date<->timestamptz comparison
-- semantics match the previous PostgREST string comparisons, including the
-- existing paid_at day-boundary behavior.
--
-- Risk: low — read-only, additive, reversible by DROP FUNCTION.
-- Created: 2026-06-16
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_top_clients_by_revenue(p_limit, p_from, p_to)
--   Mirrors getTopClientsByRevenue + sumFinance. Revenue (Τζίρος) =
--   issued invoices (status sent/viewed/paid/overdue) summed by total where
--   issue_date is present; Collections (Εισπράξεις) = paid invoices by paid_at.
--   project_count mirrors the TS quirk: it is the invoice count for the client.
--   Date filter is the same OR as the TS query: issued in range OR paid in range.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_clients_by_revenue(
  p_limit integer DEFAULT 10,
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

  WITH per_client AS (
    SELECT
      i.client_id,
      COALESCE(NULLIF(c.company_name, ''), NULLIF(c.contact_name, ''), 'Unknown') AS client_name,
      COALESCE(SUM(i.total) FILTER (WHERE i.issue_date IS NOT NULL), 0) AS total_revenue,
      COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid' AND i.paid_at IS NOT NULL), 0) AS total_collections,
      COUNT(*) AS project_count
    FROM public.invoices i
    LEFT JOIN public.clients c ON c.id = i.client_id
    WHERE i.status IN ('sent', 'viewed', 'paid', 'overdue')
      AND (
        p_from IS NULL OR p_to IS NULL
        OR (i.issue_date >= p_from AND i.issue_date <= p_to)
        OR (i.paid_at >= p_from AND i.paid_at <= p_to)
      )
    GROUP BY i.client_id, COALESCE(NULLIF(c.company_name, ''), NULLIF(c.contact_name, ''), 'Unknown')
  ),
  top AS (
    SELECT * FROM per_client
    ORDER BY total_revenue DESC
    LIMIT GREATEST(p_limit, 0)
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'client_id', client_id,
        'client_name', client_name,
        'total_revenue', total_revenue,
        'total_collections', total_collections,
        'project_count', project_count
      )
      ORDER BY total_revenue DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM top;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_top_clients_by_revenue IS
  'Top clients by Revenue (Τζίρος, issued by issue_date) with Collections. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_top_clients_by_revenue(integer, date, date) TO authenticated;

-- NOTE: getPaymentMethodBreakdown is intentionally NOT converted here. The report
-- is non-functional independent of this phase (invoices.payment_method is never
-- written by the app, and the old TS read a non-existent `metadata` column). Tracked
-- as a separate follow-up; #32 is perf-only and leaves that function unchanged.

-- ---------------------------------------------------------------------
-- get_project_type_breakdown(p_from, p_to) — non-archived projects grouped
--   by project_type. Mirrors getProjectTypeBreakdown.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_type_breakdown(
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

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('type', project_type, 'count', cnt)),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT p.project_type, COUNT(*) AS cnt
    FROM public.projects p
    WHERE p.status <> 'archived'
      AND (p_from IS NULL OR p_to IS NULL OR (p.created_at >= p_from AND p.created_at <= p_to))
    GROUP BY p.project_type
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_project_type_breakdown IS
  'Non-archived projects grouped by project_type. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_project_type_breakdown(date, date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_expenses_by_category(p_from, p_to) — expenses grouped by category.
--   Mirrors getExpensesByCategory.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_expenses_by_category(
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

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('category', category, 'amount', amount, 'count', cnt)),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT e.category, COALESCE(SUM(e.amount), 0) AS amount, COUNT(*) AS cnt
    FROM public.expenses e
    WHERE (p_from IS NULL OR p_to IS NULL OR (e.date >= p_from AND e.date <= p_to))
    GROUP BY e.category
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_expenses_by_category IS
  'Expenses grouped by category. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_expenses_by_category(date, date) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
