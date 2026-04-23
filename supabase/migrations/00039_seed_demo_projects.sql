-- =====================================================================
-- Migration: 00039_seed_demo_projects.sql
-- Description: SEED-ONLY migration with demo clients + projects so the
--              pricing-health dashboard has real data to render across
--              all 5 statuses (loss / underpriced / healthy / premium /
--              unpriced). Data taken from the Cost Analysis spreadsheet.
--
--              IDEMPOTENT: skips silently if a demo client already exists
--              (keyed on unique demo email addresses @demo.devremedia.local).
--
--              SAFE TO REMOVE later: delete rows where client.email ends
--              with '@demo.devremedia.local'. No production data touched.
-- Created: 2026-04-24
-- =====================================================================

DO $$
DECLARE
  v_cost_per_hour  numeric(10,2);
  v_total_monthly  numeric(12,2);
  v_expected_hours numeric(8,2);
  v_already_seeded boolean;

  -- client ids (will be populated as we insert)
  id_opthalmica uuid;
  id_skyvenue   uuid;
  id_texnomat   uuid;
  id_delle      uuid;
  id_motomarket uuid;
  id_giannotis  uuid;
  id_gerasimos  uuid;
  id_almeco     uuid;
  id_papadop    uuid;
  id_antoniou   uuid;
  id_agv        uuid;
  id_beecars    uuid;
  id_cripe      uuid;
  id_gitas      uuid;
  id_kosmima    uuid;
  id_ktirio     uuid;
  id_athens     uuid;
