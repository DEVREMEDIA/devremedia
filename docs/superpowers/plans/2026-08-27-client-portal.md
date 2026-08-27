# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The surface clients actually see stops loading everything before showing anything, and starts speaking the same visual language as the proposal that brought them here.

**Architecture:** A small cached query layer for the portal (`src/lib/queries/client-portal.ts`) lets every section of the client home fetch exactly what it needs without repeating a query, the way the admin hubs already work. The home page becomes a shell of `<Suspense>` boundaries around async section components. `requireUser()` gains `cache()`, which collapses the auth round-trip every action makes independently. Then the portal's hand-written colour maps die and its remaining English gets translated.

**Tech Stack:** Next.js 16 App Router (Server Components, streaming, `React.cache`), React 19, TypeScript 5, Tailwind 4, next-intl, Supabase, Playwright.

**Spec:** DEVREMEDIA/devremedia#107 (parent PRD #100). Inventory: `.superpowers/sdd/107-portal-inventory.md`.

## Global Constraints

- Touch only the files each task names. Nothing else may appear in a commit.
- Never stage `.npmrc` or `.env.local` — local Windows build workarounds, they stay untracked.
- Never commit `design-explorations/`, `patches/`, `tzeni/`, `.sandcastle/`, `.gitnexus/`, `src/app/dev/prototype-ia/`.
- **What the client sees, and in what order, does not change — only when it appears and how it looks.** Same sections, same order, same content, same counts.
- **Authorisation must not weaken.** `getMyAgreement` runs against the admin client and does its own authorisation check in application code because there is no RLS backstop for it — that check stays exactly as it is. No query may lose a filter.
- `messages/en.json` and `messages/el.json` end with identical key trees and equal counts. Baseline: `2454 2454 [] []`.
- No `any`, no `@ts-ignore`, no `as` assertions without validation.
- Verification per task: `pnpm type-check` clean, `pnpm lint` 0 errors (30 pre-existing warnings expected), `pnpm build` succeeds with both guard scripts printing `ok`.
- `src/middleware.ts` and `src/components/landing/` stay untouched.

---

### Task 1: One auth call, one query per thing

**Files:**
- Modify: `src/lib/auth-helpers.ts`
- Create: `src/lib/queries/client-portal.ts`
- Modify: `src/lib/actions/deliverables.ts`

**Interfaces:**
- Produces: `getClientId`, `getClientProjects`, `getClientInvoices`, `getClientContracts`, `getClientAgreement`, `getClientRecentDeliverables` — every one `cache()`-wrapped. Task 2 consumes all six.
- Produces: `getDeliverablesByProjects(projectIds: string[])` in the actions file.

**Context:** the client home makes nine sequential `await`s, and the real round-trip count is higher — around fourteen — because five separate actions each re-authenticate and two of them re-look-up the same client record. Splitting the page into streaming sections would make that *worse*, not better, unless the reads dedupe first. So the dedup comes first, in its own task, before anything is split.

Two facts I verified before writing this, so you do not have to:
- **All five actions authenticate through `requireUser()`.** Not one of them calls `supabase.auth.getUser()` directly. One `cache()` therefore collapses every hidden auth round-trip in the request.
- **`src/lib/queries/*.ts` is an established layer** with its own conventions: no `'use server'`, plain functions, returns bare data rather than the `ActionResult` shape. Follow those conventions; do not copy the actions' shape.

- [ ] **Step 1: `requireUser` gets `cache()`**

`cache` is already imported at the top of `auth-helpers.ts` — `getAdminRole` on line 54 is already wrapped, and this is the same treatment.

```diff
-export async function requireUser(): Promise<AuthOk | AuthErr> {
+// Κάθε ενέργεια αυτού του προϊόντος περνά από εδώ, και μια σελίδα του πελάτη
+// καλεί πέντε ενέργειες — δηλαδή πέντε ταξίδια στον Auth για την ίδια απάντηση,
+// μέσα στο ίδιο αίτημα. Το `cache()` τα κάνει ένα. Ο `getAdminRole` από κάτω
+// είναι ήδη έτσι· αυτό απλώς έλειπε.
+export const requireUser = cache(async (): Promise<AuthOk | AuthErr> => {
   const supabase = await createClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
     return { supabase, user: null, error: 'Unauthorized' };
   }

   return { supabase, user, error: null };
-}
+});
```

