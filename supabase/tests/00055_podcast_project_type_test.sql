-- =====================================================================
-- SQL parity test for migration 00055 — 'podcast' project_type (#50)
--
-- WHY: the app accepts 8 PROJECT_TYPES (src/lib/constants/enums.ts), but the
-- original DB CHECK (00002) listed only 7 — omitting 'podcast'. This script
-- proves: (A) the OLD check rejected 'podcast' (the bug), and (B) the NEW check
-- (verbatim from migration 00055) accepts ALL 8 app types incl. 'podcast' and
-- still rejects unknown values — i.e. app PROJECT_TYPES == DB-accepted set.
--
-- HOW TO RUN: paste the whole file into Supabase Dashboard → SQL Editor and Run.
-- It is fully SELF-CONTAINED (uses TEMP tables that mirror the CHECK expressions)
-- and ends in ROLLBACK, so it needs nothing applied first, writes NOTHING
-- permanent, and touches NO production rows. A passing run raises one
-- '✅ ALL ASSERTIONS PASSED' notice; any failure raises and aborts.
--
-- Section C is an OPTIONAL post-apply check against the LIVE projects table —
-- run it after migration 00055 is applied to confirm the real constraint name
-- was replaced (not duplicated) and now includes 'podcast'.
-- =====================================================================

begin;

-- The single source of truth for this test: the app PROJECT_TYPES list.
-- Keep in sync with src/lib/constants/enums.ts (PROJECT_TYPES).
do $$
declare
  v_app_types text[] := array[
    'corporate_video', 'event_coverage', 'social_media_content',
    'commercial', 'documentary', 'music_video', 'podcast', 'other'
  ];
  t text;
  v_rejected boolean;
  v_accepted int;
begin
  -- ---- Section A (RED): the OLD check (7 types, no 'podcast') rejects podcast ----
  create temp table _pt_old (
    project_type text check (project_type in (
      'corporate_video', 'event_coverage', 'social_media_content',
      'commercial', 'documentary', 'music_video', 'other'
    ))
  ) on commit drop;

  v_rejected := false;
  begin
    insert into _pt_old(project_type) values ('podcast');
  exception when check_violation then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'RED FAIL: old check unexpectedly accepted podcast (bug not reproduced)';
  end if;

  -- ---- Section B (GREEN): the NEW check (verbatim from 00055) accepts all 8 ----
  -- NOTE: the CHECK list below is copied verbatim from migration 00055 — keep in sync.
  create temp table _pt_new (
    project_type text check (project_type in (
      'corporate_video', 'event_coverage', 'social_media_content',
      'commercial', 'documentary', 'music_video', 'podcast', 'other'
    ))
  ) on commit drop;

  foreach t in array v_app_types loop
    insert into _pt_new(project_type) values (t);  -- must all succeed
  end loop;

  v_accepted := (select count(*) from _pt_new);
  if v_accepted <> array_length(v_app_types, 1) then
    raise exception 'GREEN FAIL: new check accepted % of % app types',
      v_accepted, array_length(v_app_types, 1);
  end if;

  -- unknown value must still be rejected
  v_rejected := false;
  begin
    insert into _pt_new(project_type) values ('___not_a_real_type___');
  exception when check_violation then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'GREEN FAIL: new check accepted an unknown project_type';
  end if;

  raise notice '✅ ALL ASSERTIONS PASSED — old check rejected podcast; new check accepts all % app types incl. podcast and rejects unknowns',
    array_length(v_app_types, 1);
end $$;

rollback;

-- =====================================================================
-- Section C (OPTIONAL — run AFTER applying migration 00055 to cloud):
-- confirms the LIVE projects constraint was replaced (single constraint,
-- not duplicated) and now includes 'podcast'. Expect exactly one row whose
-- definition contains 'podcast'.
-- =====================================================================
-- select conname, pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where conrelid = 'public.projects'::regclass
--   and contype = 'c'
--   and pg_get_constraintdef(oid) ilike '%project_type%';
