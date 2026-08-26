# Clients area adopts the shared table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every table in the Clients hub renders through the shared table, and the status cell of the entire product stops carrying its own colour dictionary.

**Architecture:** The four remaining hub tables move onto `DataTable`, which needs no new capability for any of them — a useful answer in itself. The centre of gravity turns out to be elsewhere: `StatusBadge`, the status cell used across the whole product, is a fifty-entry hardcoded colour map that never consults the tone resolver. It moves onto `statusTone()` and `ToneChip`, which is the only way the acceptance criterion "status cells take their tone from the resolver" can be true.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, TanStack Table 8, Tailwind CSS 4, next-intl 4.8, Playwright.

**Spec:** DEVREMEDIA/devremedia#105 (parent PRD #100). Read the issue body; it is the authority this plan argues from. Inventory: `.superpowers/sdd/105-clients-inventory.md`.

## Two stated disagreements with the spec

**1. The shared form dialog is deferred, and this slice does not build it.**

The issue says the shared form dialog «is born here» and that «every ad-hoc dialog in this area moves onto it». Reading every file: **there is no add/edit dialog in the Clients hub to move.** Creating a client, a proposal and a contract are all routed **pages**, not dialogs. Of the 31 files product-wide that build their own dialog chrome, exactly one sits in this area — and it is a delete confirmation, which belongs to the existing `ConfirmDialog` and not to a form dialog at all. The single add/edit chrome anywhere near the area, `client-drawer.tsx`, is a `Sheet` on the client **detail** page, and it needs a width that changes with a step the child form reports — the inventory's own proposed interface does not fit it.

Building the component here means designing it against zero fitting consumers. The cluster it should be designed against — packages, templates, team, users, sales resources, cost categories — lives in the Settings area, and that is where it belongs.

**2. The client detail page is out of scope.**

`/admin/clients/[clientId]` has its own tabs, its own drawer, and a table with a totals footer that `DataTable` cannot yet draw. Detail screens are slice #106's subject; splitting them across two slices would put two pull requests on the same files.

## Global Constraints

- **Behaviour must not change.** Same columns, same order, same links, same filters, same searches, same formatters, same destructive confirmations. What each tab shows, and in what order, is unchanged.
- **`DataTable` is not modified by this slice.** Every table here is served by what it already has. If a task believes it needs a new prop, that is a finding to report, not a change to make.
- **`ConfirmDialog` is untouched** and stays the answer for destructive actions.
- **No query, route, or `<Suspense>` changes.** Nothing under `src/lib/queries/`, `src/lib/actions/`, `src/middleware.ts`.
- **Both message catalogues stay in step.** A new key goes into **both** `messages/en.json` and `messages/el.json`, at the same path, in the same commit. Greek in the Greek file. A key in one catalogue only is a runtime failure TypeScript cannot see — it reaches the user as a raw key name.
- **No raw colours.** Tokens only: `bg-card`, `border-border`, `text-muted-foreground`, `text-destructive`, `text-tone-{critical,caution,positive,neutral}`, `bg-tone-*-bg`, `hover:bg-accent`, `ring-ring`.
- **Tone comes from `statusTone()`** in `src/lib/status-tone.ts` — and it takes a **raw database status value**, never translated display text. The tokenizer strips every non-ASCII character, so a Greek string silently returns `neutral` with no error.
- **`src/components/landing/**` is never touched.** **Never stage `.npmrc` or `.env.local`.**
- Greek is the default locale. Comments in this codebase are Greek; match the surrounding file.

---

## File Structure

**Modified — the shared status cell:**
- `src/components/shared/status-badge.tsx` — the fifty-colour map goes; the resolver comes in.
- `src/lib/status-tone.ts` — `TONE_RULES` gains only the keywords whose loss would change meaning.
- `src/lib/status-tone.test.ts` — new cases for those keywords.

**Modified — the four hub tables:**
- `src/components/admin/leads/all-leads-table.tsx`
- `src/components/admin/chatbot/conversations-table.tsx`
- `src/app/admin/proposals/proposals-list.tsx`
- `src/app/admin/contracts/contracts-list-page.tsx`

**Modified — the duplicated status map's second copy:**
- `src/app/admin/proposals/[proposalId]/proposal-detail.tsx` — only the `statusStyles` map and its use.

