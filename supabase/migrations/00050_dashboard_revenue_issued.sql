-- =====================================================================
-- Migration 00050 — Dashboard Revenue (Τζίρος) alongside Collections
-- Purpose: Surface the accrual figure on the dashboard cockpit. The
--          aggregate RPCs from 00045 only computed Collections (paid
--          invoices by paid_at). This migration ADDS Revenue (issued
--          invoices — status sent/viewed/paid/overdue — by issue_date)
--          to get_dashboard_kpi and get_business_velocity. The existing
--          Collections keys are kept unchanged so no consumer breaks.
--
-- Mirrors the rules in src/lib/finance.ts (see PRD
--   docs/prd/revenue-by-issue-date.md and ADR 0002). REVENUE_STATUSES =
--   sent | viewed | paid | overdue (excludes draft/cancelled).
--
-- get_revenue_forecast is intentionally NOT touched (forward-looking).
-- Security: SECURITY DEFINER + is_admin() guard, same as 00045.
-- Risk: low — additive, no data writes, reversible by re-running 00045.
-- Created: 2026-06-04
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_dashboard_kpi(p_today) — adds revenue_issued_{current,prev,daily}
--   (Revenue/Τζίρος by issue_date) next to the existing revenue_*
--   (Collections/Εισπράξεις by paid_at) keys.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_dashboard_kpi(p_today date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_today)::date;
  v_prev_month_start date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_thirty_ago date := p_today - interval '30 days';
  v_sixty_ago date := p_today - interval '60 days';

  v_revenue_current numeric;      -- Collections (paid by paid_at), MTD
  v_revenue_prev numeric;
  v_daily jsonb;                  -- Collections daily sparkline

  v_revenue_issued_current numeric;  -- Revenue (issued by issue_date), MTD
  v_revenue_issued_prev numeric;
  v_issued_daily jsonb;              -- Revenue daily sparkline

  v_pipeline_value numeric;
  v_active_count integer;
  v_profit_current numeric;
  v_profit_prev numeric;
  v_cash_overdue numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Collections (Εισπράξεις): paid invoices by paid_at
  SELECT COALESCE(SUM(total), 0) INTO v_revenue_current
  FROM public.invoices
  WHERE status = 'paid' AND paid_at >= v_month_start;

  SELECT COALESCE(SUM(total), 0) INTO v_revenue_prev
  FROM public.invoices
  WHERE status = 'paid'
    AND paid_at >= v_prev_month_start
    AND paid_at < v_month_start;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'value', v) ORDER BY d), '[]'::jsonb)
    INTO v_daily
  FROM (
    SELECT (paid_at::date)::text AS d, SUM(total)::numeric AS v
    FROM public.invoices
    WHERE status = 'paid' AND paid_at >= v_thirty_ago
    GROUP BY paid_at::date
  ) buckets;

  -- Revenue (Τζίρος): issued invoices (excl. draft/cancelled) by issue_date
  SELECT COALESCE(SUM(total), 0) INTO v_revenue_issued_current
  FROM public.invoices
  WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
    AND issue_date >= v_month_start;

  SELECT COALESCE(SUM(total), 0) INTO v_revenue_issued_prev
  FROM public.invoices
  WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
    AND issue_date >= v_prev_month_start
    AND issue_date < v_month_start;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'value', v) ORDER BY d), '[]'::jsonb)
    INTO v_issued_daily
  FROM (
    SELECT (issue_date)::text AS d, SUM(total)::numeric AS v
    FROM public.invoices
    WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
      AND issue_date >= v_thirty_ago
    GROUP BY issue_date
  ) buckets;

  SELECT COALESCE(SUM(deal_value * (probability / 100.0)), 0) INTO v_pipeline_value
  FROM public.leads
  WHERE stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation');

  SELECT COUNT(*) INTO v_active_count
  FROM public.projects
  WHERE status NOT IN ('delivered', 'archived');

  SELECT margin INTO v_profit_current
  FROM public.get_profit_margin_window(v_thirty_ago, p_today);

  SELECT margin INTO v_profit_prev
  FROM public.get_profit_margin_window(v_sixty_ago, v_thirty_ago);

  SELECT COALESCE(SUM(total), 0) INTO v_cash_overdue
  FROM public.invoices
  WHERE status = 'overdue'
     OR (status IN ('sent', 'viewed') AND due_date < p_today);

  RETURN jsonb_build_object(
    'revenue_current', v_revenue_current,
    'revenue_prev', v_revenue_prev,
    'revenue_daily', v_daily,
    'revenue_issued_current', v_revenue_issued_current,
    'revenue_issued_prev', v_revenue_issued_prev,
    'revenue_issued_daily', v_issued_daily,
    'pipeline_value', v_pipeline_value,
    'active_count', v_active_count,
    'profit_margin_current', v_profit_current,
    'profit_margin_prev', v_profit_prev,
    'cash_overdue', v_cash_overdue
  );
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_kpi IS
  'Aggregated KPI hero metrics in one call. Revenue (issued by issue_date) + Collections (paid by paid_at). Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpi(date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_business_velocity(p_period_days) — adds invoices_issued_{now,prev}_sum
