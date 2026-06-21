-- =====================================================================
-- 00067 — Filming time window; retire named Time Slots
-- A Hold now carries (booking_date, start_time, duration_minutes).
-- slot_id + booking_time_slots are dropped — verified 0 rows use them
-- (the hold-based flow has never run in production). Guard re-checks.
-- =====================================================================

-- Safety: abort if any real Hold data exists on slot_id (must be 0 — see PRD #87 §4).
do $$
begin
  if exists (select 1 from public.filming_requests where slot_id is not null) then
    raise exception 'Refusing to drop slot_id: % rows still reference it',
      (select count(*) from public.filming_requests where slot_id is not null);
  end if;
end $$;

alter table public.filming_requests
  add column if not exists start_time       time,
  add column if not exists duration_minutes int check (duration_minutes is null or duration_minutes > 0);

comment on column public.filming_requests.start_time is 'Hold: filming start (wall-clock Athens). With booking_date + duration_minutes identifies the time window.';
comment on column public.filming_requests.duration_minutes is 'Hold: filming duration in minutes (one of booking_durations.minutes).';

-- Overlap counts key off the date; the per-slot index is obsolete.
drop index if exists idx_filming_requests_date_slot;
create index if not exists idx_filming_requests_booking_date
  on public.filming_requests (booking_date)
  where booking_date is not null;

alter table public.filming_requests drop column if exists slot_id;
drop table if exists public.booking_time_slots cascade;
