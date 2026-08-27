# Shared Detail Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three detail screens stop inventing their own header and their own tab wiring, and start telling the truth in the URL.

**Architecture:** A `DetailShell` server component composes the back link, the existing `PageHeading`, a meta slot and the existing `SectionTabs`. The active tab stops being client state: the route's Server Component reads `?tab=` and hands it down as a prop, so a `<Link>` navigation is the only thing that changes tabs. Each route gains a `loading.tsx` shaped like a detail screen, not like a hub.

**Tech Stack:** Next.js 16 App Router (Server Components, `searchParams` as a Promise), React 19, TypeScript 5, Tailwind 4, next-intl, TanStack Table 8, Playwright.

**Spec:** DEVREMEDIA/devremedia#106 (parent PRD #100). Inventory: `.superpowers/sdd/106-detail-inventory.md`.

## Global Constraints

- Touch only the files each task names. Nothing else may appear in a commit.
- Never stage `.npmrc` or `.env.local` — local Windows build workarounds, they stay untracked.
- Never commit `design-explorations/`, `patches/`, `tzeni/`, `.sandcastle/`, `.gitnexus/`, `src/app/dev/prototype-ia/`.
- **What each screen shows, which tabs exist and what is inside them, does not change.** This is a wiring slice.
- **Every deep link that worked before must still work.** `?tab=tasks` resolves to the tasks tab. A bookmark to a bare detail URL lands on the same tab it landed on before.
- `messages/en.json` and `messages/el.json` end with identical key trees and equal counts. Baseline: `2449 2449 [] []`.
- No `any`, no `@ts-ignore`, no `as` assertions without validation.
- Verification per task: `pnpm type-check` clean, `pnpm lint` 0 errors (30 pre-existing warnings expected), `pnpm build` succeeds with both guard scripts printing `ok`.
- `src/middleware.ts`, `src/components/landing/` and `src/lib/` stay untouched.

---

### Task 1: The shell

**Files:**
- Create: `src/components/shared/detail-shell.tsx`

**Interfaces:**
- Consumes: `PageHeading` from `@/components/shared/page-heading` (props `{ title, subtitle?, children? }`); `SectionTabs` and `SectionTab` from `@/components/shell-v2/section-tabs` (props `{ basePath, tabs, active }`, and `SectionTab` is `{ key, label, count? }`).
- Produces: `DetailShell`, used verbatim by Tasks 2, 4 and 6.

