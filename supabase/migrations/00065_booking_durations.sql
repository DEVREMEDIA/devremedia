-- =====================================================================
-- 00065 — Booking durations + start-time interval
-- Fixed durations the Client picks from (admin-managed, like the old slots),
-- plus the start-time granularity used to enumerate candidate start times.
-- =====================================================================

create table if not exists public.booking_durations (
  id          uuid        primary key default gen_random_uuid(),
  minutes     int         not null check (minutes > 0 and minutes <= 24 * 60),
  position    int         not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists uniq_booking_durations_minutes
  on public.booking_durations (minutes);

insert into public.booking_durations (minutes, position) values
  (60, 0), (120, 1), (240, 2)
  on conflict (minutes) do nothing;

alter table public.booking_settings
  add column if not exists slot_interval_minutes int not null default 30
    check (slot_interval_minutes between 5 and 240);

-- updated_at trigger (reuse cost_model_touch_updated_at from 00037, as 00062 did)
drop trigger if exists trg_booking_durations_updated_at on public.booking_durations;
create trigger trg_booking_durations_updated_at
  before update on public.booking_durations
  for each row execute function public.cost_model_touch_updated_at();

-- RLS — admin / super_admin only (mirrors 00062)
alter table public.booking_durations enable row level security;

create policy "Admins full access to booking_durations"
  on public.booking_durations for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));
