---
title: Admin Dashboard Refactor — Panoramic Business Cockpit
status: draft
date: 2026-04-25
authors: ntontischris, Claude
applies_to: devremedia
---

# Admin Dashboard Refactor — Panoramic Business Cockpit

## Problem

The current `/admin/dashboard` (`src/app/admin/dashboard/page.tsx`) shows 5 KPI cards, a 6-month revenue chart, project status pie chart, activity feed, pending actions, and a "today's tasks" widget. It is operational-only and partially broken:

- "Today's tasks" reads only from `tasks` table, ignoring `calendar_events` (meetings, filming, reminders) — user reported 2 appointments not shown.
- No forward-looking metrics (pipeline forecast, revenue projection).
- No per-project profitability despite a fully-shipped cost model.
- No team/crew utilization visibility.
- No risk/exception surfacing — overdue invoices, stale leads, unsigned contracts, pending deliverables are scattered across pages with no unified view.
- Same view for super_admin and admin even though their decisions differ.

A founder of a video production agency (super_admin) needs a panoramic view to make daily strategic + operational decisions in one screen. An admin only needs the operational layer.

## Goals

1. Pass the **glance test** — super_admin understands business state in <10 seconds from the top of the page.
2. **Exception-based** — surface what needs attention, not what's normal.
3. **Action-oriented** — every metric clickable to its source page, filtered.
4. **Role-aware** — super_admin sees full panorama, admin sees operational only.
5. **Operating cadence layered** — Today → This week → This month → Trend, never mixed.
6. **Context over isolation** — every KPI has delta vs previous period and (where useful) sparkline trend.

## Non-goals

- Dashboard customization per user (drag-and-drop reorder).
- Real-time auto-refresh (polling/realtime subscriptions).
- Mobile-specific layout — default responsive grid suffices.
- Custom date range picker — rolling periods only (MTD, last 30d, last 90d).
- Export to PDF/CSV from dashboard.
- Notification/alert system when thresholds breached.

## Audience & roles

`/admin/dashboard` is accessible to `super_admin` and `admin`. Role is read server-side from `user_profiles.role` once at the top of `page.tsx` and gates which sections render. There is no client-side toggle.

| Role | Sees |
|---|---|
| `super_admin` | Full layout: Hero KPIs → Today + Risk → Sales → Finance → Production → Footer |
| `admin` | Operational only: Today + Risk → Production → Activity feed |

## Information architecture

### Super_admin layout (top to bottom)

1. **Hero KPI strip** — 6 cards, glance test
2. **Two columns** — Σήμερα (left) + Προσοχή/Risk (right)
3. **Sales** — Funnel + Revenue forecast (two cards)
4. **Finance** — Cost health + Project profitability (two cards)
5. **Production** — Crew load heatmap + Upcoming deadlines grouped
6. **Footer** — Activity feed + Business velocity summary

### Admin layout

1. **Two columns** — Σήμερα + Προσοχή
2. **Production** — Crew load + Upcoming deadlines
3. **Activity feed**

## Sections — detailed spec

### 1. Hero KPI strip (super_admin)

Grid `lg:grid-cols-6 md:grid-cols-3 grid-cols-2`. Each card = clickable link to filtered source page.

| KPI | Source query | Compared against | Sparkline | Exception flag |
|---|---|---|---|---|
| Revenue MTD | sum `invoices.total` where `status='paid' AND paid_at` in current month | previous full month total | last 30 days, daily series | none |
| Pipeline (weighted) | sum of `leads.deal_value × leads.probability` where stage in (new, contacted, qualified, proposal, negotiation) | snapshot 30 days ago (computed from `lead_activities` stage history if available, else point-in-time) | last 30 days, weekly series | none |
| Active projects | count `projects` where status not in (delivered, archived) | count snapshot 30 days ago (from `activity_log` project state changes) | none | red badge if count > `dashboard_thresholds.active_projects_warn_above` |
| Profit margin (rolling 30d) | `getProfitMargin(last 30 days)` returns `(revenue − expenses) / revenue` | previous 30-day window | last 30 days, weekly series | red if below `cost_settings.default_margin` |
| Cash overdue | sum `invoices.total` where `status='overdue' OR (status in (sent, viewed) AND due_date < today)` | none | none | red if > 0 |
| At-risk count | union: count(overdue invoices) + count(stale leads) + count(stale deliverables) + count(unsigned contracts past threshold) | none | none | red if > 0 |

Card structure (DOM):

```
[Icon] [Label]                  [▲ 12% vs last month] [exception dot]
[Big value]
[mini sparkline]
```

Each card wraps a Next.js `<Link>` to its source filtered page.