**Modified — protection:**
- `scripts/check-design.mjs`, `e2e/design-identity.spec.ts`
- `messages/en.json`, `messages/el.json` — only for strings that are hardcoded today in the files above.

---

### Task 1: The status cell stops carrying its own colours

**Files:**
- Modify: `src/lib/status-tone.ts`
- Modify: `src/lib/status-tone.test.ts`
- Modify: `src/components/shared/status-badge.tsx`

**Interfaces:**
- Consumes: `statusTone`, `Tone` from `@/lib/status-tone`; `ToneChip` from `@/components/shared/tone-chip`.
- Produces: `StatusBadge` keeps its exact public API — `{ status: string; className?: string }`. **No call site changes.** There are roughly thirty of them across the product and this task edits none.

**Context — read this before touching anything.** `StatusBadge` today holds a `statusColorMap` of about fifty entries in light-mode Tailwind palette colours (`bg-green-100 text-green-800`, `bg-blue-100 text-blue-800`, …). Three separate problems live in that one map:
1. It never consults the tone resolver, so the product has two disagreeing status vocabularies.
2. Those are light-mode colours with no dark variant, so in the dark edition — the product's resting state — a status pill is a bright wash.
3. An unknown status falls back to neutral silently.

This task changes only how the badge is **coloured and shaped**. It does **not** change what text the badge displays: the existing `displayText` derivation stays exactly as it is. That text is English derived from the raw status value, which is a real problem — and it belongs to the copy slice, not here. Do not try to fix it.

**This has product-wide visual effect on purpose.** Every status pill in the product changes appearance in this commit. That is the migration, not a side effect.

- [ ] **Step 1: Work out which keywords would lose meaning**

Read both `src/lib/status-tone.ts` and the `statusColorMap` in `src/components/shared/status-badge.tsx`. For every key in the map, work out what `statusTone()` returns for it today, and write the comparison into your report as a table: key → old colour family → tone the resolver gives → whether meaning is lost.

You will find three groups:
- Keys the resolver already agrees with — most of them.
- Keys the resolver does not know, where the old colour carried real meaning: `success`, `warning`, `danger`, `viewed`. These get added to `TONE_RULES`.
- Keys whose old colour was **blue** — `info`, `briefing`, `pre_production`, `filming`, `editing`, `todo`. These become `neutral`, deliberately. Blue was never one of the four tones; an in-flight state is not an alarm, and the four-tone system says so.

- [ ] **Step 2: Add only the four keywords to `TONE_RULES`**

`TONE_RULES` is data, not code — that is the point of it. Add `'success'` to the positive list, `'warning'` and `'viewed'` to the caution list, `'danger'` to the critical list. Keep each list alphabetically undisturbed — append, do not reorder. Add nothing else.

- [ ] **Step 3: Write the failing tests first**

`src/lib/status-tone.test.ts` already exists. Add cases for the four new keywords and for one blue-family key that must now resolve to neutral:

```ts
it('resolves the keywords the status badge used to colour by hand', () => {
  expect(statusTone('success')).toBe('positive');
  expect(statusTone('warning')).toBe('caution');
  expect(statusTone('viewed')).toBe('caution');
  expect(statusTone('danger')).toBe('critical');
});

it('gives in-flight states no alarm tone', () => {
  // Ήταν μπλε στον παλιό χάρτη. Το μπλε δεν ήταν ποτέ ένας από τους τέσσερις
  // τόνους — μια κατάσταση σε εξέλιξη δεν είναι συναγερμός.
  expect(statusTone('briefing')).toBe('neutral');
  expect(statusTone('filming')).toBe('neutral');
  expect(statusTone('todo')).toBe('neutral');
});
```

Run: `pnpm test:unit`
Expected: the first test **fails** before Step 2's edit is in place, passes after. If you did Step 2 first, revert it, watch the test fail, then reapply — a test that has never failed proves nothing.

- [ ] **Step 4: Rewrite `status-badge.tsx`**

Delete `statusColorMap` entirely. Keep `normalizedStatus` (it feeds the resolver) and keep `displayText` exactly as it is.

