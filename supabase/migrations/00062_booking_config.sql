-- =====================================================================
-- 00062 — Booking configuration: Time Slots + global Capacity (#74)
--
-- Two admin-managed inputs the availability calculation will use later:
--   * booking_time_slots — an ordered list of named parts of a day
--   * booking_settings    — a singleton holding the global crew Capacity
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.booking_time_slots (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  position    int         not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_booking_time_slots_position
  on public.booking_time_slots (position);

create table if not exists public.booking_settings (
  id          int         primary key default 1 check (id = 1),
  capacity    int         not null default 1 check (capacity >= 1),
  updated_at  timestamptz not null default now()
);

-- Singleton row
insert into public.booking_settings (id) values (1)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. updated_at triggers (reuse cost_model_touch_updated_at from 00037)
-- ---------------------------------------------------------------------

drop trigger if exists trg_booking_time_slots_updated_at on public.booking_time_slots;
create trigger trg_booking_time_slots_updated_at
  before update on public.booking_time_slots
  for each row execute function public.cost_model_touch_updated_at();

drop trigger if exists trg_booking_settings_updated_at on public.booking_settings;
create trigger trg_booking_settings_updated_at
  before update on public.booking_settings
  for each row execute function public.cost_model_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. RLS — admin / super_admin only
-- ---------------------------------------------------------------------

alter table public.booking_time_slots enable row level security;
alter table public.booking_settings   enable row level security;

create policy "Admins full access to booking_time_slots"
  on public.booking_time_slots for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  );

create policy "Admins full access to booking_settings"
  on public.booking_settings for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('super_admin', 'admin')
    )
  );
