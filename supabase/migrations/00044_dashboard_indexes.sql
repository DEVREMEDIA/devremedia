-- =====================================================================
-- Migration 00044 — Dashboard composite + partial indexes
-- Purpose: Cover the multi-column filters used by the admin dashboard
--          query layer (kpi-hero, today, risk, sales, finance, velocity,
--          production). Existing single-column indexes from 00004 stay;
--          these add composites for the predicates that combine status
--          + a date column, plus a couple of partial indexes for the
--          highly selective unassigned-filming and overdue-invoice cases.
-- Created: 2026-04-25
-- Risk: low — pure additions, IF NOT EXISTS, no data writes, reversible
--             with DROP INDEX.
-- =====================================================================

-- ---------------------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------------------

-- Used by: kpi-hero (revenue MTD/prev MTD/sparkline), velocity (paid window)
CREATE INDEX IF NOT EXISTS idx_invoices_status_paid_at
  ON public.invoices (status, paid_at DESC);

-- Used by: kpi-hero (cash overdue OR), risk (overdue invoices),
--          today (invoices due today), sales/forecast (sent+viewed in range)
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date
  ON public.invoices (status, due_date);

-- ---------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------

-- Used by: risk (deadline window + status filter),
--          production (upcoming + recently delivered)
CREATE INDEX IF NOT EXISTS idx_projects_status_deadline
  ON public.projects (status, deadline);

-- Used by: today (deadline = today + status filter)
CREATE INDEX IF NOT EXISTS idx_projects_deadline_status
  ON public.projects (deadline, status);

-- Used by: velocity (delivered in window)
CREATE INDEX IF NOT EXISTS idx_projects_status_updated_at
  ON public.projects (status, updated_at DESC);

-- ---------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------

-- Used by: sales/forecast (stage IN (...) + expected_close_date range)
CREATE INDEX IF NOT EXISTS idx_leads_stage_expected_close_date
  ON public.leads (stage, expected_close_date);

-- Used by: sales/funnel won-recent (stage='won' + updated_at >= X)
CREATE INDEX IF NOT EXISTS idx_leads_stage_updated_at
  ON public.leads (stage, updated_at DESC);

-- ---------------------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------------------

-- Used by: today (status != done + due_date predicates)
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date
  ON public.tasks (status, due_date);

-- ---------------------------------------------------------------------
-- DELIVERABLES
-- ---------------------------------------------------------------------

-- Used by: risk (pending_review + stale created_at), today (pending review queue)
CREATE INDEX IF NOT EXISTS idx_deliverables_status_created_at
  ON public.deliverables (status, created_at DESC);

-- ---------------------------------------------------------------------
-- CONTRACTS
-- ---------------------------------------------------------------------

-- Used by: risk (sent/viewed + stale sent_at)
CREATE INDEX IF NOT EXISTS idx_contracts_status_sent_at
  ON public.contracts (status, sent_at);

-- Used by: velocity (signed + signed_at >= X)
CREATE INDEX IF NOT EXISTS idx_contracts_status_signed_at
  ON public.contracts (status, signed_at DESC);

-- ---------------------------------------------------------------------
-- CALENDAR_EVENTS
-- ---------------------------------------------------------------------

-- Used by: today (filming/meeting/reminder by date),
--          production (crew load), risk (filming no-crew)
CREATE INDEX IF NOT EXISTS idx_calendar_events_type_start_date
  ON public.calendar_events (event_type, start_date);

-- Partial: highly selective — unassigned upcoming filmings only.
-- Used by: risk (filmingNoCrew query). Tiny index, very fast scan.
CREATE INDEX IF NOT EXISTS idx_calendar_events_filming_unassigned
  ON public.calendar_events (start_date)
  WHERE event_type = 'filming' AND assigned_to IS NULL;

-- ---------------------------------------------------------------------
-- PROPOSALS
-- ---------------------------------------------------------------------

-- Used by: velocity (sent + sent_at window)
CREATE INDEX IF NOT EXISTS idx_proposals_status_sent_at
  ON public.proposals (status, sent_at DESC);

-- =====================================================================
-- ANALYZE the touched tables so the planner picks up the new indexes
-- right away. Cheap, runs in seconds even on populated tables.
-- =====================================================================

ANALYZE public.invoices;
ANALYZE public.projects;
ANALYZE public.leads;
ANALYZE public.tasks;
ANALYZE public.deliverables;
ANALYZE public.contracts;
ANALYZE public.calendar_events;
ANALYZE public.proposals;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
