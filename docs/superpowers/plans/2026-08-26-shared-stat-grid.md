# One design for a number — shared stat grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared stat grid and stat card replace all seven bespoke figure-grid variants across admin, employee, client and salesman.

**Architecture:** The shipped `/admin/today` screen already contains the target treatment — the risk-radar tiles: a hairline-ruled grid (`gap-px` over `bg-border`) of `bg-card` tiles, each a mono micro-label above a `font-display` figure with `tabular-nums`. That becomes `StatGrid` + `StatCard` in `src/components/shared/`. The card absorbs everything the richest existing variant (the admin `KpiCard`) can do — icon, exception dot, period delta, sparkline, link — as options, so no variant needs to survive. `DeltaBadge` and `Sparkline` move from `src/components/admin/dashboard/shared/` to `src/components/shared/`; `ExceptionBadge` folds into `StatCard` and its file is deleted.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4 (`@theme inline` tokens), next-intl 4.8, lucide-react, recharts (sparkline only), Playwright.

**Spec:** DEVREMEDIA/devremedia#103 (parent PRD #100). Read the issue body; it is the authority this plan argues from.

## Global Constraints

- **Which figures are shown, and what they mean, must not change.** Same labels, same numbers, same formatting, same ordering, same links, same conditional colouring. This slice is a change of clothes, not of content.
- **No message-catalogue changes.** `messages/en.json` and `messages/el.json` are not touched by any task. Every label keeps the exact `t('…')` call it has today.
- **No query, route, or Suspense changes.** No file under `src/lib/queries/`, `src/lib/actions/`, or `src/middleware.ts` is touched. No `<Suspense>` boundary is added, removed or moved.
- **No raw colours.** Everything comes from tokens: `bg-card`, `border-border`, `text-muted-foreground`, `text-foreground`, `text-tone-{critical,caution,positive,neutral}`, `bg-tone-*-bg`, `hover:bg-accent`, `ring-ring`. A literal Tailwind palette colour (`text-blue-500`, `bg-amber-500/10`, `rgba(…)`) is a defect — the build guard fails on it.
- **Tone comes from the resolver, never from a colour in a component.** `statusTone()` in `src/lib/status-tone.ts` maps a raw database status to a `Tone`. Where a variant hardcoded a colour per item (per lead stage, per task status), the migration passes a `Tone`, not a class.
- **`src/components/landing/**` is never touched.** It is a different product surface, permanently out of scope.
- **Never stage `.npmrc` or `.env.local`.** They are local Windows build workarounds and must stay untracked.
- Greek is the default locale (`el`). Comments in this codebase are written in Greek; match the surrounding file.

---

## File Structure

**Created:**
- `src/components/shared/stat-grid.tsx` — the hairline grid container. Layout only.
- `src/components/shared/stat-card.tsx` — one tile. Label, value, and every option the variants needed.

**Moved (git mv, then fix importers):**
- `src/components/admin/dashboard/shared/delta-badge.tsx` → `src/components/shared/delta-badge.tsx`
- `src/components/admin/dashboard/shared/sparkline.tsx` → `src/components/shared/sparkline.tsx`

**Deleted:**
- `src/components/admin/dashboard/shared/exception-badge.tsx` — folds into `StatCard`; it has no other caller.
- `src/components/admin/dashboard/hero/kpi-card.tsx` — `StatCard` replaces it; it has no other caller.

**Modified:**
- `src/components/admin/dashboard/hero/kpi-strip.tsx`
- `src/components/admin/dashboard/shared/card-skeletons.tsx` (`KpiStripSkeleton` must match the new grid)
- `src/components/admin/dashboard/velocity/business-velocity.tsx` (import path only)
- `src/app/admin/today/page.tsx` (the risk-radar tile grid)
- `src/components/admin/chatbot/chatbot-stats.tsx`
- `src/components/admin/calendar/calendar-stats.tsx`
- `src/components/employee/dashboard/task-stats.tsx`
- `src/components/client/dashboard/dashboard-stats.tsx`
- `src/components/salesman/dashboard/pipeline-summary.tsx`
- `scripts/check-design.mjs`
- `e2e/design-identity.spec.ts`