### 2. Σήμερα (today agenda)

Polymorphic timeline-style list grouped by item kind. One server query `getTodayAgenda()` returns all items.

Item kinds and their sources:

| Kind | Source | Filter |
|---|---|---|
| `filming` | `calendar_events` | `event_type='filming' AND start_date::date = today` |
| `meeting` | `calendar_events` | `event_type in ('meeting', 'reminder') AND start_date::date = today` |
| `task` | `tasks` | `(due_date = today OR (due_date < today AND status != 'done')) AND status != 'done'` |
| `project_start` | `projects` | `start_date = today AND status not in (archived)` |
| `project_deadline` | `projects` | `deadline = today AND status not in (delivered, archived)` |
| `invoice_due` | `invoices` | `due_date = today AND status in (sent, viewed)` |
| `deliverable_pending` | `deliverables` | `status = 'pending_review'` (no date filter — sticky until reviewed) |

Group headers: Γυρίσματα, Ραντεβού, Tasks, Project starts, Deadlines, Invoices, Approvals.

Each row: title, time/all-day badge, assignee avatar (where assigned_to exists), priority/status badge where applicable, link to source detail page.

Empty state: friendly empty illustration + "Καμία δραστηριότητα σήμερα — απόλαυσε την ησυχία".

### 3. Προσοχή (risk panel)

Exception-based. One server query `getRiskItems()` returns a sorted union of risk types. Thresholds read from `cost_settings.dashboard_thresholds` (configurable).

Risk types and detection:

| Type | Detection | Severity |
|---|---|---|
| `overdue_invoice` | `invoices` where `status='overdue' OR (status in (sent, viewed) AND due_date < today)` | 1 (highest) |
| `stale_lead` | `leads` where stage in (contacted, qualified, proposal, negotiation) AND last `lead_activities.created_at` > `stale_lead_days` ago (or `created_at` if no activities) | 3 |
| `stale_deliverable` | `deliverables` where `status='pending_review' AND created_at > stale_deliverable_days ago` | 2 |
| `unsigned_contract` | `contracts` where `status in (sent, viewed) AND sent_at > stale_contract_days ago` | 2 |
| `deadline_risk` | `projects` where `deadline within deadline_risk_days days AND status not in (review, delivered, archived)` | 2 |
| `filming_no_crew` | `calendar_events` where `event_type='filming' AND assigned_to IS NULL AND start_date >= today` | 2 |

Sort by severity ascending, then by age descending within type. Limit 8 items shown; "View all" link goes to a new page `/admin/dashboard/risk` (server-rendered list, all items, filterable by type).

Each item row: type icon, short description, age badge (e.g., "14d"), link to source.

### 4. Sales section (super_admin)

Two cards side-by-side `lg:grid-cols-2`.

#### 4.1 Funnel card

Horizontal funnel, 5 stages with counts and conversion rates:

```
Filming Requests (pending)  →  Leads (open)  →  Proposals (sent)  →  Won  →  Active Projects
        12                          8                 5                3            15
                  67%                    63%               60%             —
```

- "Filming Requests (pending)" = `filming_requests` where `status='pending'`
- "Leads (open)" = `leads` where stage in (new, contacted, qualified, proposal, negotiation)
- "Proposals (sent)" = `proposals` where `status='sent'`
- "Won" = `leads` where stage='won' in last 30 days
- "Active Projects" = `projects` where status not in (delivered, archived)

Conversion = next stage / current stage (capped at 100%).

#### 4.2 Revenue forecast card

Bar chart, 3 buckets:

- **Confirmed (next 30d)** = sum `invoices.total` where `status in (sent, viewed) AND due_date <= today + 30`
- **Likely (next 30-90d)** = sum `leads.deal_value × leads.probability` where stage in (proposal, negotiation) AND `expected_close_date` between today+30 and today+90
- **Pipeline total** = sum `leads.deal_value` where stage in (new, contacted, qualified, proposal, negotiation) (uncalibrated)

Caption shows weighted total ("Expected: €X,XXX over next 90 days").

### 5. Finance section (super_admin)

Two cards side-by-side.

#### 5.1 Cost health card

- **Total monthly operating cost** = sum `cost_items.monthly_cost` where active=true (top number)
- **Cost per hour** = monthly cost / `cost_settings.expected_monthly_hours` (subline)
- **Per-category breakdown** = mini horizontal bars, one per `cost_categories` row, showing share of total
- **Margin status** = average actual project margin (rolling 90d, computed as in 5.2) compared to `cost_settings.default_margin`. Green badge if at or above target, red if below.

#### 5.2 Project profitability card

