-- =====================================================================
-- Migration: 00049_calendar_events_assigned_to_user_profiles_fk.sql
-- Description: Add explicit FK from calendar_events.assigned_to → user_profiles
--              to enable PostgREST embed hint resolution.
--
-- Why: Migration 00035 added calendar_events.assigned_to with a FK to
-- auth.users(id). PostgREST cannot use that FK to embed user_profiles
-- because the join target table differs. The dashboard today aggregator
-- (today.ts) and the crew-load heatmap (production.ts) embed via
--   assignee:user_profiles!calendar_events_assigned_to_user_profiles_fkey(...)
-- and silently fail, so today's meetings and crew names never render.
--
-- Same fix that 00016 applied to leads.assigned_to. We add a second FK
-- (the auth.users one from 00035 stays for audit chain integrity).
--
-- Idempotent: guarded so re-running against a DB that already has the
-- constraint is a no-op.
-- =====================================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_assigned_to_user_profiles_fkey'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_assigned_to_user_profiles_fkey
      foreign key (assigned_to) references public.user_profiles(id) on delete set null;
  end if;
end $$;
