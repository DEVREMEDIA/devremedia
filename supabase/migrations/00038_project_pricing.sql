-- =====================================================================
-- Migration: 00038_project_pricing.sql
-- Description: Adds pricing-analysis fields to projects.
--              - shooting_hours / editing_hours: user-entered effort
--              - cost_per_hour_snapshot: frozen cost/hour at time of quote,
--                so pricing analysis on old projects doesn't shift when the
--                cost model is edited later.
--              - quoted_price: the price offered to the client (independent
--                of invoices, which are generated later).
-- Created: 2026-04-24
-- =====================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS shooting_hours          numeric(8,2),
  ADD COLUMN IF NOT EXISTS editing_hours           numeric(8,2),
  ADD COLUMN IF NOT EXISTS cost_per_hour_snapshot  numeric(10,2),
  ADD COLUMN IF NOT EXISTS quoted_price            numeric(12,2);

COMMENT ON COLUMN public.projects.shooting_hours IS
  'Billable shooting hours for this project (admin-entered).';
COMMENT ON COLUMN public.projects.editing_hours IS
  'Billable editing/post hours for this project (admin-entered).';
COMMENT ON COLUMN public.projects.cost_per_hour_snapshot IS
  'Cost/hour at the time the quote was built. Frozen — does not shift when cost_model is edited.';
COMMENT ON COLUMN public.projects.quoted_price IS
  'Price offered to the client for this project. Independent from invoice amounts.';

CREATE INDEX IF NOT EXISTS idx_projects_cost_per_hour_snapshot
  ON public.projects(cost_per_hour_snapshot)
  WHERE cost_per_hour_snapshot IS NOT NULL;
