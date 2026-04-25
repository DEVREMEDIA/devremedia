-- =====================================================================
-- Migration 00045 — Dashboard aggregate RPCs (additive, no app changes)
-- Purpose: Collapse the heterogeneous count/sum query batches issued by
--          getKpiHero (8 queries), getSalesFunnel (5), getRevenueForecast
--          (3), and getBusinessVelocity (10) into a single round-trip
--          each. Each RPC returns JSONB shaped to the existing dashboard
--          types; the application keeps using the old query paths until
--          PR4 flips a feature flag.
--
-- Security: SECURITY DEFINER + explicit is_admin() guard at the top of
--           every function. Only admins/super_admins can call them.
-- Risk: low — pure additions, no data writes, reversible via DROP FUNCTION.
-- Created: 2026-04-25
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_dashboard_kpi(p_today)
-- Returns: JSONB with revenue MTD, prev MTD, daily sparkline buckets,
--          weighted pipeline, active project count, profit margin
--          (rolling 30d + previous 30d), cash overdue total.
-- Replaces: 8 supabase queries inside src/lib/queries/dashboard/kpi-hero.ts
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
    SELECT (paid_at::date)::text AS d, SUM(total)::numeric AS v
    FROM public.invoices
    WHERE status = 'paid' AND paid_at >= v_thirty_ago
    GROUP BY paid_at::date
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

COMMENT ON FUNCTION public.get_dashboard_kpi IS
  'Aggregated KPI hero metrics in one call. Replaces 8 round-trips. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpi(date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_sales_funnel()
-- Returns: JSONB array of stage counts: filming_requests, leads_open,
--          proposals_sent, won (last 30d), active_projects.
-- Replaces: 5 supabase queries inside src/lib/queries/dashboard/sales.ts
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_sales_funnel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  WHERE stage = 'won' AND updated_at >= (CURRENT_DATE - interval '30 days');

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

COMMENT ON FUNCTION public.get_sales_funnel IS
  'Sales funnel stage counts in one call. Replaces 5 round-trips. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_sales_funnel() TO authenticated;

-- ---------------------------------------------------------------------
-- get_revenue_forecast(p_today)
-- Returns: JSONB with confirmed (sent/viewed invoices due within 30d),
--          likely (weighted leads expected to close 30-90d),
--          pipeline (raw open lead deal_value).
-- Replaces: 3 supabase queries inside src/lib/queries/dashboard/sales.ts
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_revenue_forecast(p_today date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in30 date := p_today + interval '30 days';
  v_in90 date := p_today + interval '90 days';
  v_confirmed numeric;
  v_likely numeric;
  v_pipeline numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(total), 0) INTO v_confirmed
  FROM public.invoices
  WHERE status IN ('sent', 'viewed')
    AND due_date >= p_today
    AND due_date <= v_in30;

  SELECT COALESCE(SUM(deal_value * (probability / 100.0)), 0) INTO v_likely
  FROM public.leads
  WHERE stage IN ('proposal', 'negotiation')
    AND expected_close_date >= v_in30
    AND expected_close_date <= v_in90;

  SELECT COALESCE(SUM(deal_value), 0) INTO v_pipeline
  FROM public.leads
  WHERE stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation');

  RETURN jsonb_build_object(
    'confirmed', v_confirmed,
    'likely', v_likely,
    'pipeline', v_pipeline
  );
END;
$$;

COMMENT ON FUNCTION public.get_revenue_forecast IS
  'Forecast aggregates in one call. Replaces 3 round-trips. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_revenue_forecast(date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_business_velocity(p_period_days)
-- Returns: JSONB of counters {now, prev, sum?} for projects created,
--          projects delivered, invoices paid (count + sum), contracts
--          signed, proposals sent — current vs previous period.
-- Replaces: 10 supabase queries inside src/lib/queries/dashboard/velocity.ts
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

  SELECT COUNT(*), COALESCE(SUM(total), 0)
    INTO v_i_paid_now_count, v_i_paid_now_sum
  FROM public.invoices
  WHERE status = 'paid' AND paid_at >= v_current_from;

  SELECT COUNT(*) INTO v_i_paid_prev_count
  FROM public.invoices
  WHERE status = 'paid'
    AND paid_at >= v_previous_from
    AND paid_at < v_current_from;

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
    'contracts_signed_now', v_c_signed_now,
    'contracts_signed_prev', v_c_signed_prev,
    'proposals_sent_now', v_pr_sent_now,
    'proposals_sent_prev', v_pr_sent_prev
  );
END;
$$;

COMMENT ON FUNCTION public.get_business_velocity IS
  'Velocity counters with previous-period delta in one call. Replaces 10 round-trips. Admin-only.';

GRANT EXECUTE ON FUNCTION public.get_business_velocity(integer) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