---

### Task 1: The shared primitives

**Files:**
- Create: `src/components/shared/stat-grid.tsx`
- Create: `src/components/shared/stat-card.tsx`
- Move: `src/components/admin/dashboard/shared/delta-badge.tsx` → `src/components/shared/delta-badge.tsx`
- Move: `src/components/admin/dashboard/shared/sparkline.tsx` → `src/components/shared/sparkline.tsx`
- Modify: `src/components/admin/dashboard/velocity/business-velocity.tsx` (import path only)
- Modify: `src/components/admin/dashboard/hero/kpi-card.tsx` (import paths only — this file is deleted in Task 2, but must keep compiling now)

**Interfaces:**
- Consumes: `Tone` and `statusTone` from `@/lib/status-tone`; `cn` from `@/lib/utils`.
- Produces:
  ```ts
  // src/components/shared/stat-grid.tsx
  export function StatGrid(props: { columns?: 2 | 3 | 4 | 5 | 6 | 7; children: ReactNode }): JSX.Element;

  // src/components/shared/stat-card.tsx
  export interface StatCardProps {
    label: string;
    value: ReactNode;          // already formatted by the caller
    tone?: Tone;               // colours the figure; omit for a plain figure
    caption?: ReactNode;       // secondary line below the figure
    icon?: LucideIcon;
    href?: string;             // makes the whole tile a link
    deltaPct?: number | null;  // period-over-period delta; omit to hide the badge
    invertDelta?: boolean;     // when "up" is bad (overdue cash, at-risk count)
    sparkline?: number[];      // an empty array reserves the row, keeping tiles level
    exception?: boolean;       // the small critical dot
  }
  export function StatCard(props: StatCardProps): JSX.Element;
  ```

**Context:** neither file carries `'use client'`. `StatCard` must stay importable from a server component (`KpiStrip` is `async`) and from a client component alike. `Sparkline` keeps its own `'use client'` (recharts); importing a client component from a server component is fine.

- [ ] **Step 1: Move the two shared pieces**

```bash
git mv src/components/admin/dashboard/shared/delta-badge.tsx src/components/shared/delta-badge.tsx
git mv src/components/admin/dashboard/shared/sparkline.tsx src/components/shared/sparkline.tsx
```

Then fix the three importers. In `src/components/admin/dashboard/velocity/business-velocity.tsx`:

```diff
-import { DeltaBadge } from '../shared/delta-badge';
+import { DeltaBadge } from '@/components/shared/delta-badge';
```

In `src/components/admin/dashboard/hero/kpi-card.tsx` (temporary — the file is deleted in Task 2):

```diff
-import { DeltaBadge } from '../shared/delta-badge';
+import { DeltaBadge } from '@/components/shared/delta-badge';
 import { ExceptionBadge } from '../shared/exception-badge';
-import { Sparkline } from '../shared/sparkline';
+import { Sparkline } from '@/components/shared/sparkline';
```

Change nothing else in those files — not the markup, not the props.

- [ ] **Step 2: Write `src/components/shared/stat-grid.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatGridProps {
  /** Πόσες στήλες στο μεγάλο πλάτος. Σε στενή οθόνη πέφτουν πάντα σε δύο. */
  columns?: 2 | 3 | 4 | 5 | 6 | 7;
  children: ReactNode;
}

// Το Tailwind δεν βλέπει class names που χτίζονται δυναμικά, οπότε ο χάρτης
// μένει στατικός — αλλά ζει εδώ, μία φορά, όχι σε κάθε πλέγμα του προϊόντος.
const COLUMN_CLASSES: Record<NonNullable<StatGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7',
};

/**
 * Ένα πλέγμα αριθμών, χαραγμένο με τρίχινες γραμμές αντί για αιωρούμενες
 * κάρτες: το `gap-px` πάνω σε `bg-border` αφήνει το φόντο να φανεί ανάμεσα
 * στα πλακίδια. Ένα μπλοκ, όχι επτά αντικείμενα.
 */
export function StatGrid({ columns = 4, children }: StatGridProps) {
  return (
    <div
      data-slot="stat-grid"
      className={cn('grid gap-px border border-border bg-border', COLUMN_CLASSES[columns])}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/shared/stat-card.tsx`**

```tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { DeltaBadge } from '@/components/shared/delta-badge';
import { Sparkline } from '@/components/shared/sparkline';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status-tone';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: Tone;
  caption?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  deltaPct?: number | null;
  invertDelta?: boolean;
  sparkline?: number[];
  exception?: boolean;
}

// Χωρίς τόνο ο αριθμός είναι απλός· με τόνο βάφεται. Το `neutral` ΔΕΝ είναι
// το ίδιο με «χωρίς τόνο» — είναι ρητά σβησμένος αριθμός (π.χ. μηδενικό
// πλήθος), και έτσι κρατιέται η σημερινή συμπεριφορά του ραντάρ κινδύνων.
const VALUE_TONE: Record<Tone, string> = {
  critical: 'text-tone-critical',
  caution: 'text-tone-caution',
  positive: 'text-tone-positive',
  neutral: 'text-tone-neutral',
};

const TILE = 'flex flex-col bg-card p-4';

/**
 * Ένας αριθμός, με τον ίδιο τρόπο παντού. Ό,τι χρειάστηκε κάποια από τις
 * παλιές παραλλαγές ζει εδώ ως επιλογή, ώστε καμία να μη χρειάζεται να μείνει.
 */
export function StatCard({
  label,
  value,
  tone,
  caption,
  icon: Icon,
  href,
  deltaPct,
  invertDelta,
  sparkline,
  exception,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] leading-tight uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {exception ? (
            <span className="h-2 w-2 rounded-full bg-tone-critical" aria-label="Exception" />
          ) : null}
          {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : null}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span
          data-slot="stat-card-value"
          className={cn(
            'font-display text-3xl leading-none tabular-nums',
            tone ? VALUE_TONE[tone] : 'text-foreground',
          )}
        >
          {value}
        </span>
        {deltaPct !== undefined ? (
          <DeltaBadge deltaPct={deltaPct} invertColors={invertDelta} />
        ) : null}
      </div>

      {caption ? (
        <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{caption}</p>
      ) : null}

      {/* Ένας άδειος πίνακας κρατά τη θέση, ώστε πλακίδια με και χωρίς
          καμπύλη να μένουν στο ίδιο ύψος μέσα στην ίδια λωρίδα. */}
      {sparkline ? (
        <div className="mt-2">
          {sparkline.length > 0 ? <Sparkline data={sparkline} /> : <div className="h-8" />}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        data-slot="stat-card"
        className={cn(
          TILE,
          'transition-colors hover:bg-accent',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div data-slot="stat-card" className={TILE}>
      {content}
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles and the guard is still happy**

Run: `pnpm type-check`
Expected: no errors.

Run: `node scripts/check-design.mjs`
Expected: `ok — …` (the new files are not yet in `COVERED`; that happens in Task 4).

Run: `pnpm lint`
Expected: 0 errors. Pre-existing warnings are fine; do not fix unrelated ones.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/stat-grid.tsx src/components/shared/stat-card.tsx src/components/shared/delta-badge.tsx src/components/shared/sparkline.tsx src/components/admin/dashboard/velocity/business-velocity.tsx src/components/admin/dashboard/hero/kpi-card.tsx
git commit -m "feat(design): add the shared stat grid and stat card"
```

---

### Task 2: The admin dashboard — the two richest grids

**Files:**
- Modify: `src/components/admin/dashboard/hero/kpi-strip.tsx`
- Delete: `src/components/admin/dashboard/hero/kpi-card.tsx`
- Delete: `src/components/admin/dashboard/shared/exception-badge.tsx`
- Modify: `src/components/admin/dashboard/shared/card-skeletons.tsx` (`KpiStripSkeleton` only)
- Modify: `src/app/admin/today/page.tsx` (the risk-radar tile grid inside `RiskRadar` only)

