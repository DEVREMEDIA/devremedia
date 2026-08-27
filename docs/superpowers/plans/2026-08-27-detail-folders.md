# Detail Folders Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The last four detail screens — admin invoice, client invoice, lead and filming request — render through the shared detail shell, and the design guard covers the folders they live in.

**Architecture:** Each screen is migrated on its own, because they are not three of a kind. The invoice is a table with no tabs; the lead is tabs with no table and no dialogs; the filming request is dialogs with neither. They share a destination (`DetailShell`), not a shape. The guard is extended last, once the folders are clean.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4, next-intl 4.8.

**Spec:** DEVREMEDIA/devremedia#109, corrected by the inventory comment posted on it. Where the issue and the inventory disagree, **the inventory wins** — it was verified file by file and the issue was not.

## Global Constraints

- What a user sees, and in what order, is unchanged. This is the binding constraint of the whole branch.
- Server actions are not touched. `convertToProject`, `approveHold`, `rejectHold`, `reviewFilmingRequest`, `deleteInvoice`, `updateInvoiceStatus`, `updateLead` and every `revalidatePath` literal must be byte-identical after this slice.
- Never commit `.npmrc` or `.env.local`. `git status` ends showing only the untracked `.npmrc`.
- New user-facing strings are translated and land in **both** `messages/el.json` and `messages/en.json` with identical key trees.
- `@/` import alias. No `any` without a written reason. Functional style.
- Every `*_PENDING` list in `scripts/check-design.mjs` may only shrink, and a stale entry fails the build. Never add an entry whose stated reason is not true.
- Run `node scripts/check-design.mjs` after every task. It is chained into `pnpm build`.

## What the inventory established, and the rulings that follow

**There are four screens, not three.** `src/components/client/invoices/invoice-detail.tsx` is never named in the issue, but `scripts/check-design.mjs` already charges it to this slice in **both** `HEADING_PENDING` and `TABLE_PENDING`. Three of the four `HEADING_PENDING` entries say `→ #109`. This slice does not close until they are gone.

**The lead folder is clean of hardcoded English.** The issue said otherwise. Every string there already runs through `t()`. The English lives in the two invoice files — eight sites, listed in Task 1 and Task 4.

**Status already goes through the resolver** in all four screens. What is still English is the *label* `StatusBadge` prints, which is shared infrastructure and is tracked as #120. **This slice does not fix it**, and all four migrated screens will still show English status text when it closes. Say so in the PR body rather than letting it read as an oversight.

**Ruling A — `FormDialog` gains exactly one prop: `submitVariant`.**
The filming request's review dialog switches its submit button between `destructive` and `default` on accept-versus-decline. `FormDialog` has no variant, and its doc comment warns against a shell that grows a prop per caller.
*Decision:* add `submitVariant?: 'default' | 'destructive'`, defaulting to `'default'`.
*Why this one is allowed:* it is not a structural difference — the shell, the footer and the submit path are identical; only the button's meaning changes. "This submit destroys something" is a property of forms in general, not of this caller, and a delete-with-a-reason form will want it next.
*Cost if wrong:* one optional prop with one default.

**Ruling B — both invoice line-item tables are EXEMPT, not PENDING.**
The guard already distinguishes them: `TABLE_DETAIL_EXEMPT` means *this must never become a `DataTable`*; `TABLE_PENDING` means *this has not migrated yet*. The admin invoice's table sits in EXEMPT with the rationale that an invoice's lines **are the document** — few, fixed, meaningless to sort or paginate. The client invoice's table is the same table, and sits in PENDING.
*Decision:* move the client invoice's entry from `TABLE_PENDING` to `TABLE_DETAIL_EXEMPT`, under one shared rationale; and delete the hedge in the admin entry's comment ("redesigned in #109 anyway"), which goes stale the moment this slice lands.
*Why not migrate them:* a shared `DataTable` brings sorting, filtering and empty states to a three-line receipt body, and fights the document presentation the PDF mirrors.
*Cost if wrong:* two invoice bodies keep a hand-built table that reviewers must read as deliberate — which is exactly what the EXEMPT list is for.

