-- =====================================================================
-- Migration 00042 — proposals.project_id
-- Purpose: Link a proposal to the project it spawned, enabling the
--          sales funnel + revenue realization queries on the dashboard.
-- Created: 2026-04-25
-- =====================================================================

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_project_id
  ON public.proposals(project_id);

COMMENT ON COLUMN public.proposals.project_id IS
  'Set when an accepted proposal is converted into a project; nullable for drafts/rejected/expired.';
