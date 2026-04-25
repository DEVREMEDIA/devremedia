-- =====================================================================
-- Migration 00043 — cost_settings.dashboard_thresholds
-- Purpose: Configurable thresholds for dashboard risk panel and KPI
--          exception flags. Singleton cost_settings row id=1.
-- Created: 2026-04-25
-- =====================================================================

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS dashboard_thresholds jsonb NOT NULL DEFAULT '{
    "stale_lead_days": 14,
    "stale_deliverable_days": 7,
    "stale_contract_days": 14,
    "deadline_risk_days": 7,
    "active_projects_warn_above": 50
  }'::jsonb;

COMMENT ON COLUMN public.cost_settings.dashboard_thresholds IS
  'Dashboard risk + exception thresholds, editable from /admin/cost-model.';

-- =====================================================================
-- Profit margin RPC for dashboard hero KPI (used by getKpiHero)
-- Returns: rolling-window margin = (revenue - expenses) / revenue
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_profit_margin_window(p_from date, p_to date)
RETURNS TABLE(margin numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN COALESCE(SUM(i.total), 0) = 0 THEN 0
      ELSE (
        COALESCE(SUM(i.total), 0) - COALESCE((
          SELECT SUM(amount) FROM expenses
          WHERE date >= p_from AND date < p_to
        ), 0)
      ) / NULLIF(SUM(i.total), 0)
    END
  FROM invoices i
  WHERE i.status = 'paid'
    AND i.paid_at >= p_from
    AND i.paid_at < p_to;
$$;