**Ruling C — the lead's tabs move into the URL, and that is a behaviour change on purpose.**
Lead detail uses radix `Tabs`, so its two tabs are not deep-linkable and reset on refresh. Slice #106 established that a detail screen's tabs live in the URL.
*Decision:* migrate to `DetailShell.tabs`, and give `[leadId]/page.tsx` the `searchParams` handling it currently lacks.
*Cost if wrong:* a lead's tab now survives a refresh and a shared link, which the issue asks for in its own acceptance criteria.

**Ruling D — the filming request's `router.back()` becomes a real href.**
`DetailShell` takes `backHref`, not a handler. `router.back()` returns to whatever came before; a link returns to a fixed place.
*Decision:* accept the change. Back goes to `/admin/productions?tab=requests`.
*Why:* `router.back()` from a deep link lands wherever the user came from, which for an emailed link is outside the app. A fixed destination is the behaviour the other migrated screens already have.
*Cost if wrong:* one navigation lands on the requests hub instead of the previous page.

**Back destinations point at the real page, never at a redirect stub.** `/admin/invoices` and `/admin/filming-requests` are both `redirect()` stubs left over from the v2 switchover. Use:

| screen | backHref |
|---|---|
| admin invoice | `/admin/finance?tab=invoices` |
| lead | `/admin/clients?tab=interest` |
| filming request | `/admin/productions?tab=requests` |
| client invoice | `/client/documents?tab=invoices` |

All four list routes named above are `redirect()` stubs (`/admin/invoices`, `/admin/leads`, `/admin/filming-requests`, `/client/invoices`). The table gives the destinations they redirect to. Linking to the stub would work, and would cost every back-navigation an extra redirect hop.

---

### Task 1: The admin invoice detail moves onto the shell

**Files:**
- Modify: `src/app/admin/invoices/[invoiceId]/invoice-detail.tsx` (329 lines)
- Create: `src/app/admin/invoices/[invoiceId]/loading.tsx`
- Modify: `messages/el.json`, `messages/en.json`

**Interfaces:**
- Consumes: `DetailShell` from `@/components/shared/detail-shell` — props `backHref`, `backLabel`, `title`, `meta?`, `actions?`, `tabs?`, `children`. `DetailSkeleton` from `@/components/shared/detail-skeleton`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Replace the screen's own title with the shell**

The file owns an `<h1>` at line 134 and has no back-link and no tabs. Wrap its body in `DetailShell` with `backHref="/admin/finance?tab=invoices"`, the invoice number as `title`, the existing `StatusBadge` as `meta`, and the Preview/Download/Delete buttons as `actions`. Pass **no** `tabs` — this screen has none and must not grow any.

Delete the `<h1>`. It is one of the three `HEADING_PENDING` entries this slice must clear.

- [ ] **Step 2: Translate the five English strings**

| line | string | key |
|---|---|---|
| 140 | `Preview` | `invoices.preview` |
| 144 | `Download` | `invoices.download` |
| 99, 108 | `'PDF not loaded yet'` | `invoices.pdfNotReady` |
| 303 | `` `{invoice.invoice_number} — Preview` `` | `invoices.previewTitle` with the number interpolated |
| 310 | `title="Invoice Preview"` | `invoices.previewFrameTitle` |

Add all five to **both** catalogues. Greek first — the product's default locale is `el`.

- [ ] **Step 3: Leave the line-items table exactly as it is**

It is `TABLE_DETAIL_EXEMPT` by Ruling B. Do not touch it, do not move it to `DataTable`.

- [ ] **Step 4: Add the loading state**

`loading.tsx` rendering `DetailSkeleton`, matching `src/app/admin/projects/[projectId]/loading.tsx`. Read that file and follow it.

- [ ] **Step 5: Verify**