Do **not** touch `requireAdmin` in the same edit. It does a second query for the role and has different callers; leave it exactly as it is and say so in your report.

- [ ] **Step 2: One batched deliverables query**

In `src/lib/actions/deliverables.ts`, beside the existing `getDeliverablesByProject`, add:

```ts
/**
 * Τα παραδοτέα πολλών έργων με ΕΝΑ ερώτημα. Η αρχική του πελάτη ζητούσε ένα
 * ανά έργο — παράλληλα μεν, αλλά πέντε ταξίδια και πέντε ελέγχους ταυτότητας
 * για κάτι που είναι ένα `in`.
 */
export async function getDeliverablesByProjects(
  projectIds: string[],
): Promise<ActionResult<Deliverable[]>> {
  if (projectIds.length === 0) return { data: [], error: null };

  const { supabase, user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Deliverable[], error: null };
}
```

Match the file's existing import names and its `ActionResult` usage exactly — read the file's other functions first and copy their shape, including how they name the error branch. The empty-array early return matters: `.in('project_id', [])` is a query that returns nothing but still costs a round trip.

- [ ] **Step 3: The cached portal readers**

Create `src/lib/queries/client-portal.ts`:

```ts
import { cache } from 'react';
import { requireUser } from '@/lib/auth-helpers';
import { getProjects } from '@/lib/actions/projects';
import { getInvoices } from '@/lib/actions/invoices';
import { getMyContracts } from '@/lib/actions/contracts';
import { getMyAgreement } from '@/lib/actions/my-agreement';
import { getDeliverablesByProjects } from '@/lib/actions/deliverables';
import type { DeliverableWithProject, InvoiceWithRelations } from '@/types';

/**
 * Ο πελάτης βλέπει τη δική του αρχική σε τμήματα που φορτώνουν ανεξάρτητα.
 * Για να μη σημαίνει αυτό ότι το ίδιο ερώτημα τρέχει τέσσερις φορές — μία ανά
 * τμήμα που το χρειάζεται — κάθε ανάγνωση εδώ είναι `cache()`. Μέσα σε ένα
 * αίτημα, το δεύτερο κάλεσμα δεν αγγίζει τη βάση.
 */

/** Το `clients.id` του συνδεδεμένου χρήστη, ή `null` αν δεν είναι πελάτης. */
export const getClientId = cache(async (): Promise<string | null> => {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return null;

  const { data } = await supabase.from('clients').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
});

export const getClientProjects = cache(async () => {
  const clientId = await getClientId();
  // Χωρίς πελάτη δεν υπάρχουν «τα έργα του» — και το φίλτρο του `getProjects`
  // αγνοεί σιωπηλά ένα `undefined`, δηλαδή θα γύριζε ό,τι επιτρέπει το RLS
  // σαν να ήταν δικά του. Ρητό κενό, όχι σιωπηλό «όλα».
  if (!clientId) return [];

  const result = await getProjects({ client_id: clientId });
  return result.data ?? [];
});

export const getClientInvoices = cache(async (): Promise<InvoiceWithRelations[]> => {
  const clientId = await getClientId();
  if (!clientId) return [];

  const result = await getInvoices({
    status: ['sent', 'viewed', 'overdue', 'paid', 'cancelled'],
    client_id: clientId,
  });
  return (result.data ?? []) as InvoiceWithRelations[];
});

export const getClientContracts = cache(async () => {
  const result = await getMyContracts();
  return result.data ?? [];
});

export const getClientAgreement = cache(async () => {
  const result = await getMyAgreement();
  return result.data;
});

/** Τα πέντε πιο πρόσφατα παραδοτέα, από τα πέντε πιο πρόσφατα έργα. */
export const getClientRecentDeliverables = cache(async (): Promise<DeliverableWithProject[]> => {
  const projects = await getClientProjects();
  const recent = projects.slice(0, 5);
  if (recent.length === 0) return [];

  const titleOf = new Map(recent.map((p) => [p.id, p.title]));
  const result = await getDeliverablesByProjects(recent.map((p) => p.id));

  return (result.data ?? [])
    .map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      version: d.version,
      created_at: d.created_at,
      project_id: d.project_id,
      project: { title: titleOf.get(d.project_id) ?? '' },
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
});
```