**Context:** the issue asks for a shell taking "a back link, a title, a status, an action slot, a URL-driven tab set and an optional aside." Four of those six already exist and already agree across the screens: the title is `PageHeading` in both admin screens, the action slot is its `children`, the status is already `StatusBadge` (which resolves through `statusTone` since #105), and the tab set is `SectionTabs`. The shell's job is therefore composition, not invention.

Two deliberate departures from the issue's wording, both recorded as rulings in the ledger:

1. **No `aside` prop.** Neither screen has a persistent side panel today. It would be built for zero consumers.
2. **`status` is a slot, not a string.** The project screen shows *two* chips (status and priority) plus a link to the client. A `ReactNode` slot fits all three screens without a plural/singular decision.

The back link moves **above** the title. Today the two admin screens bury it inside the action group, beside Edit and Delete — a navigation control sitting among destructive ones. Above the title is where `proposal-detail.tsx` already puts it.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '@/components/shared/page-heading';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

interface DetailShellProps {
  /** Πού γυρνά κανείς πίσω, και πώς λέγεται εκεί. */
  backHref: string;
  backLabel: string;
  title: string;
  /** Ό,τι στέκεται κάτω από τον τίτλο: πλακίδια κατάστασης, σύνδεσμος πελάτη. */
  meta?: ReactNode;
  /** Ενέργειες δίπλα στον τίτλο. */
  actions?: ReactNode;
  /**
   * Όλα μαζί ή τίποτα: μια οθόνη είτε έχει καρτέλες οδηγούμενες από το URL,
   * είτε δεν έχει καθόλου. Τρία ξεχωριστά προαιρετικά props θα επέτρεπαν να
   * περάσει κανείς καρτέλες χωρίς να πει ποια είναι ενεργή.
   */
  tabs?: { items: SectionTab[]; active: string; basePath: string };
  children: ReactNode;
}

/**
 * Το κοινό κέλυφος κάθε οθόνης λεπτομέρειας. Δεν εφευρίσκει τίποτα: συνθέτει
 * τον έναν τίτλο (`PageHeading`) με τις καρτέλες που ήδη οδηγούν τους κόμβους
 * (`SectionTabs`). Ο σύνδεσμος επιστροφής στέκεται ΠΑΝΩ από τον τίτλο και όχι
 * μέσα στις ενέργειες — η πλοήγηση δεν κάθεται δίπλα στη διαγραφή.
 */
export function DetailShell({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  tabs,
  children,
}: DetailShellProps) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <PageHeading title={title} subtitle={meta}>
        {actions}
      </PageHeading>

      {tabs ? (
        <SectionTabs basePath={tabs.basePath} tabs={tabs.items} active={tabs.active} />
      ) : null}

      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify it is a Server Component**

There must be no `'use client'` directive in this file. `SectionTabs` has none either, and that is the whole point — tabs are `<Link>`s, not client state.

Run: `grep -n "use client" src/components/shared/detail-shell.tsx`
Expected: no output.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds.

Nothing renders it yet, so the build proves only that it compiles. Say so in your report rather than claiming it works.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/detail-shell.tsx
git commit -m "feat(design): a detail screen gets a shell instead of a fresh start"
```

---

### Task 2: The project detail stops syncing tabs by hand

**Files:**
- Modify: `src/app/admin/projects/[projectId]/page.tsx`
- Modify: `src/app/admin/projects/[projectId]/project-detail.tsx`

**Interfaces:**
- Consumes: `DetailShell` from Task 1.
- Produces: the pattern Tasks 4 and 6 copy — `page.tsx` owns the tab decision, the client component receives it as a prop.

**Context:** this is the screen the issue names. It hand-rolls the tab-to-URL sync in full (`useSearchParams` → `useState` → `useEffect` → `router.replace`), and it fetches the current user in a second `useEffect` purely so the Messages tab can know who is talking.

Both go. The tab comes from the server; the user is fetched on the server.

Read the file end to end before editing. **Every `TabsContent` body must survive byte-for-byte** — you are changing what mounts them, not what they render.

- [ ] **Step 1: The page reads the tab and the user**

Replace the whole of `page.tsx` with:

```tsx
import { getProject } from '@/lib/actions/projects';
import { getContractsByProject } from '@/lib/actions/contracts';
import { createClient } from '@/lib/supabase/server';
import { ProjectWithClient } from '@/types';
import { ProjectDetail, PROJECT_TABS } from './project-detail';
import { notFound } from 'next/navigation';

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const result = await getProject(projectId);

  if (result.error) {
    return { title: 'Project Not Found' };
  }

  const project = result.data as ProjectWithClient;
  return { title: project.title };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const result = await getProject(projectId);

  if (result.error) {
    notFound();
  }

  const project = result.data as ProjectWithClient;

  // Fetch contracts for this project
  const contractsResult = await getContractsByProject(projectId);
  const contracts = contractsResult.data ?? [];

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = PROJECT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';

  // Ο χρήστης διαβάζεται εδώ αντί για ένα useEffect μέσα στην οθόνη: η καρτέλα
  // μηνυμάτων τον χρειάζεται για να ξέρει ποιος μιλά, και μέχρι τώρα έδειχνε
  // κενή κατάσταση όσο περίμενε ένα δεύτερο ταξίδι στον διακομιστή.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProjectDetail
      project={project}
      contracts={contracts}
      activeTab={activeTab}
      currentUserId={user?.id ?? null}
    />
  );
}
```

- [ ] **Step 2: Export the tab list from the detail component**

At the top level of `project-detail.tsx`, above the component, add:

```tsx
/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const PROJECT_TABS: readonly string[] = [
  'overview',
  'tasks',
  'deliverables',
  'messages',
  'invoices',
  'contracts',
];
```

The annotation is `readonly string[]`, **not** `as const`. On an `as const` tuple, `includes` narrows its parameter to the literal union and rejects a plain `string` — and `satisfies` does not widen it back. The array is read once, by `.includes`, so the literal types buy nothing here.

- [ ] **Step 3: Delete the hand-rolled sync**

Remove, in `project-detail.tsx`:
- `const searchParams = useSearchParams();`
- `const tabFromUrl = searchParams.get('tab') || 'overview';`
- `const [activeTab, setActiveTab] = useState(tabFromUrl);`
- `const [currentUserId, setCurrentUserId] = useState<string | null>(null);`
- the `useEffect` that calls `setActiveTab(tabFromUrl)`
- the `useEffect` that calls `supabase.auth.getUser()`
- the whole `handleTabChange` `useCallback`

Then remove every import left unused: `useEffect`, `useCallback`, `useSearchParams`, and the `createClient` import from `@/lib/supabase/client`. `useState` stays — `deleteDialogOpen` and `isDeleting` still need it. `useRouter` stays — `handleDelete` still pushes.

Widen the props:

```tsx
interface ProjectDetailProps {
  project: ProjectWithClient;
  contracts: Contract[];
  activeTab: string;
  currentUserId: string | null;
}

