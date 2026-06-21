-- =====================================================================
-- SQL parity test for migration 00069 — book_filming atomic claim (PRD #87)
-- Paste into Supabase SQL Editor and Run. Self-contained, ends in ROLLBACK,
-- touches no production rows (year-2099 fixtures). Raises on any failure.
-- The book_filming body below is copied VERBATIM from 00069 — keep in sync.
-- =====================================================================
begin;

-- 1) function under test (verbatim from 00069)
create or replace function public.book_filming(
  p_date     date,
  p_start    time,
  p_duration int,
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
  v_is_open         boolean;
  v_open            time;
  v_close           time;
  v_interval        int;
  v_start_min       int := floor(extract(epoch from p_start) / 60);
  v_open_min        int;
  v_close_min       int;
  v_month_start     date := date_trunc('month', p_date)::date;
  v_month_end       date := (date_trunc('month', p_date) + interval '1 month')::date;
  v_used            numeric;
  v_cost            numeric;
  v_new_id          uuid;
begin
  -- 1. caller is a Client
  select id into v_client_id from public.clients where user_id = auth.uid();
  if v_client_id is null then raise exception 'not_a_client'; end if;

  -- 2. active Agreement → Package Allowance
  select pp.allowance_count, pp.allowance_unit
  into v_allowance_count, v_allowance_unit
  from public.client_agreements ca
  join public.proposal_packages pp on pp.id = ca.package_id
  where ca.client_id = v_client_id and ca.active;
  if v_allowance_count is null then raise exception 'no_agreement'; end if;

  -- 3. duration is one we offer
  if not exists (select 1 from public.booking_durations where minutes = p_duration) then
    raise exception 'invalid_duration';
  end if;

  -- 4. the day is explicitly open
  select is_open, open_time, close_time
  into v_is_open, v_open, v_close
  from public.booking_day_availability where date = p_date;
  if v_is_open is null or not v_is_open then raise exception 'day_closed'; end if;

  -- 5. inside the open window + aligned to the interval
  select slot_interval_minutes into v_interval from public.booking_settings where id = 1;
  v_interval  := coalesce(v_interval, 30);
  v_open_min  := floor(extract(epoch from v_open) / 60);
  v_close_min := floor(extract(epoch from v_close) / 60);
  if v_start_min < v_open_min
     or v_start_min + p_duration > v_close_min
     or ((v_start_min - v_open_min) % v_interval) <> 0 then
    raise exception 'outside_hours';
  end if;

  -- 6. serialise concurrent claims on this day
  perform pg_advisory_xact_lock(hashtextextended(p_date::text, 0));

  -- 7. Capacity = overlapping non-declined windows on this date
  select capacity into v_capacity from public.booking_settings where id = 1;
  v_capacity := coalesce(v_capacity, 1);

  select count(*) into v_occupied
  from public.filming_requests
  where booking_date = p_date
    and status <> 'declined'
    and start_time is not null and duration_minutes is not null
    and floor(extract(epoch from start_time) / 60) < (v_start_min + p_duration)
    and v_start_min < floor(extract(epoch from start_time) / 60) + duration_minutes;

  if v_occupied >= v_capacity then raise exception 'capacity_full'; end if;

  -- 8. Allowance per unit
  if v_allowance_unit = 'days' then
    select count(distinct booking_date) into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := case when exists (
      select 1 from public.filming_requests
      where client_id = v_client_id and status <> 'declined' and booking_date = p_date
    ) then 0 else 1 end;
  elsif v_allowance_unit = 'hours' then
    select coalesce(sum(duration_minutes), 0) / 60.0 into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := p_duration / 60.0;
  else -- slots
    select count(*) into v_used
    from public.filming_requests
    where client_id = v_client_id and status <> 'declined'
      and booking_date >= v_month_start and booking_date < v_month_end;
    v_cost := 1;
  end if;

  if v_used + v_cost > v_allowance_count then raise exception 'allowance_exceeded'; end if;

  -- 9. create the pending Hold
  insert into public.filming_requests
    (client_id, title, booking_date, start_time, duration_minutes, location, description, status)
  values
    (v_client_id, 'Booking ' || to_char(p_date, 'YYYY-MM-DD'),
     p_date, p_start, p_duration, p_location, p_note, 'pending')
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- 2) auth.uid() reads a settable GUC so we can switch acting user per call.
create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- 3) year-2099 fixtures + assertions
do $$
declare
  u1 uuid := '99990001-0001-4001-8001-000000000011';
  u2 uuid := '99990002-0002-4002-8002-000000000012';
  c1 uuid; c2 uuid; p_days uuid; p_hours uuid;
  d1 date := '2099-03-10';
  ok boolean; err text;
