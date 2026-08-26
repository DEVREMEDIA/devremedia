# V2 Dashboard Bridge (PR Β) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Τα 11 κομμάτια του v1 admin dashboard που λείπουν από το v2 μπαίνουν στο v2 shell, κατανεμημένα στις σωστές περιοχές, το καθένα σε δικό του `<Suspense>` — καμία σελίδα δεν φορτώνει «τα πάντα με τη μία».

**Architecture:** Γέφυρα, όχι redesign: τα υπάρχοντα self-contained async widgets (`src/components/admin/dashboard/**` — καθένα φέρνει τα δικά του δεδομένα και μεταφράσεις) συντίθενται μέσα στις v2 σελίδες με τα υπάρχοντα skeletons (`card-skeletons.tsx`). Role gating (super_admin vs admin) όπως στο v1, μέσω νέου shared helper. Το v1 dashboard ΔΕΝ αγγίζεται.

**Tech Stack:** Next.js 16 App Router, React Suspense, next-intl 4.8, Supabase.

**Spec:** `docs/superpowers/specs/2026-08-26-v2-switchover-spec.md` (ενότητα «Feature parity» — πίνακας κατανομής, και «Περιορισμός απόδοσης»)

## Global Constraints

- Branch `feat/v2-dashboard-bridge` από origin/master `6a7dd9a` (περιλαμβάνει το PR Α / #97).
- Πριν από ΚΑΘΕ commit: `pnpm build` πρέπει να περνά. `pnpm type-check` + `pnpm lint` στο τέλος κάθε task.
- Επιτρεπτά αρχεία ΜΟΝΟ: `src/app/admin-v2/{today,productions,clients,finance}/page.tsx`, `src/lib/auth-helpers.ts`, `messages/{el,en}.json`, `e2e/v2-shell.spec.ts`. Το v1 (`src/app/admin/**`, `src/components/admin/dashboard/**`) μένει άθικτο.
- Κάθε νέο widget τυλίγεται σε δικό του `<Suspense>` με fallback από τα υπάρχοντα `CardSkeleton`/`KpiStripSkeleton` — ποτέ top-level await για δεδομένα widget εκτός Suspense.
- Νέα ελληνικά strings μόνο μέσω `shellV2.pages` keys, ταυτόσημα δέντρα el/en.
- Conventional commits, imperative mood. Ποτέ commit τα untracked `.npmrc` / `.env.local`.

---

### Task 1: Shared helper `getAdminRole`

**Files:**
- Modify: `src/lib/auth-helpers.ts`

**Interfaces:**
- Produces: `export async function getAdminRole(): Promise<'super_admin' | 'admin' | null>` — ο μόνος τρόπος που τα Tasks 2-4 μαθαίνουν τον ρόλο. Δεν αλλάζει τίποτα υπάρχον στο αρχείο.

- [ ] **Step 1: Πρόσθεσε το helper στο τέλος του `src/lib/auth-helpers.ts`**

```ts
/** Ρόλος του τρέχοντος admin — για UI gating (super_admin βλέπει τα οικονομικά widgets). */
export async function getAdminRole(): Promise<'super_admin' | 'admin' | null> {
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

  if (data?.role === 'super_admin' || data?.role === 'admin') return data.role;
  return null;
}
```

(Ίδια σημασιολογία με το τοπικό `getRole()` του v1 `src/app/admin/dashboard/page.tsx:20-34` — εκείνο μένει ως έχει· πεθαίνει με το v1 στο PR Γ.)

- [ ] **Step 2: Build**

Run: `pnpm build && pnpm type-check`
Expected: επιτυχία.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-helpers.ts
git commit -m "feat(auth): shared getAdminRole helper for role-gated dashboard widgets"
```

---

### Task 2: «Σήμερα» — agenda, KPIs, activity, velocity

**Files:**
- Modify: `src/app/admin-v2/today/page.tsx`
- Modify: `messages/el.json`, `messages/en.json` (μόνο αν χρειαστεί νέο string — βλ. Step 2· τα widgets φέρνουν τις δικές τους μεταφράσεις από το namespace `dashboard`)

**Interfaces:**
- Consumes: `getAdminRole` (Task 1)· widgets: `KpiStrip`, `TodayAgenda`, `ActivityFeed` + `getRecentActivity`, `BusinessVelocity`, skeletons `CardSkeleton`/`KpiStripSkeleton` — imports ακριβώς όπως στο v1 `src/app/admin/dashboard/page.tsx:4-17`.
- Produces: το τελικό layout του «Σήμερα» μέχρι το redesign.

- [ ] **Step 1: Έλεγξε το caching του `getRiskItems`**

Διάβασε το `src/lib/queries/dashboard/risk.ts`. Αν το `getRiskItems` ΔΕΝ είναι τυλιγμένο σε React `cache()`, τύλιξέ το (μοτίβο των άλλων queries του dashboard perf stack). Χρειάζεται γιατί θα καλείται δύο φορές στο ίδιο request (υπότιτλος + ραντάρ) και πρέπει να γίνει dedupe.

- [ ] **Step 2: Ξαναστήσε το `src/app/admin-v2/today/page.tsx`**

Κράτα: `generateMetadata`, τον header τίτλο, τα `RISK_GROUPS` με τα υπάρχοντα i18n keys, το footer link, και ΟΛΟ το markup του ραντάρ (counter strip + grouped λίστες) — αλλά μετακίνησέ το ραντάρ σε τοπικό async component ώστε να μπει σε Suspense. Τελική δομή:

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { RiskItem } from '@/components/admin/dashboard/risk/risk-item';
import { KpiStrip } from '@/components/admin/dashboard/hero/kpi-strip';
import { TodayAgenda } from '@/components/admin/dashboard/today/today-agenda';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import { BusinessVelocity } from '@/components/admin/dashboard/velocity/business-velocity';
import { CardSkeleton, KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';
import { getRiskItems } from '@/lib/queries/dashboard/risk';
import { getRecentActivity } from '@/lib/queries';
import { getAdminRole } from '@/lib/auth-helpers';
import type { RiskType } from '@/types/dashboard';
import type { ActivityLogWithUser } from '@/types';

// generateMetadata: αμετάβλητο

async function Subtitle() {
  const t = await getTranslations('shellV2.pages.adminToday');
  const items = await getRiskItems();
  return <p className="mt-1 text-sm text-muted-foreground">{t('subtitle', { count: items.length })}</p>;
}

async function ActivityFeedSection() {
  const recentActivity = await getRecentActivity(10);
  return <ActivityFeed activities={recentActivity as ActivityLogWithUser[]} />;
}

async function RiskRadar() {
  const t = await getTranslations('shellV2.pages.adminToday');
  const RISK_GROUPS: { type: RiskType; label: string }[] = [ /* ίδιο με σήμερα */ ];
  const items = await getRiskItems();
  return (
    <>
      {/* το ΥΠΑΡΧΟΝ markup: section «Κινδυνεύουν» με counters + grouped λίστες + emptyState — αυτούσιο */}
    </>
  );
}

export default async function TodayPage() {
  const t = await getTranslations('shellV2.pages.adminToday');
  const role = await getAdminRole();
  const isSuper = role === 'super_admin';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <Suspense fallback={<p className="mt-1 text-sm text-muted-foreground">&nbsp;</p>}>
          <Subtitle />
        </Suspense>
      </header>

      {isSuper && (
        <Suspense fallback={<KpiStripSkeleton />}>
          <KpiStrip />
        </Suspense>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={6} />}>
          <TodayAgenda />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <ActivityFeedSection />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton rows={6} />}>
        <RiskRadar />
      </Suspense>

      {isSuper && (
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <BusinessVelocity />
        </Suspense>
      )}

      <p className="text-xs text-muted-foreground">{/* footer: αμετάβλητο */}</p>
    </div>
  );
}
```

Το `getAdminRole()` await στο top level είναι αποδεκτό (ένα ελαφρύ query· ό,τι κάνει και το v1). ΟΛΑ τα widgets μέσα σε Suspense.

- [ ] **Step 3: Build + οπτικός έλεγχος**

Run: `pnpm build && pnpm type-check`
Expected: επιτυχία. Σε dev: `/admin-v2/today` δείχνει αμέσως header+σκελετούς, μετά γεμίζουν agenda/feed/ραντάρ (και KPI/velocity ως super_admin).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin-v2/today/page.tsx src/lib/queries/dashboard/risk.ts messages/el.json messages/en.json
git commit -m "feat(v2): bridge agenda, KPIs, activity feed and velocity into Today"
```

(Πρόσθεσε στα paths ό,τι πραγματικά άλλαξε — τα messages μόνο αν προστέθηκε string.)

---

### Task 3: «Παραγωγές» — καρτέλα «Φόρτος & προθεσμίες»

**Files:**
- Modify: `src/app/admin-v2/productions/page.tsx`
- Modify: `messages/el.json`, `messages/en.json`

**Interfaces:**
- Consumes: `CrewLoadHeatmap`, `UpcomingDeadlinesGrouped`, `CardSkeleton` (imports όπως v1 dashboard). Νέο tab key `overview`.
- Produces: τρίτη καρτέλα στο productions hub — φορτώνει ΜΟΝΟ όταν είναι ενεργή (μοτίβο `{active === 'x' && ...}`).

- [ ] **Step 1: Νέα κλειδιά**

`shellV2.pages.adminProductions`: el `"tabOverview": "Φόρτος & προθεσμίες"`, en `"tabOverview": "Load & deadlines"`.

- [ ] **Step 2: Νέο tab στο page**

Στο `src/app/admin-v2/productions/page.tsx`: πρόσθεσε στο TABS `{ key: 'overview', label: t('tabOverview') }` (τρίτο), νέο component:

```tsx
function OverviewTab() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Suspense fallback={<CardSkeleton rows={4} />}>
        <CrewLoadHeatmap />
      </Suspense>
      <Suspense fallback={<CardSkeleton rows={5} />}>
        <UpcomingDeadlinesGrouped />
      </Suspense>
    </div>
  );
}
```

και `{active === 'overview' && <OverviewTab />}` στο render. Imports: `Suspense` από react, τα 2 widgets + `CardSkeleton` όπως στο v1 dashboard.

- [ ] **Step 3: Build + commit**

Run: `pnpm build && pnpm type-check` → επιτυχία.

```bash
git add src/app/admin-v2/productions/page.tsx messages/el.json messages/en.json
git commit -m "feat(v2): crew load and deadlines overview tab in Productions"
```

---

### Task 4: Sales cards στο «Ενδιαφέρον» + finance cards στην «Κοστολόγηση»/«Υγεία»

**Files:**
- Modify: `src/app/admin-v2/clients/page.tsx`
- Modify: `src/app/admin-v2/finance/page.tsx`

**Interfaces:**
- Consumes: `getAdminRole` (Task 1)· `SalesFunnelCard`, `RevenueForecastCard`, `CostHealthCard`, `ProjectProfitabilityCard`, `CardSkeleton` (imports όπως v1 dashboard).
- Produces: super_admin-only widgets μέσα στις αντίστοιχες καρτέλες. Κανένα νέο string.

- [ ] **Step 1: Clients — InterestTab**

Στο `src/app/admin-v2/clients/page.tsx`, το `InterestTab()` γίνεται:

```tsx
async function InterestTab() {
  const [result, role] = await Promise.all([getLeads(), getAdminRole()]);
  const leads = (result.data ?? []) as unknown as ComponentProps<typeof AllLeadsTable>['leads'];
  return (
    <div className="space-y-6">
      {role === 'super_admin' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <SalesFunnelCard />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <RevenueForecastCard />
          </Suspense>
        </div>
      )}
      <AllLeadsTable leads={leads} />
    </div>
  );
}
```

- [ ] **Step 2: Finance — CostModelTab & PricingHealthTab**

Στο `src/app/admin-v2/finance/page.tsx`: στο `CostModelTab()` πρόσθεσε πριν το `<CostModelContent .../>` (τυλίγοντας σε `<div className="space-y-6">`):

```tsx
{role === 'super_admin' && (
  <Suspense fallback={<CardSkeleton rows={5} />}>
    <CostHealthCard />
  </Suspense>
)}
```

με `const role = await getAdminRole();` μέσα στο ήδη υπάρχον `Promise.all` (πρόσθεσέ το ως επιπλέον μέλος). Αντίστοιχα στο `PricingHealthTab()` με `<ProjectProfitabilityCard />` πάνω από το `PricingHealthContent`.

- [ ] **Step 3: Build + commit**

Run: `pnpm build && pnpm type-check && pnpm lint` → επιτυχία.

```bash
git add src/app/admin-v2/clients/page.tsx src/app/admin-v2/finance/page.tsx
git commit -m "feat(v2): bridge sales funnel, forecast and finance health cards into their hubs"
```

---

### Task 5: e2e — γέφυρα smoke

**Files:**
- Modify: `e2e/v2-shell.spec.ts`

**Interfaces:**
- Consumes: υπάρχον μοτίβο του spec (loginAsAdmin, skip-gating). ΠΡΩΤΑ διάβασε τους τίτλους που τα widgets αποδίδουν (π.χ. Card title του `TodayAgenda` — δες το component και τα κλειδιά του στο namespace `dashboard` στα messages) — μην μαντέψεις strings.

- [ ] **Step 1: Δύο νέα tests στο ίδιο describe**

```ts
test('today page bridges agenda and activity', async ({ page }) => {
  test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
  await loginAsAdmin(page);
  await page.goto('/admin-v2/today');
  // αντικατέστησε τα regex με τους ΠΡΑΓΜΑΤΙΚΟΥΣ τίτλους των δύο cards (el|en)
  await expect(page.getByText(/<TodayAgenda-title-el>|<TodayAgenda-title-en>/i).first()).toBeVisible();
  await expect(page.getByText(/<ActivityFeed-title-el>|<ActivityFeed-title-en>/i).first()).toBeVisible();
});

