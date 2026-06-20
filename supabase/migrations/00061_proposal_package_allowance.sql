-- =====================================================================
-- Migration: 00061_proposal_package_allowance.sql
-- Description: Give every Package a monthly Allowance — how many Filmings
--              it grants per calendar month, expressed as an integer count
--              plus a unit that is exactly 'days' or 'slots'.
--                'days'  = distinct dates (any number of Time Slots each)
--                'slots' = individual Time Slots
--              Existing Packages are seeded from shooting_days (unit 'days').
-- Issue: #73
-- Created: 2026-06-20
-- =====================================================================

ALTER TABLE public.proposal_packages
  ADD COLUMN IF NOT EXISTS allowance_count int,
  ADD COLUMN IF NOT EXISTS allowance_unit  text NOT NULL DEFAULT 'days'
    CHECK (allowance_unit IN ('days', 'slots'));

-- Seed the 'days' case for current Packages from shooting_days where present.
UPDATE public.proposal_packages
SET allowance_count = shooting_days
WHERE allowance_count IS NULL
  AND shooting_days IS NOT NULL;