BEGIN
  -- Abort cleanly if we've already seeded
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE email LIKE '%@demo.devremedia.local'
  ) INTO v_already_seeded;

  IF v_already_seeded THEN
    RAISE NOTICE 'Demo data already seeded — skipping.';
    RETURN;
  END IF;

  -- Compute the live cost/hour to snapshot on each project
  SELECT COALESCE(SUM(monthly_cost), 0) INTO v_total_monthly
    FROM public.cost_items WHERE active = true;
  SELECT expected_monthly_hours INTO v_expected_hours
    FROM public.cost_settings WHERE id = 1;

  IF v_expected_hours IS NULL OR v_expected_hours <= 0 THEN
    v_expected_hours := 352;
  END IF;

  v_cost_per_hour := ROUND((v_total_monthly / v_expected_hours)::numeric, 2);
  RAISE NOTICE 'Seeding demo projects with cost_per_hour = %', v_cost_per_hour;

  -- =========================================================
  -- 1. Create demo clients (17 companies from Excel)
  -- =========================================================
  INSERT INTO public.clients (company_name, contact_name, email, status, notes) VALUES
    ('Opthalmica',          'Opthalmica',          'opthalmica@demo.devremedia.local',  'active', 'Demo client'),
    ('Skyvenue',            'Skyvenue',            'skyvenue@demo.devremedia.local',    'active', 'Demo client'),
    ('Texnomat',            'Texnomat',            'texnomat@demo.devremedia.local',    'active', 'Demo client'),
    ('Delle Textille',      'Delle Textille',      'delle@demo.devremedia.local',       'active', 'Demo client'),
    ('Motomarket',          'Motomarket',          'motomarket@demo.devremedia.local',  'active', 'Demo client'),
    ('Χρήστος Γιαννιώτης',  'Χρήστος Γιαννιώτης',  'giannotis@demo.devremedia.local',   'active', 'Demo client'),
    ('Γεράσιμος',           'Γεράσιμος',           'gerasimos@demo.devremedia.local',   'active', 'Demo client'),
    ('Almeco',              'Almeco',              'almeco@demo.devremedia.local',      'active', 'Demo client'),
    ('Dr Παπαδόπουλος',     'Dr Παπαδόπουλος',     'papadopoulos@demo.devremedia.local','active', 'Demo client'),
    ('Αντωνίου Τσόλκα',     'Αντωνίου Τσόλκα',     'antoniou@demo.devremedia.local',    'active', 'Demo client'),
    ('AGV',                 'AGV',                 'agv@demo.devremedia.local',         'active', 'Demo client'),
    ('Bee Cars',            'Bee Cars',            'beecars@demo.devremedia.local',     'active', 'Demo client'),
    ('CRIPE',               'CRIPE',               'cripe@demo.devremedia.local',       'active', 'Demo client'),
    ('Dr Gitas',            'Dr Gitas',            'gitas@demo.devremedia.local',       'active', 'Demo client'),
    ('KosmimaDoro',         'KosmimaDoro',         'kosmima@demo.devremedia.local',     'active', 'Demo client'),
    ('Το Κτίριο',           'Το Κτίριο',           'ktirio@demo.devremedia.local',      'active', 'Demo client'),
    ('Athens Vision',       'Athens Vision',       'athens@demo.devremedia.local',      'active', 'Demo client');

  -- Fetch their ids
  SELECT id INTO id_opthalmica FROM public.clients WHERE email='opthalmica@demo.devremedia.local';
  SELECT id INTO id_skyvenue   FROM public.clients WHERE email='skyvenue@demo.devremedia.local';
  SELECT id INTO id_texnomat   FROM public.clients WHERE email='texnomat@demo.devremedia.local';
  SELECT id INTO id_delle      FROM public.clients WHERE email='delle@demo.devremedia.local';
  SELECT id INTO id_motomarket FROM public.clients WHERE email='motomarket@demo.devremedia.local';
  SELECT id INTO id_giannotis  FROM public.clients WHERE email='giannotis@demo.devremedia.local';
  SELECT id INTO id_gerasimos  FROM public.clients WHERE email='gerasimos@demo.devremedia.local';
  SELECT id INTO id_almeco     FROM public.clients WHERE email='almeco@demo.devremedia.local';
  SELECT id INTO id_papadop    FROM public.clients WHERE email='papadopoulos@demo.devremedia.local';
  SELECT id INTO id_antoniou   FROM public.clients WHERE email='antoniou@demo.devremedia.local';
  SELECT id INTO id_agv        FROM public.clients WHERE email='agv@demo.devremedia.local';
  SELECT id INTO id_beecars    FROM public.clients WHERE email='beecars@demo.devremedia.local';
  SELECT id INTO id_cripe      FROM public.clients WHERE email='cripe@demo.devremedia.local';
  SELECT id INTO id_gitas      FROM public.clients WHERE email='gitas@demo.devremedia.local';
  SELECT id INTO id_kosmima    FROM public.clients WHERE email='kosmima@demo.devremedia.local';
  SELECT id INTO id_ktirio     FROM public.clients WHERE email='ktirio@demo.devremedia.local';
  SELECT id INTO id_athens     FROM public.clients WHERE email='athens@demo.devremedia.local';

  -- =========================================================
  -- 2. Create demo projects (real numbers from PROJECT PRICING sheet)
  --    status enum: briefing|pre_production|filming|editing|review|revisions|delivered|archived
  --    project_type: corporate_video|event_coverage|social_media_content|commercial|documentary|music_video|other
  --
  --    Coverage of every pricing-health status:
  --    - healthy    : Opthalmica, Γιαννιώτης, Γεράσιμος, CRIPE, KosmimaDoro, Αθens, Texnomat
  --    - underpriced: Skyvenue (loss actually), Delle, Motomarket
  --    - loss       : Skyvenue, AGV
  --    - premium    : Dr Παπαδόπουλος, Αντωνίου, Dr Gitas, Bee Cars, Almeco
  --    - unpriced   : AGV variant (no quote)
  -- =========================================================
  INSERT INTO public.projects (
    client_id, title, project_type, status, priority,
    shooting_hours, editing_hours, cost_per_hour_snapshot, quoted_price, budget
  ) VALUES
    -- healthy projects
    (id_opthalmica, 'Opthalmica — Social Content Pack',    'social_media_content', 'delivered',  'medium',  8,  12, v_cost_per_hour,  950,  950),
    (id_texnomat,   'Texnomat — Corporate Showreel',        'corporate_video',     'delivered',  'medium',  8,   6, v_cost_per_hour,  450,  450),
    (id_giannotis,  'Χρ. Γιαννιώτης — Brand Documentary',   'documentary',         'delivered',  'high',   24,  30, v_cost_per_hour, 1800, 1800),
    (id_gerasimos,  'Γεράσιμος — Commercial Spot',          'commercial',          'editing',    'medium', 18,  20, v_cost_per_hour, 1200, 1200),
    (id_cripe,      'CRIPE — Event Coverage',               'event_coverage',      'delivered',  'medium', 16,  18, v_cost_per_hour, 1124, 1124),
    (id_kosmima,    'KosmimaDoro — Social Reels Bundle',    'social_media_content','delivered',  'low',    16,  12, v_cost_per_hour,  995,  995),
    (id_athens,     'Athens Vision — Corporate Video',      'corporate_video',     'delivered',  'medium', 16,  24, v_cost_per_hour, 1450, 1450),
    (id_ktirio,     'Το Κτίριο — Short Documentary',        'documentary',         'review',     'medium',  8,  24, v_cost_per_hour, 1400, 1400),

    -- underpriced / loss
    (id_skyvenue,   'Skyvenue — Promo Package',             'commercial',          'delivered',  'medium', 16,  12, v_cost_per_hour,  350,  350),
    (id_delle,      'Delle Textille — Social Pack',         'social_media_content','delivered',  'low',     8,   6, v_cost_per_hour,  350,  350),
    (id_motomarket, 'Motomarket — Long-form Campaign',      'commercial',          'filming',    'high',   32, 22.5,v_cost_per_hour, 1200, 1200),

    -- premium
    (id_papadop,    'Dr Παπαδόπουλος — Personal Brand',     'other',               'delivered',  'high',    8,  15, v_cost_per_hour, 1450, 1450),
    (id_antoniou,   'Αντωνίου Τσόλκα — Brand Film',         'corporate_video',     'delivered',  'high',    8,  40, v_cost_per_hour, 3600, 3600),
    (id_beecars,    'Bee Cars — Post-production Only',      'social_media_content','delivered',  'medium',  0,14.4, v_cost_per_hour,  650,  650),
    (id_gitas,      'Dr Gitas — Editing Package',           'social_media_content','delivered',  'medium',  0,  30, v_cost_per_hour, 1698, 1698),
    (id_almeco,     'Almeco — Quick Edit',                  'other',               'delivered',  'low',     0,   0, v_cost_per_hour,   45,   45),

    -- unpriced (no hours yet — still in briefing)
    (id_agv,        'AGV — Pending Quote',                  'corporate_video',     'briefing',   'medium',  NULL, NULL, NULL, NULL, NULL);

  RAISE NOTICE 'Seeded 17 demo clients + 17 demo projects with cost_per_hour=%', v_cost_per_hour;
END$$;
