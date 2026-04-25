# Admin Dashboard Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/admin/dashboard` into a role-aware panoramic business cockpit with hero KPIs, today agenda, risk panel, sales/finance/production sections, and business velocity.

**Architecture:** Server-rendered page (`page.tsx`) reads role from `user_profiles`, branches into super_admin (full panorama) or admin (operational only) layout. Each section is a server component that fetches from a dedicated query in `src/lib/queries/dashboard/*` and renders into typed cards. Two new migrations add `proposals.project_id` and `cost_settings.dashboard_thresholds`.

**Tech Stack:** Next.js 16 App Router, Server Components, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS 4, shadcn/ui (Card/Badge/Skeleton), recharts (sparkline + bar chart), next-intl, lucide-react, Zod 4.

**Verification model:** No unit test framework in this repo. Verification is via:
1. `pnpm type-check` (TypeScript strict)
2. `pnpm lint`
3. `pnpm build`
4. Playwright E2E (`pnpm test:e2e`)
5. Manual smoke test in `pnpm dev`

**Spec:** `docs/superpowers/specs/2026-04-25-admin-dashboard-refactor-design.md`

---

## File map

**Created:**
- `supabase/migrations/00042_proposals_project_link.sql`
- `supabase/migrations/00043_dashboard_thresholds.sql`
- `src/types/dashboard.ts`
- `src/lib/queries/dashboard/_utils.ts`
- `src/lib/queries/dashboard/kpi-hero.ts`
- `src/lib/queries/dashboard/today.ts`
- `src/lib/queries/dashboard/risk.ts`
- `src/lib/queries/dashboard/sales.ts`
- `src/lib/queries/dashboard/finance.ts`
- `src/lib/queries/dashboard/production.ts`
- `src/lib/queries/dashboard/velocity.ts`
- `src/components/admin/dashboard/shared/delta-badge.tsx`
- `src/components/admin/dashboard/shared/exception-badge.tsx`
- `src/components/admin/dashboard/shared/age-badge.tsx`
- `src/components/admin/dashboard/shared/sparkline.tsx`
- `src/components/admin/dashboard/hero/kpi-card.tsx`
- `src/components/admin/dashboard/hero/kpi-strip.tsx`
- `src/components/admin/dashboard/today/today-item.tsx`
- `src/components/admin/dashboard/today/today-agenda.tsx`
- `src/components/admin/dashboard/risk/risk-item.tsx`
- `src/components/admin/dashboard/risk/risk-panel.tsx`
- `src/components/admin/dashboard/sales/sales-funnel-card.tsx`
- `src/components/admin/dashboard/sales/revenue-forecast-card.tsx`
- `src/components/admin/dashboard/finance/cost-health-card.tsx`
- `src/components/admin/dashboard/finance/project-profitability-card.tsx`
- `src/components/admin/dashboard/production/crew-load-heatmap.tsx`
- `src/components/admin/dashboard/production/upcoming-deadlines-grouped.tsx`
- `src/components/admin/dashboard/velocity/business-velocity.tsx`
- `src/app/admin/dashboard/risk/page.tsx`
- `e2e/admin-dashboard.spec.ts`

**Modified:**
- `src/lib/schemas/cost-model.ts` (add `dashboardThresholdsSchema`)
- `src/app/admin/dashboard/page.tsx` (full rewrite)
- `src/app/admin/cost-model/page.tsx` (add thresholds editor card)
- `messages/el.json` (add `dashboard.*` namespace keys)
- `messages/en.json` (add `dashboard.*` namespace keys)

**Deleted:**
- `src/components/admin/dashboard/today-tasks.tsx`
- `src/components/admin/dashboard/pending-actions.tsx`
- `src/components/admin/dashboard/kpi-cards.tsx`
- `src/components/admin/dashboard/revenue-chart.tsx`
- `src/components/admin/dashboard/project-status-chart.tsx`

`src/components/admin/dashboard/activity-feed.tsx` is **kept** — used in footer.

---

## Conventions

- Every query file starts with `'use server';`
- Every server query function returns a typed plain object, never throws — wrap DB calls in try/catch and return safe defaults on error
- Server Components by default; `'use client'` only for interactive parts (sparkline, expand/collapse, hover)
- All currency formatted with `new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' })`
- Use `useTranslations('dashboard.*')` for all visible strings
- Per-section error: section component wraps fetch in try/catch and renders an `<EmptyState>` with `{t('loadError')}`
- File length limit: split when >300 lines

---

## Task 1: Migration 00042 — proposals.project_id

**Files:**
- Create: `supabase/migrations/00042_proposals_project_link.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- =====================================================================
-- Migration 00042 — proposals.project_id
-- Purpose: Link a proposal to the project it spawned, enabling the
--          sales funnel + revenue realization queries on the dashboard.
-- Created: 2026-04-25
-- =====================================================================

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_project_id
  ON public.proposals(project_id);

COMMENT ON COLUMN public.proposals.project_id IS
  'Set when an accepted proposal is converted into a project; nullable for drafts/rejected/expired.';
```

- [ ] **Step 2: Verify SQL parses**

Run: `psql -d postgres -f supabase/migrations/00042_proposals_project_link.sql --dry-run` if local Supabase available, otherwise visually inspect.

Expected: no syntax errors. Migration is idempotent (`IF NOT EXISTS`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00042_proposals_project_link.sql
git commit -m "feat(db): add proposals.project_id link"
```

---

## Task 2: Migration 00043 — dashboard_thresholds

**Files:**
- Create: `supabase/migrations/00043_dashboard_thresholds.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- =====================================================================
-- Migration 00043 — cost_settings.dashboard_thresholds
-- Purpose: Configurable thresholds for dashboard risk panel and KPI
--          exception flags. Singleton cost_settings row id=1.
-- Created: 2026-04-25
-- =====================================================================

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS dashboard_thresholds jsonb NOT NULL DEFAULT '{
    "stale_lead_days": 14,
    "stale_deliverable_days": 7,
    "stale_contract_days": 14,
    "deadline_risk_days": 7,
    "active_projects_warn_above": 50
  }'::jsonb;

COMMENT ON COLUMN public.cost_settings.dashboard_thresholds IS
  'Dashboard risk + exception thresholds, editable from /admin/cost-model.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00043_dashboard_thresholds.sql
git commit -m "feat(db): add dashboard thresholds to cost_settings"
```

---

## Task 3: Update Zod schema for cost_settings dashboard_thresholds

**Files:**
- Modify: `src/lib/schemas/cost-model.ts`

- [ ] **Step 1: Append thresholds schema to cost-model.ts**

Add at the end of `src/lib/schemas/cost-model.ts`:

```typescript
// ---------------------------------------------------------------------
// Dashboard thresholds (sub-object inside cost_settings.dashboard_thresholds)
// ---------------------------------------------------------------------

export const dashboardThresholdsSchema = z.object({
  stale_lead_days: z
    .number()
    .int()
    .min(1, 'Πρέπει να είναι τουλάχιστον 1 μέρα')
    .max(365, 'Μέγιστο 365 μέρες')
    .default(14),
  stale_deliverable_days: z.number().int().min(1).max(365).default(7),
  stale_contract_days: z.number().int().min(1).max(365).default(14),
  deadline_risk_days: z.number().int().min(1).max(365).default(7),
  active_projects_warn_above: z.number().int().min(1).max(10_000).default(50),
});
export type DashboardThresholdsInput = z.input<typeof dashboardThresholdsSchema>;
export type DashboardThresholdsOutput = z.output<typeof dashboardThresholdsSchema>;
```

Then extend `costSettingsSchema` to include the new field as optional (not required for existing callers):

Find:
```typescript
  deposit_percent: z.number().min(0).max(1, 'Προκαταβολή 0-100%'),
});
```

Replace with:
```typescript
  deposit_percent: z.number().min(0).max(1, 'Προκαταβολή 0-100%'),
  dashboard_thresholds: dashboardThresholdsSchema.optional(),
});
```

(Order matters: `dashboardThresholdsSchema` declaration must come BEFORE the modified `costSettingsSchema`. If the existing schema sits above the dashboard schema, hoist `dashboardThresholdsSchema` above it.)

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/cost-model.ts
git commit -m "feat(schema): add dashboard thresholds Zod schema"
```

---

## Task 4: Dashboard types

**Files:**
- Create: `src/types/dashboard.ts`

- [ ] **Step 1: Write all dashboard types**

