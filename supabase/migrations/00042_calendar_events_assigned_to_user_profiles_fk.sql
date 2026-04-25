-- =====================================================================
-- Migration: 00042_calendar_events_assigned_to_user_profiles_fk.sql
-- Description: Add explicit FK from calendar_events.assigned_to → user_profiles
--              to enable PostgREST embed hint resolution.
--
-- Why: Migration 00035 added calendar_events.assigned_to with a FK to
-- auth.users(id). PostgREST cannot use that FK to embed user_profiles
-- because the join target table differs. The dashboard today aggregator
-- (and the crew-load heatmap) embed via
--   assignee:user_profiles!calendar_events_assigned_to_fkey(...)
-- and silently fail, so today's meetings never render.
--
-- Same fix that 00016 applied to leads.assigned_to. We add a second FK
-- (the auth.users one stays for audit chain integrity).
-- =====================================================================

alter table public.calendar_events
  add constraint calendar_events_assigned_to_user_profiles_fkey
  foreign key (assigned_to) references public.user_profiles(id) on delete set null;