**Interfaces:**
- Consumes: `StatGrid`, `StatCard` from Task 1.
- Produces: nothing later tasks depend on.

**Context:** `KpiCard` and `ExceptionBadge` each have exactly one caller, which this task rewrites — after this task both files are unreferenced and must be deleted, not left orphaned.

- [ ] **Step 1: Rewrite `kpi-strip.tsx` onto the shared grid**

The seven cards keep their exact labels, hrefs, icons, formatters and `invertDeltaColors` flags. Replace the wrapper `div` and each `<KpiCard>`:

```diff
-import { KpiCard } from './kpi-card';
+import { StatGrid } from '@/components/shared/stat-grid';
+import { StatCard } from '@/components/shared/stat-card';
```

```diff
-    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-7">
-      <KpiCard
-        label={t('revenueMtd')}
-        metric={hero.revenueMtd}
-        href="/admin/reports"
-        icon={Wallet}
-        formatValue={fmtEur}
-      />
+    <StatGrid columns={7}>
+      <StatCard
+        label={t('revenueMtd')}
+        value={fmtEur(hero.revenueMtd.value)}
+        href="/admin/reports"
+        icon={Wallet}
+        deltaPct={hero.revenueMtd.deltaPct}
+        sparkline={hero.revenueMtd.sparkline ?? []}
+        exception={hero.revenueMtd.exception}
+      />
```

Do the same for the other six, keeping each one's own formatter and href:

| label key | metric | href | icon | formatter | extra |
|---|---|---|---|---|---|
| `revenueMtd` | `hero.revenueMtd` | `/admin/reports` | `Wallet` | `fmtEur` | — |
| `collectionsMtd` | `hero.collectionsMtd` | `/admin/reports` | `Banknote` | `fmtEur` | — |
| `pipeline` | `hero.pipeline` | `/admin/leads` | `TrendingUp` | `fmtEur` | — |
| `activeProjects` | `hero.activeProjects` | `/admin/projects` | `Briefcase` | `fmtInt` | — |
| `profitMargin` | `hero.profitMargin` | `/admin/reports` | `Activity` | `fmtPct` | — |
| `cashOverdue` | `hero.cashOverdue` | `/admin/invoices?status=overdue` | `Coins` | `fmtEur` | `invertDelta` |
| `atRisk` | `hero.atRiskCount` | `/admin/dashboard/risk` | `AlertTriangle` | `fmtInt` | `invertDelta` |

Every card passes `sparkline={<metric>.sparkline ?? []}` so all seven tiles stay level, and `exception={<metric>.exception}`. Close with `</StatGrid>`.

The old `KpiCard` marked an exception by adding `border-tone-critical` to the whole card; the shared card marks it with the dot the old `ExceptionBadge` drew. Both signals existed before — the dot survives, the border does not, because a hairline grid has no per-tile border to colour.

- [ ] **Step 2: Delete the two now-unreferenced files**

```bash
git rm src/components/admin/dashboard/hero/kpi-card.tsx
git rm src/components/admin/dashboard/shared/exception-badge.tsx
```

Verify nothing still references them:

Run: `grep -rn "kpi-card\|exception-badge\|KpiCard\|ExceptionBadge" src e2e scripts`
Expected: no output.

- [ ] **Step 3: Match the skeleton to the new grid**

`KpiStripSkeleton` is what the user sees while the strip loads. It must be the same shape, or the screen jumps. Replace its body:

```tsx
export function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-2 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
```

Remove the now-unused `Card`, `CardContent`, `CardHeader` import **only if** `CardSkeleton` below no longer needs them — it does need them, so keep the import as it is.

- [ ] **Step 4: Move the risk radar onto the shared grid**

In `src/app/admin/today/page.tsx`, inside `RiskRadar`, the first `<section>` hand-rolls exactly this grid. Replace only that grid — the `<h2>` above it and everything below it stay untouched:

