-- =====================================================================
-- SQL parity test for migration 00053 — finance RPCs (#36)
--
-- WHY: the Vitest fixtures in src/lib/finance.test.ts only exercise the TS
-- side (Vitest can't run Postgres). This script is the matching SQL-side
-- check: it proves get_monthly_revenue / get_profit_margin produce the SAME
-- numbers as the TS bucketMonthlyFinance / sumFinance on the SAME fixtures.
--
-- HOW TO RUN: paste the whole file into the Supabase Dashboard → SQL Editor
-- and Run. It is fully SELF-CONTAINED and ends in ROLLBACK, so it:
--   • needs nothing applied first (it CREATEs the functions itself),
--   • writes NOTHING permanent (all seeds + funcs are rolled back),
--   • touches NO production rows (fixtures use year-2099 dates the RPC
--     range query isolates; real data never falls in that window).
-- A passing run returns one row: '✅ ALL ASSERTIONS PASSED' plus the
-- computed series so you can eyeball them. A failure raises and aborts.
--
-- The two CREATE FUNCTION bodies below are copied VERBATIM from
-- supabase/migrations/00053_finance_rpcs.sql — keep them in sync.
-- =====================================================================

begin;

-- 1) The functions under test (verbatim from migration 00053) -----------
create or replace function public.get_monthly_revenue(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with candidates as (
    select
      coalesce(total, 0)::numeric as total,
      status,
      issue_date,
      (paid_at at time zone 'UTC')::date as paid_date
    from public.invoices
    where status in ('sent', 'viewed', 'paid', 'overdue')
      and (
        p_from is null or p_to is null
        or (issue_date is not null and issue_date >= p_from and issue_date <= p_to)
        or ((paid_at at time zone 'UTC')::date >= p_from and (paid_at at time zone 'UTC')::date <= p_to)
      )
  ),
  revenue_buckets as (
    select to_char(issue_date, 'YYYY-MM') as month, sum(total) as revenue
    from candidates where issue_date is not null
    group by to_char(issue_date, 'YYYY-MM')
  ),
  collections_buckets as (
    select to_char(paid_date, 'YYYY-MM') as month, sum(total) as collections
    from candidates where status = 'paid' and paid_date is not null
    group by to_char(paid_date, 'YYYY-MM')
  ),
  merged as (
    select
      coalesce(r.month, c.month) as month,
      coalesce(r.revenue, 0)::numeric as revenue,
      coalesce(c.collections, 0)::numeric as collections
    from revenue_buckets r
    full outer join collections_buckets c on r.month = c.month
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('month', month, 'revenue', revenue, 'collections', collections)
      order by month
    ), '[]'::jsonb
  )
  into v_result
  from merged
  where p_from is null or p_to is null
    or (month >= to_char(p_from, 'YYYY-MM') and month <= to_char(p_to, 'YYYY-MM'));

  return v_result;
end;
$$;

create or replace function public.get_profit_margin(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue numeric; v_expenses numeric; v_profit numeric; v_margin numeric;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(sum(total), 0) into v_revenue
  from public.invoices
  where status in ('sent', 'viewed', 'paid', 'overdue')
    and issue_date is not null
    and (p_from is null or p_to is null or (issue_date >= p_from and issue_date <= p_to));

  select coalesce(sum(amount), 0) into v_expenses
  from public.expenses
  where (p_from is null or p_to is null or (date >= p_from and date <= p_to));

  v_profit := v_revenue - v_expenses;
  v_margin := case when v_revenue > 0 then (v_profit / v_revenue) * 100 else 0 end;

  return jsonb_build_object(
    'revenue', v_revenue, 'expenses', v_expenses, 'profit', v_profit, 'margin', v_margin
  );
end;
$$;

-- 2) Bypass the admin guard for this rolled-back txn only ---------------
create or replace function public.is_admin() returns boolean language sql as $$ select true $$;

-- 3) Canonical fixtures — same rows as SHARED_FIXTURES in finance.test.ts,
--    shifted to year 2099 so the range query returns ONLY these rows.
insert into public.invoices
  (invoice_number, status, issue_date, due_date, subtotal, total, line_items, paid_at) values
  ('TEST-00053-1', 'sent',    '2099-01-10', '2099-02-10', 500, 500, '[]'::jsonb, null),
  ('TEST-00053-2', 'paid',    '2099-01-15', '2099-02-15', 300, 300, '[]'::jsonb, '2099-01-20T10:00:00Z'),
  ('TEST-00053-3', 'overdue', '2099-02-05', '2099-03-05', 200, 200, '[]'::jsonb, null),
  ('TEST-00053-4', 'viewed',  '2099-02-10', '2099-03-10', 100, 100, '[]'::jsonb, null),
  ('TEST-00053-5', 'draft',   '2099-01-01', '2099-02-01', 999, 999, '[]'::jsonb, null), -- excluded
  ('TEST-00053-6', 'paid',    '2099-01-25', '2099-02-25',  50,  50, '[]'::jsonb, '2099-03-01T10:00:00Z');

insert into public.expenses (category, amount, date) values
  ('test-00053', 130, '2099-01-05'),
  ('test-00053', 100, '2099-02-15'); -- total 230 → profit 920 → margin exactly 80.00

-- 4) Assert the RPCs match the TS-fixture expectations ------------------
do $$
declare
  m jsonb := public.get_monthly_revenue('2099-01-01', '2099-12-31');
  p jsonb := public.get_profit_margin('2099-01-01', '2099-12-31');
begin
  -- get_monthly_revenue: Jan 850/300, Feb 300/0, Mar 0/50 (draft 999 excluded)
  assert jsonb_array_length(m) = 3, 'expected 3 month buckets, got: ' || m::text;

  assert (m->0->>'month') = '2099-01'
     and (m->0->>'revenue')::numeric = 850
     and (m->0->>'collections')::numeric = 300, 'Jan bucket wrong: ' || m::text;

  assert (m->1->>'month') = '2099-02'
     and (m->1->>'revenue')::numeric = 300
     and (m->1->>'collections')::numeric = 0, 'Feb bucket wrong: ' || m::text;

  assert (m->2->>'month') = '2099-03'
     and (m->2->>'revenue')::numeric = 0
     and (m->2->>'collections')::numeric = 50, 'Mar bucket wrong: ' || m::text;

  -- get_profit_margin: revenue 1150, expenses 230, profit 920, margin 80
  assert (p->>'revenue')::numeric  = 1150, 'revenue wrong: '  || p::text;
  assert (p->>'expenses')::numeric = 230,  'expenses wrong: ' || p::text;
  assert (p->>'profit')::numeric   = 920,  'profit wrong: '   || p::text;
  assert (p->>'margin')::numeric   = 80,   'margin wrong: '   || p::text;

  raise notice '✅ all finance RPC assertions passed';
end;
$$;

-- 5) Return the computed values for eyeballing, then discard everything --
select '✅ ALL ASSERTIONS PASSED' as result,
       public.get_monthly_revenue('2099-01-01', '2099-12-31') as monthly,
       public.get_profit_margin('2099-01-01', '2099-12-31')   as profit_margin;

rollback;
