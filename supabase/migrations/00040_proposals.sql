-- =====================================================================
-- Migration: 00040_proposals.sql
-- Description: Dynamic proposal packages + proposals.
--              - proposal_packages: admin-managed Pack A/B/C/... with
--                either manual pricing or auto (hours × cost/hour × margin)
--              - proposals: individual offers to leads/clients with
--                selected packages + custom content fields
--
--              Package prices auto-mode are recomputed at render time from
--              the current cost_settings (we do NOT freeze here — packages
--              are marketing catalogue, not project-specific quotes).
-- Created: 2026-04-24
-- =====================================================================

-- =====================================================================
-- 1. PROPOSAL PACKAGES (dynamic catalogue)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.proposal_packages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                     -- e.g. 'Pack A - 8 videos'
  video_count     int,                               -- informational
  shooting_days   int,                               -- informational
  shooting_hours  numeric(8,2) NOT NULL DEFAULT 0,
  editing_hours   numeric(8,2) NOT NULL DEFAULT 0,
  price_mode      text NOT NULL DEFAULT 'manual'
                  CHECK (price_mode IN ('manual', 'auto')),
  manual_price    numeric(12,2),                     -- used when price_mode='manual'
  description     text,
  inclusions      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ["2 ημέρες γυρίσματα", "8 ready to use videos"]
  sort_order      int NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_packages_sort   ON public.proposal_packages(sort_order);
CREATE INDEX IF NOT EXISTS idx_proposal_packages_active ON public.proposal_packages(active);

-- =====================================================================
-- 2. PROPOSALS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.proposals (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 uuid REFERENCES public.leads(id)   ON DELETE SET NULL,
  client_id               uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  client_name             text NOT NULL,                  -- shown on the PDF cover
  competitive_advantage   text,                           -- [ΑΝΤΑΓΩΝΙΣΤΙΚΟ ΠΛΕΟΝΕΚΤΗΜΑ]
  client_need             text,                           -- free-form
  selected_packages       jsonb NOT NULL DEFAULT '[]'::jsonb,
                          -- array of { package_id, price_override?, label_override? }
  include_discount        boolean NOT NULL DEFAULT false, -- toggles the -10% "γνωριμίας" page
  valid_until             date,
  pdf_path                text,                           -- storage path (optional cache)
  notes                   text,                           -- internal
  locale                  text NOT NULL DEFAULT 'el'
                          CHECK (locale IN ('el','en')),
  sent_at                 timestamptz,
  responded_at            timestamptz,
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_status      ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id     ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id   ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at  ON public.proposals(created_at DESC);

-- =====================================================================
-- 3. updated_at triggers
-- =====================================================================

CREATE OR REPLACE FUNCTION public.proposals_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_packages_updated_at ON public.proposal_packages;
CREATE TRIGGER trg_proposal_packages_updated_at
  BEFORE UPDATE ON public.proposal_packages
  FOR EACH ROW EXECUTE FUNCTION public.proposals_touch_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_touch_updated_at();

-- =====================================================================
-- 4. RLS — admin / super_admin only (for now; clients see via public link)
-- =====================================================================

ALTER TABLE public.proposal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to proposal_packages"
  ON public.proposal_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
             WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
             WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

CREATE POLICY "Admins full access to proposals"
  ON public.proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
             WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
             WHERE id = auth.uid() AND role IN ('super_admin','admin'))
  );

-- =====================================================================
-- 5. SEED initial packages from the PDF proposal template (editable after)
-- =====================================================================

INSERT INTO public.proposal_packages
  (name, video_count, shooting_days, shooting_hours, editing_hours,
   price_mode, manual_price, description, inclusions, sort_order)
SELECT * FROM (VALUES
  ('Pack A - 8 videos',  8,  2, 16, 24, 'manual', 1170.00,
   'Social-first content production.',
   '["2 ημέρες γυρίσματα", "8 ready to use videos"]'::jsonb, 10),
  ('Pack B - 12 videos', 12, 2, 24, 22.5, 'manual', 1360.00,
   'Social-first content production.',
   '["2 ημέρες γυρίσματα", "12 ready to use videos"]'::jsonb, 20),
  ('Pack C - 20 videos', 20, 2, 24, 52, 'manual', 2220.00,
   'Social-first content production.',
   '["2 ημέρες γυρίσματα", "20 ready to use videos"]'::jsonb, 30)
) AS s(name, video_count, shooting_days, shooting_hours, editing_hours,
       price_mode, manual_price, description, inclusions, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.proposal_packages WHERE active = true
);