```tsx
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone } from '@/lib/status-tone';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Το κελί κατάστασης όλου του προϊόντος. Έως αυτή τη φέτα κουβαλούσε δικό του
 * λεξικό πενήντα χρωμάτων — φτιαγμένο για φωτεινό φόντο, χωρίς σκούρα έκδοση,
 * και χωρίς καμία σχέση με τον resolver που κρίνει τον τόνο παντού αλλού.
 * Τώρα ρωτά τον resolver, όπως κάθε άλλο σημείο.
 *
 * Το κείμενο παράγεται ακόμα από την ωμή τιμή της κατάστασης, άρα είναι
 * αγγλικό. Είναι πραγματικό πρόβλημα και ανήκει στη φέτα του κειμένου, όχι εδώ.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <ToneChip tone={statusTone(normalizedStatus)} className={className}>
      {displayText}
    </ToneChip>
  );
}
```

The `Badge` and `cn` imports go with the map. `ToneChip` already applies `cn` to the `className` you pass it.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit` → all pass.
Run: `pnpm type-check` → no errors.
Run: `pnpm lint` → 0 errors.
Run: `node scripts/check-design.mjs` → `ok`.
Run: `pnpm build` → succeeds.

Then search the whole of `src` for `statusColorMap` and for any remaining import of `Badge` inside `status-badge.tsx`. Report what you searched for.

- [ ] **Step 6: Commit**

```bash
git add src/lib/status-tone.ts src/lib/status-tone.test.ts src/components/shared/status-badge.tsx
git commit -m "feat(design): the status cell asks the resolver instead of its own colour map"
```

---

### Task 2: The leads table

**Files:**
- Modify: `src/components/admin/leads/all-leads-table.tsx`

**Interfaces:**
- Consumes: `DataTable` from `@/components/shared/data-table`; column `meta: { align, numeric, width }`.

**Context:** seven columns, its own search box and stage filter in local state, an `EmptyState` when there are no leads at all, and an inline row when the filter matches nothing. The established pattern in this codebase — see `src/app/admin/invoices/expenses/expenses-content.tsx` — is that **filters live outside the table and the filtered array is handed to it**. Follow that. Do **not** move the search into `DataTable`'s own `searchKey` or `globalSearch`: the current search spans exactly three fields, and `globalSearch` would silently widen it to every column, including deal value and dates.

- [ ] **Step 1: Declare the columns**

Seven columns, in this exact order, each cell renderer byte-identical in what it produces:

| id / accessorKey | header | cell | meta |
|---|---|---|---|
| `contact_name` | `t('contactName')` | the `Link` to `/admin/leads/${lead.id}` **and** the email `<p>` beneath it, exactly as today | — |
| `company_name` | `t('companyName')` | `lead.company_name ?? '-'` | — |
| `stage` | `t('stage')` | `<StatusBadge status={lead.stage} />` | — |
| `source` | `t('source')` | the `Badge variant="outline"` with `LEAD_SOURCE_LABELS[...] ?? lead.source` | — |
| `deal_value` | `t('dealValue')` | `lead.deal_value != null ? \`€${lead.deal_value.toLocaleString()}\` : '-'` | `{ numeric: true }` |
| `assigned_to` | `t('assignedTo')` | `lead.assigned_user?.display_name ?? t('unassigned')` | — |
| `last_contacted_at` | `t('lastContact')` | the same `toLocaleDateString(undefined, {...})` call, or `t('never')` | `{ numeric: true, align: 'left' }` |

`deal_value` was `text-right` by hand; `meta.numeric` supplies right alignment plus even-width digits. The date column takes `numeric` for the digits but keeps `align: 'left'` — a date is not a quantity and must not jump to the right edge.

Wrap the column array in `React.useMemo` with `[t]` as the dependency, matching `invoices-table-view.tsx`.

- [ ] **Step 2: Replace the table**

Keep the whole filter bar above exactly as it is. Keep the zero-leads `EmptyState` early return exactly as it is — that is a different state from "the filter matched nothing" and both must survive.

```tsx
<DataTable
  columns={columns}
  data={filtered}
  emptyState={<span className="text-muted-foreground">{t('noMatchingLeads')}</span>}
/>
```

