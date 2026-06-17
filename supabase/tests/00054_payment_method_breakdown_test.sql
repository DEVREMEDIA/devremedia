-- =====================================================================
-- SQL parity test for migration 00054 — get_payment_method_breakdown (#40)
--
-- WHY: proves the RPC groups paid invoices by payment_method correctly
-- (null/empty → 'Other', summed, ordered by amount DESC) on the real DB.
--
-- HOW TO RUN: paste the whole file into Supabase Dashboard → SQL Editor and
-- Run. Fully SELF-CONTAINED, ends in ROLLBACK, so it:
--   • needs nothing applied first (it CREATEs the function itself),
--   • writes NOTHING permanent (funcs + seeds rolled back),
--   • touches NO production rows (fixtures use year-2099 dates the RPC
--     range query isolates; real data never falls in that window).
-- A passing run returns one row: '✅ ALL ASSERTIONS PASSED' + the breakdown.
--
-- Function body below is copied VERBATIM from
-- supabase/migrations/00054_payment_method_breakdown_rpc.sql — keep in sync.
-- =====================================================================

begin;

-- 1) The function under test (verbatim from migration 00054) -----------
create or replace function public.get_payment_method_breakdown(
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object('method', method, 'amount', amount, 'count', cnt)
      order by amount desc
    ), '[]'::jsonb
  )
  into v_result
  from (
    select
      coalesce(nullif(i.payment_method, ''), 'Other') as method,
      coalesce(sum(i.total), 0)                        as amount,
      count(*)                                          as cnt
    from public.invoices i
    where i.status = 'paid'
      and (
        p_from is null or p_to is null
        or (i.paid_at >= p_from and i.paid_at <= p_to)
      )
    group by coalesce(nullif(i.payment_method, ''), 'Other')
  ) grouped;

  return v_result;
end;
$$;

-- 2) Bypass the admin guard for this rolled-back txn only ---------------
create or replace function public.is_admin() returns boolean language sql as $$ select true $$;

-- 3) Fixtures (year-2099 so the range query isolates them from real data)
insert into public.invoices
  (invoice_number, status, issue_date, due_date, subtotal, total, line_items, payment_method, paid_at) values
  ('TEST-00054-1', 'paid', '2099-01-10', '2099-02-10', 1000, 1000, '[]'::jsonb, 'card',          '2099-01-10T10:00:00Z'),
  ('TEST-00054-2', 'paid', '2099-01-15', '2099-02-15',  500,  500, '[]'::jsonb, 'card',          '2099-01-15T10:00:00Z'), -- card → 1500 / 2
  ('TEST-00054-3', 'paid', '2099-02-01', '2099-03-01',  400,  400, '[]'::jsonb, 'bank_transfer', '2099-02-01T10:00:00Z'), -- bank_transfer → 400 / 1
  ('TEST-00054-4', 'paid', '2099-02-10', '2099-03-10',  200,  200, '[]'::jsonb, null,            '2099-02-10T10:00:00Z'), -- null → Other
  ('TEST-00054-5', 'paid', '2099-03-01', '2099-04-01',  100,  100, '[]'::jsonb, '',              '2099-03-01T10:00:00Z'), -- empty → Other → Other 300 / 2
  ('TEST-00054-6', 'sent', '2099-01-01', '2099-02-01', 9999, 9999, '[]'::jsonb, 'card',          null);                   -- not paid → excluded

-- 4) Assert the breakdown matches expectations -------------------------
do $$
declare
  b jsonb := public.get_payment_method_breakdown('2099-01-01', '2099-12-31');
begin
  -- Expected, ordered by amount DESC: card 1500/2, bank_transfer 400/1, Other 300/2
  assert jsonb_array_length(b) = 3, 'expected 3 methods, got: ' || b::text;

  assert (b->0->>'method') = 'card'
     and (b->0->>'amount')::numeric = 1500
     and (b->0->>'count')::int = 2, 'card bucket wrong: ' || b::text;

  assert (b->1->>'method') = 'bank_transfer'
     and (b->1->>'amount')::numeric = 400
     and (b->1->>'count')::int = 1, 'bank_transfer bucket wrong: ' || b::text;

  assert (b->2->>'method') = 'Other'
     and (b->2->>'amount')::numeric = 300
     and (b->2->>'count')::int = 2, 'Other bucket wrong: ' || b::text;

  raise notice '✅ all payment-method breakdown assertions passed';
end;
$$;

-- 5) Return the computed breakdown for eyeballing, then discard ----------
select '✅ ALL ASSERTIONS PASSED' as result,
       public.get_payment_method_breakdown('2099-01-01', '2099-12-31') as breakdown;

rollback;