`pnpm type-check` clean. `node scripts/check-design.mjs` still `ok`. `pnpm lint` at baseline (`✖ 30 problems (0 errors, 30 warnings)`). Confirm by grep that `deleteInvoice` and `updateInvoiceStatus` call sites are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/invoices/[invoiceId] messages/el.json messages/en.json
git commit -m "feat(design): the admin invoice detail wears the shell and speaks Greek"
```

---

### Task 2: The invoice is fetched once per request

**Files:**
- Modify: `src/lib/actions/invoices.ts` (`getInvoice`, line ~64)
- Modify: `src/app/admin/invoices/[invoiceId]/page.tsx`

**Interfaces:**
- Consumes: `cache` from `react`, the pattern established in `src/lib/auth-helpers.ts` (`requireUser` is `cache()`-wrapped) and `src/lib/queries/client-portal.ts`.
- Produces: `getInvoice` becomes request-deduplicated for every caller, not only this route.

- [ ] **Step 1: Prove the double fetch before changing anything**

`page.tsx:15` calls `getInvoice(invoiceId)` inside `generateMetadata`; `page.tsx:28` calls it again for the body. `getInvoice` is a plain `async function` — nothing dedupes it. Confirm both call sites by reading the file, and confirm no other caller depends on `getInvoice` being uncached.

- [ ] **Step 2: Wrap it**

Wrap `getInvoice` in `cache()` from `react`, the same way `requireUser` is wrapped. Do **not** restructure the route to fetch once and thread the result — the issue explicitly asks for the caching helper rather than a restructure, and `generateMetadata` cannot receive a value from the body.

- [ ] **Step 3: Prove it deduped**

Add a temporary `console.count('getInvoice')` inside the function, load an admin invoice page in `pnpm dev`, and confirm the count reads 1 rather than 2 for a single request. Remove the instrumentation. Report the observed counts before and after.

- [ ] **Step 4: Verify and commit**

`pnpm type-check`, `pnpm test:unit`, `node scripts/check-design.mjs`.

```bash
git add src/lib/actions/invoices.ts
git commit -m "perf(invoices): one request, one round-trip for the same row"
```

---

### Task 3: The payment dialog joins the shared shell, and its green line finds a token

**Files:**
- Modify: `src/components/admin/invoices/payment-actions.tsx` (144 lines)
- Modify: `messages/el.json`, `messages/en.json` if any string there is untranslated

**Interfaces:**
- Consumes: `FormDialog` from `@/components/shared/form-dialog` — props `open`, `onOpenChange`, `title`, `description?`, `children`, `onSubmit`, `submitLabel`, `cancelLabel`, `submitting?`, `className?`.

- [ ] **Step 1: Move the "record manual payment" dialog into `FormDialog`**

Lines 98-141: a payment-method `Select` and a date `Input` with a single submit. This is the plain add/edit shape `FormDialog` exists for. The fields become `children`; the shell owns the footer, the spinner and the description.

Keep `paymentMethod` / `paymentDate` local state where it is. `FormDialog` does not own form state.

- [ ] **Step 2: The green line takes a tone**

Line 77 renders `text-green-600`. Replace with `text-tone-positive`. That is the token a "payment received" line means, and it carries both editions; `text-green-600` carries neither.

- [ ] **Step 3: Verify and commit**

`node scripts/check-design.mjs` — note this file is not yet colour-covered, so the guard will not catch a mistake here until Task 7. Grep the file yourself to confirm no raw colour remains.

```bash
git add src/components/admin/invoices/payment-actions.tsx messages/
git commit -m "feat(design): the payment dialog stops rebuilding the footer"
```

---

### Task 4: The client invoice detail stops being a worse copy of the admin one

**Files:**
- Modify: `src/components/client/invoices/invoice-detail.tsx` (237 lines)
- Modify: `src/app/client/invoices/[invoiceId]/page.tsx`
- Create: `src/app/client/invoices/[invoiceId]/loading.tsx`
- Modify: `messages/el.json`, `messages/en.json`

- [ ] **Step 1: Onto the shell**

Own `<h1>` at line 81 and own `router.back()` — both go. `DetailShell` with a `backHref` pointing at the real client invoices list (**verify the route before writing it**; do not point at a redirect stub).

This clears the third `→ #109` entry in `HEADING_PENDING`.

- [ ] **Step 2: Translate its four English strings**

Lines 91 (`Preview`), 95 (`Download`), 223 (`` `… — Preview` ``), 229 (`title="Invoice Preview"`). **Reuse the keys Task 1 added** — they are the same words on the same kind of screen. Do not create a second set under a client namespace.

- [ ] **Step 3: Currency comes from the shared formatter**

The file hand-writes `€{...toFixed(2)}`. The admin twin already uses `formatCurrency` from `@/lib/format`. Use it here too. Confirm the rendered output is character-for-character what it was, and say so — a currency format change is a visible change and this slice does not make visible changes.

- [ ] **Step 4: The route uses the shared auth helper**

`page.tsx` calls `supabase.auth.getUser()` directly rather than `requireUser()` from `@/lib/auth-helpers`. Switch it.