```diff
-        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
-          {RISK_GROUPS.map((group) => {
-            const count = items.filter((i) => i.type === group.type).length;
-
-            return (
-              <div key={group.type} className="bg-card p-3">
-                <div
-                  className={`font-display text-3xl leading-tight tabular-nums ${count > 0 ? 'text-tone-critical' : 'text-muted-foreground'}`}
-                >
-                  {count}
-                </div>
-                <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
-                  {group.label}
-                </p>
-              </div>
-            );
-          })}
-        </div>
+        <StatGrid columns={6}>
+          {RISK_GROUPS.map((group) => {
+            const count = items.filter((i) => i.type === group.type).length;
+            return (
+              <StatCard
+                key={group.type}
+                label={group.label}
+                value={count}
+                tone={count > 0 ? 'critical' : 'neutral'}
+              />
+            );
+          })}
+        </StatGrid>
```

Add the two imports at the top of the file, in the existing `@/components/shared/…` group next to `PageHeading`.

The label moves from below the figure to above it, and the zero-count grey moves from `text-muted-foreground` to `text-tone-neutral`. Both are deliberate: the whole product now reads label-then-figure, and `tone-neutral` is the token for a deliberately quiet figure.

- [ ] **Step 5: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `node scripts/check-design.mjs`
Expected: `ok — …`.

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/admin/dashboard src/app/admin/today/page.tsx
git commit -m "feat(design): the admin dashboard figures move onto the shared grid"
```

---

### Task 3: The five remaining bespoke grids

**Files:**
- Modify: `src/components/admin/chatbot/chatbot-stats.tsx`
- Modify: `src/components/admin/calendar/calendar-stats.tsx`
- Modify: `src/components/employee/dashboard/task-stats.tsx`
- Modify: `src/components/client/dashboard/dashboard-stats.tsx`
- Modify: `src/components/salesman/dashboard/pipeline-summary.tsx`

**Interfaces:**
- Consumes: `StatGrid`, `StatCard` from Task 1.
- Produces: nothing later tasks depend on.

**Context:** five files, one change each: a hand-rolled tile grid becomes `StatGrid` + `StatCard`. In every case the labels, the values, the icons and the order stay exactly as they are. What goes away is the per-item colour: none of these colours meant anything a reader could decode — they were decoration, and the shared card has no slot for decoration. Where a colour *did* carry meaning, it becomes a `tone`.

All five files keep their `'use client'` directive and their `useTranslations` calls unchanged.

- [ ] **Step 1: `chatbot-stats.tsx`**

Four figures, no colour, no icon meaning beyond decoration. Keep the icons.

```diff
-import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
+import { StatGrid } from '@/components/shared/stat-grid';
+import { StatCard } from '@/components/shared/stat-card';
```

```diff
-    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
-      {stats.map((stat) => (
-        <Card key={stat.title}>
-          …
-        </Card>
-      ))}
-    </div>
+    <StatGrid columns={4}>
+      {stats.map((stat) => (
+        <StatCard key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} />
+      ))}
+    </StatGrid>
```

- [ ] **Step 2: `calendar-stats.tsx`**

The `useMemo` block that computes the four numbers is untouched. Only the `cards` array and the render change. Drop the `color` field; two of the four carried meaning and become tones, two were decoration:

```tsx
const cards: { label: string; value: number; icon: ComponentType<{ className?: string }>; tone?: Tone }[] = [
  { label: t('thisMonthEvents'), value: stats.thisMonthEvents, icon: CalendarDays },
  {
    label: t('upcomingDeadlines'),
    value: stats.upcomingDeadlines,
    icon: AlertTriangle,
    tone: stats.upcomingDeadlines > 0 ? 'caution' : undefined,
  },
  {
    label: t('overdueInvoices'),
    value: stats.overdueInvoices,
    icon: FileText,
    tone: stats.overdueInvoices > 0 ? 'critical' : undefined,
  },
  { label: t('activeProjects'), value: stats.activeProjects, icon: FolderOpen },
];
```

Import `Tone` as a type from `@/lib/status-tone`. Render:

```tsx
<StatGrid columns={4}>
  {cards.map((card) => (
    <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
  ))}