```typescript
import type { DashboardThresholdsOutput } from '@/lib/schemas/cost-model';

// ---------------------------------------------------------------------
// Hero KPI strip
// ---------------------------------------------------------------------

export type KpiMetric = {
  value: number;
  previous: number | null;
  deltaPct: number | null;
  sparkline?: number[];
  exception: boolean;
};

export type KpiHero = {
  revenueMtd: KpiMetric;
  pipeline: KpiMetric;
  activeProjects: KpiMetric;
  profitMargin: KpiMetric;
  cashOverdue: KpiMetric;
  atRiskCount: KpiMetric;
};

// ---------------------------------------------------------------------
// Today agenda
// ---------------------------------------------------------------------

export type TodayItemKind =
  | 'filming'
  | 'meeting'
  | 'task'
  | 'project_start'
  | 'project_deadline'
  | 'invoice_due'
  | 'deliverable_pending';

export type TodayItem = {
  id: string;
  kind: TodayItemKind;
  title: string;
  subtitle?: string;
  time?: string | null; // HH:mm or null for all-day
  href: string;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  badge?: { label: string; tone: 'default' | 'destructive' | 'secondary' | 'outline' };
};

// ---------------------------------------------------------------------
// Risk panel
// ---------------------------------------------------------------------

export type RiskType =
  | 'overdue_invoice'
  | 'stale_lead'
  | 'stale_deliverable'
  | 'unsigned_contract'
  | 'deadline_risk'
  | 'filming_no_crew';

export type RiskItem = {
  id: string;
  type: RiskType;
  severity: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  ageDays: number;
  href: string;
};

// ---------------------------------------------------------------------
// Sales funnel + forecast
// ---------------------------------------------------------------------

export type FunnelStage = {
  key: 'filming_requests' | 'leads_open' | 'proposals_sent' | 'won' | 'active_projects';
  count: number;
};

export type SalesFunnel = {
  stages: FunnelStage[];
  conversions: { fromKey: string; toKey: string; ratePct: number }[];
};

export type RevenueForecast = {
  confirmed: number; // confirmed next 30d
  likely: number; // weighted next 30-90d
  pipeline: number; // total open uncalibrated
  expectedTotal90d: number;
};

// ---------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------

export type CostHealth = {
  totalMonthlyCost: number;
  costPerHour: number;
  expectedMonthlyHours: number;
  categories: { name: string; total: number }[];
  avgProjectMargin90d: number | null;
  targetMargin: number;
  marginOnTarget: boolean;
};

export type ProjectProfitabilityRow = {
  projectId: string;
  title: string;
  clientName: string | null;
  quotedPrice: number;
  cost: number;
  marginAmount: number;
  marginPct: number;
};

export type ProjectProfitability = {
  topProfitable: ProjectProfitabilityRow[];
  topUnprofitable: ProjectProfitabilityRow[];
};

// ---------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------

export type CrewLoadCell = { date: string; count: number }; // date = YYYY-MM-DD

export type CrewLoadRow = {
  crewMemberId: string | null; // null = "Unassigned"
  crewMemberName: string;
  days: CrewLoadCell[];
};

export type DeadlineGroup = {
  atRisk: DeadlineProject[];
  onTrack: DeadlineProject[];
  recentlyDelivered: DeadlineProject[];
};

export type DeadlineProject = {
  projectId: string;
  title: string;
  clientName: string | null;
  deadline: string;
  status: string;
  daysUntilDeadline: number;
};

// ---------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------

export type VelocityCounter = {
  count: number;
  sum?: number; // monetary aggregation where applicable
  deltaVsPrevious: number; // signed integer count delta
};

export type BusinessVelocity = {
  projectsCreated: VelocityCounter;
  projectsDelivered: VelocityCounter;
  invoicesPaid: VelocityCounter;
  contractsSigned: VelocityCounter;
  proposalsSent: VelocityCounter;
};

// ---------------------------------------------------------------------
// Re-export thresholds for convenience
// ---------------------------------------------------------------------

export type { DashboardThresholdsOutput };
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types/dashboard.ts
git commit -m "feat(types): add dashboard panorama types"
```

---

## Task 5: Date/period utilities for dashboard queries

**Files:**
- Create: `src/lib/queries/dashboard/_utils.ts`

- [ ] **Step 1: Write utility helpers**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { DashboardThresholdsOutput } from '@/lib/schemas/cost-model';

const DEFAULT_THRESHOLDS: DashboardThresholdsOutput = {
  stale_lead_days: 14,
  stale_deliverable_days: 7,
  stale_contract_days: 14,
  deadline_risk_days: 7,
  active_projects_warn_above: 50,
};

export async function getDashboardThresholds(): Promise<DashboardThresholdsOutput> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_settings')
      .select('dashboard_thresholds')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.dashboard_thresholds) return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...(data.dashboard_thresholds as Partial<DashboardThresholdsOutput>) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

export function daysAheadIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function startOfMonthIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().split('T')[0];
}

export function startOfPreviousMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().split('T')[0];
}