**Two behaviours here are deliberate changes and must be in your report:**
1. `getClientProjects` returns `[]` when there is no client record. The page used to pass `client_id: undefined` into `getProjects`, whose guard is `if (filters?.client_id)` — so an undefined id produced *no filter at all*. It is masked today by RLS, but "show me everything the database will let me see" is not what that call meant.
2. `getClientRecentDeliverables` takes the five most recent *projects* and returns the five most recent *deliverables across them* — same as before. Confirm by reading the old code that the sort and both `slice(0, 5)` boundaries land in the same places.

- [ ] **Step 4: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

Nothing consumes the new file yet, so a green build proves it compiles and nothing else. Say exactly that; do not claim the page got faster.

Then prove the `cache()` did not break the app's auth:

```bash
grep -rn "requireUser" src/lib/actions | wc -l
```
Report the number. Every one of those call sites now shares one auth round trip per request; none of them changed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-helpers.ts src/lib/queries/client-portal.ts src/lib/actions/deliverables.ts
git commit -m "perf(client): one auth call and one query per thing, per request"
```

---

### Task 2: The client home stops waiting for its slowest part

**Files:**
- Modify: `src/app/client/home/page.tsx`
- Modify: `src/app/client/home/loading.tsx`

**Interfaces:**
- Consumes: every reader from Task 1.

**Context:** this is the reason the whole redesign started. The page awaits everything, then renders everything. A client with one slow query sees nothing at all until it lands.

The prior art is `src/app/admin/today/page.tsx` — read it before you start. Its shape: the page is a thin shell; each section is its own `async function` component that fetches what it needs; each is wrapped in its own `<Suspense fallback={…}>`; repeated reads dedupe through `cache()`. Copy that shape exactly. Skeletons already exist: `CardSkeleton` and `KpiStripSkeleton` from `@/components/admin/dashboard/shared/card-skeletons`.

**Do not change any section component.** `DashboardStats`, `MyAgreementCard`, `ActiveProjects`, `PendingActions`, `RecentDeliverables`, `InvoicesSummary`, `UpcomingFilmings` and `CompletedProjects` all take resolved data as props and none of them needs to become a client component. Their props do not change.

- [ ] **Step 1: Write the section components**

Above the default export, one async component per boundary. Each derives what it needs from the cached readers — the filters currently computed at the top of the page move into the section that uses them, unchanged:

```tsx
async function StatsSection() {
  const [projects, invoices, contracts] = await Promise.all([
    getClientProjects(),
    getClientInvoices(),
    getClientContracts(),
  ]);
  const activeProjects = projects.filter((p) => p.status !== 'archived' && p.status !== 'delivered');
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  const unsignedContracts = contracts.filter((c) => c.status === 'sent' || c.status === 'viewed');

  return (
    <DashboardStats
      activeProjectsCount={activeProjects.length}
      pendingActionsCount={pendingInvoices.length + unsignedContracts.length}
      upcomingFilmingsCount={
        activeProjects.filter((p) => p.filming_date && new Date(p.filming_date) >= new Date()).length
      }
    />
  );
}
```

Write the remaining seven the same way, each awaiting only what it needs:

| section component | reads | renders |
|---|---|---|
| `StatsSection` | projects, invoices, contracts | `DashboardStats` |
| `AgreementSection` | agreement | `MyAgreementCard` |
| `ActiveProjectsSection` | projects | `ActiveProjects` with the active filter |
| `PendingActionsSection` | invoices, contracts | `PendingActions` |
| `RecentDeliverablesSection` | recent deliverables | `RecentDeliverables` |
| `InvoicesSummarySection` | invoices | `InvoicesSummary` |
| `UpcomingFilmingsSection` | projects | `UpcomingFilmings` with the active filter |
| `CompletedProjectsSection` | projects | `CompletedProjects` with the completed filter |

The two filters are duplicated across sections on purpose — they are three lines of `Array.filter` over data `cache()` already deduped. Extracting them into a shared helper would buy nothing and cost a layer.

- [ ] **Step 2: The page becomes a shell**

```tsx
export default async function ClientDashboardPage() {
  const t = await getTranslations('client.dashboard');

  // Ο έλεγχος ταυτότητας μένει στην κρίσιμη διαδρομή: μια σελίδα πελάτη δεν
  // αρχίζει να ζωγραφίζει πριν ξέρουμε ότι υπάρχει πελάτης.
  const { user } = await requireUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-8">
      <PageHeading title={t('title')} subtitle={t('description')} />

      <Suspense fallback={<KpiStripSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <AgreementSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={4} />}>
        <ActiveProjectsSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <PendingActionsSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <RecentDeliverablesSection />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton rows={4} />}>
        <InvoicesSummarySection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <UpcomingFilmingsSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <CompletedProjectsSection />
      </Suspense>
    </div>
  );
}
```

Note the wrapper: `space-y-8` alone, **not** `container mx-auto px-4 py-6 sm:px-6 space-y-8`. The shell already pads the page; the old wrapper padded it a second time. Every hub in the product uses the bare form.

The comments marking each section (`{/* Welcome Header */}`, `{/* Stat Cards */}` and the rest) go — the component names now say what the comments said.

- [ ] **Step 3: The loading state stops pretending there are tabs**

`src/app/client/home/loading.tsx` renders `HubSkeleton`, whose shape is title + **tab strip** + six rows. This page has no tabs, and now most of it streams behind its own boundaries anyway — the route-level skeleton only needs to cover the heading before the first boundary resolves.

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

/** Ό,τι υπάρχει πριν το πρώτο όριο: η επικεφαλίδα και η λωρίδα αριθμών. */
export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <KpiStripSkeleton />
    </div>
  );
}
```

