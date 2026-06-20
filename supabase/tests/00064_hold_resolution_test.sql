-- =====================================================================
-- SQL parity test for Hold resolution (#78)
--
-- WHY: approveHold / rejectHold are TS server actions tested with a mocked
-- Supabase client (src/lib/actions/filming-requests-hold.test.ts) — that proves
-- the action writes the right status, but NOT the DB-level capacity/allowance
-- consequence. Resolution works purely by flipping filming_requests.status, and
-- the atomic claim (book_slot, migration 00064) counts only rows where
-- status <> 'declined'. This script proves, against the REAL book_slot:
--   (1) APPROVE keeps the spot taken — a Hold moved to 'converted' (a confirmed
--       Filming) still occupies Capacity, so a second Client claiming the same
--       date+Slot at Capacity 1 is rejected with 'capacity_full' (approval does
--       NOT free the spot),
--   (2) a 'converted' Filming still consumes the Client's monthly Allowance,
--   (3) REJECT frees the spot — a Hold moved to 'declined' no longer occupies
--       Capacity, so the date+Slot becomes claimable again, and
--   (4) REJECT frees the Allowance — after a 'declined' Hold the Client can book
--       another day within the same monthly Allowance.
--
-- HOW TO RUN: paste the whole file into the Supabase Dashboard → SQL Editor and
-- Run. Self-contained, ends in ROLLBACK: needs nothing applied first (it CREATEs
-- the function itself), writes NOTHING permanent, and touches NO production rows
-- (year-2099 dates + dedicated test users). A pass raises '✅ ALL ASSERTIONS
-- PASSED'; any failure raises and aborts.
--
-- The book_slot body below is copied VERBATIM from migration 00064 — keep in sync.
-- =====================================================================

begin;

-- 1) The function under test (verbatim from migration 00064) -------------
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
  select id into v_client_id
  from public.clients
  where user_id = auth.uid();

  if v_client_id is null then
    raise exception 'not_a_client';
  end if;

  select pp.allowance_count, pp.allowance_unit
  into v_allowance_count, v_allowance_unit
  from public.client_agreements ca
  join public.proposal_packages pp on pp.id = ca.package_id
  where ca.client_id = v_client_id and ca.active;

  if v_allowance_count is null then
    raise exception 'no_agreement';
  end if;

  if not exists (select 1 from public.booking_time_slots where id = p_slot_id) then
    raise exception 'invalid_slot';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_date::text || ':' || p_slot_id::text, 0));

  if exists (
    select 1 from public.filming_requests
    where client_id = v_client_id
      and booking_date = p_date
      and slot_id = p_slot_id
      and status <> 'declined'
  ) then
    raise exception 'already_booked';
  end if;

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

  if v_allowance_unit = 'days' then
    select count(distinct booking_date) into v_used
    from public.filming_requests
    where client_id = v_client_id
      and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;

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

    v_cost := 1;
  end if;

  if v_used + v_cost > v_allowance_count then
    raise exception 'allowance_exceeded';
  end if;

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

-- 2) auth.uid() reads a settable GUC so we can switch acting user per call.
create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- 3) Year-2099 fixtures: two Clients, one Time Slot, Capacity 1.
do $$
declare
  u1 uuid := '99990078-0001-4001-8001-000000000001';
  u2 uuid := '99990078-0002-4002-8002-000000000002';
  c1 uuid; c2 uuid;
  p1 uuid; p2 uuid;
  s1 uuid;
  d1 date := '2099-06-10';
  d2 date := '2099-06-20';
  hold1 uuid;
  ok boolean;
  err text;
begin
  insert into auth.users (id, email) values
    (u1, 'test-00078-1@example.test'),
    (u2, 'test-00078-2@example.test');

  insert into public.clients (user_id, contact_name, email) values
    (u1, 'Test Client 1', 'test-00078-c1@example.test') returning id into c1;
  insert into public.clients (user_id, contact_name, email) values
    (u2, 'Test Client 2', 'test-00078-c2@example.test') returning id into c2;

  -- C1: 1 day/month (so allowance freeing is observable). C2: plenty (only Capacity blocks it).
  insert into public.proposal_packages (name, allowance_count, allowance_unit) values
    ('Test Pack 00078 A', 1, 'days') returning id into p1;
  insert into public.proposal_packages (name, allowance_count, allowance_unit) values
    ('Test Pack 00078 B', 10, 'slots') returning id into p2;

  insert into public.client_agreements (client_id, package_id, agreed_monthly_price, active) values
    (c1, p1, 0, true), (c2, p2, 0, true);

  insert into public.booking_time_slots (name, position) values ('TestSlot78', 7800) returning id into s1;

  update public.booking_settings set capacity = 1 where id = 1;

  -- C1 books D1+S1 → a pending Hold.
  perform set_config('test.uid', u1::text, true);
  hold1 := public.book_slot(d1, s1);
  if hold1 is null then
    raise exception 'SETUP FAIL: C1 first claim returned null';
  end if;

  -- ===== APPROVE path: the Hold becomes a confirmed Filming ('converted') =====
  update public.filming_requests set status = 'converted' where id = hold1;

  -- (1) C2 claims the SAME D1+S1 at Capacity 1 → capacity_full (approval kept the spot).
  perform set_config('test.uid', u2::text, true);
  ok := false; err := null;
  begin
    perform public.book_slot(d1, s1);
  exception when others then err := sqlerrm; ok := true;
  end;
  if not ok or err <> 'capacity_full' then
    raise exception 'FAIL 1: approved Filming should keep the spot (expected capacity_full), got ok=% err=%', ok, err;
  end if;

  -- (2) C1 claims D2+S1 (a new day) → allowance_exceeded (the 'converted' Filming still uses the 1 day).
  perform set_config('test.uid', u1::text, true);
  ok := false; err := null;
  begin
    perform public.book_slot(d2, s1);
  exception when others then err := sqlerrm; ok := true;
  end;
  if not ok or err <> 'allowance_exceeded' then
    raise exception 'FAIL 2: converted Filming should still use Allowance (expected allowance_exceeded), got ok=% err=%', ok, err;
  end if;

  -- ===== REJECT path: the Hold is declined → date+Slot returns to Free =====
  update public.filming_requests set status = 'declined' where id = hold1;

  -- (3) C2 claims D1+S1 again → now succeeds (rejection freed the Capacity slot).
  perform set_config('test.uid', u2::text, true);
  if public.book_slot(d1, s1) is null then
    raise exception 'FAIL 3: rejected Hold should free the spot, but C2 claim returned null';
  end if;

  -- (4) C1 claims D2+S1 → now succeeds (rejection freed C1''s 1-day Allowance).
  perform set_config('test.uid', u1::text, true);
  if public.book_slot(d2, s1) is null then
    raise exception 'FAIL 4: rejected Hold should free the Allowance, but C1 claim returned null';
  end if;

  raise notice '✅ ALL ASSERTIONS PASSED — approval keeps Capacity+Allowance; rejection frees both';
end $$;

rollback;