**This is the one security-adjacent edit in the slice.** The unauthenticated and wrong-client outcomes must be identical before and after — same redirect or `notFound()`, same status. Read `requireUser`'s return shape before writing, prove both paths, and state in your report exactly what happens now for: no session, a session belonging to another client, and a missing invoice.

- [ ] **Step 5: Loading state, verify, commit**

```bash
git add src/app/client/invoices src/components/client/invoices messages/
git commit -m "feat(design): the client invoice detail catches up with its admin twin"
```

---

### Task 5: The lead's tabs move into the URL

**Files:**
- Modify: `src/components/admin/leads/lead-detail.tsx` (254 lines)
- Modify: `src/app/admin/leads/[leadId]/page.tsx` (47 lines)
- Create: `src/app/admin/leads/[leadId]/loading.tsx`

- [ ] **Step 1: The page learns to read a tab**

`page.tsx` currently renders the shared `PageHeading` directly and has no `searchParams` handling at all. In Next.js 16 `searchParams` is a `Promise` — `await` it. Read `src/app/admin/projects/[projectId]/page.tsx` for the established shape and follow it exactly.

- [ ] **Step 2: `DetailShell` replaces `PageHeading` plus radix `Tabs`**

Two tabs, `info` and `activities`, with `basePath` `/admin/leads/{leadId}` and `active` from the URL. Delete the radix `Tabs`/`TabsList`/`TabsContent` implementation at lines 90-96.

The lead has **no back-link today**. `DetailShell` requires one: `/admin/clients?tab=interest`, which is where the leads list actually lives.

- [ ] **Step 3: The mailto link takes a token**

Line 111 renders `text-blue-600`. This is a link, not a status: use the same treatment other links in migrated screens use — read one first, and match it rather than inventing a value.

- [ ] **Step 4: The activity timeline stays a timeline**

It is a laid-out `<div>` list, correctly so. Do not move it to `DataTable`.

- [ ] **Step 5: Loading state, verify, commit**

Confirm `updateLead` and its `revalidatePath` are untouched.

```bash
git add src/app/admin/leads src/components/admin/leads/lead-detail.tsx
git commit -m "feat(design): a lead's tab survives a refresh"
```

---

### Task 6: The filming request moves onto the shell

**Files:**
- Modify: `src/components/shared/form-dialog.tsx`
- Modify: `src/components/admin/filming-requests/filming-request-detail.tsx` (496 lines — the largest)
- Create: `src/app/admin/filming-requests/[requestId]/loading.tsx`

- [ ] **Step 1: `FormDialog` gains `submitVariant`** (Ruling A)

```tsx
/** Όταν η υποβολή καταστρέφει κάτι. Το κέλυφος δεν αλλάζει, η σημασία αλλάζει. */
submitVariant?: 'default' | 'destructive';
```

Default `'default'`; pass it to the submit `Button`'s `variant`. Nothing else about the shell changes. Extend the file's doc comment to say why this one prop was allowed in, so the next reader does not read it as the start of a slide.

- [ ] **Step 2: The review dialog moves in**

Lines 447-482. Title, description, submit label **and** submit variant all switch on `reviewStatus` — keep every one of those ternaries at the call site, where they already are. The shell only receives their results.

- [ ] **Step 3: The shell replaces the own back-link and own title**

Lines 159-164. `backHref="/admin/productions?tab=requests"` (Ruling D — `router.back()` goes). No tabs: this screen is one scrolling stack of cards and stays one.

This clears the second `→ #109` entry in `HEADING_PENDING`.

- [ ] **Step 4: Do not move the availability effect**

Lines 61-75 fire one `fetch('/api/calendar/availability?date=…')` per preferred date from a `useEffect` keyed on `request.preferred_dates`. It is **not** tied to any tab or visibility state. Since Step 3 adds no tabs there is nothing to break — but do not restructure it, do not memoise it, do not move it below a conditional render. State in your report that it is untouched.

- [ ] **Step 5: The loading state**

`src/app/admin/filming-requests/[requestId]/loading.tsx` rendering `DetailSkeleton`, following `src/app/admin/projects/[projectId]/loading.tsx`. This is the fourth and last of the routes the issue says has none.

- [ ] **Step 6: The conversion flow is not touched**