begin
  insert into auth.users (id, email) values
    (u1, 'test-00069-1@example.test'), (u2, 'test-00069-2@example.test');
  insert into public.clients (user_id, contact_name, email)
    values (u1, 'T1', 'test-00069-c1@example.test') returning id into c1;
  insert into public.clients (user_id, contact_name, email)
    values (u2, 'T2', 'test-00069-c2@example.test') returning id into c2;

  insert into public.proposal_packages (name, allowance_count, allowance_unit)
    values ('Test 00069 days', 10, 'days') returning id into p_days;   -- C2: not the blocker
  insert into public.proposal_packages (name, allowance_count, allowance_unit)
    values ('Test 00069 hours', 2, 'hours') returning id into p_hours; -- C1: 2h/month

  insert into public.client_agreements (client_id, package_id, agreed_monthly_price, active)
    values (c1, p_hours, 0, true), (c2, p_days, 0, true);

  insert into public.booking_durations (minutes, position) values (30, 90), (60, 91), (90, 92)
    on conflict (minutes) do nothing;
  update public.booking_settings set capacity = 1, slot_interval_minutes = 30 where id = 1;
  insert into public.booking_day_availability (date, is_open, open_time, close_time)
    values (d1, true, '09:00', '17:00')
    on conflict (date) do update set is_open = true, open_time = '09:00', close_time = '17:00';

  -- (1a) C1 books 09:00 for 90m → ok (uses 1.5h of 2h)
  perform set_config('test.uid', u1::text, true);
  if public.book_filming(d1, '09:00', 90) is null then raise exception 'FAIL 1a'; end if;

  -- (1b) C2 books an OVERLAPPING window 09:30 at Capacity 1 → capacity_full
  perform set_config('test.uid', u2::text, true);
  ok := false; err := null;
  begin perform public.book_filming(d1, '09:30', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'capacity_full' then raise exception 'FAIL 1b: %', err; end if;

  -- (2) C2 books a NON-overlapping window 11:00 → ok (no overlap with 09:00-10:30)
  if public.book_filming(d1, '11:00', 60) is null then raise exception 'FAIL 2'; end if;

  -- (3) C1 hours budget: +60m would be 1.5h+1h=2.5h > 2h → allowance_exceeded
  perform set_config('test.uid', u1::text, true);
  ok := false; err := null;
  begin perform public.book_filming(d1, '13:00', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'allowance_exceeded' then raise exception 'FAIL 3: %', err; end if;
  -- but a 30m window fits exactly (1.5h + 0.5h = 2h)
  if public.book_filming(d1, '13:00', 30) is null then raise exception 'FAIL 3b'; end if;

  -- (4) closed day / outside hours / invalid duration
  ok := false; err := null;
  begin perform public.book_filming('2099-03-11', '09:00', 60);
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'day_closed' then raise exception 'FAIL 4a: %', err; end if;

  ok := false; err := null;
  begin perform public.book_filming(d1, '08:45', 60); -- before open + unaligned
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'outside_hours' then raise exception 'FAIL 4b: %', err; end if;

  ok := false; err := null;
  begin perform public.book_filming(d1, '15:00', 45); -- 45 not in durations
  exception when others then err := sqlerrm; ok := true; end;
  if not ok or err <> 'invalid_duration' then raise exception 'FAIL 4c: %', err; end if;

  raise notice '✅ ALL ASSERTIONS PASSED — overlap capacity, hours allowance, day/hours/duration guards';
end $$;

rollback;