</StatGrid>
```

`StatCard`'s `icon` prop is typed `LucideIcon`; these four are lucide icons, so change the array's icon type from `ComponentType<{ className?: string }>` to `LucideIcon` (imported as a type from `lucide-react`) and drop the now-unused `ComponentType` import.

Colour previously fired unconditionally (a red icon chip even at zero overdue invoices). Tying the tone to `> 0` is the honest reading of what those colours were for, and matches the risk radar.

- [ ] **Step 3: `task-stats.tsx` (employee)**

Four task-status counts. These *do* have meaning: the status resolver knows them. Replace the `accent`/`bg` fields with a tone from the resolver, keyed on the raw status value — never on the translated label:

```tsx
import { statusTone } from '@/lib/status-tone';

const items = [
  { label: t('todoCount'), value: stats.todo, icon: CheckSquare, status: 'todo' },
  { label: t('inProgressCount'), value: stats.in_progress, icon: Clock, status: 'in_progress' },
  { label: t('reviewCount'), value: stats.review, icon: Eye, status: 'review' },
  { label: t('doneCount'), value: stats.done, icon: CheckCircle2, status: 'done' },
];
```

```tsx
<StatGrid columns={4}>
  {items.map((item) => (
    <StatCard
      key={item.label}
      label={item.label}
      value={item.value}
      icon={item.icon}
      tone={statusTone(item.status)}
    />
  ))}
</StatGrid>
```

`statusTone` resolves `'todo'` → `neutral`, `'in_progress'` → `caution`, `'review'` → `caution`, `'done'` → `positive`. Drop the `cn` import if nothing else in the file uses it.

- [ ] **Step 4: `dashboard-stats.tsx` (client)**

Three figures. Only the middle one's colour meant anything — it went orange when there was something to do:

```tsx
<StatGrid columns={3}>
  <StatCard label={t('activeProjects')} value={activeProjectsCount} icon={Clapperboard} />
  <StatCard
    label={t('pendingActions')}
    value={pendingActionsCount}
    icon={AlertCircle}
    tone={pendingActionsCount > 0 ? 'caution' : 'positive'}
  />
  <StatCard label={t('upcomingFilmings')} value={upcomingFilmingsCount} icon={Calendar} />
</StatGrid>
```

Drop the now-unused `cn` import and the `stats` array.

- [ ] **Step 5: `pipeline-summary.tsx` (salesman) — the two top cards only**

Replace only the first `<div className="grid gap-4 md:grid-cols-2">` block and its two hand-rolled tiles. The "Pipeline by Stage" panel below it is a different idea — a funnel breakdown, not a figure grid — and **stays exactly as it is in this slice**.

```tsx
<StatGrid columns={2}>
  <StatCard
    label={t('pipelineSummary')}
    value={`${pipelineValue.total.toLocaleString('el-GR')}€`}
    icon={DollarSign}
    caption={`Weighted: ${pipelineValue.weighted.toLocaleString('el-GR')}€`}
  />
  <StatCard
    label={t('activeLeads')}
    value={activeLeads}
    icon={TrendingUp}
    caption={`${summary.won} ${tStatus('won')}, ${summary.lost} ${tStatus('lost')}`}
  />
