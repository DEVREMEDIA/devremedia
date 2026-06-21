-- =====================================================================
-- 00066 — Booking schedule: weekly template (base) + per-day availability
-- A day is bookable ONLY if booking_day_availability has a row with is_open.
-- The weekly template is just the base that "apply to month" copies from.
-- =====================================================================

create table if not exists public.booking_weekly_template (
  weekday     int  primary key check (weekday between 0 and 6), -- 0=Sunday … 6=Saturday
  is_open     boolean not null default false,
  open_time   time,
  close_time  time,
  updated_at  timestamptz not null default now(),
  check (not is_open or (open_time is not null and close_time is not null and open_time < close_time))
);

insert into public.booking_weekly_template (weekday, is_open, open_time, close_time) values
  (0, false, null,     null),
  (1, true,  '09:00',  '17:00'),
  (2, true,  '09:00',  '17:00'),
  (3, true,  '09:00',  '17:00'),
  (4, true,  '09:00',  '17:00'),
  (5, true,  '09:00',  '17:00'),
  (6, false, null,     null)
  on conflict (weekday) do nothing;

create table if not exists public.booking_day_availability (
  date        date primary key,
  is_open     boolean not null default true,
  open_time   time not null,
  close_time  time not null,
  updated_at  timestamptz not null default now(),
  check (open_time < close_time)
);

drop trigger if exists trg_booking_weekly_template_updated_at on public.booking_weekly_template;
create trigger trg_booking_weekly_template_updated_at
  before update on public.booking_weekly_template
  for each row execute function public.cost_model_touch_updated_at();

drop trigger if exists trg_booking_day_availability_updated_at on public.booking_day_availability;
create trigger trg_booking_day_availability_updated_at
  before update on public.booking_day_availability
  for each row execute function public.cost_model_touch_updated_at();

alter table public.booking_weekly_template  enable row level security;
alter table public.booking_day_availability enable row level security;

create policy "Admins full access to booking_weekly_template"
  on public.booking_weekly_template for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));

create policy "Admins full access to booking_day_availability"
  on public.booking_day_availability for all
  using (exists (select 1 from public.user_profiles
                 where id = auth.uid() and role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_profiles
                      where id = auth.uid() and role in ('super_admin', 'admin')));