--   (Revenue/Τζίρος by issue_date) next to invoices_paid_* (Collections).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_business_velocity(p_period_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_from timestamptz := now() - (p_period_days || ' days')::interval;
  v_previous_from timestamptz := now() - (p_period_days * 2 || ' days')::interval;

  v_p_created_now integer;
  v_p_created_prev integer;
  v_p_delivered_now integer;
  v_p_delivered_prev integer;
  v_i_paid_now_count integer;
  v_i_paid_prev_count integer;
  v_i_paid_now_sum numeric;
  v_i_issued_now_sum numeric;
  v_i_issued_prev_sum numeric;
  v_c_signed_now integer;
  v_c_signed_prev integer;
  v_pr_sent_now integer;
  v_pr_sent_prev integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_p_created_now
  FROM public.projects WHERE created_at >= v_current_from;

  SELECT COUNT(*) INTO v_p_created_prev
  FROM public.projects
  WHERE created_at >= v_previous_from AND created_at < v_current_from;

  SELECT COUNT(*) INTO v_p_delivered_now
  FROM public.projects
  WHERE status = 'delivered' AND updated_at >= v_current_from;

  SELECT COUNT(*) INTO v_p_delivered_prev
  FROM public.projects
  WHERE status = 'delivered'
    AND updated_at >= v_previous_from
    AND updated_at < v_current_from;

  -- Collections (Εισπράξεις): paid invoices by paid_at
  SELECT COUNT(*), COALESCE(SUM(total), 0)
    INTO v_i_paid_now_count, v_i_paid_now_sum
  FROM public.invoices
  WHERE status = 'paid' AND paid_at >= v_current_from;

  SELECT COUNT(*) INTO v_i_paid_prev_count
  FROM public.invoices
  WHERE status = 'paid'
    AND paid_at >= v_previous_from
    AND paid_at < v_current_from;

  -- Revenue (Τζίρος): issued invoices (excl. draft/cancelled) by issue_date
  SELECT COALESCE(SUM(total), 0) INTO v_i_issued_now_sum
  FROM public.invoices
  WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
    AND issue_date >= v_current_from::date;

  SELECT COALESCE(SUM(total), 0) INTO v_i_issued_prev_sum
  FROM public.invoices
  WHERE status IN ('sent', 'viewed', 'paid', 'overdue')
    AND issue_date >= v_previous_from::date
    AND issue_date < v_current_from::date;

  SELECT COUNT(*) INTO v_c_signed_now
  FROM public.contracts
  WHERE status = 'signed' AND signed_at >= v_current_from;

  SELECT COUNT(*) INTO v_c_signed_prev
  FROM public.contracts
  WHERE status = 'signed'
    AND signed_at >= v_previous_from
    AND signed_at < v_current_from;

  SELECT COUNT(*) INTO v_pr_sent_now
  FROM public.proposals
  WHERE status = 'sent' AND sent_at >= v_current_from;

  SELECT COUNT(*) INTO v_pr_sent_prev
  FROM public.proposals
  WHERE status = 'sent'
    AND sent_at >= v_previous_from
    AND sent_at < v_current_from;

  RETURN jsonb_build_object(
    'projects_created_now', v_p_created_now,
    'projects_created_prev', v_p_created_prev,
    'projects_delivered_now', v_p_delivered_now,
    'projects_delivered_prev', v_p_delivered_prev,
    'invoices_paid_now_count', v_i_paid_now_count,
    'invoices_paid_prev_count', v_i_paid_prev_count,
    'invoices_paid_now_sum', v_i_paid_now_sum,
    'invoices_issued_now_sum', v_i_issued_now_sum,
    'invoices_issued_prev_sum', v_i_issued_prev_sum,
    'contracts_signed_now', v_c_signed_now,
    'contracts_signed_prev', v_c_signed_prev,
    'proposals_sent_now', v_pr_sent_now,
    'proposals_sent_prev', v_pr_sent_prev
  );
END;
$$;

COMMENT ON FUNCTION public.get_business_velocity IS
  'Velocity counters with previous-period delta in one call. Adds Revenue (issued by issue_date) next to Collections (paid). Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_business_velocity(integer) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