export function ProjectDetail({
  project,
  contracts,
  activeTab,
  currentUserId,
}: ProjectDetailProps) {
```

- [ ] **Step 4: Replace the header and the tab list**

The current header is a `PageHeading` whose actions hold Back, Edit and Delete, then a separate row with the client link and two status chips, then `<Tabs>`. It becomes:

```tsx
  const TABS: SectionTab[] = [
    { key: 'overview', label: t('overview') },
    { key: 'tasks', label: t('tasks') },
    { key: 'deliverables', label: t('deliverables') },
    { key: 'messages', label: tc('messages') },
    { key: 'invoices', label: t('invoices') },
    { key: 'contracts', label: t('contracts') },
  ];

  return (
    <DetailShell
      backHref="/admin/projects"
      backLabel={t('title')}
      title={project.title}
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/clients/${project.client_id}`}
            className="flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            <span className="font-medium">
              {project.client?.company_name || project.client?.contact_name}
            </span>
          </Link>
          <StatusBadge status={project.status} />
          <StatusBadge status={project.priority} />
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {tc('edit')}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-4 w-4 mr-2" />
            {tc('delete')}
          </Button>
        </>
      }
      tabs={{ items: TABS, active: activeTab, basePath: `/admin/projects/${project.id}` }}
    >
      {/* τα σώματα των καρτελών, βήμα 5 */}
    </DetailShell>
  );
```

The Back button is gone from the actions — `DetailShell` renders it above the title. `t('title')` is the projects list page title and is the correct label for "back to projects"; verify it exists in `messages/el.json` under `projects.title` before using it, and if it does not, stop and report rather than inventing a key.

- [ ] **Step 5: Replace `TabsContent` with conditional mounting**

Each `<TabsContent value="X" …>` becomes `{activeTab === 'X' && ( … )}`, keeping the wrapper classes the `TabsContent` carried. For the overview tab, which had `className="space-y-6"`:

```tsx
      {activeTab === 'overview' && <div className="space-y-6">{/* unchanged body */}</div>}
```

For the rest, which had no className, the body goes in directly:

```tsx
      {activeTab === 'tasks' && <TaskList projectId={project.id} />}
```

**Do not alter a single line inside any body.** Copy them across exactly, including the `MessagesWithChannel` subtree, which now receives `currentUserId` from props instead of state — the variable name is unchanged, so the body itself does not change.

Then delete the `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` import.

- [ ] **Step 6: Verify the deep links**

Read the final file and confirm, in your report, that all six keys in `PROJECT_TABS` match the six `activeTab === '…'` comparisons and the six `SectionTab.key` values — three lists that must agree. A typo here silently renders a blank tab.

- [ ] **Step 7: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors, no unused imports. `pnpm build` → succeeds with both guards `ok`.

Also run `grep -n "useSearchParams\|handleTabChange\|TabsContent" src/app/admin/projects/[projectId]/project-detail.tsx` and confirm no output. Put it in your report.

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/projects/[projectId]/page.tsx" "src/app/admin/projects/[projectId]/project-detail.tsx"
git commit -m "feat(design): the project detail lets the URL own its tabs"
```

---

### Task 3: The project's invoices tab joins the shared table

**Files:**
- Modify: `src/app/admin/projects/[projectId]/invoices-tab.tsx`

**Interfaces:**
- Consumes: `DataTable` from `@/components/shared/data-table`.

**Context:** this table is invisible to the design guard today — `src/app/admin/projects/` is in neither `COVERED` nor `TABLE_GUARDED_AREAS`. Task 8 puts the folder behind both, and this table has to have moved by then or the guard fails. It also carries the folder's raw colours and a hardcoded English `"Status"` header.

Read the file first. Follow the shape of `src/components/admin/invoices/invoices-table-view.tsx` for the column array and the `useMemo(..., [t])` idiom.

**The table has a `<TableFooter>` totals row, and `DataTable` cannot render one. It is not becoming one.** Look at what that footer actually is (lines ~230-246): four cells that do not line up with the data columns — a label, a total, a "paid: …" fragment crammed into the third cell, and an outstanding figure spanning two. It is a summary strip wearing table clothes. Step 3 below moves it out of the table and builds it as what it is. Do **not** add a footer slot to `DataTable` for a single consumer.

- [ ] **Step 1: Declare the columns**

Same columns, same order, same content as the rows render today. Every money column takes `meta: { numeric: true }`; every date column takes `meta: { numeric: true, align: 'left' }` — a date keeps the aligned digits but must not jump to the right edge, because it is not a quantity. The status cell keeps `<StatusBadge>`.

`meta` is a TanStack module augmentation already declared inside `data-table.tsx` as `{ align?, numeric?, width? }` — do not re-declare it.

- [ ] **Step 2: Replace the table**

```tsx
<DataTable
  columns={columns}
  data={invoices}
  emptyState={<span className="text-muted-foreground">{/* the file's existing empty string */}</span>}
/>
```

Delete the `<Table>` block, any `rounded-md border` wrapper around it (`DataTable` brings its own), and the now-unused imports — including `TableFooter`, whose replacement is the next step.

- [ ] **Step 3: The totals become a summary strip**

Directly beneath the `DataTable`, keeping the same three figures, the same three labels and the same order:

```tsx
<div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
  <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
    {t('total')}
  </span>
  <span className="font-mono tabular-nums">{formatCurrency(totalInvoiced)}</span>
  <span className="text-muted-foreground">
    {t('paid')}: <span className="font-mono tabular-nums">{formatCurrency(totalPaid)}</span>
  </span>
  <span className={cn('font-mono tabular-nums', unpaid > 0 && 'text-tone-critical')}>
    {t('outstanding')}: {formatCurrency(unpaid)}
  </span>
</div>
```

`totalInvoiced`, `totalPaid` and `unpaid` are already computed in this file — do not recompute them. The three translation keys already exist and are reused unchanged.

- [ ] **Step 4: Kill the raw colours and the hardcoded English**

Every raw palette colour in this file becomes a token: a positive figure `text-tone-positive`, a critical one `text-tone-critical`, a caution one `text-tone-caution`, muted text `text-muted-foreground`. If a colour does not map onto one of the four tones, stop and report it rather than guessing.

The hardcoded `Status` header takes an existing translation key. Check `messages/el.json` for `invoices.status` or `common.status` and use whichever exists. If neither does, add `status` to **both** catalogues under the namespace the rest of the file already uses.

After the change, this must return nothing:

```bash
grep -nE "(text|bg|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-[0-9]" "src/app/admin/projects/[projectId]/invoices-tab.tsx"
```

Put the grep and its empty result in your report.

There are exactly four raw colours in this file — I scanned it: `text-red-600` at line ~179, `text-green-600` at ~213, `text-orange-500` at ~219, and `text-red-600` at ~241 (the last one lives in the footer and travels into the summary strip as `text-tone-critical`, per Step 3). If you find a fifth, that is a real finding — report it.

- [ ] **Step 5: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. If you touched the catalogues, run the key-tree check:

```bash
node -e "const c=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?c(v,p+k+'.'):[p+k]);const el=c(require('./messages/el.json')),en=c(require('./messages/en.json'));const a=new Set(el),b=new Set(en);console.log(el.length,en.length,el.filter(k=>!b.has(k)),en.filter(k=>!a.has(k)))"
```
Expected: two equal counts and two empty arrays. Paste the real output.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/projects/[projectId]/invoices-tab.tsx" messages/en.json messages/el.json
git commit -m "feat(design): the project invoices tab joins the shared table"
```

---

### Task 4: The client detail gains tabs the URL can see

**Files:**
- Modify: `src/app/admin/clients/[clientId]/page.tsx`
- Modify: `src/app/admin/clients/[clientId]/client-detail.tsx`

**Interfaces:**
- Consumes: `DetailShell`; the pattern established by Task 2.

**Context:** the issue frames this screen as having "a different mechanism". It has **none**. `const [activeTab, setActiveTab] = useState('overview')` is the whole of it — switching tabs is invisible to the URL, cannot be linked, cannot be bookmarked, and a refresh always drops you back on Overview. This is not a replacement, it is an addition.

**One thing must not break, and it is easy to break.** This screen owns a client-side refresh bus: `refreshKey` is state in `ClientDetail`, passed as a prop into five of the six tab bodies, and bumped by `handleDrawerSuccess` when the drawer saves. Keep it exactly as it is. It stays inside the client component; only the *tab choice* moves out. If you find yourself needing to move `refreshKey` to the server or into context, stop and report — the plan is wrong and I want to know before you work around it.

- [ ] **Step 1: The page reads the tab**

Add `searchParams` to the page's props, exactly as Task 2 did:

```tsx
interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}
```

and, in the component body, before the return:

```tsx
  const { tab } = await searchParams;
  const activeTab = CLIENT_TABS.includes(tab ?? '') ? (tab as string) : 'overview';
```

Pass `activeTab={activeTab}` to `<ClientDetail …>`. Change nothing else in this file — its data fetching and its `notFound()` handling stay as they are.

- [ ] **Step 2: Export the tab list**

At the top level of `client-detail.tsx`:

```tsx
/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const CLIENT_TABS: readonly string[] = [
  'overview',
  'projects',
  'invoices',
  'contracts',
  'agreement',
  'activity',
];
```

The annotation is `readonly string[]`, **not** `as const`: on an `as const` tuple, `includes` narrows its parameter to the literal union and rejects a plain `string`, and `satisfies` does not widen it back. Task 2 hit exactly this and it does not type-check.

- [ ] **Step 3: Take the tab out of state**

Delete `const [activeTab, setActiveTab] = useState('overview');` and add `activeTab: string` to the props interface and the destructuring. **Every other piece of state in this component stays**: `deleteDialogOpen`, `isDeleting`, `isInviting`, `drawerOpen`, `drawerMode`, `refreshKey`.

- [ ] **Step 4: Replace the header and the tabs**

```tsx
  const TABS: SectionTab[] = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'projects', label: t('tabs.projects') },
    { key: 'invoices', label: t('tabs.invoices') },
    { key: 'contracts', label: t('tabs.contracts') },
    { key: 'agreement', label: t('tabs.agreement') },
    { key: 'activity', label: t('tabs.activity') },
  ];
```

and wrap the screen in `DetailShell` with `backHref="/admin/clients"`, the client's name as `title`, the status chip as `meta`, the existing action buttons as `actions`, and `tabs={{ items: TABS, active: activeTab, basePath: `/admin/clients/${client.id}` }}`.

Read the file's current header before writing this: keep every action button it has, in the order it has them, minus any Back button, which `DetailShell` now renders. If the status chip currently sits inside a card rather than beside the title, move it into `meta` — that is the inconsistency this slice exists to remove — and say in your report that you moved it.

- [ ] **Step 5: Replace `TabsContent` with conditional mounting**

Each `<TabsContent value="X">` becomes `{activeTab === 'X' && ( … )}`, bodies copied exactly, `refreshKey` props untouched. Then delete the `Tabs`/`TabsContent`/`TabsList`/`TabsTrigger` import.

The `ClientDrawer` and the `ConfirmDialog` below the tabs stay exactly where they are, inside `DetailShell`'s children.

- [ ] **Step 6: Verify the three lists agree**

Confirm in your report that `CLIENT_TABS`, the six `activeTab === '…'` comparisons and the six `SectionTab.key` values are the same six strings.

- [ ] **Step 7: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

Then prove the refresh bus survived:

```bash
grep -c "refreshKey" "src/app/admin/clients/[clientId]/client-detail.tsx"
```
Expected: the same count as before your change. Report both numbers.

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/clients/[clientId]/page.tsx" "src/app/admin/clients/[clientId]/client-detail.tsx"
git commit -m "feat(design): the client detail's tabs become linkable"
```

---

### Task 5: The two client-detail tables join the shared one

**Files:**
- Modify: `src/components/admin/clients/client-invoices-tab.tsx`
- Modify: `src/components/admin/contracts/contract-list.tsx`

**Interfaces:**
- Consumes: `DataTable`.

**Context:** both files are already named in `TABLE_PENDING` in `scripts/check-design.mjs`, each with a comment saying it is owed to **#106**. This is #106. Task 8 removes both entries, and the guard fails if an entry no longer violates — so these must migrate here, not later.

Both are tab bodies of the client detail screen. `contract-list.tsx` is also used elsewhere; check with `grep -rn "ContractList" src --include=*.tsx` before you start, and if it has other consumers, its public props must not change.

- [ ] **Step 1: `client-invoices-tab.tsx`**

Move it onto `DataTable`, same columns, same order, same content. Money columns `meta: { numeric: true }`; date columns `meta: { numeric: true, align: 'left' }`; the row-actions column `meta: { width: 'w-[…]' }` matching whatever width the header cell has today.

Its `refreshKey` prop and its data fetching stay exactly as they are — this task changes rendering only.

Its toasts and menu items are hardcoded English. Translate them: add the keys to **both** catalogues under the namespace the file already uses, or reuse existing keys where they exist. List every key you added in your report.

- [ ] **Step 2: `contract-list.tsx`**

Same treatment. Its table headers are hardcoded English; translate them the same way.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Run the catalogue key-tree check from Task 3 Step 4 and paste the real output.

Then confirm neither file builds its own table any more:

```bash
grep -n "from '@/components/ui/table'\|<table" src/components/admin/clients/client-invoices-tab.tsx src/components/admin/contracts/contract-list.tsx
```
Expected: no output. Put it in your report.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/clients/client-invoices-tab.tsx src/components/admin/contracts/contract-list.tsx messages/en.json messages/el.json
git commit -m "feat(design): the client detail's tables join the shared one"
```

---

### Task 6: The client portal's project detail, the third screen with the same disease

**Files:**
- Modify: `src/app/client/projects/[projectId]/page.tsx`
- Modify: `src/app/client/projects/[projectId]/client-project-detail.tsx`

**Interfaces:**
- Consumes: `DetailShell`; the pattern from Tasks 2 and 4.

**Context:** the issue names two screens. There is a third, and the guard already says so: `scripts/check-design.mjs` lists this file in `HEADING_PENDING` with the comment `// → #106`. It hand-rolls the same tab-to-URL sync as the project detail, renders its own raw `<h1>`, and its back link is a bare `router.back()` icon button with no label.

Leaving it out would mean shipping a slice whose own guard names it as owed and then does not pay it.

**One thing changes visibly and it is deliberate:** its tab triggers currently carry icons, and hide their labels on small screens. `SectionTabs` shows labels always and scrolls horizontally instead — the same behaviour every hub in the product already has. The icons go. Say so in your report.

The deliverables tab carries a count badge. `SectionTab` already models this: `{ key, label, count }`. Use it — do not hand-roll the badge.

- [ ] **Step 1: The page reads the tab**

Same shape as Tasks 2 and 4: add `searchParams: Promise<{ tab?: string }>` to the page props, validate against an exported tab list, pass `activeTab` down.

- [ ] **Step 2: Export the tab list and delete the hand-rolled sync**

Export the tab list in the same style Tasks 2 and 4 used:

```tsx
/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const CLIENT_PROJECT_TABS: readonly string[] = [
  /* the same keys the TabsTrigger values use today, in the same order */
];
```

The annotation is `readonly string[]`, **not** `as const` — on an `as const` tuple, `includes` rejects a plain `string`, and `satisfies` does not widen it back.

Remove `useSearchParams`, the `activeTab` state, the syncing `useEffect` and `handleTabChange`, plus every import they leave unused.

`router` may still be needed — check before deleting `useRouter`. The back link no longer uses `router.back()`: `DetailShell` takes an explicit `backHref` of `/client/projects`, because a browser-history back button is not a navigation the page controls and lands somewhere different depending on how you arrived.

- [ ] **Step 3: Replace the header**

The raw `<h1>` and its wrapper `<div className="flex items-center gap-4">` go. `DetailShell` takes:
- `backHref="/client/projects"`, `backLabel` from the existing translations for the projects list
- `title={project.title}`
- `meta` = the existing `<StatusBadge status={project.status} />` and the project-type label, in the same order they appear today
- no `actions` — this screen has none

The outer `<div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">` stays as `DetailShell`'s parent; `DetailShell` brings its own `space-y-6`, so drop that class from the outer div to avoid doubling the gap.

- [ ] **Step 4: Replace `TabsContent` with conditional mounting**

As in Tasks 2 and 4. Bodies copied exactly.

- [ ] **Step 5: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds.

Then:
```bash
grep -n "<h1\|useSearchParams\|handleTabChange\|TabsContent" "src/app/client/projects/[projectId]/client-project-detail.tsx"
```
Expected: no output. Report it.

- [ ] **Step 6: Commit**

```bash
git add "src/app/client/projects/[projectId]/page.tsx" "src/app/client/projects/[projectId]/client-project-detail.tsx"
git commit -m "feat(design): the client portal's project detail joins the other two"
```

---

### Task 7: Three routes stop showing nothing

**Files:**
- Create: `src/components/shell-v2/detail-skeleton.tsx`
- Create: `src/app/admin/projects/[projectId]/loading.tsx`
- Create: `src/app/admin/clients/[clientId]/loading.tsx`
- Create: `src/app/client/projects/[projectId]/loading.tsx`

**Context:** none of the three routes has a `loading.tsx`. The twelve that exist all render `HubSkeleton`, whose shape is title + tab row + six full-width rows. A detail screen does not look like that: it opens with a back link, then a title with a meta row beside it, then tabs, then content. A skeleton whose shape does not match the content makes the page jump when the data lands, which is worse than no skeleton.

- [ ] **Step 1: Write the skeleton**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Σκελετός οθόνης λεπτομέρειας: σύνδεσμος επιστροφής, τίτλος με τη σειρά
 * μεταδεδομένων του, καρτέλες, περιεχόμενο. Το σχήμα ταιριάζει με το
 * `DetailShell` — ένας σκελετός που δεν ταιριάζει κάνει τη σελίδα να πηδά.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the three route files**

Each is three lines. Read one of the existing twelve first and match its exact shape — including whether it exports `default` and whether it takes a wrapping element.

```tsx
import { DetailSkeleton } from '@/components/shell-v2/detail-skeleton';

export default function Loading() {
  return <DetailSkeleton />;
}
```

The client portal's page wraps its content in `container mx-auto px-4 py-6 sm:px-6`; its `loading.tsx` must use the same wrapper, or the skeleton will sit at a different width from the content that replaces it. Check the page and match it.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds, and the build output lists the three routes.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell-v2/detail-skeleton.tsx "src/app/admin/projects/[projectId]/loading.tsx" "src/app/admin/clients/[clientId]/loading.tsx" "src/app/client/projects/[projectId]/loading.tsx"
git commit -m "feat(design): a detail screen shows its shape before its data"
```

---

### Task 8: Lock the three screens in

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

**Context:** the guard runs inside `pnpm build` and is the only protection that fires in this environment — the credentialed Playwright specs are all skipped, because there are no test users in the database. Do not describe the new tests as coverage that protects anything today.

Read `scripts/check-design.mjs` end to end first. It enforces six rules and folds them into one exit. Match its structure and its Greek voice in comments.

- [ ] **Step 1: Extend `COVERED`**

Add, each with a short Greek comment:

```js
  'src/components/shared/detail-shell.tsx',
  'src/components/shell-v2/detail-skeleton.tsx',
  'src/app/admin/projects/[projectId]',
  'src/app/client/projects/[projectId]',
```

`src/app/admin/clients` is already covered as a whole folder, so the client detail comes along for free — verify that and say so.

Run the guard. **One thing will trip, and I already know what it is:** `src/app/admin/projects/[projectId]/project-detail.tsx` line ~273 writes `text-amber-600` on a deadline countdown. It sits inside a tab body that Task 2 was forbidden to touch, so it lands here. Fix it to `text-tone-caution` — that is exactly what it means: a deadline seven days out or nearer. Its two siblings in the same ternary (`text-destructive`, `text-muted-foreground`) are already tokens and stay as they are.

I scanned the rest myself: `src/app/client/projects/` has **zero** raw colours, and the projects folder's other four live in `invoices-tab.tsx`, which Task 3 cleared. If a fifth trips, that is a real finding: fix it if it is a single token on a single line, otherwise stop and report it. **Do not add a `PENDING` entry to make the first run pass** — a pending list that grows on the first run is not a pending list.

- [ ] **Step 2: Retire the `HEADING_PENDING` entry this slice paid**

`src/app/client/projects/[projectId]/client-project-detail.tsx` is listed with the comment `// → #106`. Task 6 removed its `<h1>`. Remove the entry. The guard already fails on a stale `HEADING_PENDING` entry, so leaving it in would fail the build — confirm that by running the guard before and after removing it, and paste both outputs.

- [ ] **Step 3: Extend the table rule and retire its two paid entries**

Add to `TABLE_GUARDED_AREAS`:

```js
  'src/app/admin/projects/',
  'src/app/client/projects/',
  'src/components/client/projects/',
```

Remove from `TABLE_PENDING` the two entries Task 5 paid:
- `src/components/admin/clients/client-invoices-tab.tsx`
- `src/components/admin/contracts/contract-list.tsx`

Run the guard. **I scanned the three new prefixes myself and the only hand-rolled table under them is `src/app/admin/projects/[projectId]/invoices-tab.tsx`, which Task 3 migrated — so no new `TABLE_PENDING` entry should be needed at all.** If one trips anyway, that is a real finding: report it, and only then give it an entry with a one-line Greek reason naming the slice that owes it.

- [ ] **Step 4: Prove the rule bites in the new area**

Temporarily add `import { Table } from '@/components/ui/table';` to `src/app/admin/projects/[projectId]/invoices-tab.tsx`.
Run: `node scripts/check-design.mjs` → must exit non-zero naming that file. Revert, confirm green.

Report the exact output of both runs. Do not commit the temporary edit.

- [ ] **Step 5: Extend `e2e/design-identity.spec.ts`**

Read the file first and match its conventions: `test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database')` as the first line of every test, `loginAsAdmin(page)`, and a URL assertion **before** anything else.

Add a `design identity — detail screens` block with three tests. Each needs a real record to open, so each test navigates to the list first and clicks the first row's link rather than hardcoding an id — an id from a seed file would rot.

| test | what it proves |
|---|---|
| the shell renders on a project | after opening the first project: exactly one `[data-slot="page-heading"]`, a `[role="tablist"]`, and a back link whose `href` is `/admin/projects` |
| a deep link into a tab resolves to that tab | navigate straight to `?tab=invoices` on that project and assert the invoices tab's content is visible and the invoices tab has `aria-selected="true"` |
| the client detail's tabs are in the URL | open the first client, click the Contracts tab, and assert `page.url()` now contains `tab=contracts` — this is the one test that would catch the client screen losing its URL sync again |

Do not write a test that asserts the loading state appears. It requires winning a race against the server and would be flaky; the acceptance criterion asking for it is not worth a test that fails at random. Say in your report that you left it out and why.

- [ ] **Step 6: Full verification**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm test:unit` → all pass.
`pnpm exec playwright test e2e/design-identity.spec.ts --list` → the three new tests are listed.
`pnpm build` → succeeds, both guards `ok`. Paste the guard's final success line verbatim.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts
git commit -m "test(design): guard the detail screens and cover the URL-driven tabs"
```