export function calcDeltaPct(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function ageDays(fromIso: string): number {
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Build a daily sparkline for the last N days from rows of {date, value}.
 * Missing days are filled with 0.
 */
export function buildDailySparkline(
  rows: { date: string; value: number }[],
  days: number,
): number[] {
  const map = new Map(rows.map((r) => [r.date, r.value]));
  const result: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(map.get(key) ?? 0);
  }
  return result;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/_utils.ts
git commit -m "feat(queries): dashboard date and threshold utilities"
```

---

## Task 6: getKpiHero query

**Files:**
- Create: `src/lib/queries/dashboard/kpi-hero.ts`

- [ ] **Step 1: Write the query**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { KpiHero, KpiMetric } from '@/types/dashboard';
import {
  buildDailySparkline,
  calcDeltaPct,
  daysAgoIso,
  getDashboardThresholds,
  startOfMonthIso,
  startOfPreviousMonthIso,
  todayIso,
} from './_utils';

const EMPTY_METRIC: KpiMetric = { value: 0, previous: null, deltaPct: null, exception: false };

export async function getKpiHero(): Promise<KpiHero> {
  try {
    const supabase = await createClient();
    const thresholds = await getDashboardThresholds();
    const today = todayIso();
    const monthStart = startOfMonthIso();
    const prevMonthStart = startOfPreviousMonthIso();

    const [
      revenueCurrent,
      revenuePrev,
      revenueDaily,
      pipelineLeads,
      activeProjectsRow,
      profitMarginCurrent,
      profitMarginPrev,
      cashOverdueRow,
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', monthStart),
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', prevMonthStart)
        .lt('paid_at', monthStart),
      supabase
        .from('invoices')
        .select('paid_at, total')
        .eq('status', 'paid')
        .gte('paid_at', daysAgoIso(30))
        .order('paid_at', { ascending: true }),
      supabase
        .from('leads')
        .select('deal_value, probability')
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(delivered,archived)'),
      supabase.rpc('get_profit_margin_window', {
        p_from: daysAgoIso(30),
        p_to: today,
      }),
      supabase.rpc('get_profit_margin_window', {
        p_from: daysAgoIso(60),
        p_to: daysAgoIso(30),
      }),
      supabase
        .from('invoices')
        .select('total')
        .or(`status.eq.overdue,and(status.in.(sent,viewed),due_date.lt.${today})`),
    ]);

    // Revenue MTD
    const revenueValue = (revenueCurrent.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );
    const revenuePrevValue = (revenuePrev.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );

    const dailyBuckets: Record<string, number> = {};
    (revenueDaily.data ?? []).forEach((r: { paid_at: string | null; total: number | null }) => {
      if (!r.paid_at) return;
      const day = r.paid_at.split('T')[0];
      dailyBuckets[day] = (dailyBuckets[day] ?? 0) + (r.total ?? 0);
    });
    const revenueSparkline = buildDailySparkline(
      Object.entries(dailyBuckets).map(([date, value]) => ({ date, value })),
      30,
    );

    const revenueMtd: KpiMetric = {
      value: revenueValue,
      previous: revenuePrevValue,
      deltaPct: calcDeltaPct(revenueValue, revenuePrevValue),
      sparkline: revenueSparkline,
      exception: false,
    };

    // Pipeline (weighted)
    const pipelineValue = (pipelineLeads.data ?? []).reduce(
      (sum: number, l: { deal_value: number | null; probability: number | null }) =>
        sum + (l.deal_value ?? 0) * ((l.probability ?? 0) / 100),
      0,
    );
    const pipeline: KpiMetric = {
      value: pipelineValue,
      previous: null,
      deltaPct: null,
      exception: false,
    };

    // Active projects
    const activeCount = activeProjectsRow.count ?? 0;
    const activeProjects: KpiMetric = {
      value: activeCount,
      previous: null,
      deltaPct: null,
      exception: activeCount > thresholds.active_projects_warn_above,
    };

    // Profit margin (rolling 30d) — RPC may not exist; fall back to null
    const profitMarginValue = readRpcMargin(profitMarginCurrent.data);
    const profitMarginPrevValue = readRpcMargin(profitMarginPrev.data);
    const targetMargin = thresholds.deadline_risk_days; // unused — actual target read below

    const { data: settingsRow } = await supabase
      .from('cost_settings')
      .select('default_margin')
      .eq('id', 1)
      .maybeSingle();
    const target = Number(settingsRow?.default_margin ?? 0.6);

    const profitMargin: KpiMetric = {
      value: profitMarginValue ?? 0,
      previous: profitMarginPrevValue,
      deltaPct: calcDeltaPct(profitMarginValue ?? 0, profitMarginPrevValue),
      exception: profitMarginValue != null && profitMarginValue < target,
    };

    // Cash overdue
    const cashValue = (cashOverdueRow.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );
    const cashOverdue: KpiMetric = {
      value: cashValue,
      previous: null,
      deltaPct: null,
      exception: cashValue > 0,
    };

    // At-risk count is computed by getRiskItems — we just count its result
    const { getRiskItems } = await import('./risk');
    const risks = await getRiskItems();
    const atRiskCount: KpiMetric = {
      value: risks.length,
      previous: null,
      deltaPct: null,
      exception: risks.length > 0,
    };

    void targetMargin; // silence unused
    return { revenueMtd, pipeline, activeProjects, profitMargin, cashOverdue, atRiskCount };
  } catch {
    return {
      revenueMtd: EMPTY_METRIC,
      pipeline: EMPTY_METRIC,
      activeProjects: EMPTY_METRIC,
      profitMargin: EMPTY_METRIC,
      cashOverdue: EMPTY_METRIC,
      atRiskCount: EMPTY_METRIC,
    };
  }
}

function readRpcMargin(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === 'number') return data;
  if (Array.isArray(data) && data.length > 0 && typeof data[0]?.margin === 'number') {
    return data[0].margin;
  }
  return null;
}
```

**Note:** This query depends on a Postgres function `get_profit_margin_window(p_from, p_to)` that does not yet exist. Add it as part of this task:

In `supabase/migrations/00043_dashboard_thresholds.sql` (extend that migration — it has not been applied yet), append:

```sql
-- Profit margin RPC for dashboard hero KPI
CREATE OR REPLACE FUNCTION public.get_profit_margin_window(p_from date, p_to date)
RETURNS TABLE(margin numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN COALESCE(SUM(i.total), 0) = 0 THEN 0
      ELSE (
        COALESCE(SUM(i.total), 0) - COALESCE((
          SELECT SUM(amount) FROM expenses
          WHERE date >= p_from AND date < p_to
        ), 0)
      ) / NULLIF(SUM(i.total), 0)
    END
  FROM invoices i
  WHERE i.status = 'paid'
    AND i.paid_at >= p_from
    AND i.paid_at < p_to;
$$;
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/kpi-hero.ts supabase/migrations/00043_dashboard_thresholds.sql
git commit -m "feat(queries): hero KPI strip aggregator + profit margin RPC"
```

---

## Task 7: getTodayAgenda query

**Files:**
- Create: `src/lib/queries/dashboard/today.ts`

- [ ] **Step 1: Write the query**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { TodayItem } from '@/types/dashboard';
import { todayIso } from './_utils';

export async function getTodayAgenda(): Promise<TodayItem[]> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const tomorrow = (() => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    const [filming, meetings, tasks, projectStarts, projectDeadlines, invoicesDue, deliverables] =
      await Promise.all([
        supabase
          .from('calendar_events')
          .select(
            'id, title, description, start_date, all_day, assigned_to, project_id, ' +
              'assignee:user_profiles!calendar_events_assigned_to_fkey(display_name, avatar_url)',
          )
          .eq('event_type', 'filming')
          .gte('start_date', today)
          .lt('start_date', tomorrow),
        supabase
          .from('calendar_events')
          .select(
            'id, title, description, start_date, all_day, event_type, assigned_to, ' +
              'assignee:user_profiles!calendar_events_assigned_to_fkey(display_name, avatar_url)',
          )
          .in('event_type', ['meeting', 'reminder'])
          .gte('start_date', today)
          .lt('start_date', tomorrow),
        supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, project_id, project:projects(title), ' +
              'assignee:user_profiles!tasks_assigned_to_fkey(display_name, avatar_url)',
          )
          .or(`due_date.eq.${today},and(due_date.lt.${today},status.neq.done)`)
          .neq('status', 'done')
          .order('due_date', { ascending: true })
          .limit(20),
        supabase
          .from('projects')
          .select('id, title, start_date, client:clients(contact_name)')
          .eq('start_date', today)
          .not('status', 'eq', 'archived'),
        supabase
          .from('projects')
          .select('id, title, deadline, status, client:clients(contact_name)')
          .eq('deadline', today)
          .not('status', 'in', '(delivered,archived)'),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, client:clients(contact_name)')
          .eq('due_date', today)
          .in('status', ['sent', 'viewed']),
        supabase
          .from('deliverables')
          .select('id, title, project_id, project:projects(title)')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: true })
          .limit(10),
      ]);

    const items: TodayItem[] = [];

    // Filming
    (filming.data ?? []).forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      items.push({
        id: `filming-${row.id}`,
        kind: 'filming',
        title: row.title,
        subtitle: row.description ?? undefined,
        time: row.all_day ? null : new Date(row.start_date).toISOString().substring(11, 16),
        href: row.project_id ? `/admin/projects/${row.project_id}` : '/admin/calendar',
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
      });
    });

    // Meetings + reminders
    (meetings.data ?? []).forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      items.push({
        id: `meeting-${row.id}`,
        kind: 'meeting',
        title: row.title,
        subtitle: row.description ?? undefined,
        time: row.all_day ? null : new Date(row.start_date).toISOString().substring(11, 16),
        href: '/admin/calendar',
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
      });
    });

    // Tasks
    (tasks.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      const overdue = row.due_date && row.due_date < today;
      items.push({
        id: `task-${row.id}`,
        kind: 'task',
        title: row.title,
        subtitle: project?.title ?? undefined,
        time: null,
        href: `/admin/projects/${row.project_id}/tasks`,
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
        badge: overdue ? { label: 'Overdue', tone: 'destructive' } : { label: row.priority, tone: 'secondary' },
      });
    });

    // Project starts
    (projectStarts.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `project-start-${row.id}`,
        kind: 'project_start',
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/projects/${row.id}`,
      });
    });

    // Project deadlines
    (projectDeadlines.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `project-deadline-${row.id}`,
        kind: 'project_deadline',
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/projects/${row.id}`,
        badge: { label: row.status, tone: 'outline' },
      });
    });

    // Invoices due
    (invoicesDue.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `invoice-${row.id}`,
        kind: 'invoice_due',
        title: `Invoice ${row.invoice_number}`,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/invoices/${row.id}`,
      });
    });

    // Deliverables pending review
    (deliverables.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      items.push({
        id: `deliverable-${row.id}`,
        kind: 'deliverable_pending',
        title: row.title,
        subtitle: project?.title ?? undefined,
        time: null,
        href: `/admin/projects/${row.project_id}`,
      });
    });

    return items;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/today.ts
git commit -m "feat(queries): today agenda aggregator (calendar + tasks + projects + invoices + deliverables)"
```

---

## Task 8: getRiskItems query

**Files:**
- Create: `src/lib/queries/dashboard/risk.ts`

- [ ] **Step 1: Write the query**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { RiskItem } from '@/types/dashboard';
import { ageDays, daysAgoIso, daysAheadIso, getDashboardThresholds, todayIso } from './_utils';

export async function getRiskItems(): Promise<RiskItem[]> {
  try {
    const supabase = await createClient();
    const t = await getDashboardThresholds();
    const today = todayIso();

    const [overdueInv, staleLeads, staleDeliv, unsigned, deadlineRisk, filmingNoCrew] =
      await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, client:clients(contact_name)')
          .or(`status.eq.overdue,and(status.in.(sent,viewed),due_date.lt.${today})`),
        supabase
          .from('leads')
          .select('id, contact_name, company_name, stage, last_contacted_at, created_at')
          .in('stage', ['contacted', 'qualified', 'proposal', 'negotiation']),
        supabase
          .from('deliverables')
          .select('id, title, project_id, created_at, project:projects(title)')
          .eq('status', 'pending_review')
          .lt('created_at', daysAgoIso(t.stale_deliverable_days)),
        supabase
          .from('contracts')
          .select('id, title, sent_at, client:clients(contact_name)')
          .in('status', ['sent', 'viewed'])
          .lt('sent_at', daysAgoIso(t.stale_contract_days)),
        supabase
          .from('projects')
          .select('id, title, deadline, status')
          .gte('deadline', today)
          .lte('deadline', daysAheadIso(t.deadline_risk_days))
          .not('status', 'in', '(review,delivered,archived)'),
        supabase
          .from('calendar_events')
          .select('id, title, start_date')
          .eq('event_type', 'filming')
          .is('assigned_to', null)
          .gte('start_date', today),
      ]);

    const items: RiskItem[] = [];

    (overdueInv.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `overdue-${row.id}`,
        type: 'overdue_invoice',
        severity: 1,
        title: `Invoice ${row.invoice_number}`,
        subtitle: `${client?.contact_name ?? '—'} · €${Number(row.total ?? 0).toFixed(2)}`,
        ageDays: row.due_date ? ageDays(row.due_date) : 0,
        href: `/admin/invoices/${row.id}`,
      });
    });

    (staleLeads.data ?? []).forEach((row: any) => {
      const lastTouch = row.last_contacted_at ?? row.created_at;
      const age = ageDays(lastTouch);
      if (age < t.stale_lead_days) return;
      items.push({
        id: `stale-lead-${row.id}`,
        type: 'stale_lead',
        severity: 3,
        title: row.contact_name ?? row.company_name ?? 'Lead',
        subtitle: `${row.stage} · no activity ${age}d`,
        ageDays: age,
        href: `/admin/leads/${row.id}`,
      });
    });

    (staleDeliv.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      items.push({
        id: `stale-deliv-${row.id}`,
        type: 'stale_deliverable',
        severity: 2,
        title: row.title,
        subtitle: project?.title ?? undefined,
        ageDays: ageDays(row.created_at),
        href: `/admin/projects/${row.project_id}`,
      });
    });

    (unsigned.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `unsigned-${row.id}`,
        type: 'unsigned_contract',
        severity: 2,
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        ageDays: row.sent_at ? ageDays(row.sent_at) : 0,
        href: `/admin/contracts/${row.id}`,
      });
    });

    (deadlineRisk.data ?? []).forEach((row: any) => {
      const days = ageDays(row.deadline);
      const remaining = -days; // negative because deadline is in future
      items.push({
        id: `deadline-${row.id}`,
        type: 'deadline_risk',
        severity: 2,
        title: row.title,
        subtitle: `${row.status} · deadline in ${Math.abs(remaining)}d`,
        ageDays: 0,
        href: `/admin/projects/${row.id}`,
      });
    });

    (filmingNoCrew.data ?? []).forEach((row: any) => {
      items.push({
        id: `nocrew-${row.id}`,
        type: 'filming_no_crew',
        severity: 2,
        title: row.title,
        subtitle: 'No crew assigned',
        ageDays: 0,
        href: '/admin/calendar',
      });
    });

    items.sort((a, b) => a.severity - b.severity || b.ageDays - a.ageDays);
    return items;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/risk.ts
git commit -m "feat(queries): risk panel aggregator (overdue/stale/unsigned/deadline-risk/no-crew)"
```

---

## Task 9: getSalesFunnel + getRevenueForecast queries

**Files:**
- Create: `src/lib/queries/dashboard/sales.ts`

- [ ] **Step 1: Write both queries**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { SalesFunnel, RevenueForecast, FunnelStage } from '@/types/dashboard';
import { daysAgoIso, daysAheadIso, todayIso } from './_utils';

export async function getSalesFunnel(): Promise<SalesFunnel> {
  try {
    const supabase = await createClient();

    const [filmingReq, leadsOpen, proposalsSent, wonRecent, activeProjects] = await Promise.all([
      supabase
        .from('filming_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'won')
        .gte('updated_at', daysAgoIso(30)),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(delivered,archived)'),
    ]);

    const stages: FunnelStage[] = [
      { key: 'filming_requests', count: filmingReq.count ?? 0 },
      { key: 'leads_open', count: leadsOpen.count ?? 0 },
      { key: 'proposals_sent', count: proposalsSent.count ?? 0 },
      { key: 'won', count: wonRecent.count ?? 0 },
      { key: 'active_projects', count: activeProjects.count ?? 0 },
    ];

    const conversions = stages.slice(0, -1).map((from, i) => {
      const to = stages[i + 1];
      const ratePct = from.count === 0 ? 0 : Math.min(100, (to.count / from.count) * 100);
      return { fromKey: from.key, toKey: to.key, ratePct };
    });

    return { stages, conversions };
  } catch {
    return { stages: [], conversions: [] };
  }
}

export async function getRevenueForecast(): Promise<RevenueForecast> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const in30 = daysAheadIso(30);
    const in90 = daysAheadIso(90);

    const [confirmedRows, likelyRows, pipelineRows] = await Promise.all([
      supabase
        .from('invoices')
        .select('total')
        .in('status', ['sent', 'viewed'])
        .gte('due_date', today)
        .lte('due_date', in30),
      supabase
        .from('leads')
        .select('deal_value, probability')
        .in('stage', ['proposal', 'negotiation'])
        .gte('expected_close_date', in30)
        .lte('expected_close_date', in90),
      supabase
        .from('leads')
        .select('deal_value')
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
    ]);

    const confirmed = (confirmedRows.data ?? []).reduce(
      (s: number, r: { total: number | null }) => s + (r.total ?? 0),
      0,
    );
    const likely = (likelyRows.data ?? []).reduce(
      (s: number, r: { deal_value: number | null; probability: number | null }) =>
        s + (r.deal_value ?? 0) * ((r.probability ?? 0) / 100),
      0,
    );
    const pipeline = (pipelineRows.data ?? []).reduce(
      (s: number, r: { deal_value: number | null }) => s + (r.deal_value ?? 0),
      0,
    );

    return { confirmed, likely, pipeline, expectedTotal90d: confirmed + likely };
  } catch {
    return { confirmed: 0, likely: 0, pipeline: 0, expectedTotal90d: 0 };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/sales.ts
git commit -m "feat(queries): sales funnel + revenue forecast"
```