- [ ] **Step 4: Verify the page shows the same things in the same order**

Read the old file (`git show HEAD:src/app/client/home/page.tsx`) beside your new one and confirm in your report, item by item, that all eight sections render in the same order with the same props. Any difference is a finding — report it rather than deciding for yourself.

- [ ] **Step 5: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

Also confirm no section component became `'use client'`:
```bash
grep -n "use client" src/app/client/home/page.tsx
```
Expected: no output.

**Say plainly in your report that you cannot prove here that the page streams** — that needs a running server and a slow query. What you can prove is that each section is behind its own boundary and fetches only what it needs.

- [ ] **Step 6: Commit**

```bash
git add src/app/client/home/page.tsx src/app/client/home/loading.tsx
git commit -m "perf(client): the home page shows each part as soon as that part is ready"
```

---

### Task 3: Three copies of the same colour map die

**Files:**
- Modify: `src/app/client/invoices/invoices-list.tsx`
- Modify: `src/app/client/contracts/contracts-list.tsx`
- Modify: `src/components/client/dashboard/invoices-summary.tsx`

**Interfaces:**
- Consumes: `StatusBadge` from `@/components/shared/status-badge`; `ToneChip` from `@/components/shared/tone-chip`; `statusTone` from `@/lib/status-tone`.

**Context:** these three files independently hand-roll near-identical status→colour maps — 42 of the portal's 100 raw colours live in them. This is the same disease slice #105 cured in the proposals area, where the same map existed byte-for-byte in two files.

The rule from that slice applies here: **if the call site already has a translated label, keep it.** Use `<ToneChip tone={statusTone(status)}>{translatedLabel}</ToneChip>`. Only where the label is the raw status string does `<StatusBadge status={status} />` apply, because that is all `StatusBadge` does — `ToneChip` plus an English derivation of the raw value.