Delete the `<div className="rounded-md border">` wrapper, the whole `<Table>` block, and the now-unused imports (`Table` and its siblings, `TableRow`/`TableCell`/etc.).

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors, no unused imports. `pnpm build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/leads/all-leads-table.tsx
git commit -m "feat(design): the leads table moves onto the shared one"
```

---

### Task 3: The conversations table, and the delete that never asked

**Files:**
- Modify: `src/components/admin/chatbot/conversations-table.tsx`
- Modify: `messages/en.json`, `messages/el.json`

**Interfaces:**
- Consumes: `DataTable`; `ConfirmDialog` from `@/components/shared/confirm-dialog`.

**Context:** this file has three problems and the migration is the smallest of them.

1. **A destructive action with no confirmation.** Clicking the bin deletes a conversation immediately. Every other destructive action in this product goes through `ConfirmDialog`. This one must too.
2. **A whole-row click that contains a delete button.** The row navigates on click and holds a bin inside it, so the bin has to `stopPropagation` to avoid navigating while deleting. That is a mis-click waiting to happen. The first cell becomes an explicit `Link`, exactly as the clients and leads tables already do, and the row-level `onClick` goes. `DataTable` has no row-click concept and must not grow one for this.
3. **Every string is hardcoded English** — four headers, the empty state, and the success toast — in a product whose default locale is Greek.

- [ ] **Step 1: Add the translation keys to BOTH catalogues**

Under the existing `chatbot` namespace in both files, at the same path and in the same order. Check first whether any already exist and reuse them if so.

| key | el | en |
|---|---|---|
| `table.session` | `Συνεδρία` | `Session` |
| `table.language` | `Γλώσσα` | `Language` |
| `table.messages` | `Μηνύματα` | `Messages` |
| `table.lastActive` | `Τελευταία δραστηριότητα` | `Last active` |
| `table.empty` | `Δεν υπάρχουν ακόμα συνομιλίες. Το widget του chatbot στη δημόσια σελίδα δημιουργεί συνομιλίες όταν οι επισκέπτες αλληλεπιδρούν μαζί του.` | `No conversations yet. The chatbot widget on the landing page will create conversations when visitors interact with it.` |
| `table.deleted` | `Η συνομιλία διαγράφηκε` | `Conversation deleted` |
| `table.deleteTitle` | `Διαγραφή συνομιλίας;` | `Delete conversation?` |
| `table.deleteConfirm` | `Η συνομιλία και τα μηνύματά της θα διαγραφούν οριστικά.` | `The conversation and its messages will be permanently deleted.` |

After editing, verify both files still parse and have the same number of keys — the verification step below shows how.

- [ ] **Step 2: Declare the columns**

Five columns, same order, same content:

| id / accessorKey | header | cell | meta |
|---|---|---|---|
| `session_id` | `t('table.session')` | a `Link` to `/admin/chatbot/${conv.id}` wrapping `` `${conv.session_id.slice(0, 8)}...` ``, with `className="font-medium hover:underline"` | `{ numeric: true, align: 'left' }` |
| `language` | `t('table.language')` | the existing `<span>` pill with `🇬🇷 EL` / `🇬🇧 EN` | — |
| `message_count` | `t('table.messages')` | `conv.message_count` | `{ numeric: true }` |
| `updated_at` | `t('table.lastActive')` | the same `formatDistanceToNow(...)` call, in `<span className="text-sm text-muted-foreground">` | — |
| `actions` | `''` (empty header) | the bin `Button`, now calling `setPendingDelete(conv)` instead of deleting | `{ width: 'w-[50px]' }` |

The session id keeps its monospaced face — `meta.numeric` supplies it, and an id is exactly what that face is for. `align: 'left'` is required or the column jumps right.

The bin button's `onClick` no longer needs `stopPropagation`, because the row is no longer clickable. Remove that argument and the `e: React.MouseEvent` parameter with it.

- [ ] **Step 3: Wire the confirmation**

```tsx
const [pendingDelete, setPendingDelete] = React.useState<ChatConversation | null>(null);
const [deleting, setDeleting] = React.useState(false);

const handleDelete = async () => {
  if (!pendingDelete) return;
  setDeleting(true);
  const result = await deleteChatConversation(pendingDelete.id);
  setDeleting(false);
  setPendingDelete(null);

  if (result.error) {
    toast.error(result.error);
  } else {
    toast.success(t('table.deleted'));
    router.refresh();
  }
};
```