---

## Task 10: getCostModelHealth + getProjectProfitability queries

**Files:**
- Create: `src/lib/queries/dashboard/finance.ts`

- [ ] **Step 1: Write both queries**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  CostHealth,
  ProjectProfitability,
  ProjectProfitabilityRow,
} from '@/types/dashboard';
import { daysAgoIso } from './_utils';

export async function getCostModelHealth(): Promise<CostHealth> {
  try {
    const supabase = await createClient();

    const [items, settings, perCategory, recentProjects] = await Promise.all([
      supabase.from('cost_items').select('monthly_cost, category_id, active').eq('active', true),
      supabase
        .from('cost_settings')
        .select('expected_monthly_hours, default_margin')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('cost_items')
        .select('monthly_cost, category:cost_categories!inner(name)')
        .eq('active', true),
      supabase
        .from('projects')
        .select('quoted_price, shooting_hours, editing_hours, cost_per_hour_snapshot')
        .gte('created_at', daysAgoIso(90))
        .not('quoted_price', 'is', null)
        .not('status', 'eq', 'archived'),
    ]);

    const totalMonthlyCost = (items.data ?? []).reduce(
      (s: number, r: { monthly_cost: number | null }) => s + Number(r.monthly_cost ?? 0),
      0,
    );
    const expectedMonthlyHours = Number(settings.data?.expected_monthly_hours ?? 352);
    const targetMargin = Number(settings.data?.default_margin ?? 0.6);
    const costPerHour = expectedMonthlyHours > 0 ? totalMonthlyCost / expectedMonthlyHours : 0;

    const categoryMap = new Map<string, number>();
    (perCategory.data ?? []).forEach(
      (row: { monthly_cost: number | null; category: { name: string } | { name: string }[] | null }) => {
        const cat = Array.isArray(row.category) ? row.category[0] : row.category;
        if (!cat?.name) return;
        categoryMap.set(cat.name, (categoryMap.get(cat.name) ?? 0) + Number(row.monthly_cost ?? 0));
      },
    );
    const categories = Array.from(categoryMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    let avgMargin: number | null = null;
    const projectMargins: number[] = [];
    (recentProjects.data ?? []).forEach((p: any) => {
      const quoted = Number(p.quoted_price ?? 0);
      const cost =
        (Number(p.shooting_hours ?? 0) + Number(p.editing_hours ?? 0)) *
        Number(p.cost_per_hour_snapshot ?? 0);
      if (quoted > 0) {
        projectMargins.push((quoted - cost) / quoted);
      }
    });
    if (projectMargins.length > 0) {
      avgMargin = projectMargins.reduce((a, b) => a + b, 0) / projectMargins.length;
    }

    return {
      totalMonthlyCost,
      costPerHour,
      expectedMonthlyHours,
      categories,
      avgProjectMargin90d: avgMargin,
      targetMargin,
      marginOnTarget: avgMargin != null ? avgMargin >= targetMargin : false,
    };
  } catch {
    return {
      totalMonthlyCost: 0,
      costPerHour: 0,
      expectedMonthlyHours: 352,
      categories: [],
      avgProjectMargin90d: null,
      targetMargin: 0.6,
      marginOnTarget: false,
    };
  }
}

export async function getProjectProfitability(): Promise<ProjectProfitability> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('projects')
      .select(
        'id, title, quoted_price, shooting_hours, editing_hours, cost_per_hour_snapshot, ' +
          'client:clients(contact_name)',
      )
      .gte('created_at', daysAgoIso(90))
      .not('quoted_price', 'is', null)
      .not('status', 'eq', 'archived');

    const rows: ProjectProfitabilityRow[] = (data ?? [])
      .map((p: any) => {
        const quoted = Number(p.quoted_price ?? 0);
        const cost =
          (Number(p.shooting_hours ?? 0) + Number(p.editing_hours ?? 0)) *
          Number(p.cost_per_hour_snapshot ?? 0);
        const marginAmount = quoted - cost;
        const marginPct = quoted > 0 ? marginAmount / quoted : 0;
        const client = Array.isArray(p.client) ? p.client[0] : p.client;
        return {
          projectId: p.id,
          title: p.title,
          clientName: client?.contact_name ?? null,
          quotedPrice: quoted,
          cost,
          marginAmount,
          marginPct,
        };
      })
      .filter((r: ProjectProfitabilityRow) => r.quotedPrice > 0);

    const sorted = [...rows].sort((a, b) => b.marginPct - a.marginPct);
    return {
      topProfitable: sorted.slice(0, 5),
      topUnprofitable: sorted.slice(-5).reverse(),
    };
  } catch {
    return { topProfitable: [], topUnprofitable: [] };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/finance.ts
git commit -m "feat(queries): cost model health + project profitability"
```

---

## Task 11: getCrewLoad + getUpcomingDeadlinesGrouped queries

**Files:**
- Create: `src/lib/queries/dashboard/production.ts`

- [ ] **Step 1: Write both queries**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  CrewLoadRow,
  CrewLoadCell,
  DeadlineGroup,
  DeadlineProject,
} from '@/types/dashboard';
import { daysAgoIso, daysAheadIso, todayIso } from './_utils';

export async function getCrewLoad(daysAhead = 14): Promise<CrewLoadRow[]> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const end = daysAheadIso(daysAhead);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(
        'start_date, assigned_to, ' +
          'assignee:user_profiles!calendar_events_assigned_to_fkey(display_name)',
      )
      .eq('event_type', 'filming')
      .gte('start_date', today)
      .lte('start_date', end);

    if (error || !data) return [];

    type Bucket = { name: string; cells: Map<string, number> };
    const crewMap = new Map<string | null, Bucket>();

    data.forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      const id = (row.assigned_to as string | null) ?? null;
      const name = assignee?.display_name ?? 'Unassigned';
      const day = String(row.start_date).split('T')[0];
      if (!crewMap.has(id)) crewMap.set(id, { name, cells: new Map() });
      const bucket = crewMap.get(id)!;
      bucket.cells.set(day, (bucket.cells.get(day) ?? 0) + 1);
    });

    const days: string[] = [];
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const rows: CrewLoadRow[] = [];
    crewMap.forEach((bucket, id) => {
      const cells: CrewLoadCell[] = days.map((date) => ({
        date,
        count: bucket.cells.get(date) ?? 0,
      }));
      rows.push({ crewMemberId: id, crewMemberName: bucket.name, days: cells });
    });

    rows.sort((a, b) => {
      if (a.crewMemberId == null) return 1;
      if (b.crewMemberId == null) return -1;
      return a.crewMemberName.localeCompare(b.crewMemberName);
    });

    return rows;
  } catch {
    return [];
  }
}

export async function getUpcomingDeadlinesGrouped(daysAhead = 30): Promise<DeadlineGroup> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const end = daysAheadIso(daysAhead);
    const recentlyDeliveredFrom = daysAgoIso(7);

    const [upcoming, delivered] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, deadline, status, client:clients(contact_name)')
        .gte('deadline', today)
        .lte('deadline', end)
        .not('status', 'eq', 'archived')
        .order('deadline', { ascending: true }),
      supabase
        .from('projects')
        .select('id, title, deadline, status, client:clients(contact_name)')
        .eq('status', 'delivered')
        .gte('deadline', recentlyDeliveredFrom)
        .lt('deadline', today)
        .order('deadline', { ascending: false }),
    ]);

    const toRow = (p: any): DeadlineProject => {
      const client = Array.isArray(p.client) ? p.client[0] : p.client;
      const days = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86_400_000);
      return {
        projectId: p.id,
        title: p.title,
        clientName: client?.contact_name ?? null,
        deadline: p.deadline,
        status: p.status,
        daysUntilDeadline: days,
      };
    };

    const atRisk: DeadlineProject[] = [];
    const onTrack: DeadlineProject[] = [];

    (upcoming.data ?? []).forEach((p: any) => {
      const row = toRow(p);
      const isRisk = row.daysUntilDeadline <= 7 && !['review', 'delivered'].includes(row.status);
      if (isRisk) atRisk.push(row);
      else onTrack.push(row);
    });

    return {
      atRisk,
      onTrack,
      recentlyDelivered: (delivered.data ?? []).map(toRow),
    };
  } catch {
    return { atRisk: [], onTrack: [], recentlyDelivered: [] };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/production.ts
git commit -m "feat(queries): crew load heatmap + grouped deadlines"
```

---

## Task 12: getBusinessVelocity query

**Files:**
- Create: `src/lib/queries/dashboard/velocity.ts`

- [ ] **Step 1: Write the query**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { BusinessVelocity, VelocityCounter } from '@/types/dashboard';
import { daysAgoIso } from './_utils';

const EMPTY: VelocityCounter = { count: 0, deltaVsPrevious: 0 };

export async function getBusinessVelocity(periodDays = 7): Promise<BusinessVelocity> {
  try {
    const supabase = await createClient();
    const currentFrom = daysAgoIso(periodDays);
    const previousFrom = daysAgoIso(periodDays * 2);

    // Counts via direct table queries (activity_log coverage is uneven; fallback to source tables).
    const [
      pCreatedNow, pCreatedPrev,
      pDeliveredNow, pDeliveredPrev,
      iPaidNow, iPaidPrev,
      cSignedNow, cSignedPrev,
      prSentNow, prSentPrev,
    ] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', currentFrom),
      supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', previousFrom).lt('created_at', currentFrom),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('updated_at', currentFrom),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('updated_at', previousFrom).lt('updated_at', currentFrom),
      supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', currentFrom),
      supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', previousFrom).lt('paid_at', currentFrom),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'signed').gte('signed_at', currentFrom),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'signed').gte('signed_at', previousFrom).lt('signed_at', currentFrom),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', currentFrom),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', previousFrom).lt('sent_at', currentFrom),
    ]);

    const counter = (now: number, prev: number, sum?: number): VelocityCounter => ({
      count: now,
      sum,
      deltaVsPrevious: now - prev,
    });

    const invoicesPaidNowSum = (iPaidNow.data ?? []).reduce(
      (s: number, r: { total: number | null }) => s + Number(r.total ?? 0),
      0,
    );

    return {
      projectsCreated: counter(pCreatedNow.count ?? 0, pCreatedPrev.count ?? 0),
      projectsDelivered: counter(pDeliveredNow.count ?? 0, pDeliveredPrev.count ?? 0),
      invoicesPaid: counter(
        iPaidNow.data?.length ?? 0,
        iPaidPrev.data?.length ?? 0,
        invoicesPaidNowSum,
      ),
      contractsSigned: counter(cSignedNow.count ?? 0, cSignedPrev.count ?? 0),
      proposalsSent: counter(prSentNow.count ?? 0, prSentPrev.count ?? 0),
    };
  } catch {
    return {
      projectsCreated: EMPTY,
      projectsDelivered: EMPTY,
      invoicesPaid: EMPTY,
      contractsSigned: EMPTY,
      proposalsSent: EMPTY,
    };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/dashboard/velocity.ts
git commit -m "feat(queries): business velocity rolling window counter"
```

---

## Task 13: Shared UI primitives — badges + sparkline

**Files:**
- Create: `src/components/admin/dashboard/shared/delta-badge.tsx`
- Create: `src/components/admin/dashboard/shared/exception-badge.tsx`
- Create: `src/components/admin/dashboard/shared/age-badge.tsx`
- Create: `src/components/admin/dashboard/shared/sparkline.tsx`

- [ ] **Step 1: Write `delta-badge.tsx`**

```tsx
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = { deltaPct: number | null; className?: string; invertColors?: boolean };

export function DeltaBadge({ deltaPct, className, invertColors = false }: Props) {
  if (deltaPct == null) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />—
      </span>
    );
  }

  const positive = deltaPct >= 0;
  const goodDirection = invertColors ? !positive : positive;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = goodDirection ? 'text-emerald-600' : 'text-red-600';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', color, className)}>
      <Icon className="h-3 w-3" />
      {positive ? '+' : ''}
      {deltaPct.toFixed(1)}%
    </span>
  );
}
```

- [ ] **Step 2: Write `exception-badge.tsx`**

```tsx
import { cn } from '@/lib/utils';

