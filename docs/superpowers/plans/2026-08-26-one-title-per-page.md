# One Title Per Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page in the product renders exactly one page title, through the shared `PageHeading` from the identity foundation.

**Architecture:** Four populations, handled differently. The 8 tabbed **hubs** own their page title and adopt `PageHeading`. The 17 **tab bodies** mounted inside those hubs stop rendering a title of their own; the seven that carry controls keep the controls as a toolbar row. The 41 **standalone pages** that use the old `PageHeader` swap it for `PageHeading` mechanically. A further 8 pages **hand-roll an `<h1>`** without the old component at all, and adopt `PageHeading` too. `PageHeader` then has no callers and is deleted, which is what makes the invariant permanent.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, next-intl, Playwright 1.58, Vitest 3.

**Spec:** GitHub issue DEVREMEDIA/devremedia#102 (slice of PRD #100). Foundation shipped in #101 / master `dedd05b`.

## Global Constraints

- **Never stage `.npmrc` or `.env.local`.** They are local Windows build workarounds and must stay untracked.
- **Never touch the landing layer.** `src/components/landing/**` is out of scope, including the `<h1>` in `hero-section.tsx`.
- **What each page shows, and the order it shows it in, does not change.** This slice moves and deletes headings. It does not touch queries, data flow, routing, or `Suspense` boundaries.
- **No raw colours.** Every colour comes from a token. `pnpm check:design` enforces this on covered areas.
- **Both message catalogues stay in step.** `messages/el.json` and `messages/en.json` must keep identical key trees. Removing a heading may orphan keys; removing a key from one file means removing it from the other.
- **`PageHeading` takes `title`, `subtitle`, `children` — and no `className`.** No caller passes one today; do not add the prop.
- **Greek is the default locale.** Any user-visible string must come from the message catalogues, never a literal in a component.
- Verification for every task: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm check:design`, `pnpm build`.

## Rulings carried into this plan

These resolve conflicts between issue #102's acceptance criteria and what the code actually is. They bind the tasks below.

**Ruling 1 — tab-scoped controls stay with their tab; they do not move into the page heading.** Issue #102 says surviving actions land "in the heading's action slot". Seven tab bodies carry controls: a cards/table view toggle (invoices), a view toggle (productions), an export dialog (expenses), an orphaned-client cleanup dialog (clients), a link to proposal packages (proposals), a create-template button (templates) and a new-package button (packages). Every one of them acts on *that tab's* content, and all seven live in client components holding their own state. Hoisting them into a server-rendered hub heading would need cross-boundary plumbing, and would make a control that belongs to one of five Finance tabs look like it belongs to Finance. They stay in the tab body as a right-aligned toolbar row above the content. Cost if wrong: the toolbar row moves up one level later, a contained change.

**Ruling 2 — a hub's subtitle is the hub's own, not a concatenation.** Where a removed tab heading's `description` says something the hub's subtitle does not, prefer the hub's. Do not merge five tab descriptions into one hub subtitle. Cost if wrong: a sentence of context is lost from a screen that still shows the same data.

**Ruling 3 — `src/app/client/book` is in scope; `src/app/book` and `src/components/landing` are not.** `/client/book` is the booking form inside the client portal and wears the app shell. `/book` is its public twin, and reading it settled the question: it brings its own `<nav>`, its own language switcher, a centred hero composition and raw colours throughout — it is outside the shell, and half-migrating it would break the composition while leaving it off the token layer. It goes on the guard's pending list with the detail screens. The marketing landing is `src/components/landing/**`, reached from `src/app/page.tsx`, and is excluded outright. Cost if wrong: the public booking form keeps its own look, which it arguably should.

---

### Task 1: The 8 hubs adopt the shared page heading

**Files:**
- Modify: `src/app/admin/clients/page.tsx`
- Modify: `src/app/admin/finance/page.tsx`
- Modify: `src/app/admin/knowledge/page.tsx`
- Modify: `src/app/admin/productions/page.tsx`
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/client/documents/page.tsx`
- Modify: `src/app/employee/work/page.tsx`
- Modify: `src/app/salesman/library/page.tsx`

**Interfaces:**
- Consumes: `PageHeading` from `@/components/shared/page-heading` — `{ title: string; subtitle?: React.ReactNode; children?: React.ReactNode }`.
- Produces: every hub renders exactly one `data-slot="page-heading"`. Task 6's Playwright assertion depends on that attribute being present exactly once per hub route.

Each hub currently hand-rolls its title. `src/app/admin/finance/page.tsx` is representative:

```tsx
<header>
  <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
</header>
```

- [ ] **Step 1: Replace the hand-rolled header in each of the 8 hubs**

The replacement, using the same translation keys the file already uses:

```tsx
import { PageHeading } from '@/components/shared/page-heading';

<PageHeading title={t('title')} subtitle={t('subtitle')} />
```

Do not change the surrounding `<div className="space-y-5">`, the `SectionTabs` call, or any tab dispatch. Some hubs may name their keys differently or omit a subtitle — use whatever keys that file already reads, and omit `subtitle` where the hub has none. Do not invent new keys.

- [ ] **Step 2: Verify**

Run: `pnpm type-check && pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/clients/page.tsx src/app/admin/finance/page.tsx src/app/admin/knowledge/page.tsx src/app/admin/productions/page.tsx src/app/admin/settings/page.tsx src/app/client/documents/page.tsx src/app/employee/work/page.tsx src/app/salesman/library/page.tsx
git commit -m "feat(design): the eight hubs adopt the shared page heading"
```

---

### Task 2: The 17 tab bodies stop rendering a page title

**Files:**

Ten carry a title and nothing else — delete it outright:
- `src/app/admin/cost-model/cost-model-content.tsx`
- `src/app/admin/filming-requests/requests-page.tsx`
- `src/app/admin/pricing-health/pricing-health-content.tsx`
- `src/app/admin/settings/settings-page.tsx`
- `src/app/admin/users/users-page.tsx`
- `src/app/client/contracts/contracts-page.tsx`
- `src/app/client/invoices/invoices-page.tsx`
- `src/app/employee/tasks/tasks-page.tsx`
- `src/app/salesman/resources/resources-page.tsx`
- `src/components/salesman/handbook/sales-handbook.tsx`

Seven carry controls — delete the title, keep the controls:
- `src/app/admin/clients/clients-content.tsx` — orphaned-client cleanup dialog, behind `orphanedCount > 0`
- `src/app/admin/contracts/templates/templates-content.tsx` — create-template button
- `src/app/admin/invoices/expenses/expenses-content.tsx` — export dialog button
- `src/app/admin/invoices/invoices-content.tsx` — cards/table view toggle
- `src/app/admin/projects/projects-content.tsx` — `ViewToggle`
- `src/app/admin/proposal-packages/packages-content.tsx` — new-package button
- `src/app/admin/proposals/proposals-list.tsx` — link to proposal packages

**How this list was derived, and why it is 17 and not 12:** each hub's imports were followed transitively to find what it mounts as a tab. Five of these — `settings-page`, `templates-content`, `packages-content`, the client `contracts-page` and the client `invoices-page` — are reached through **relative** imports (`./settings-page`), not the `@/` alias. Any sweep that keys only on the alias misses them and leaves those five screens with two titles. If you re-derive this list, follow both import forms.

**Interfaces:**
- Consumes: nothing new.
- Produces: none of these 17 files imports `@/components/shared/page-header` afterwards. Task 5 deletes that module and depends on this.

- [ ] **Step 1: The ten files with no controls — delete the heading**

Each renders a self-closing `<PageHeader title={…} description={…} />` and nothing else in that slot. Delete the element and the now-unused `PageHeader` import. Example, `src/app/admin/users/users-page.tsx`:

```tsx
// before
<PageHeader title={t('title')} description={t('description')} />

// after — the element is gone; the surrounding wrapper stays exactly as it was
```

`src/components/salesman/handbook/sales-handbook.tsx` carries a hardcoded Greek literal rather than a translation:

```tsx
<PageHeader title="Εγχειρίδιο Πωλήσεων" description="Sales Manual & Tools — Devre Media v1" />
```

Deleting it removes the untranslated string too. That is the correct outcome — do not translate it, do not preserve it elsewhere.

- [ ] **Step 2: The seven files with controls — keep the controls, drop the title**

Replace the `PageHeader` wrapper with a plain right-aligned toolbar row. `src/app/admin/invoices/invoices-content.tsx`:

```tsx
// before
<PageHeader title={t('title')} description={t('description')}>
  <div className="flex items-center gap-1 rounded-lg border p-1">
    …view toggle buttons…
  </div>
</PageHeader>

// after
<div className="flex items-center justify-end gap-2">
  <div className="flex items-center gap-1 rounded-lg border p-1">
    …view toggle buttons, byte-identical…
  </div>
</div>
```

The controls themselves — their handlers, state, conditionals, icons and labels — must not change in any way. Only the wrapper does. `clients-content.tsx` keeps its `orphanedCount > 0` conditional exactly as written.

- [ ] **Step 3: Leave the translation catalogues alone**

Deleting these headings orphans the `title` / `description` keys those files read. **Do not delete them in this slice.**

An unused key in `messages/*.json` is inert data that nothing renders. A key deleted while something still reads it is a runtime failure that TypeScript cannot see, `pnpm build` does not catch, and the user meets on screen as a raw key name. Several of these files are still reachable through redirect stubs and are read from more than one place, so "grep says nobody uses it" is a weaker guarantee here than it looks. The trade is a tidier JSON file against a class of silent breakage — not worth it in a slice whose whole point is that nothing changes but the heading.

Slice #111 sweeps the catalogues across the whole repo; that is where this belongs.

Verify the catalogues are still in step — they should be trivially, since you changed neither:

Run: `node -e "const el=require('./messages/el.json'),en=require('./messages/en.json');const walk=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?walk(v,p+k+'.'):[p+k]);const a=walk(el).sort(),b=walk(en).sort();const d=[...a.filter(k=>!b.includes(k)),...b.filter(k=>!a.includes(k))];console.log(d.length?'DRIFT: '+d.join(', '):'catalogues in step')"`
Expected: `catalogues in step`

- [ ] **Step 4: Verify**

Run: `pnpm type-check && pnpm lint && pnpm test:unit`
Expected: clean, 205/205.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(design): tab bodies give up their titles, keeping their controls"
```

---

### Task 3: The standalone pages swap onto the shared heading

**Files:** every file under `src/` that still imports `@/components/shared/page-header` after Task 2 — 41 of them, spanning all four roles plus `src/components/shared/notifications-log.tsx` and `src/app/dev/page.tsx`.

Derive the list rather than trusting this description:

```bash
grep -rl "components/shared/page-header" src/
```

**Interfaces:**
- Consumes: `PageHeading` — `{ title, subtitle?, children? }`.
- Produces: zero importers of `@/components/shared/page-header` remain. Task 5 deletes the module and will fail loudly if any survive.

This is a mechanical, same-shape edit repeated across many files. It is one batch, not one task per file.

- [ ] **Step 1: Swap every call site**

Three changes per file, and nothing else:

```tsx
// 1. the import
- import { PageHeader } from '@/components/shared/page-header';
+ import { PageHeading } from '@/components/shared/page-heading';

// 2. the element name
- <PageHeader …>   …   </PageHeader>
+ <PageHeading …>  …   </PageHeading>

// 3. the prop rename — this is the only prop that differs
- description={…}
+ subtitle={…}
```

`title` and `children` keep their names and values. No call site passes `className`, so nothing else needs handling — if you find one that does, stop and report it rather than adding the prop.

Do not restyle, reorder, reword, or "improve" anything at these call sites. Do not touch `src/components/landing/**`.

- [ ] **Step 2: Verify nothing was missed**

Run: `grep -rl "components/shared/page-header" src/`
Expected: no output at all.

Run: `pnpm type-check && pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add -A src
git commit -m "feat(design): every standalone page moves onto the shared heading"
```

---

### Task 4: The eight hand-rolled titles adopt the shared heading

**Files:**
- Modify: `src/app/admin/calendar/page.tsx`
- Modify: `src/app/client/contracts/[contractId]/sign/sign-client.tsx`
- Modify: `src/app/client/home/page.tsx`

**Interfaces:**
- Consumes: `PageHeading` — `{ title, subtitle?, children? }`.
- Produces: the only `<h1>`s left under `src/` are `page-heading.tsx`, `src/components/landing/`, and the five files Task 5's guard lists as pending.

Eight files hand-roll an `<h1>` without importing `PageHeader`, which is why keying the migration off the import misses them. **Three of the eight migrate here. Five do not** — see the ruling below, which is binding.

Each of the three is the same clean shape: a title, a one-line description, no leading control and no actions.

```tsx
// before
<header>
  <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
</header>

// after
<PageHeading title={t('title')} subtitle={t('subtitle')} />
```

**Ruling 4 — the four detail screens and the public booking page stay as they are.**

The three detail screens under `src/components/**` and `src/app/client/projects/**` share a shape `PageHeading` cannot express:

```tsx
<div className="flex items-center gap-4">
  <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
  <div className="flex-1">
    <h1>{entity.name}</h1>
    <div className="flex items-center gap-2 mt-2"><StatusBadge … /> …metadata…</div>
  </div>
  <div className="flex items-center gap-2">…actions…</div>
</div>
```

The title, the status row and the actions map onto `title` / `subtitle` / `children` cleanly enough. The **leading back control does not** — `PageHeading` has no slot before the title, deliberately. Adding a `back` prop here would invent, in a slice about titles, exactly the affordance that slice #106 (shared detail shell) exists to design properly. `src/app/admin/invoices/[invoiceId]/invoice-detail.tsx` has no back button and *could* migrate — it is held back anyway, so that the two invoice detail screens do not diverge for a slice.

`src/app/book/page.tsx` is a public page outside the app shell: its own `<nav>`, its own language switcher, a centred hero composition, and raw colours throughout (`text-zinc-400`, `border-white/10`). Migrating only its heading would leave it half on the token layer and break the centred composition. It belongs with the landing layer.

All five go on the guard's pending list in Task 5, and come off it in #106 / #109. Cost if wrong: five screens keep their current heading for one to three more slices, which is what the wave plan already intends.

- [ ] **Step 1: Replace the three hand-rolled titles**

Read each of the three first — `client/home/page.tsx` uses different translation keys (`title` / `description`) and sits inside a `container mx-auto` wrapper that must stay. Use whatever keys each file already reads; do not invent or rename any.

- [ ] **Step 2: Verify the expected `<h1>`s and no others**

Run: `grep -rln "<h1" src/ --include=*.tsx`
Expected: exactly seven files — `page-heading.tsx`, `landing/hero-section.tsx`, and the five deferred: `app/book/page.tsx`, `app/admin/invoices/[invoiceId]/invoice-detail.tsx`, `app/client/projects/[projectId]/client-project-detail.tsx`, `components/admin/filming-requests/filming-request-detail.tsx`, `components/client/invoices/invoice-detail.tsx`.

Run: `pnpm type-check && pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add -A src
git commit -m "feat(design): the hand-rolled titles move onto the shared heading"
```

---

### Task 5: Delete the old component and lock the invariant

**Files:**
- Delete: `src/components/shared/page-header.tsx`
- Modify: `scripts/check-design.mjs`

**Interfaces:**
- Consumes: the guard's existing `COVERED` / `PENDING` / `RAW_COLOUR` structure from #101.
- Produces: a build that fails on any reintroduction of `PageHeader` or a hand-rolled `<h1>` page title.

- [ ] **Step 1: Delete the module**

```bash
git rm src/components/shared/page-header.tsx
```

- [ ] **Step 2: Teach the guard the new rule**

Add a second check alongside the raw-colour scan. It runs over every `.tsx` under `src/`, and fails on either of:

- an import of `components/shared/page-header` — always, with no exemptions, because the module no longer exists
- a literal `<h1`, outside the exempt list and outside the pending list

```js
// Ένας τίτλος ανά σελίδα: ο μόνος που γράφει <h1> είναι το κοινό PageHeading.
const HEADING_EXEMPT = [
  'src/components/shared/page-heading.tsx', // εδώ ζει ο ένας και μοναδικός <h1>
  'src/components/landing/', // άλλο επίπεδο, εκτός σκοπού μόνιμα
];

// Οθόνες που κρατούν προσωρινά τον δικό τους τίτλο, με ρητό λόγο και ρητό
// σημείο επιστροφής. Κάθε επόμενη φέτα αφαιρεί από εδώ — η λίστα μόνο μικραίνει.
const HEADING_PENDING = [
  'src/app/book/page.tsx', // δημόσια σελίδα με δικό της κέλυφος
  'src/app/admin/invoices/[invoiceId]/invoice-detail.tsx', // → #109
  'src/app/client/projects/[projectId]/client-project-detail.tsx', // → #106
  'src/components/admin/filming-requests/filming-request-detail.tsx', // → #109
  'src/components/client/invoices/invoice-detail.tsx', // → #109
];
```

Two properties this check must have, both learned from the colour guard in #101:

- **A pending entry that no longer violates is itself a failure.** If a file on `HEADING_PENDING` has no `<h1>`, the guard reports it, so the list cannot quietly outlive its reason. #101 shipped a `PENDING` list where five of eight entries were already clean.
- **Comments do not count.** Reuse the existing `stripComments` helper so a `// βλ. <h1>` in a comment is not a violation.

Report violations in the same shape as the colour violations, with a message naming `PageHeading` as the fix.

- [ ] **Step 3: Run the guard against the tree as it now stands**

Run: `node scripts/check-design.mjs`
Expected: passes, and the summary line reports both what it covered and how many headings are pending.

If it reports a file not on the pending list, that file was missed in Tasks 1-4 — fix the file, do not add it to the list. The pending list is closed: those five entries and no others.

- [ ] **Step 4: Commit**

```bash
git add -A scripts src
git commit -m "feat(design): retire PageHeader and make one-title-per-page a build rule"
```

---

### Task 6: Prove the invariant in the browser

**Files:**
- Modify: `e2e/design-identity.spec.ts`

**Interfaces:**
- Consumes: `data-slot="page-heading"` rendered by `PageHeading`, and `data-slot="page-heading-title"` on its `<h1>`.
- Produces: nothing downstream.

The existing spec already asserts a single heading on `/admin/today`. Widen it to a representative route list covering all four roles and every tabbed hub.

- [ ] **Step 1: Write the failing assertion**

```ts
const HUB_ROUTES = [
  '/admin/clients',
  '/admin/finance',
  '/admin/finance?tab=expenses',
  '/admin/finance?tab=cost',
  '/admin/knowledge',
  '/admin/productions',
  '/admin/settings',
  '/client/documents',
  '/employee/work',
  '/salesman/library',
];

for (const route of HUB_ROUTES) {
  test(`exactly one page heading on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('[data-slot="page-heading-title"]')).toHaveCount(1);
  });
}
```

These routes are behind authentication. Follow whatever pattern the existing spec uses for authenticated routes; if the suite skips when `E2E_TEST_USERS_READY` is unset, these tests skip the same way. Do NOT weaken the assertion to make it pass without credentials — a skipped test is honest, a vacuous one is not. #101 shipped a test that passed against the broken build; do not repeat that.

- [ ] **Step 2: Run the suite**

Run: `pnpm test:e2e --project=chromium`
Expected: passes or skips for want of credentials. Report which, precisely.

- [ ] **Step 3: Commit**

```bash
git add e2e/design-identity.spec.ts
git commit -m "test(design): assert one page heading across every hub and role"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run everything**

Run: `pnpm type-check && pnpm lint && pnpm test:unit && pnpm build`
Expected: all clean. `pnpm build` chains `check:design` and `check:routes`.

- [ ] **Step 2: Confirm the scope held**

Run: `git diff --stat master`
Expected: changes confined to `src/app/**`, `src/components/**` (excluding `landing/`), `messages/*.json`, `scripts/check-design.mjs`, `e2e/design-identity.spec.ts`, and this plan. No query file, no action file, no migration, no `Suspense` boundary.

Run: `git diff master -- src | grep -c "Suspense"`
Expected: `0`. This slice must not add or remove a single streaming boundary.