The dialog closes on both paths, matching how `invoices-table-view.tsx` does it:

```tsx
<ConfirmDialog
  open={pendingDelete !== null}
  onOpenChange={(open) => !open && setPendingDelete(null)}
  title={t('table.deleteTitle')}
  description={t('table.deleteConfirm')}
  confirmLabel={tc('delete')}
  onConfirm={handleDelete}
  loading={deleting}
  destructive
/>
```

`tc` is `useTranslations('common')`; check that `common.delete` exists before using it, and use the namespace the rest of the file uses if it does not.

- [ ] **Step 4: Replace the table**

The zero-conversations early return keeps its own shape but takes the translated string. The `DataTable` gets `emptyState` for the filtered-to-nothing case — there is no filter here, so pass the same translated empty string for consistency.

- [ ] **Step 5: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds.

Then prove the two catalogues are still in step:

```bash
node -e "const c=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?c(v,p+k+'.'):[p+k]);const el=c(require('./messages/el.json')),en=c(require('./messages/en.json'));const a=new Set(el),b=new Set(en);console.log(el.length,en.length,el.filter(k=>!b.has(k)),en.filter(k=>!a.has(k)))"
```
Expected: two equal counts and two empty arrays. Put the actual output in your report.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/chatbot/conversations-table.tsx messages/en.json messages/el.json
git commit -m "feat(design): the conversations table joins the shared one and finally asks before deleting"
```

---

### Task 4: The proposals list becomes a table

**Files:**
- Modify: `src/app/admin/proposals/proposals-list.tsx`
- Modify: `src/app/admin/proposals/[proposalId]/proposal-detail.tsx` — the `statusStyles` map only

**Interfaces:**
- Consumes: `DataTable`; `StatusBadge` from `@/components/shared/status-badge` (Task 1 already made it tone-driven).

**Context:** this is not a swap, it is a structural change. Today each proposal is a `<Link>` row in a `divide-y` stack: the client name and a status pill on one line, then a smaller line holding the linked company, a package count and the creation date, with the expiry date pushed to the right. It is a table wearing a list's clothes — six pieces of data per row, the same six every time.

It also carries a hand-written `statusStyles` map of raw palette colours, **duplicated byte-for-byte** into `proposal-detail.tsx`. Both copies go. Half-fixing a duplicated map is how it grows back.

- [ ] **Step 1: Delete both copies of `statusStyles`**

In `proposals-list.tsx`, delete the map and replace its only use with the shared badge:

```diff
-                        <Badge variant="outline" className={`text-xs ${statusStyles[p.status]}`}>
-                          {ts(p.status)}
-                        </Badge>
+                        <StatusBadge status={p.status} />
```

In `proposal-detail.tsx`, delete the identical map and replace its use the same way. **Change nothing else in that file** — its hardcoded English labels and `'el-GR'` date formatting are pre-existing and belong to the copy slice.

Note the consequence and put it in your report: the badge text now comes from `StatusBadge`'s own derivation rather than `ts(p.status)`, so it renders in English. That is the same English every other status pill in the product renders, and unifying it is the point; the translation of all of them is the copy slice's job.

If dropping `ts` leaves `useTranslations('proposals.status')` unused, remove it. If `Badge` becomes unused, remove that import too.

- [ ] **Step 2: Declare six columns**

| id / accessorKey | header | cell | meta |
|---|---|---|---|
| `client_name` | `t('list.client')` | a `Link` to `/admin/proposals/${p.id}` wrapping `p.client_name`, `className="font-medium hover:underline"` | — |
| `linked` | `t('list.linkedTo')` | the existing fallback chain — `p.client?.company_name \|\| p.client?.contact_name \|\| p.lead?.company_name \|\| p.lead?.contact_name \|\| '—'` | — |
| `status` | `t('list.status')` | `<StatusBadge status={p.status} />` | — |
| `packages` | `t('list.packages')` | `p.selected_packages.length` | `{ numeric: true }` |
| `created_at` | `t('list.created')` | `new Date(p.created_at).toLocaleDateString('el-GR')` — unchanged, including the hardcoded locale | `{ numeric: true, align: 'left' }` |
| `valid_until` | `t('list.validUntil')` | `p.valid_until ? new Date(p.valid_until).toLocaleDateString('el-GR') : '—'` | `{ numeric: true, align: 'left' }` |

The English pluralisation `${pkgCount} ${pkgCount === 1 ? 'package' : 'packages'}` disappears with the sub-line: the count becomes a column with a translated header, so the word is no longer glued to the number. That is a real improvement and it needs no new plural machinery.

**The six header keys almost certainly do not exist.** Check `messages/el.json` under `proposals.list` first. Add only the missing ones, to **both** catalogues, at the same path: `client` / `linkedTo` / `status` / `packages` / `created` / `validUntil`, with Greek in the Greek file (`Πελάτης`, `Συνδεδεμένο με`, `Κατάσταση`, `Πακέτα`, `Δημιουργήθηκε`, `Ισχύει έως`).

- [ ] **Step 3: Replace the list**

Keep the two action buttons above and the whole filter bar exactly as they are. Keep the `Card`/`CardContent` wrapper. Replace only the `filtered.length === 0 ? … : <div className="divide-y">…</div>` block:

```tsx
<DataTable
  columns={columns}
  data={filtered}
  emptyState={<span className="text-muted-foreground">{t('list.empty')}</span>}