type Props = { active: boolean; className?: string };

export function ExceptionBadge({ active, className }: Props) {
  if (!active) return null;
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full bg-red-500', className)}
      aria-label="Exception"
    />
  );
}
```

- [ ] **Step 3: Write `age-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = { days: number; className?: string };

export function AgeBadge({ days, className }: Props) {
  const label = days < 1 ? '<1d' : `${days}d`;
  const tone =
    days >= 30
      ? 'bg-red-100 text-red-700'
      : days >= 14
        ? 'bg-orange-100 text-orange-700'
        : days >= 7
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-slate-100 text-slate-700';
  return (
    <Badge variant="secondary" className={cn(tone, className)}>
      {label}
    </Badge>
  );
}
```

- [ ] **Step 4: Write `sparkline.tsx`**

```tsx
'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

type Props = { data: number[]; color?: string };

export function Sparkline({ data, color = 'currentColor' }: Props) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer>
        <LineChart data={series}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/dashboard/shared/
git commit -m "feat(ui): dashboard shared badges + sparkline primitives"
```

---

## Task 14: i18n strings for dashboard

**Files:**
- Modify: `messages/el.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Identify the existing `dashboard` namespace block in both files**

Run: `grep -n '"dashboard":' messages/el.json messages/en.json`

Note the line range; the existing block has keys like `title`, `description`, `activeProjects`, etc. Keep those keys (still used elsewhere) and add new sub-namespaces alongside.

- [ ] **Step 2: Add new keys to `messages/el.json` inside the `dashboard` object**

Append within the existing `"dashboard": { ... }` block, before its closing brace:

```json
"loadError": "Δεν φόρτωσε. Δοκίμασε ξανά.",
"hero": {
  "revenueMtd": "Έσοδα μήνα",
  "pipeline": "Pipeline (σταθμισμένο)",
  "activeProjects": "Ενεργά projects",
  "profitMargin": "Περιθώριο κέρδους (30η)",
  "cashOverdue": "Ληξιπρόθεσμα",
  "atRisk": "Σε κίνδυνο",
  "vsPrevious": "vs προηγ. περίοδος"
},
"today": {
  "title": "Σήμερα",
  "empty": "Καμία δραστηριότητα σήμερα — απόλαυσε την ησυχία.",
  "groups": {
    "filming": "Γυρίσματα",
    "meeting": "Ραντεβού",
    "task": "Tasks",
    "project_start": "Έναρξη projects",
    "project_deadline": "Deadlines",
    "invoice_due": "Τιμολόγια",
    "deliverable_pending": "Παραδοτέα προς review"
  },
  "allDay": "Όλη μέρα"
},
"risk": {
  "title": "Προσοχή",
  "empty": "Όλα καλά. Καμία ειδοποίηση.",
  "viewAll": "Όλες οι ειδοποιήσεις",
  "types": {
    "overdue_invoice": "Ληξιπρόθεσμο τιμολόγιο",
    "stale_lead": "Ανενεργό lead",
    "stale_deliverable": "Καθυστερημένο παραδοτέο",
    "unsigned_contract": "Ανυπόγραφη σύμβαση",
    "deadline_risk": "Project σε κίνδυνο deadline",
    "filming_no_crew": "Γύρισμα χωρίς συνεργείο"
  }
},
"sales": {
  "title": "Πωλήσεις",
  "funnel": "Funnel",
  "forecast": "Πρόβλεψη εσόδων",
  "stages": {
    "filming_requests": "Αιτήσεις",
    "leads_open": "Leads",
    "proposals_sent": "Προσφορές",
    "won": "Won",
    "active_projects": "Active"
  },
  "confirmed": "Επιβεβαιωμένα (30η)",
  "likely": "Πιθανά (30-90η)",
  "pipeline": "Pipeline σύνολο",
  "expected90d": "Αναμενόμενα 90 ημερών"
},
"finance": {
  "title": "Οικονομικά",
  "costHealth": "Υγεία κόστους",
  "totalMonthlyCost": "Συνολικό μηνιαίο κόστος",
  "costPerHour": "Κόστος ανά ώρα",
  "marginStatus": "Status περιθωρίου",
  "marginOnTarget": "Στον στόχο",
  "marginBelow": "Κάτω από στόχο",
  "profitability": "Κερδοφορία projects",
  "topProfitable": "Πιο κερδοφόρα",
  "topUnprofitable": "Λιγότερο κερδοφόρα"
},
"production": {
  "title": "Παραγωγή",
  "crewLoad": "Φόρτος συνεργείου (14η)",
  "deadlines": "Deadlines",
  "atRisk": "Σε κίνδυνο",
  "onTrack": "Σύμφωνα με χρονοδιάγραμμα",
  "recentlyDelivered": "Πρόσφατα παραδοτέα",
  "unassigned": "Χωρίς ανάθεση"
},
"velocity": {
  "title": "Ρυθμός εβδομάδας",
  "projectsCreated": "Νέα projects",
  "projectsDelivered": "Παραδοτέα",
  "invoicesPaid": "Πληρωμένα τιμολόγια",
  "contractsSigned": "Υπογεγραμμένες συμβάσεις",
  "proposalsSent": "Προσφορές που στάλθηκαν"
}
```

- [ ] **Step 3: Mirror in `messages/en.json` with English values**

Same structure, English strings:

```json
"loadError": "Failed to load. Try again.",
"hero": {
  "revenueMtd": "Revenue MTD",
  "pipeline": "Pipeline (weighted)",
  "activeProjects": "Active projects",
  "profitMargin": "Profit margin (30d)",
  "cashOverdue": "Cash overdue",
  "atRisk": "At risk",
  "vsPrevious": "vs prev period"
},
"today": {
  "title": "Today",
  "empty": "Nothing scheduled — enjoy the quiet.",
  "groups": {
    "filming": "Filmings",
    "meeting": "Meetings",
    "task": "Tasks",
    "project_start": "Project starts",
    "project_deadline": "Deadlines",
    "invoice_due": "Invoices due",
    "deliverable_pending": "Deliverables pending review"
  },
  "allDay": "All day"
},
"risk": {
  "title": "Attention",
  "empty": "All clear. No alerts.",
  "viewAll": "View all alerts",
  "types": {
    "overdue_invoice": "Overdue invoice",
    "stale_lead": "Stale lead",
    "stale_deliverable": "Stale deliverable",
    "unsigned_contract": "Unsigned contract",
    "deadline_risk": "Deadline risk",
    "filming_no_crew": "Filming without crew"
  }
},
"sales": {
  "title": "Sales",
  "funnel": "Funnel",
  "forecast": "Revenue forecast",
  "stages": {
    "filming_requests": "Requests",
    "leads_open": "Leads",
    "proposals_sent": "Proposals",
    "won": "Won",
    "active_projects": "Active"
  },
  "confirmed": "Confirmed (30d)",
  "likely": "Likely (30-90d)",
  "pipeline": "Pipeline total",
  "expected90d": "Expected 90d"
},
"finance": {
  "title": "Finance",
  "costHealth": "Cost health",
  "totalMonthlyCost": "Total monthly cost",
  "costPerHour": "Cost per hour",
  "marginStatus": "Margin status",
  "marginOnTarget": "On target",
  "marginBelow": "Below target",
  "profitability": "Project profitability",
  "topProfitable": "Most profitable",
  "topUnprofitable": "Least profitable"
},
"production": {
  "title": "Production",
  "crewLoad": "Crew load (14d)",
  "deadlines": "Deadlines",
  "atRisk": "At risk",
  "onTrack": "On track",
  "recentlyDelivered": "Recently delivered",
  "unassigned": "Unassigned"
},
"velocity": {
  "title": "This week",
  "projectsCreated": "Projects created",
  "projectsDelivered": "Delivered",
  "invoicesPaid": "Invoices paid",
  "contractsSigned": "Contracts signed",
  "proposalsSent": "Proposals sent"
}
```