- [ ] **Step 1: Read all three maps and write the comparison**

Before changing anything, write into your report a table: every key of every map, its colour family, the tone `statusTone()` gives it, and whether the meaning changes. If any status resolves to a tone that contradicts its old colour, **stop and report it** rather than changing the meaning of a client-facing badge.

- [ ] **Step 2: Replace, file by file**

Delete each map. At each use site, decide between `ToneChip` and `StatusBadge` by the rule above, and say which you chose and why for each of the three files.

If a file's label came from a translation namespace, that namespace's hook stays. If it becomes unused, remove it.

`contracts-list.tsx` has a fourth problem noted in the inventory: when a status is neither signed nor signable, the badge falls back to rendering the raw enum value (`pending_review`) to a Greek-speaking client. Route it through the same translated labels the rest of the file uses; if no key exists for that status, add one to **both** catalogues.

- [ ] **Step 3: Verify**

After the change these must return nothing:

```bash
grep -nE "(text|bg|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-[0-9]" src/app/client/invoices/invoices-list.tsx src/app/client/contracts/contracts-list.tsx src/components/client/dashboard/invoices-summary.tsx
```

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. If you touched the catalogues, run the key-tree check:

```bash
node -e "const c=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?c(v,p+k+'.'):[p+k]);const el=c(require('./messages/el.json')),en=c(require('./messages/en.json'));const a=new Set(el),b=new Set(en);console.log(el.length,en.length,el.filter(k=>!b.has(k)),en.filter(k=>!a.has(k)))"
```
Expected: two equal counts and two empty arrays. Paste the real output.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/invoices/invoices-list.tsx src/app/client/contracts/contracts-list.tsx src/components/client/dashboard/invoices-summary.tsx messages/en.json messages/el.json
git commit -m "feat(design): the portal's three status colour maps become one resolver"
```

---

### Task 4: The dashboard cards take their colours from the tokens

**Files:**
- Modify: `src/components/client/dashboard/active-projects.tsx`
- Modify: `src/components/client/dashboard/pending-actions.tsx`
- Modify: `src/components/client/dashboard/completed-projects.tsx`
- Modify: `src/components/client/dashboard/upcoming-filmings.tsx`
- Modify: `src/components/client/dashboard/recent-deliverables.tsx`
- Modify: `src/components/client/dashboard/my-agreement-card.tsx`

**Context:** six cards on the client home, 23 raw colours between them. These are exactly the surfaces a client looks at first, and today they are painted in light-edition palette values with no dark variant.

This is a batch of the same small edit repeated across six files. Do them all in one pass and one commit.

- [ ] **Step 1: Map each colour to a token, or stop**

For each occurrence decide which of the four tones it means, then use `text-tone-critical` / `text-tone-caution` / `text-tone-positive` / `text-tone-neutral`, with `bg-tone-*-bg` where a background is wanted. Plain structural colours become `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-destructive`.

**If a colour does not map onto one of the four tones or a structural token, stop and report it** — a wrong tone on a client-facing card says something untrue about the client's own project, and inventing a fifth tone is not yours to decide.

Put the full before/after table in your report: file, line, old class, new class, and the meaning you read from it.

- [ ] **Step 2: Verify**

This must return nothing:

```bash
grep -rnE "(text|bg|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-[0-9]|#[0-9a-fA-F]{6}" src/components/client/dashboard/
```

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/components/client/dashboard/
git commit -m "feat(design): the client's own cards stop mixing their own paint"
```

---

### Task 5: The booking wizard, the payment result, and the stragglers

**Files:**
- Modify: `src/components/client/book/step-project-type.tsx`
- Modify: `src/components/client/book/step-details.tsx`
- Modify: `src/app/client/invoices/[invoiceId]/success/success-content.tsx`
- Modify: `src/app/client/invoices/[invoiceId]/cancel/page.tsx`
- Modify: `src/app/client/contracts/[contractId]/sign/sign-client.tsx`
- Modify: `src/app/client/contracts/[contractId]/contract-view-client.tsx`

