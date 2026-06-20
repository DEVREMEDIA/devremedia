-- =====================================================================
-- 00063 — Book a slot: Holds on filming_requests + atomic claim RPC (#77)
--
-- A "Hold" is a filming_requests row in status 'pending' that carries a
-- concrete booking_date + slot_id. Holds (and any non-declined later state)
-- occupy Capacity on that date+Slot exactly like a confirmed Filming.
--
-- The claim MUST be atomic: two simultaneous requests for the last spot in a
-- date+Slot at Capacity must not both succeed. We serialize concurrent claims
-- on the same date+Slot with a transaction-scoped advisory lock, then count +
-- insert inside that lock. The lock is released at COMMIT, so the second
-- transaction only proceeds once the first has committed its row — and then
-- sees Capacity full. This is enforced here, in the DB, not in app code.
--
-- A claim that would exceed the Client's remaining monthly Allowance (per the
-- active Agreement's Package, counted in 'days' or 'slots') is rejected.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Hold columns on filming_requests
-- ---------------------------------------------------------------------

alter table public.filming_requests
  add column if not exists booking_date date,
  add column if not exists slot_id      uuid references public.booking_time_slots(id) on delete set null;

comment on column public.filming_requests.booking_date is 'Hold: the chosen filming date (date+slot_id together identify the Capacity unit)';
comment on column public.filming_requests.slot_id is 'Hold: the chosen Time Slot (FK to booking_time_slots)';

-- Counts of Holds per date+Slot drive the Capacity check.
create index if not exists idx_filming_requests_date_slot
  on public.filming_requests (booking_date, slot_id)
  where booking_date is not null;

-- ---------------------------------------------------------------------
-- 2. Atomic claim RPC
-- ---------------------------------------------------------------------
--
-- Returns the new Hold id (uuid). Raises a sentinel error on rejection:
--   not_a_client       — caller is not a Client
--   no_agreement       — Client has no active Agreement / Allowance
--   invalid_slot       — slot_id does not exist
--   already_booked     — Client already holds this exact date+Slot
--   capacity_full      — date+Slot has reached Capacity
--   allowance_exceeded — would exceed the Client's remaining monthly Allowance
-- ---------------------------------------------------------------------
create or replace function public.book_slot(
  p_date     date,
  p_slot_id  uuid,
  p_location text default null,
  p_note     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id       uuid;
  v_allowance_count int;
  v_allowance_unit  text;
  v_capacity        int;
  v_occupied        int;
  v_month_start     date := date_trunc('month', p_date)::date;
  v_month_end       date := (date_trunc('month', p_date) + interval '1 month')::date;
  v_used            int;
  v_cost            int;
  v_new_id          uuid;
begin
  -- Resolve the calling Client.
  select id into v_client_id
  from public.clients
  where user_id = auth.uid();

  if v_client_id is null then
    raise exception 'not_a_client';
  end if;

  -- Active Agreement → Package Allowance.
  select pp.allowance_count, pp.allowance_unit
  into v_allowance_count, v_allowance_unit
  from public.client_agreements ca
  join public.proposal_packages pp on pp.id = ca.package_id
  where ca.client_id = v_client_id and ca.active;

  if v_allowance_count is null then
    raise exception 'no_agreement';
  end if;

  -- The Time Slot must exist.
  if not exists (select 1 from public.booking_time_slots where id = p_slot_id) then
    raise exception 'invalid_slot';
  end if;

  -- Serialize concurrent claims on THIS date+Slot. Held until COMMIT, so a
  -- second claim waits, then counts the first claim's committed row below.
  perform pg_advisory_xact_lock(hashtextextended(p_date::text || ':' || p_slot_id::text, 0));

  -- A Client cannot hold the same date+Slot twice.
  if exists (
    select 1 from public.filming_requests
    where client_id = v_client_id
      and booking_date = p_date
      and slot_id = p_slot_id
      and status <> 'declined'
  ) then
    raise exception 'already_booked';
  end if;

  -- Capacity: Holds + confirmed Filmings (any non-declined Hold) on this date+Slot.
  select capacity into v_capacity from public.booking_settings where id = 1;
  v_capacity := coalesce(v_capacity, 1);

  select count(*) into v_occupied
  from public.filming_requests
  where booking_date = p_date
    and slot_id = p_slot_id
    and status <> 'declined';

  if v_occupied >= v_capacity then
    raise exception 'capacity_full';
  end if;

  -- Allowance: how much the Client has already used this calendar month,
  -- counted per the Package unit, plus the cost of this new booking.
  if v_allowance_unit = 'days' then
    select count(distinct booking_date) into v_used
    from public.filming_requests
    where client_id = v_client_id
      and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;

    -- A Slot on a date the Client already uses this month costs no extra day.
    v_cost := case when exists (
      select 1 from public.filming_requests
      where client_id = v_client_id
        and status <> 'declined'
        and booking_date = p_date
    ) then 0 else 1 end;
  else
    select count(*) into v_used
    from public.filming_requests
    where client_id = v_client_id
      and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;

    -- (already_booked guard above means this is always a new pair → cost 1)
    v_cost := 1;
  end if;

  if v_used + v_cost > v_allowance_count then
    raise exception 'allowance_exceeded';
  end if;

  -- Create the pending Hold.
  insert into public.filming_requests (client_id, title, booking_date, slot_id, location, description, status)
  values (
    v_client_id,
    'Booking ' || to_char(p_date, 'YYYY-MM-DD'),
    p_date,
    p_slot_id,
    p_location,
    p_note,
    'pending'
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

comment on function public.book_slot(date, uuid, text, text) is
  'Atomically create a pending Hold on a date+Slot: enforces Capacity (advisory-locked) '
  'and the Client''s remaining monthly Allowance. Raises sentinel errors on rejection. (#77)';

grant execute on function public.book_slot(date, uuid, text, text) to authenticated;