- [ ] **Step 4: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/el.json'))" && node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"`
Expected: no output (parse OK).

- [ ] **Step 5: Commit**

```bash
git add messages/el.json messages/en.json
git commit -m "i18n(dashboard): add panorama namespace keys (el + en)"
```

---

## Task 15: Hero KPI strip components

**Files:**
- Create: `src/components/admin/dashboard/hero/kpi-card.tsx`
- Create: `src/components/admin/dashboard/hero/kpi-strip.tsx`

- [ ] **Step 1: Write `kpi-card.tsx`**

```tsx
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DeltaBadge } from '../shared/delta-badge';
import { ExceptionBadge } from '../shared/exception-badge';
import { Sparkline } from '../shared/sparkline';
import { cn } from '@/lib/utils';
import type { KpiMetric } from '@/types/dashboard';

type Props = {
  label: string;
  metric: KpiMetric;
  href: string;
  icon: LucideIcon;
  formatValue?: (n: number) => string;
  invertDeltaColors?: boolean;
};

export function KpiCard({ label, metric, href, icon: Icon, formatValue, invertDeltaColors }: Props) {
  const display = formatValue ? formatValue(metric.value) : String(metric.value);
  return (
    <Link href={href}>
      <Card className={cn('transition-colors hover:bg-accent', metric.exception && 'border-red-500')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <ExceptionBadge active={metric.exception} />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tabular-nums">{display}</span>
            <DeltaBadge deltaPct={metric.deltaPct} invertColors={invertDeltaColors} />
          </div>
          {metric.sparkline && metric.sparkline.length > 0 ? (
            <Sparkline data={metric.sparkline} />
          ) : (
            <div className="h-8" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Write `kpi-strip.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Coins,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { KpiCard } from './kpi-card';
import { getKpiHero } from '@/lib/queries/dashboard/kpi-hero';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtInt = (n: number) => n.toLocaleString('el-GR');

export async function KpiStrip() {
  const t = await getTranslations('dashboard.hero');
  const hero = await getKpiHero();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label={t('revenueMtd')}
        metric={hero.revenueMtd}
        href="/admin/reports"
        icon={Wallet}
        formatValue={fmtEur}
      />
      <KpiCard
        label={t('pipeline')}
        metric={hero.pipeline}
        href="/admin/leads"
        icon={TrendingUp}
        formatValue={fmtEur}
      />
      <KpiCard
        label={t('activeProjects')}
        metric={hero.activeProjects}
        href="/admin/projects"
        icon={Briefcase}
        formatValue={fmtInt}
      />
      <KpiCard
        label={t('profitMargin')}
        metric={hero.profitMargin}
        href="/admin/reports"
        icon={Activity}
        formatValue={fmtPct}
      />
      <KpiCard
        label={t('cashOverdue')}
        metric={hero.cashOverdue}
        href="/admin/invoices?status=overdue"
        icon={Coins}
        formatValue={fmtEur}
        invertDeltaColors
      />
      <KpiCard
        label={t('atRisk')}
        metric={hero.atRiskCount}
        href="/admin/dashboard/risk"
        icon={AlertTriangle}
        formatValue={fmtInt}
        invertDeltaColors
      />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/hero/
git commit -m "feat(ui): hero KPI strip with delta + sparkline + exception flag"
```

---

## Task 16: Today agenda components

**Files:**
- Create: `src/components/admin/dashboard/today/today-item.tsx`
- Create: `src/components/admin/dashboard/today/today-agenda.tsx`

- [ ] **Step 1: Write `today-item.tsx`**

```tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TodayItem as TodayItemType } from '@/types/dashboard';