**Context:** the last 20 raw colours in the portal outside the two files slice #106 already declared. `success-content.tsx` is the notable one — it carries a map of **raw hex values** for payment state, which is the furthest thing from a token in the codebase.

Same rules as Task 4: map to a tone or a structural token, stop and report anything that fits neither, and put the full before/after table in your report.

- [ ] **Step 1: Replace the colours**

- [ ] **Step 2: Verify**

These must return nothing:

```bash
grep -rnE "(text|bg|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-[0-9]|#[0-9a-fA-F]{6}|rgba?\(" src/components/client/book/
grep -rnE "(text|bg|border|ring|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-[0-9]|#[0-9a-fA-F]{6}|rgba?\(" "src/app/client/invoices/[invoiceId]" "src/app/client/contracts/[contractId]"
```

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/client/book/ "src/app/client/invoices/[invoiceId]" "src/app/client/contracts/[contractId]"
git commit -m "feat(design): the booking wizard and the payment result join the token layer"
```

---

### Task 6: The portal stops speaking English at Greek clients

**Files:**
- Modify: `src/app/client/contracts/[contractId]/sign/page.tsx`
- Modify: `src/app/client/contracts/[contractId]/page.tsx`
- Modify: `src/app/client/contracts/[contractId]/contract-view-client.tsx`
- Modify: `messages/en.json`, `messages/el.json`

**Context:** the default locale is Greek and this is the surface clients see. Four concrete leaks:

1. `sign/page.tsx` — **the whole file has no translation import at all.** Three user-visible English strings: a load-failure message, "This contract is no longer available for signing.", and "Status: {status}".
2. `contracts/[contractId]/page.tsx` — `generateMetadata` returns the hardcoded English title `'Contract Not Found'`, which shows in the browser tab.
3. `contract-view-client.tsx` — an upload error throws `'Upload failed'`, and the catch shows `err.message` in preference to the translated fallback, so a server with no error message shows the client raw English.

`src/components/client/invoices/invoice-detail.tsx` also has untranslated strings ("Preview", "Download"). **It is out of scope** — it is already declared in the guard's `HEADING_PENDING` as owed to #109, and rewriting it belongs with that. Do not touch it.

- [ ] **Step 1: Add the keys to BOTH catalogues**

Under the namespace the surrounding files already use. Check first whether an equivalent key exists and reuse it rather than adding a near-duplicate — `common` already carries a lot. List every key you add, with both values, in your report.

- [ ] **Step 2: Translate the three files**

`sign/page.tsx` is a Server Component, so it takes `getTranslations` from `next-intl/server`, not the `useTranslations` hook. Check which the neighbouring server pages use and match them.

For `contract-view-client.tsx`, the fix is to prefer the translated fallback over the raw thrown string, not to translate the thrown string — an error thrown for a developer and a message shown to a client are different things.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Run the catalogue key-tree check from Task 3 Step 3 and paste the real output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/client/contracts/[contractId]" messages/en.json messages/el.json
git commit -m "feat(i18n): the signing flow speaks the client's language"
```

---

### Task 7: The same disease, three smaller places

**Files:**
- Modify: `src/app/client/documents/page.tsx`
- Modify: `src/app/client/projects/[projectId]/page.tsx`

**Context:** the home page was the worst instance of accidental sequencing, not the only one.

1. **`documents/page.tsx`** is already a proper hub — `PageHeading` + URL-driven `SectionTabs` — but its tab bodies are not wrapped in `<Suspense>`, so switching to a tab blocks on that tab's whole fetch chain before anything appears.
2. **`projects/[projectId]/page.tsx`** awaits `getDeliverablesByProject` and then `getContractsByProject`, though neither depends on the other. This is a screen slice #106 already touched, and it left this behind.

- [ ] **Step 1: Wrap each tab body in its own boundary**

In `documents/page.tsx`, each `{active === '…' && <XTab />}` becomes:

