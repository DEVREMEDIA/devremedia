-- =====================================================================
-- 00069 — book_filming: atomic Hold on a (date, start, duration) window
-- Replaces book_slot. Capacity is an overlap check; the per-day advisory
-- lock serialises concurrent same-day claims. Allowance counted per unit
-- (days/slots/hours). security definer. (PRD #87)
-- =====================================================================

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

comment on function public.book_filming(date, time, int, text, text) is
  'Atomically create a pending Hold on a (date, start, duration) window: enforces open hours, '
  'Capacity (overlap, advisory-locked per day) and the Client''s monthly Allowance. (PRD #87)';

grant execute on function public.book_filming(date, time, int, text, text) to authenticated;

-- Retire the named-slot RPC.
drop function if exists public.book_slot(date, uuid, text, text);