export function TodayItem({ item, allDayLabel }: { item: TodayItemType; allDayLabel: string }) {
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {item.time ?? allDayLabel}
        </span>
        {item.badge && (
          <Badge variant={item.badge.tone === 'default' ? undefined : item.badge.tone}>
            {item.badge.label}
          </Badge>
        )}
        {item.assigneeName && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={item.assigneeAvatarUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {item.assigneeName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Write `today-agenda.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TodayItem } from './today-item';
import { getTodayAgenda } from '@/lib/queries/dashboard/today';
import type { TodayItem as TodayItemType, TodayItemKind } from '@/types/dashboard';

const GROUP_ORDER: TodayItemKind[] = [
  'filming',
  'meeting',
  'task',
  'project_start',
  'project_deadline',
  'invoice_due',
  'deliverable_pending',
];

export async function TodayAgenda() {
  const t = await getTranslations('dashboard.today');
  const items = await getTodayAgenda();

  const grouped = new Map<TodayItemKind, TodayItemType[]>();
  items.forEach((item) => {
    if (!grouped.has(item.kind)) grouped.set(item.kind, []);
    grouped.get(item.kind)!.push(item);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          GROUP_ORDER.filter((kind) => grouped.has(kind)).map((kind) => (
            <div key={kind} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`groups.${kind}`)}
              </h4>
              <div className="space-y-2">
                {grouped.get(kind)!.map((item) => (
                  <TodayItem key={item.id} item={item} allDayLabel={t('allDay')} />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/today/
git commit -m "feat(ui): today agenda widget grouped by item kind"
```

---

## Task 17: Risk panel components

**Files:**
- Create: `src/components/admin/dashboard/risk/risk-item.tsx`
- Create: `src/components/admin/dashboard/risk/risk-panel.tsx`

- [ ] **Step 1: Write `risk-item.tsx`**

```tsx
import Link from 'next/link';
import { AlertCircle, Clock, FileWarning, MapPin, Receipt, UserX } from 'lucide-react';
import { AgeBadge } from '../shared/age-badge';
import type { RiskItem as RiskItemType } from '@/types/dashboard';

const ICON_MAP = {
  overdue_invoice: Receipt,
  stale_lead: UserX,
  stale_deliverable: Clock,
  unsigned_contract: FileWarning,
  deadline_risk: AlertCircle,
  filming_no_crew: MapPin,
} as const;

export function RiskItem({ item, label }: { item: RiskItemType; label: string }) {
  const Icon = ICON_MAP[item.type];
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            <span className="font-medium">{label}</span>
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </div>
        </div>
      </div>
      <AgeBadge days={item.ageDays} />
    </Link>
  );
}
```

- [ ] **Step 2: Write `risk-panel.tsx`**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskItem } from './risk-item';
import { getRiskItems } from '@/lib/queries/dashboard/risk';

const MAX_ITEMS = 8;

export async function RiskPanel() {
  const t = await getTranslations('dashboard.risk');
  const all = await getRiskItems();
  const items = all.slice(0, MAX_ITEMS);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-500" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        {all.length > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {all.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <>
            {items.map((it) => (
              <RiskItem key={it.id} item={it} label={t(`types.${it.type}`)} />
            ))}
            {all.length > MAX_ITEMS && (
              <Link
                href="/admin/dashboard/risk"
                className="block pt-2 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {t('viewAll')} ({all.length})
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/risk/
git commit -m "feat(ui): risk panel with severity-sorted exception list"
```

---

## Task 18: Sales section components

**Files:**
- Create: `src/components/admin/dashboard/sales/sales-funnel-card.tsx`
- Create: `src/components/admin/dashboard/sales/revenue-forecast-card.tsx`

- [ ] **Step 1: Write `sales-funnel-card.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSalesFunnel } from '@/lib/queries/dashboard/sales';

export async function SalesFunnelCard() {
  const t = await getTranslations('dashboard.sales');
  const { stages, conversions } = await getSalesFunnel();
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('funnel')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => {
          const widthPct = (s.count / max) * 100;
          const conv = i < conversions.length ? conversions[i] : null;
          return (
            <div key={s.key} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{t(`stages.${s.key}`)}</span>
                <span className="text-sm tabular-nums">{s.count}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              {conv && (
                <div className="pl-2 text-xs text-muted-foreground">
                  ↓ {conv.ratePct.toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write `revenue-forecast-card.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRevenueForecast } from '@/lib/queries/dashboard/sales';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export async function RevenueForecastCard() {
  const t = await getTranslations('dashboard.sales');
  const forecast = await getRevenueForecast();
  const max = Math.max(1, forecast.confirmed, forecast.likely, forecast.pipeline);

  const Bar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium tabular-nums">{fmtEur(value)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('forecast')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Bar label={t('confirmed')} value={forecast.confirmed} />
        <Bar label={t('likely')} value={forecast.likely} />
        <Bar label={t('pipeline')} value={forecast.pipeline} />
        <div className="border-t pt-2 text-sm text-muted-foreground">
          {t('expected90d')}:{' '}
          <span className="font-medium text-foreground">{fmtEur(forecast.expectedTotal90d)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/sales/
git commit -m "feat(ui): sales funnel + revenue forecast cards"
```

---

## Task 19: Finance section components

**Files:**
- Create: `src/components/admin/dashboard/finance/cost-health-card.tsx`
- Create: `src/components/admin/dashboard/finance/project-profitability-card.tsx`

- [ ] **Step 1: Write `cost-health-card.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCostModelHealth } from '@/lib/queries/dashboard/finance';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

export async function CostHealthCard() {
  const t = await getTranslations('dashboard.finance');
  const health = await getCostModelHealth();
  const max = Math.max(1, ...health.categories.map((c) => c.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('costHealth')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{t('totalMonthlyCost')}</div>
            <div className="text-xl font-bold tabular-nums">{fmtEur(health.totalMonthlyCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('costPerHour')}</div>
            <div className="text-xl font-bold tabular-nums">{fmtEur(health.costPerHour)}</div>
          </div>
        </div>
        <div className="space-y-2">
          {health.categories.map((c) => (
            <div key={c.name} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span>{c.name}</span>
                <span className="tabular-nums">{fmtEur(c.total)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(c.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm">
            {t('marginStatus')}: {fmtPct(health.avgProjectMargin90d)} / {fmtPct(health.targetMargin)}
          </span>
          <Badge variant={health.marginOnTarget ? 'default' : 'destructive'}>
            {health.marginOnTarget ? t('marginOnTarget') : t('marginBelow')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write `project-profitability-card.tsx`**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProjectProfitability } from '@/lib/queries/dashboard/finance';
import type { ProjectProfitabilityRow } from '@/types/dashboard';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function Row({ row, target }: { row: ProjectProfitabilityRow; target: number }) {
  const pct = row.marginPct;
  const tone = pct >= target ? 'default' : pct >= target - 0.1 ? 'secondary' : 'destructive';
  return (
    <Link
      href={`/admin/projects/${row.projectId}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-2 hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{row.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {row.clientName ?? '—'} · {fmtEur(row.quotedPrice)} / {fmtEur(row.cost)}
        </div>
      </div>
      <Badge variant={tone}>{(pct * 100).toFixed(0)}%</Badge>
    </Link>
  );
}

export async function ProjectProfitabilityCard() {
  const t = await getTranslations('dashboard.finance');
  const data = await getProjectProfitability();
  // We want the same target margin as cost health — read it once from cost_settings
  const { getCostModelHealth } = await import('@/lib/queries/dashboard/finance');
  const { targetMargin } = await getCostModelHealth();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('profitability')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('topProfitable')}
          </h4>
          {data.topProfitable.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            data.topProfitable.map((r) => <Row key={r.projectId} row={r} target={targetMargin} />)
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('topUnprofitable')}
          </h4>
          {data.topUnprofitable.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            data.topUnprofitable.map((r) => <Row key={r.projectId} row={r} target={targetMargin} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/finance/
git commit -m "feat(ui): cost health + project profitability cards"
```

---

## Task 20: Production section components

**Files:**
- Create: `src/components/admin/dashboard/production/crew-load-heatmap.tsx`
- Create: `src/components/admin/dashboard/production/upcoming-deadlines-grouped.tsx`

- [ ] **Step 1: Write `crew-load-heatmap.tsx`**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCrewLoad } from '@/lib/queries/dashboard/production';
import { cn } from '@/lib/utils';

const cellTone = (n: number) =>
  n === 0
    ? 'bg-muted'
    : n === 1
      ? 'bg-emerald-200 text-emerald-900'
      : n === 2
        ? 'bg-yellow-300 text-yellow-900'
        : 'bg-red-400 text-red-900';

export async function CrewLoadHeatmap() {
  const t = await getTranslations('dashboard.production');
  const rows = await getCrewLoad(14);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('crewLoad')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">—</p>
        </CardContent>
      </Card>
    );
  }

  const days = rows[0].days.map((d) => d.date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('crewLoad')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card pr-2 text-left font-medium">&nbsp;</th>
                {days.map((d) => (
                  <th key={d} className="px-1 text-center font-medium tabular-nums">
                    {d.split('-').slice(1).join('/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.crewMemberId ?? 'unassigned'}>
                  <td className="sticky left-0 truncate bg-card pr-2 font-medium">
                    {r.crewMemberId == null ? t('unassigned') : r.crewMemberName}
                  </td>
                  {r.days.map((c) => (
                    <td key={c.date} className="p-0.5">
                      <Link
                        href={`/admin/calendar?date=${c.date}${r.crewMemberId ? `&crew=${r.crewMemberId}` : ''}`}
                        className={cn(
                          'flex h-6 items-center justify-center rounded text-[10px] tabular-nums',
                          cellTone(c.count),
                        )}
                      >
                        {c.count > 0 ? c.count : ''}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write `upcoming-deadlines-grouped.tsx`**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUpcomingDeadlinesGrouped } from '@/lib/queries/dashboard/production';
import type { DeadlineProject } from '@/types/dashboard';

function Row({ p }: { p: DeadlineProject }) {
  return (
    <Link
      href={`/admin/projects/${p.projectId}`}
      className="flex items-center justify-between gap-2 rounded-lg border p-2 hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{p.title}</div>
        <div className="text-xs text-muted-foreground truncate">{p.clientName ?? '—'}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {p.daysUntilDeadline >= 0 ? `+${p.daysUntilDeadline}d` : `${p.daysUntilDeadline}d`}
        </span>
        <Badge variant="outline">{p.status}</Badge>
      </div>
    </Link>
  );
}

export async function UpcomingDeadlinesGrouped() {
  const t = await getTranslations('dashboard.production');
  const groups = await getUpcomingDeadlinesGrouped(30);

  const Section = ({ title, rows }: { title: string; rows: DeadlineProject[] }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        rows.map((r) => <Row key={r.projectId} p={r} />)
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('deadlines')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section title={t('atRisk')} rows={groups.atRisk} />
        <Section title={t('onTrack')} rows={groups.onTrack} />
        <Section title={t('recentlyDelivered')} rows={groups.recentlyDelivered} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/production/
git commit -m "feat(ui): crew load heatmap + grouped deadlines"
```

---

## Task 21: Business velocity component

**Files:**
- Create: `src/components/admin/dashboard/velocity/business-velocity.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { DeltaBadge } from '../shared/delta-badge';
import { getBusinessVelocity } from '@/lib/queries/dashboard/velocity';
import type { VelocityCounter } from '@/types/dashboard';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export async function BusinessVelocity() {
  const t = await getTranslations('dashboard.velocity');
  const v = await getBusinessVelocity(7);

  const Row = ({ label, c }: { label: string; c: VelocityCounter }) => {
    const deltaPct = c.deltaVsPrevious === 0 ? 0 : c.count === 0 ? -100 : (c.deltaVsPrevious / Math.max(1, c.count - c.deltaVsPrevious)) * 100;
    return (
      <div className="flex items-center justify-between border-b py-2 last:border-b-0">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            {c.count}
            {c.sum != null && c.sum > 0 ? ` · ${fmtEur(c.sum)}` : ''}
          </span>
          <DeltaBadge deltaPct={deltaPct} />
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Row label={t('projectsCreated')} c={v.projectsCreated} />
        <Row label={t('projectsDelivered')} c={v.projectsDelivered} />
        <Row label={t('invoicesPaid')} c={v.invoicesPaid} />
        <Row label={t('contractsSigned')} c={v.contractsSigned} />
        <Row label={t('proposalsSent')} c={v.proposalsSent} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/dashboard/velocity/
git commit -m "feat(ui): business velocity weekly summary"
```

---

## Task 22: Refactor dashboard page + delete legacy

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx` (full rewrite)
- Delete: `src/components/admin/dashboard/today-tasks.tsx`
- Delete: `src/components/admin/dashboard/pending-actions.tsx`
- Delete: `src/components/admin/dashboard/kpi-cards.tsx`
- Delete: `src/components/admin/dashboard/revenue-chart.tsx`
- Delete: `src/components/admin/dashboard/project-status-chart.tsx`

- [ ] **Step 1: Replace `page.tsx` with role-aware layout**

```tsx
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import { KpiStrip } from '@/components/admin/dashboard/hero/kpi-strip';
import { TodayAgenda } from '@/components/admin/dashboard/today/today-agenda';
import { RiskPanel } from '@/components/admin/dashboard/risk/risk-panel';
import { SalesFunnelCard } from '@/components/admin/dashboard/sales/sales-funnel-card';
import { RevenueForecastCard } from '@/components/admin/dashboard/sales/revenue-forecast-card';
import { CostHealthCard } from '@/components/admin/dashboard/finance/cost-health-card';
import { ProjectProfitabilityCard } from '@/components/admin/dashboard/finance/project-profitability-card';
import { CrewLoadHeatmap } from '@/components/admin/dashboard/production/crew-load-heatmap';
import { UpcomingDeadlinesGrouped } from '@/components/admin/dashboard/production/upcoming-deadlines-grouped';
import { BusinessVelocity } from '@/components/admin/dashboard/velocity/business-velocity';
import { createClient } from '@/lib/supabase/server';
import { getRecentActivity } from '@/lib/queries';
import type { ActivityLogWithUser } from '@/types';

async function getRole(): Promise<'super_admin' | 'admin' | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  if (data.role === 'super_admin' || data.role === 'admin') return data.role;
  return null;
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const role = await getRole();
  const recentActivity = await getRecentActivity(10);

  const isSuper = role === 'super_admin';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {isSuper && <KpiStrip />}

      <div className="grid gap-6 md:grid-cols-2">
        <TodayAgenda />
        <RiskPanel />
      </div>

      {isSuper && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <SalesFunnelCard />
            <RevenueForecastCard />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <CostHealthCard />
            <ProjectProfitabilityCard />
          </div>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <CrewLoadHeatmap />
        <UpcomingDeadlinesGrouped />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityFeed activities={recentActivity as ActivityLogWithUser[]} />
        {isSuper && <BusinessVelocity />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete legacy components**

```bash
rm src/components/admin/dashboard/today-tasks.tsx
rm src/components/admin/dashboard/pending-actions.tsx
rm src/components/admin/dashboard/kpi-cards.tsx
rm src/components/admin/dashboard/revenue-chart.tsx
rm src/components/admin/dashboard/project-status-chart.tsx
```

- [ ] **Step 3: Type-check + lint + build**

```bash
pnpm type-check
pnpm lint
pnpm build
```

Expected: all PASS. If any import refers to a deleted component, search and fix:
```bash
grep -rn "today-tasks\|pending-actions\|kpi-cards\|revenue-chart\|project-status-chart" src/
```

- [ ] **Step 4: Commit**

```bash
git add -A src/app/admin/dashboard/page.tsx src/components/admin/dashboard/
git commit -m "feat(dashboard): role-aware panoramic layout; delete legacy widgets"
```

---

## Task 23: /admin/dashboard/risk subpage

**Files:**
- Create: `src/app/admin/dashboard/risk/page.tsx`

- [ ] **Step 1: Write the subpage**

```tsx
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { RiskItem } from '@/components/admin/dashboard/risk/risk-item';
import { getRiskItems } from '@/lib/queries/dashboard/risk';
import type { RiskType } from '@/types/dashboard';

const RISK_TYPES: RiskType[] = [
  'overdue_invoice',
  'stale_lead',
  'stale_deliverable',
  'unsigned_contract',
  'deadline_risk',
  'filming_no_crew',
];

export default async function DashboardRiskPage() {
  const t = await getTranslations('dashboard.risk');
  const items = await getRiskItems();

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      ) : (
        RISK_TYPES.map((type) => {
          const filtered = items.filter((i) => i.type === type);
          if (filtered.length === 0) return null;
          return (
            <div key={type} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`types.${type}`)} ({filtered.length})
              </h2>
              <div className="space-y-2">
                {filtered.map((it) => (
                  <RiskItem key={it.id} item={it} label={t(`types.${it.type}`)} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/dashboard/risk/page.tsx
git commit -m "feat(dashboard): risk subpage grouped by type"
```

---

## Task 24: Dashboard thresholds editor on cost-model page

**Files:**
- Modify: `src/app/admin/cost-model/page.tsx`

- [ ] **Step 1: Inspect current page**

Run: `grep -n 'CostSettingsForm\|cost_settings\|dashboard' src/app/admin/cost-model/page.tsx`

If a `CostSettingsForm` exists, the thresholds editor should be appended within it. Otherwise, surface a new card section. The implementation depends on the existing structure.

- [ ] **Step 2: Add thresholds editor**

Given the existing `cost-model` page renders a settings card around `cost_settings`, add a new section. Approach: extend the existing form via a new collapsible "Dashboard thresholds" section.

Locate the file. Where the existing `cost_settings` form fields end (near `deposit_percent`), append:

```tsx
{/* Dashboard thresholds — inline editor */}
<details className="rounded-lg border p-4">
  <summary className="cursor-pointer text-sm font-medium">
    {t('dashboardThresholds.title')}
  </summary>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <NumberField name="dashboard_thresholds.stale_lead_days" label={t('dashboardThresholds.staleLead')} min={1} max={365} />
    <NumberField name="dashboard_thresholds.stale_deliverable_days" label={t('dashboardThresholds.staleDeliverable')} min={1} max={365} />
    <NumberField name="dashboard_thresholds.stale_contract_days" label={t('dashboardThresholds.staleContract')} min={1} max={365} />
    <NumberField name="dashboard_thresholds.deadline_risk_days" label={t('dashboardThresholds.deadlineRisk')} min={1} max={365} />
    <NumberField name="dashboard_thresholds.active_projects_warn_above" label={t('dashboardThresholds.activeProjectsWarn')} min={1} max={10000} />
  </div>
</details>
```

Where `NumberField` is the existing form-field abstraction used by the cost settings form (or use `<Input type="number">` with react-hook-form `register()` directly if no abstraction exists — match the existing pattern).

If the existing form uses `react-hook-form` with the `useForm({ resolver: zodResolver(updateCostSettingsSchema) })` pattern, the schema already accepts the optional `dashboard_thresholds` field thanks to Task 3.

The server action that persists `cost_settings` must accept the new key. Find it (likely `src/lib/actions/cost-model.ts` or `src/lib/actions/cost-settings.ts`):

Run: `grep -rn 'updateCostSettings\|cost_settings' src/lib/actions/`

Add `dashboard_thresholds` to the accepted update payload — the existing implementation should propagate the entire validated input object via `supabase.from('cost_settings').update(input).eq('id', 1)`.

- [ ] **Step 3: i18n keys for thresholds editor**

Append to the `dashboard` namespace block (Task 14) of both `messages/el.json` and `messages/en.json`:

el.json:
```json
"dashboardThresholds": {
  "title": "Όρια ειδοποιήσεων dashboard",
  "staleLead": "Ανενεργό lead (μέρες)",
  "staleDeliverable": "Καθυστερημένο παραδοτέο (μέρες)",
  "staleContract": "Ανυπόγραφη σύμβαση (μέρες)",
  "deadlineRisk": "Risk window deadline (μέρες)",
  "activeProjectsWarn": "Όριο ενεργών projects"
}
```

en.json:
```json
"dashboardThresholds": {
  "title": "Dashboard alert thresholds",
  "staleLead": "Stale lead (days)",
  "staleDeliverable": "Stale deliverable (days)",
  "staleContract": "Unsigned contract (days)",
  "deadlineRisk": "Deadline risk window (days)",
  "activeProjectsWarn": "Active projects warn above"
}
```

- [ ] **Step 4: Type-check + build**

```bash
pnpm type-check
pnpm build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/cost-model/page.tsx messages/el.json messages/en.json
git commit -m "feat(cost-model): dashboard thresholds editor"
```

---

## Task 25: Playwright E2E test

**Files:**
- Create: `e2e/admin-dashboard.spec.ts`

- [ ] **Step 1: Inspect existing E2E patterns**

Run: `ls e2e/ && cat e2e/admin-projects.spec.ts 2>/dev/null | head -40` (or any existing admin spec) to learn the login helper.

- [ ] **Step 2: Write the spec**

Adapt this skeleton to the existing login helper (e.g., `loginAsAdmin(page)`):

```typescript
import { test, expect } from '@playwright/test';

test.describe('admin dashboard', () => {
  test('super_admin sees all sections', async ({ page }) => {
    // TODO: replace with the project's existing login helper for super_admin
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.E2E_SUPERADMIN_EMAIL!);
    await page.fill('input[name="password"]', process.env.E2E_SUPERADMIN_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Σήμερα|Today/)).toBeVisible();
    await expect(page.getByText(/Προσοχή|Attention/)).toBeVisible();
    await expect(page.getByText(/Πωλήσεις|Sales|Funnel/)).toBeVisible();
    await expect(page.getByText(/Οικονομικά|Finance|Cost health/)).toBeVisible();
    await expect(page.getByText(/Παραγωγή|Production|Crew load/)).toBeVisible();
  });

  test('admin sees operational sections only', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Σήμερα|Today/)).toBeVisible();
    await expect(page.getByText(/Προσοχή|Attention/)).toBeVisible();
    // Sales/Finance hidden for non-super
    await expect(page.getByText(/Funnel/)).toHaveCount(0);
    await expect(page.getByText(/Cost health/)).toHaveCount(0);
  });

  test('hero KPI card navigates to filtered source page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.E2E_SUPERADMIN_EMAIL!);
    await page.fill('input[name="password"]', process.env.E2E_SUPERADMIN_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.goto('/admin/dashboard');
    await page.getByRole('link', { name: /Active projects|Ενεργά projects/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/projects/);
  });
});
```

- [ ] **Step 3: Run the E2E suite**

Run: `pnpm test:e2e -- admin-dashboard.spec`

Expected: tests pass against running dev server. If the project doesn't seed E2E env vars, fall back to manual smoke (Task 26).

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-dashboard.spec.ts
git commit -m "test(e2e): admin dashboard role-aware rendering"
```

---

## Task 26: Final verification & manual smoke test

- [ ] **Step 1: Full type-check, lint, build**

```bash
pnpm type-check && pnpm lint && pnpm build
```
Expected: all PASS.

- [ ] **Step 2: Apply migrations on cloud Supabase**

In Supabase Dashboard → SQL editor, run:
1. Contents of `supabase/migrations/00042_proposals_project_link.sql`
2. Contents of `supabase/migrations/00043_dashboard_thresholds.sql` (note: includes the `get_profit_margin_window` RPC defined in Task 6)

Verify with:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'project_id';
SELECT dashboard_thresholds FROM cost_settings WHERE id = 1;
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_profit_margin_window';
```
Each should return one row.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```
Browse to http://localhost:3000/admin/dashboard. As super_admin:

1. Hero strip shows 6 KPI cards with values + delta badges where applicable.
2. Σήμερα widget shows today's calendar events (the original bug — verify any meeting/filming for today appears, including the 2 appointments the user reported).
3. Προσοχή widget surfaces overdue invoices / stale leads if test data exists.
4. Sales section: funnel + revenue forecast cards render without errors.
5. Finance section: cost health + profitability cards render with values from `cost_items`.
6. Production: crew load heatmap shows next 14 days; deadlines grouped by status.
7. Velocity: footer card shows last 7 days counters.
8. Click each hero KPI → navigates to the linked filtered source page.

As admin (non-super):

1. Hero strip is HIDDEN.
2. Σήμερα + Προσοχή visible.
3. Sales/Finance sections HIDDEN.
4. Production + Activity feed visible.

- [ ] **Step 4: Final commit if any fix-up needed**

If smoke test surfaces a bug, fix it, re-run `pnpm build`, and commit:
```bash
git commit -m "fix(dashboard): <specific bug>"
```

- [ ] **Step 5: Push branch**

```bash
git push -u origin <current-branch>
```

(If on `fix/google-calendar-sync-diag`, the user will decide whether to PR this work separately or fold into existing PR #4.)

---

## Verification checklist (final)

- [ ] All migrations applied on cloud Supabase (00042, 00043)
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test:e2e -- admin-dashboard.spec` passes (or manual smoke completed)
- [ ] As super_admin: hero strip + all 6 sections visible
- [ ] As admin: only Σήμερα/Προσοχή/Production/Activity feed visible
- [ ] Original bug fixed: today's calendar appointments now appear in Σήμερα
- [ ] No reference in codebase to deleted legacy components (`grep -rn "today-tasks\|pending-actions\|kpi-cards\|revenue-chart\|project-status-chart" src/` returns empty)
- [ ] `messages/el.json` and `messages/en.json` are valid JSON
- [ ] Both `dashboard.*` namespaces complete in both locales

---

## Open issues / risks documented

1. **Profit margin RPC** — added in Task 6 alongside migration 00043. If the cloud DB doesn't have it deployed, the hero KPI card for profit margin renders 0% — the query catches the error and returns the empty metric.
2. **30-day-ago snapshots for `pipeline` and `activeProjects` deltas** — not computed (no historical store). The hero shows `—` for those deltas. Acceptable for v1; future enhancement could add a daily snapshot table.
3. **Activity log coverage** — `getBusinessVelocity` reads source tables directly (not activity_log) to avoid relying on uneven logging. Project "delivered" detection uses `projects.updated_at` + status filter, which slightly over-counts if a delivered project is touched again. Acceptable approximation for weekly summary.
4. **Crew load heatmap** uses `calendar_events.assigned_to`. Filming events without an assignee bucket under "Unassigned" — this also surfaces as a `filming_no_crew` risk so the founder sees both the load gap and the alert.