```tsx
{active === 'invoices' && (
  <Suspense fallback={<CardSkeleton rows={5} />}>
    <ClientInvoicesPage />
  </Suspense>
)}
```

Only one tab renders at a time, so this does not parallelise anything — it means the heading and the tab strip paint immediately instead of waiting for the tab's data. Say that in your report rather than claiming a speed-up that is not there.

- [ ] **Step 2: The two independent fetches run together**

In `projects/[projectId]/page.tsx`:

```diff
-  const deliverablesResult = await getDeliverablesByProject(projectId);
-  const deliverables = (deliverablesResult.data ?? []) as import('@/types').Deliverable[];
-
-  const contractsResult = await getContractsByProject(projectId);
-  const contracts = (contractsResult.data ?? []) as import('@/types').ContractWithRelations[];
+  // Κανένα από τα δύο δεν περιμένει το άλλο· μόνο η σειρά των γραμμών τα
+  // έβαζε στη σειρά.
+  const [deliverablesResult, contractsResult] = await Promise.all([
+    getDeliverablesByProject(projectId),
+    getContractsByProject(projectId),
+  ]);
+  const deliverables = (deliverablesResult.data ?? []) as import('@/types').Deliverable[];
+  const contracts = (contractsResult.data ?? []) as import('@/types').ContractWithRelations[];
```

Read the file first and match its actual variable names and casts; the diff above shows the shape, not necessarily the exact text.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/documents/page.tsx "src/app/client/projects/[projectId]/page.tsx"
git commit -m "perf(client): two more places that waited for no reason"
```

---

### Task 8: The portal stops padding itself twice

**Files:**
- Modify: every file listed in Step 1 below.

**Context:** Task 2 removed `container mx-auto px-4 py-6 sm:px-6` from the client home, because the shell already pads: `AppShell` renders `<main className="flex-1 overflow-y-auto p-4 md:p-6">`, so the wrapper was a second helping of the same padding, plus a width cap no other page in the product has.

That was right, and it left the home as the **only** page in the portal without the wrapper — an inconsistency this task closes. Fourteen other places still carry it. The issue asks for exactly this: the portal should use "the hub pattern the rest of the product uses", and every admin hub renders into a bare `space-y-*` div.

**Two things in those class lists are NOT padding and must survive:**
- `max-w-4xl` on the contract pages caps a document's reading width. Keep it, with its own `mx-auto` — a capped column still needs centring.
- `min-h-[60vh] flex items-center justify-center` on the payment success and cancel pages centres a single message in the viewport. Keep it.

Strip only `container`, `mx-auto` (where nothing else needs centring), `px-4`, `py-6`, `sm:px-6`. Keep every `space-y-*` exactly as it is.

- [ ] **Step 1: The files**

```
src/app/client/settings/page.tsx:30
src/app/client/invoices/[invoiceId]/success/success-content.tsx:42
src/app/client/invoices/[invoiceId]/page.tsx:30
src/app/client/invoices/[invoiceId]/cancel/page.tsx:16
src/app/client/invoices/invoices-page.tsx:30
src/app/client/contracts/[contractId]/sign/page.tsx:16,36,46
src/app/client/productions/page.tsx:36
src/app/client/contracts/[contractId]/page.tsx:31
src/app/client/contracts/contracts-page.tsx:20
src/app/client/book/page.tsx:15
src/app/client/projects/[projectId]/loading.tsx:5
src/app/client/projects/[projectId]/client-project-detail.tsx:56
```

Line numbers are where I found them; verify each against the file rather than trusting the number.

**The last two are a pair.** `client-project-detail.tsx` and its `loading.tsx` must keep the *same* wrapper as each other, or the skeleton sits at a different width from the content that replaces it — the exact page-jump slice #106 added that skeleton to prevent. Change both or neither.

- [ ] **Step 2: Verify**

Only these may remain, and only with a `max-w-*` or a centring reason beside them:

```bash
grep -rn "container mx-auto" src/app/client src/components/client
```

Report what is left and why each one earned its place.

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

- [ ] **Step 3: Commit**

```bash
git add src/app/client
git commit -m "fix(client): the portal stops padding what the shell already padded"
```

---

### Task 9: Lock the portal in

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

**Context:** the guard runs inside `pnpm build` and is the only protection that fires in this environment — every credentialed Playwright spec is skipped, because there are no test users in the database. Do not describe the new tests anywhere as protection that is active today.

Read `scripts/check-design.mjs` end to end first. It enforces six rules folded into one exit, and it distinguishes carefully between `TABLE_DETAIL_EXEMPT` ("must never become a `DataTable`"), `TABLE_PENDING` ("has not migrated yet, and the detector can see it") and `TABLE_PENDING_UNDETECTABLE` ("the detector physically cannot see this one"). Do not blur them. Match its Greek voice in comments.

- [ ] **Step 1: Cover the portal**

Add to `COVERED`:

```js
  'src/app/client',
  'src/components/client',