Top 5 most profitable + top 5 least profitable projects from the last 90 days (filter: `projects.created_at >= today − 90 days AND quoted_price IS NOT NULL AND status != 'archived'`). For each project:

- title, link to project detail
- quoted_price
- calculated cost = `(shooting_hours + editing_hours) × cost_per_hour_snapshot`
- margin = `(quoted_price − cost) / quoted_price`
- margin badge (green > target, yellow within 10% below target, red below)

Rendered as two collapsed sections: "Πιο κερδοφόρα" / "Λιγότερο κερδοφόρα".

### 6. Production section

#### 6.1 Crew load heatmap (next 14 days)

- Rows: crew members (distinct `assigned_to` values from `calendar_events` with `event_type='filming'` in next 14 days, joined to `user_profiles.display_name`)
- Columns: 14 day cells (today + 13)
- Cell value = count of filming events for that crew member on that day
- Cell color: 0 = empty, 1 = green, 2 = yellow, 3+ = red
- Click cell → drill down to `/admin/calendar?date=...&crew=...`

#### 6.2 Upcoming deadlines grouped (next 30d)

Replaces the existing `getUpcomingDeadlines()` flat list. Three groups:

- **At risk** — deadline within 7 days AND status not in (review, delivered)
- **On track** — deadline 7–30 days AND status in (filming, editing, review)
- **Recently delivered** — deadline within 7 past days AND status='delivered' (recognition layer)

Each group is a collapsible list of project rows (title, deadline date, status badge, days remaining).

### 7. Footer

#### 7.1 Activity feed

Existing `getRecentActivity(10)` — keep as-is. Both roles see this.

#### 7.2 Business velocity (super_admin only)

Summary card: "Last 7 days":

- N projects created (from activity_log: action='created', entity_type='project')
- N projects delivered (action='updated', metadata.status_after='delivered')
- N invoices paid (action='updated', entity_type='invoice', metadata.status_after='paid') with sum
- N contracts signed (action='updated', entity_type='contract', metadata.status_after='signed')
- N proposals sent (action='updated', entity_type='proposal', metadata.status_after='sent')

Single line each, with delta vs previous 7-day window.

## Data layer

### New queries — `src/lib/queries/dashboard/`

New folder. One file per logical domain. All functions are async server actions returning typed results.

| File | Exports | Returns |
|---|---|---|
| `kpi-hero.ts` | `getKpiHero()` | `{ revenueMtd, pipeline, activeProjects, profitMargin, cashOverdue, atRiskCount }` each `{ value, previous, delta, sparkline?, exception? }` |
| `today.ts` | `getTodayAgenda()` | `TodayItem[]` polymorphic union by `kind` |
| `risk.ts` | `getRiskItems(thresholds)` | `RiskItem[]` sorted by severity then age |
| `sales-funnel.ts` | `getSalesFunnel()`, `getRevenueForecast()` | funnel: `FunnelStage[]`; forecast: `{ confirmed, likely, pipeline }` |
| `finance.ts` | `getCostModelHealth()`, `getProjectProfitability(limit, range)` | health: nested aggregates; profitability: `ProjectProfitabilityRow[]` |
| `production.ts` | `getCrewLoad(daysAhead)`, `getUpcomingDeadlinesGrouped(daysAhead)` | crew: `{ crewMember, days: { date, count }[] }[]`; deadlines: `{ atRisk, onTrack, recentlyDelivered }` each `ProjectWithClient[]` |
| `velocity.ts` | `getBusinessVelocity(period)` | `{ projectsCreated, projectsDelivered, invoicesPaid, contractsSigned, proposalsSent }` each `{ count, sum?, deltaVsPrevious }` |

All return typed results conforming to existing `ActionResult<T>` pattern where applicable, or direct typed objects for read-only queries.

### Schema changes

#### Migration 00042 — proposals project link

```sql
ALTER TABLE proposals ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_proposals_project_id ON proposals(project_id);
```

Enables future "proposal converted to project" funnel and revenue realization tracking. Field is nullable; existing proposals stay null.

#### Migration 00043 — dashboard configurable thresholds

```sql
ALTER TABLE cost_settings ADD COLUMN dashboard_thresholds JSONB NOT NULL DEFAULT '{
  "stale_lead_days": 14,
  "stale_deliverable_days": 7,
  "stale_contract_days": 14,
  "deadline_risk_days": 7,
  "active_projects_warn_above": 50
}'::jsonb;
```

Singleton row id=1 receives the default. Editable from `/admin/cost-model` (existing page) — adds a new "Dashboard thresholds" section. Validation done client-side via Zod schema added to `src/lib/schemas/cost-settings.ts`.

## Component organization