test('productions overview tab shows crew load', async ({ page }) => {
  test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
  await loginAsAdmin(page);
  await page.goto('/admin-v2/productions?tab=overview');
  await expect(page.getByText(/<CrewLoad-title-el>|<CrewLoad-title-en>/i).first()).toBeVisible();
});
```

Τα placeholders `<...>` ΠΡΕΠΕΙ να αντικατασταθούν με τα πραγματικά strings που θα βρεις στα components/messages — αυτό είναι μέρος του task, όχι προαιρετικό.

- [ ] **Step 2: Συλλογή + έλεγχοι**

Run: `pnpm exec playwright test v2-shell.spec.ts --list` → συλλέγει όλα τα tests. `pnpm type-check && pnpm lint` → καθαρά.

- [ ] **Step 3: Commit**

```bash
git add e2e/v2-shell.spec.ts
git commit -m "test(v2): smoke for bridged agenda, activity and crew load"
```

---

## Self-Review Notes

- Κατανομή = ακριβώς ο πίνακας του spec· το `RiskPanel` του v1 ΔΕΝ μεταφέρεται (το v2 ραντάρ είναι το βελτιωμένο ισοδύναμο).
- Ο υπότιτλος του Σήμερα κρατά το count μέσω Suspense + cached `getRiskItems` — δεν μπλοκάρει το paint (περιορισμός απόδοσης του χρήστη).
- Gating: KPI/velocity/sales/finance cards = super_admin only, όπως v1. Agenda/activity/ραντάρ/φόρτος/προθεσμίες = όλοι οι admins, όπως v1.
- Hardcoded `/admin/...` hrefs ΜΕΣΑ στα widgets (π.χ. kpi-card links): αναμενόμενα — το KeepInShell τα κρατά στο v2 στην preview, και γίνονται native στο PR Γ. Μην τα αλλάξεις.