```

Two whole trees, so a new component anywhere in the portal is guarded automatically.

Run the guard. Two files already sit in `PENDING` from slice #106 (`projects-list.tsx`, `deliverable-detail-view.tsx`) and stay. Anything else that trips is a real finding — Tasks 3, 4 and 5 were supposed to have cleared every raw colour in this tree. **Report anything that trips before you touch it.** If it is a single token on a single line, fix it and say so; if it is more, stop and bring it back to me.

- [ ] **Step 2: Guard the portal's tables**

Add to `TABLE_GUARDED_AREAS`:

```js
  'src/app/client/',
  'src/components/client/',
```

One file will trip: `src/components/client/invoices/invoice-detail.tsx` hand-builds a table from the raw primitives. It is **out of scope for this slice** — it is already declared in `HEADING_PENDING` as owed to **#109**, and its table belongs with that same rewrite. Give it a `TABLE_PENDING` entry with a one-line Greek reason naming #109.

If anything else trips, that is a real finding: report it rather than deferring it silently.

- [ ] **Step 3: Prove both rules bite in the new area**

Two negative tests, both mandatory, both reported with exact output:

1. Add `className="text-red-600"` to any element in `src/components/client/dashboard/active-projects.tsx`. Run `node scripts/check-design.mjs` → must exit non-zero naming that file and line. Revert; confirm green.
2. Add `import { Table } from '@/components/ui/table';` to `src/app/client/home/page.tsx`. Run it → must exit non-zero naming that file. Revert; confirm green.

Do not commit either temporary edit. Confirm with `git status` that the worktree is clean afterwards.

- [ ] **Step 4: Extend `e2e/design-identity.spec.ts`**

Read the file first and match its conventions: `test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database')` as the first line of every test, a URL assertion **before** anything else, and a real navigation rather than a hardcoded record id.

**Use `loginAsClient`, not `loginAsAdmin`.** I checked: `e2e/helpers/auth.ts` exports both, and this is the one suite where the difference matters. An admin is admitted to `/client/*` by the middleware but has no `clients` row, so every one of the new cached readers returns an empty array for them — an admin would see an empty portal and the tests would assert nothing. A client is also the only role that exercises the RLS path these pages depend on.

Add a `design identity — client portal` block:

| route | what it proves |
|---|---|
| `/client/home` | exactly one `[data-slot="page-heading"]`, and the stat strip is visible — the section that used to wait for every other query |
| `/client/documents?tab=invoices` | the tab is `aria-selected` and the tab body renders, pinned with the `?tab=` in the URL assertion |
| `/client/home` at 390px wide | the page body does not scroll sideways — assert `document.scrollingElement.scrollWidth <= clientWidth + 1` |

Do **not** write a test asserting that a section appears before another. It races the server and would fail at random. Say in your report that you left it out and why.

- [ ] **Step 5: Full verification**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm test:unit` → all pass.
`pnpm exec playwright test e2e/design-identity.spec.ts --list` → the new tests are listed.
`pnpm build` → succeeds, both guards `ok`. Paste the guard's final success line verbatim.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts
git commit -m "test(design): guard the client portal, colours and tables alike"
```
