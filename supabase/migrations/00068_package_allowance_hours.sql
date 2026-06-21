-- =====================================================================
-- Migration: 00068_package_allowance_hours.sql
-- Description: Extend proposal_packages.allowance_unit CHECK constraint
--              to support 'hours' in addition to 'days' and 'slots'.
--                'days'  = distinct dates (any number of Time Slots each)
--                'slots' = individual Time Slots
--                'hours' = hours per month
-- Issue: #87 — booking feature
-- Created: 2026-06-21
-- =====================================================================

ALTER TABLE public.proposal_packages
  DROP CONSTRAINT IF EXISTS proposal_packages_allowance_unit_check;

ALTER TABLE public.proposal_packages
  ADD CONSTRAINT proposal_packages_allowance_unit_check
    CHECK (allowance_unit IN ('days', 'slots', 'hours'));