/>
```

The `filtered` memo, the search input and the status `Select` all stay outside the table and unchanged.

- [ ] **Step 4: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Run the catalogue key-tree check from Task 3 Step 5 and put its output in your report.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/proposals/proposals-list.tsx "src/app/admin/proposals/[proposalId]/proposal-detail.tsx" messages/en.json messages/el.json
git commit -m "feat(design): the proposals list admits it is a table"
```

---

### Task 5: The contracts list becomes a table

**Files:**
- Modify: `src/app/admin/contracts/contracts-list-page.tsx`

**Interfaces:**
- Consumes: `DataTable`; the existing `ConfirmDialog` and `EmptyState`, both unchanged.

**Context:** the same shape as Task 4 — a stack of bordered `<div>`s, six pieces of data per row, no table markup. It already uses `ConfirmDialog` correctly for delete, and that whole flow (`deleteId`, `isDeleting`, the optimistic `setContracts` filter, the toast) stays exactly as it is. Only the rendering changes.

- [ ] **Step 1: Declare the columns**

| id / accessorKey | header | cell | meta |
|---|---|---|---|
| `title` | `t('title')` | the `Link` to `/admin/contracts/${contract.id}`, `className="font-medium hover:underline"` | — |
| `status` | `t('status')` | `<StatusBadge status={contract.status} />` | — |
| `client` | `t('client')` | `contract.client?.company_name \|\| contract.client?.contact_name \|\| '-'` | — |
| `project` | `t('project')` | `contract.project?.title \|\| '-'` | — |
| `created_at` | `t('created')` | the same `toLocaleDateString(undefined, { year, month: 'short', day })` call | `{ numeric: true, align: 'left' }` |
| `actions` | `''` | the two buttons, unchanged in behaviour | `{ width: 'w-[110px]' }` |

Check each header key exists under `contracts` in `messages/el.json` before using it; add any missing one to **both** catalogues.

The project column was `hidden sm:inline` on a phone. Preserve that by passing `mobileHiddenColumns={['project']}` to `DataTable` rather than a class — that is what the prop is for, and it hides the header too, which the class never did.

- [ ] **Step 2: The delete button loses its raw colours**

```diff
-                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
+                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
```

`bg-red-50` is a light-mode colour with no dark variant; on the dark edition it painted a near-white block behind the icon.

- [ ] **Step 3: Replace the list**

Keep the zero-contracts `EmptyState` early return exactly as it is. Replace the `<div className="space-y-3">…</div>` with the `DataTable`. The `ConfirmDialog` below stays untouched.

