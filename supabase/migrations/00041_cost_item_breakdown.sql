-- =====================================================================
-- Migration: 00041_cost_item_breakdown.sql
-- Description: Sub-items for cost_items. Users can break a single line
--              (e.g. "Συνδρομές 150€") into components (Netflix 10, Adobe 50,
--              ...). When a cost_item has at least one active breakdown row,
--              its monthly_cost becomes the auto-sum of its children via
--              trigger, so pricing_health sees a single source of truth.
-- Created: 2026-04-24
-- =====================================================================

create table if not exists public.cost_item_breakdown (
  id            uuid primary key default gen_random_uuid(),
  cost_item_id  uuid not null references public.cost_items(id) on delete cascade,
  name          text not null,
  monthly_cost  numeric(12,2) not null default 0,
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_by    uuid references auth.users(id) on delete set null
);

create index if not exists idx_cost_item_breakdown_item
  on public.cost_item_breakdown(cost_item_id);
create index if not exists idx_cost_item_breakdown_sort
  on public.cost_item_breakdown(sort_order);

-- =====================================================================
-- updated_at trigger (reuses update_updated_at() from 00017)
-- =====================================================================

create trigger trg_cost_item_breakdown_updated_at
  before update on public.cost_item_breakdown
  for each row
  execute function public.update_updated_at();

-- =====================================================================
-- Auto-sum parent trigger
-- When breakdown rows change, recompute parent cost_items.monthly_cost
-- as SUM(active children). If no active children remain, the parent
-- retains whatever value it had (trigger exits without UPDATE).
-- =====================================================================

create or replace function public.sync_cost_item_total_from_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_sum     numeric(12,2);
  v_count   int;
begin
  v_item_id := coalesce(new.cost_item_id, old.cost_item_id);

  select coalesce(sum(monthly_cost), 0), count(*)
    into v_sum, v_count
    from public.cost_item_breakdown
    where cost_item_id = v_item_id and active = true;

  if v_count > 0 then
    update public.cost_items
      set monthly_cost = v_sum, updated_at = now()
      where id = v_item_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_cost_item_breakdown_sync
  after insert or update or delete on public.cost_item_breakdown
  for each row
  execute function public.sync_cost_item_total_from_breakdown();

-- =====================================================================
-- RLS — admin-only (same policy shape as cost_items)
-- =====================================================================

alter table public.cost_item_breakdown enable row level security;

create policy "admins manage cost_item_breakdown"
  on public.cost_item_breakdown
  for all
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'admin')
    )
  );
