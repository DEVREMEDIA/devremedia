-- =====================================================================
-- 00063 — Per-Client Agreement (#75)
--
-- Records, per Client, the Package they currently hold plus the monthly
-- price agreed with that Client specifically. The Agreement is the source
-- of truth for "which Package may this Client book" (read by later booking
-- slices). Prices recorded here are admin-internal.
--
--   * Can be set by hand — no Contract is required.
--   * May be pre-filled from a signed Contract whose service maps to a
--     Package (done in the action layer; not enforced here).
--   * A Client has at most one ACTIVE Agreement at a time (partial unique
--     index below). Renewals/upgrades update that active row in place.
-- =====================================================================

create table if not exists public.client_agreements (
  id                    uuid        primary key default gen_random_uuid(),
  client_id             uuid        not null references public.clients(id) on delete cascade,
  package_id            uuid        not null references public.proposal_packages(id) on delete restrict,
  agreed_monthly_price  numeric(12,2) not null check (agreed_monthly_price >= 0),
  active                boolean     not null default true,
  created_by            uuid        references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_client_agreements_client
  on public.client_agreements (client_id);

-- At most one ACTIVE Agreement per Client.
create unique index if not exists uq_client_agreements_one_active
  on public.client_agreements (client_id)
  where active;

-- ---------------------------------------------------------------------
-- updated_at trigger (reuse cost_model_touch_updated_at from 00037)
-- ---------------------------------------------------------------------

drop trigger if exists trg_client_agreements_updated_at on public.client_agreements;
create trigger trg_client_agreements_updated_at
  before update on public.client_agreements
  for each row execute function public.cost_model_touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS — admin / super_admin only
-- ---------------------------------------------------------------------

alter table public.client_agreements enable row level security;

create policy "Admins full access to client_agreements"
  on public.client_agreements for all
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