- [ ] **Step 4: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Catalogue key-tree check if you added keys.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/contracts/contracts-list-page.tsx messages/en.json messages/el.json
git commit -m "feat(design): the contracts list admits it is a table"
```

---

### Task 6: Lock the area in

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

**Context:** the guard runs inside `pnpm build` and is the only protection that fires today — the credentialed Playwright specs are skipped here because there are no test users in the database. Do not describe the new tests as coverage that protects anything now.

Read `scripts/check-design.mjs` end to end first. It already enforces five rules and folds them all into one exit at the bottom. Match its structure and its Greek voice.

- [ ] **Step 1: Extend `COVERED`**

Add, each with a short Greek comment:

```js
  'src/components/shared/status-badge.tsx',
  'src/app/admin/clients',
  'src/components/admin/leads/all-leads-table.tsx',
  'src/components/admin/chatbot/conversations-table.tsx',
  'src/app/admin/proposals/proposals-list.tsx',
  'src/app/admin/contracts/contracts-list-page.tsx',
```

`src/app/admin/clients` is a whole directory on purpose — the hub and its column definitions live there and a new component in that folder should be guarded automatically.

Run the guard. `src/app/admin/clients/columns.tsx` still writes `text-green-600` on a shield icon (line ~163). Fix it to `text-tone-positive` rather than adding a `PENDING` entry — it is one token on one line, and a pending list that grows on the first run is not a pending list.

If anything else in those paths trips the rule, that is a real finding: report it and fix it if it is one token, or bring it back to me if it is not.

- [ ] **Step 2: Extend the hand-rolled-table rule to the Clients area**

The rule and its lists already exist from the previous slice. Rename nothing; just add the Clients prefixes to `FINANCE_AREA` and rename that constant to `TABLE_GUARDED_AREAS`, updating its comment to say it covers two areas now:

```js
  'src/app/admin/clients/',
  'src/app/admin/proposals/',
  'src/app/admin/contracts/',
  'src/components/admin/leads/',
  'src/components/admin/chatbot/',
```

Run the guard and see what it catches. Several files under these prefixes are **not** in this slice's scope and will trip it — the client detail tabs, the contract detail page, the chatbot knowledge table, the leads sales report. Each one is either a detail screen owed to #106 or an area owed to a later slice.

For those, add a `TABLE_PENDING` entry — not `TABLE_DETAIL_EXEMPT`. The difference matters and is written in the file: `EXEMPT` means "this must never become a `DataTable`", `PENDING` means "this has not migrated yet". Give each entry a one-line Greek reason naming the slice that owes it. The success line already subtracts pending entries from the checked count; make sure it still does.

- [ ] **Step 3: Prove the rule bites in the new area**

Temporarily add `import { Table } from '@/components/ui/table';` to `src/components/admin/leads/all-leads-table.tsx`.
Run: `node scripts/check-design.mjs` → must exit non-zero naming that file. Revert, confirm green.

Report the exact output. Do not commit the temporary edit.

- [ ] **Step 4: Extend `e2e/design-identity.spec.ts`**

Read the file first and match its conventions: `test.skip(!process.env.E2E_TEST_USERS_READY, …)` as the first line of every test, `loginAsAdmin(page)`, and a URL assertion **before** anything else.

**Pin the tab in the URL assertion.** The Clients hub opens on `list`; every other tab needs its `?tab=` and the assertion must include it. A previous slice shipped a test that could never pass because it navigated to a hub's bare URL — and nobody noticed, because the specs are skipped.

Add a `design identity — clients area` block covering:

| route | what it proves |
|---|---|
| `/admin/clients?tab=interest` | the leads table renders through the shared part — assert a `[data-slot="table-container"]` holding a `table`, then type in the stage filter's sibling search box and assert the row count strictly drops |
| `/admin/clients?tab=proposals` | the proposals list is now a real table — assert `table` exists and has a header row |
| `/admin/clients?tab=chat` | the delete flow asks first — click the bin in the first row and assert an `alertdialog` appears; then press Escape and assert it closes and no row was removed |

The third one is the important one: it is the only test in this suite that would catch a destructive action losing its confirmation again.

- [ ] **Step 5: Full verification**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm test:unit` → all pass.
`pnpm exec playwright test e2e/design-identity.spec.ts --list` → the new tests are listed.
`pnpm build` → succeeds, both guards `ok`.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts src/app/admin/clients/columns.tsx
git commit -m "test(design): guard the Clients area and cover the delete confirmation"
```