`handleConvertToProject` and `handleApproveHold` call `router.push('/admin/projects/${result.data!.id}')` **inside the success branch only** (lines 106, 129). Restructuring dialog or loading state must not move those calls. Diff the four handlers against `git show HEAD` and confirm only JSX changed.

- [ ] **Step 7: Verify and commit**

```bash
git add src/components/shared/form-dialog.tsx src/components/admin/filming-requests src/app/admin/filming-requests
git commit -m "feat(design): the filming request wears the shell, and the shared dialog learns one word"
```

---

### Task 7: Lock the four folders in

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

- [ ] **Step 1: Cover the folders**

Add to `COVERED`:

```js
  'src/app/admin/invoices',
  'src/app/admin/leads',
  'src/app/admin/filming-requests',
  'src/components/admin/invoices',
  'src/components/admin/leads',
```

Run the guard. Every file Tasks 1-6 cleaned should pass. **Anything else that trips is a real finding** — report it before touching it.

`src/components/admin/leads/sales-report.tsx` will trip: it holds `CHART_COLORS` hex values plus `text-green-600` / `text-red-600`. It is already in `TABLE_PENDING` as a reporting surface for a later slice. Give it a colour `PENDING` entry with that same, true reason. **Do not write that its colours cannot be tokens** — `--chart-1` through `--chart-5` already exist in `globals.css`. The reason is scope, not impossibility.

- [ ] **Step 2: Clear the three heading debts**

Remove from `HEADING_PENDING`:
- `src/app/admin/invoices/[invoiceId]/invoice-detail.tsx`
- `src/components/admin/filming-requests/filming-request-detail.tsx`
- `src/components/client/invoices/invoice-detail.tsx`

Only `src/app/book/page.tsx` remains. The staleness check fails the build if you forget, and fails it again if you remove one whose `<h1>` is still there.

- [ ] **Step 3: Settle the two invoice tables** (Ruling B)

Move `src/components/client/invoices/invoice-detail.tsx` from `TABLE_PENDING` to `TABLE_DETAIL_EXEMPT`. Rewrite the admin entry's comment so the two sit under one rationale, and drop the "redesigned in #109 anyway" clause — this **is** #109.

- [ ] **Step 4: Prove the rules bite, three negative tests, exact output for each**

1. `className="text-red-600"` in `src/components/admin/leads/lead-detail.tsx` → non-zero, names file and line. Revert, confirm green.
2. A second `<PageHeading>` in `src/app/admin/invoices/[invoiceId]/invoice-detail.tsx` → non-zero. Revert, confirm green.
3. A colour behind a Tailwind underscore — `className="shadow-[0_0_8px_rgba(1,2,3,0.4)]"` — in a newly covered file → non-zero. Revert, confirm green.

Then a fourth, specific to Ruling B: put a real raw `<table>` into a file that is `TABLE_DETAIL_EXEMPT` and confirm the guard **does** still catch its colours even though its table is exempt. An exemption must exempt one rule, not all of them. If it exempts more than the table rule, that is a finding — stop and report it.

Do not commit any temporary edit.

- [ ] **Step 5: Extend `e2e/design-identity.spec.ts`**

A `design identity — detail folders` block. Every test starts with `test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database')`, asserts its URL first, and reaches the record by navigating rather than by a hardcoded id.

| route | what it proves |
|---|---|
| an admin invoice, reached from `/admin/finance?tab=invoices` | exactly one `[data-slot="page-heading"]`; the back-link resolves to the finance hub |
| a lead, reached from `/admin/clients?tab=interest`, with `?tab=activities` | the activities tab is selected from the URL, not reset |
| a filming request, reached from `/admin/productions?tab=requests` | one page heading; the review dialog opens |

**No test completes the review dialog, approves, rejects or converts.** Those write records, and this suite has no fixtures and no teardown (see #119). Opening the dialog is the assertion; closing it is the cleanup. Say in your report that you stopped there and why.

- [ ] **Step 6: Full verification**

`pnpm type-check` clean. `pnpm lint` at baseline. `pnpm test:unit` all pass. `pnpm exec playwright test e2e/design-identity.spec.ts --list` lists the new tests. `pnpm build` succeeds with both guards `ok` — paste the guard's success line verbatim.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts
git commit -m "test(design): the detail folders are guarded, and three heading debts are paid"
```
