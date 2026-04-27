-- =====================================================================
-- Migration 00046 — Dashboard RPCs use Europe/Athens for date casts
-- Purpose: The dashboard query layer now treats "today", "this month"
--          and the sparkline buckets in Athens local time. The RPCs in
--          00045 used UTC casts (paid_at::date, CURRENT_DATE) which
--          drifted by up to 3 hours and produced wrong-day numbers
--          near midnight Athens.
-- Created: 2026-04-27
-- Risk: low — CREATE OR REPLACE only on two functions, no schema change.
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_dashboard_kpi(p_today)
--   Sparkline now buckets by Athens-local date (paid_at AT TIME ZONE).
--   Other branches already use p_today which the app sends as Athens.
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

  v_revenue_current numeric;
  v_revenue_prev numeric;
  v_pipeline_value numeric;
  v_active_count integer;
  v_profit_current numeric;
  v_profit_prev numeric;
  v_cash_overdue numeric;
  v_daily jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

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
    SELECT
      ((paid_at AT TIME ZONE 'Europe/Athens')::date)::text AS d,
      SUM(total)::numeric AS v
    FROM public.invoices
    WHERE status = 'paid' AND paid_at >= v_thirty_ago
    GROUP BY (paid_at AT TIME ZONE 'Europe/Athens')::date
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
    'pipeline_value', v_pipeline_value,
    'active_count', v_active_count,
    'profit_margin_current', v_profit_current,
    'profit_margin_prev', v_profit_prev,
    'cash_overdue', v_cash_overdue
  );
END;
$$;

-- ---------------------------------------------------------------------
-- get_sales_funnel()
--   "Won last 30 days" now anchored at Athens-today, not session UTC.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_sales_funnel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athens_today date := (now() AT TIME ZONE 'Europe/Athens')::date;
  v_filming integer;
  v_leads_open integer;
  v_proposals integer;
  v_won integer;
  v_active integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_filming
  FROM public.filming_requests WHERE status = 'pending';

  SELECT COUNT(*) INTO v_leads_open
  FROM public.leads
  WHERE stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation');

  SELECT COUNT(*) INTO v_proposals
  FROM public.proposals WHERE status = 'sent';

  SELECT COUNT(*) INTO v_won
  FROM public.leads
  WHERE stage = 'won' AND updated_at >= (v_athens_today - interval '30 days');

  SELECT COUNT(*) INTO v_active
  FROM public.projects WHERE status NOT IN ('delivered', 'archived');

  RETURN jsonb_build_object(
    'filming_requests', v_filming,
    'leads_open', v_leads_open,
    'proposals_sent', v_proposals,
    'won', v_won,
    'active_projects', v_active
  );
END;
$$;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