</StatGrid>
```

The literal `Weighted:` is pre-existing untranslated English. It stays exactly as it is — adding a key would touch both catalogues, which this slice does not do. It is recorded for the copy slice.

- [ ] **Step 6: Verify**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm lint`
Expected: 0 errors — in particular, no unused imports left behind in any of the five files.

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/chatbot/chatbot-stats.tsx src/components/admin/calendar/calendar-stats.tsx src/components/employee/dashboard/task-stats.tsx src/components/client/dashboard/dashboard-stats.tsx src/components/salesman/dashboard/pipeline-summary.tsx
git commit -m "feat(design): the remaining figure grids move onto the shared card"
```

---

### Task 4: Lock it in — guard coverage and Playwright

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

**Interfaces:**
- Consumes: the `data-slot="stat-card"` and `data-slot="stat-grid"` attributes from Task 1; the migrated screens from Tasks 2 and 3.

**Context:** the guard runs inside `pnpm build`, so it is the only protection that actually fires today — the credentialed e2e specs are skipped in this environment because no test users exist. Coverage is therefore what matters most here: every file this slice cleaned goes into `COVERED`, so a raw colour cannot come back into it. Every bespoke variant that was replaced was built out of raw palette colours (`text-blue-500`, `bg-amber-500/10`), so the raw-colour rule genuinely catches a re-hand-rolled tile in those files.

Be honest about the limit, in a comment: this does **not** catch someone hand-rolling a brand-new figure grid in a file that is not covered.

- [ ] **Step 1: Extend `COVERED` in `scripts/check-design.mjs`**

Add these entries to the `COVERED` array, each with a short Greek comment saying what it is:

```js
  'src/components/shared/stat-grid.tsx',
  'src/components/shared/stat-card.tsx',
  'src/components/shared/delta-badge.tsx',
  'src/components/shared/sparkline.tsx',
  // Οι οθόνες που πέρασαν στο κοινό πλέγμα. Ήταν φτιαγμένες από ωμά χρώματα·
  // αν ξαναγίνουν, ο κανόνας χτυπά αμέσως.
  'src/components/admin/chatbot/chatbot-stats.tsx',
  'src/components/admin/calendar/calendar-stats.tsx',
  'src/components/employee/dashboard/task-stats.tsx',
  'src/components/client/dashboard/dashboard-stats.tsx',
```

Do **not** add `src/components/salesman/dashboard/pipeline-summary.tsx` — its stage-breakdown panel still holds raw colours and is out of scope for this slice. Instead, note it in a comment above the list as owed to a later slice.

- [ ] **Step 2: Run the guard and confirm it passes**

Run: `node scripts/check-design.mjs`
Expected: `ok — <N> file(s) covered, no raw colours; …` with a larger N than before.

- [ ] **Step 3: Prove the guard actually bites**

Temporarily add `text-blue-500` to a class string in `src/components/employee/dashboard/task-stats.tsx`.

Run: `node scripts/check-design.mjs`
Expected: exits non-zero, naming that file and line.

Revert the temporary edit. Run the guard again and confirm it is green. Do not commit the temporary edit.

- [ ] **Step 4: Extend `e2e/design-identity.spec.ts`**

Append a new `test.describe` block after the `page heading` one. Follow the file's existing conventions exactly: the same `test.skip(!process.env.E2E_TEST_USERS_READY, …)` guard, the same `loginAsAdmin(page)` call, the same URL assertion. Read the file first and match it.

**Only `loginAsAdmin` exists** in `e2e/helpers/auth`, and the middleware lets an admin into `/client/*`, `/employee/*` and `/salesman/*` — one admin session covers all four roles. Do not invent `loginAsClient`/`loginAsEmployee` helpers.

| route | grid it exercises | expected `[data-slot="stat-card"]` count |
|---|---|---|
| `/admin/today` | risk radar (the KPI strip is super-admin only, so the count is a floor) | at least 6 |
| `/admin/clients` | chatbot statistics | exactly 4 |
| `/employee/today` | task counts | exactly 4 |
| `/client/home` | client figures | exactly 3 |
| `/salesman/today` | pipeline figures | exactly 2 |

For each route: assert the URL (as the existing hub test does, so a redirect to `/login` fails loudly instead of quietly reporting zero cards), assert `page.locator('[data-slot="stat-grid"]').first()` is visible, then assert the count — `toHaveCount(n)` for the exact rows, and `expect(await page.locator('[data-slot="stat-card"]').count()).toBeGreaterThanOrEqual(6)` for `/admin/today`.

- [ ] **Step 5: Verify the suite is well-formed**

Run: `pnpm exec playwright test e2e/design-identity.spec.ts --list`
Expected: the new tests are listed. They will be skipped at run time without `E2E_TEST_USERS_READY`; that is expected and is not a failure.

- [ ] **Step 6: Full verification**

Run: `pnpm type-check` → no errors.
Run: `pnpm lint` → 0 errors.
Run: `pnpm test:unit` → all pass.
Run: `pnpm build` → succeeds, and both guards print `ok`.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts
git commit -m "test(design): guard the migrated figure grids and cover them in e2e"
```