```
src/components/admin/dashboard/
  hero/
    kpi-strip.tsx              server, fetches getKpiHero
    kpi-card.tsx               client, hover + sparkline
    sparkline.tsx              client, recharts mini line
  today/
    today-agenda.tsx           server, fetches getTodayAgenda
    today-item.tsx             client, polymorphic by kind
  risk/
    risk-panel.tsx             server, fetches getRiskItems
    risk-item.tsx              client
  sales/
    sales-funnel-card.tsx      server
    revenue-forecast-card.tsx  server
  finance/
    cost-health-card.tsx       server
    project-profitability-card.tsx  server
  production/
    crew-load-heatmap.tsx      server
    upcoming-deadlines-grouped.tsx  server
  velocity/
    business-velocity.tsx      server
  shared/
    delta-badge.tsx            client, ▲/▼ X% with color
    exception-badge.tsx        client, red dot
    age-badge.tsx              client, "3d ago"
```

Files over 300 lines split further. The legacy components `today-tasks.tsx`, `pending-actions.tsx`, `kpi-cards.tsx`, `revenue-chart.tsx`, `project-status-chart.tsx` are replaced and deleted. `activity-feed.tsx` stays — used by both roles in the footer.

## Data flow

`page.tsx` (Server Component) does:

1. `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();`
2. Fetch role from `user_profiles` (existing pattern from middleware).
3. Branch on role. Each branch runs its required queries with `Promise.all`.
4. Render section components in order, passing data as props.

Section components render synchronously from props. No client-side data fetching. The render is effectively static for the request lifetime.

Caching: rely on Next.js dynamic rendering with per-request Supabase server client. No explicit `revalidate` — risk and cash data must be fresh.

## Error handling

Each section component is wrapped in a small server-component error boundary pattern: the section's data fetch lives inside try/catch; on error, returns an empty-state placeholder with "Δεν φόρτωσε" + retry button (a tiny client island). One failing section does not break the page.

The KPI hero queries run in `Promise.allSettled` so one failed metric doesn't blank the whole strip — failed metrics show "—".

## i18n

All strings in `messages/el.json` and `messages/en.json` under namespace `dashboard.*`. Sub-namespaces:

- `dashboard.hero.*` (KPI labels, deltas)
- `dashboard.today.*` (item kinds, group headers)
- `dashboard.risk.*` (risk types, severities)
- `dashboard.sales.*`, `dashboard.finance.*`, `dashboard.production.*`, `dashboard.velocity.*`

Default locale `el`.

## Testing

- **Unit tests** — `src/lib/queries/dashboard/__tests__/*.test.ts`. Each query gets factory-data tests for empty / populated / threshold-edge cases. Use Supabase test client (existing pattern).
- **Component tests** — snapshot tests for empty / loading / populated states per section. Vitest + React Testing Library (existing setup).
- **E2E** — `e2e/admin-dashboard.spec.ts`:
  - Login as super_admin → assert all sections render
  - Login as admin → assert only operational sections render, sales/finance hidden
  - Trigger a risk condition (overdue invoice in fixture) → assert risk panel surfaces it
  - Click a hero KPI → assert navigation to filtered source page

100% coverage target on the new query functions (per project rule for business logic).

## Migration & rollout

Single PR (full refactor as agreed). Steps in order:

1. Migrations 00042 and 00043 applied to cloud Supabase Dashboard.
2. New queries land first (no UI consumer).
3. New components land, page.tsx switches to new layout.
4. Legacy dashboard components deleted in same PR.
5. E2E suite green.
6. Manual smoke test on staging (Vercel preview).
7. Merge → deploy.

No feature flag — atomic switch. Rollback via revert.

## Risks

- **Migration 00042 + 00043 must apply on cloud before merge** (per CURRENT.md note that migrations apply via Dashboard manually). Failing this, the build still passes but dashboard queries error → empty states everywhere.
- **Activity log gaps** — Business velocity assumes `activity_log` records project status changes with `metadata.status_after`. If logging is sparse for some entities (per research report finding), the velocity numbers undercount. Mitigation: count direct table updates via `updated_at` as fallback, or accept undercount until logging is unified (out of scope).
- **30-day-ago snapshots for hero deltas** — computing "active projects 30 days ago" from current state is impossible without an audit table. Acceptable approximation: derive from `activity_log` project status transitions. If too sparse, fall back to "vs static target from settings" rather than vs previous period for those KPIs.
- **Crew load heatmap** assumes `calendar_events.assigned_to` is set for every filming. Filming events synced from projects without `projects.assigned_to` will appear under "Unassigned". Surfaced by `filming_no_crew` risk type.

## Open questions

None at design time — defer remaining choices (icon set, exact color tokens, sparkline visual style) to implementation.
