# Employee and Salesman adopt the language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The employee and salesman areas stop carrying their own palette, their own status colours and their own English strings, so the product stops feeling like three systems.

**Architecture:** No new abstractions. Both areas adopt parts that already exist — `StatusBadge`, `StatGrid`, `FormDialog`, the tone tokens — and where the admin area has already answered a question (how a lead stage is rendered, how a lead source is rendered), the salesman area adopts that answer rather than inventing a second one.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 `@theme inline` token layer, next-intl 4.8 (default `el`), `scripts/check-design.mjs`.

**Spec:** GitHub issue #110, under PRD #100. Inventory: `.superpowers/sdd/2026-08-27-employee-salesman/inventory.md`.

---

## Global Constraints

- **Nothing renders a raw colour.** No hex, no `rgb()/rgba()/hsl()/oklch()`, no Tailwind colour class (`bg-amber-500`, `text-red-600`, …). Colour comes from the token layer in `src/app/globals.css` or from a shared part that reads it.
- **Status takes its tone from `statusTone()`**, via `StatusBadge` / `ToneChip` / `ToneIcon`. `statusTone()` takes the **raw database value**, never a translated label — a Greek string silently returns `neutral`.
- **`TONE_RULES` in `src/lib/status-tone.ts` is not edited by this slice.** Changing it changes every area at once; that is not this slice's licence.
- **No user-visible English string** survives in a file this slice touches. Both catalogues (`messages/el.json`, `messages/en.json`) carry identical key trees.
- **What either role sees, and in what order, is unchanged.** Colour and tone are this slice's subject and do change; *content and order* do not. Any change beyond colour is named explicitly in the task and in the PR.
- **The salesman handbook's content is out of scope** — `src/components/salesman/handbook/sales-handbook.tsx` lines 87–1400, the nine `*Tab()` functions. Its chrome is in scope.
- After every task: `pnpm build` (which runs both guards), and the task's own verification.

---

## Rulings made before execution

The issue's nine claims were checked against the code first. Four rulings follow from what that found; they bind every task.

**Ruling A — no list becomes a table.** The issue asks that "every list renders through the shared table". There is no table in either area: not one `<table>` tag, not one `DataTable` import, in any of the four trees. Every list is a card grid or a kanban board. Converting them would change what each role sees and in what order, which the issue's own last criterion forbids. The areas instead join `TABLE_GUARDED_AREAS`, so a hand-rolled table can never appear there in future. **This produces zero detections today, and that is the honest result** — the inventory's claim that every list would need a `TABLE_PENDING_UNDETECTABLE` entry is wrong: that list is for tables that have not migrated yet, and a card grid is not an unmigrated table.

**Ruling B — the salesman adopts the admin's answer, not a new one.** `src/components/admin/leads/all-leads-table.tsx` already renders lead **stage** as `<StatusBadge status={...} />` and lead **source** as a plain label with no colour. The salesman side does the same. This deletes `stageColors` (14 tokens), `sourceColors` (21 tokens) and the local stage map in `pipeline-summary.tsx` (10 tokens) **without inventing a single new CSS token** — and it is what "stops feeling like three systems" actually means.

**Ruling C — the kanban columns lose their pastel tints.** This is the slice's one visible change beyond colour-for-colour substitution, and it is stated here so it is a decision and not a side effect. Seven pastel column backgrounds become the surface tokens; each column is named by its heading and its count, which is what identifies it. Editorial Noir is a restrained palette and seven pastels are precisely what it replaces. Content and order of the cards are untouched.

**Ruling D — task priority goes through `statusTone()` unchanged.** `urgent` is already in the `critical` list and `high` is already in `caution`; `medium`/`low` fall through to `neutral`. The three independent, differently-valued `priorityColorMap` objects are deleted and replaced by `StatusBadge`, with no edit to `TONE_RULES`. Two of the three screens will change colour slightly, because they disagreed with each other before — that disagreement is the defect.

**Ruling E — the two dead breadcrumb files are deleted.** `src/components/employee/breadcrumbs.tsx` and `src/components/salesman/breadcrumbs.tsx` are imported nowhere (verified by grep for every import shape). Left in place, they would have to be translated and de-coloured purely to satisfy a guard that is about to cover their folders. A third, `src/components/admin/breadcrumbs.tsx`, is equally dead but sits outside this slice — it is left alone and reported.

---

## File structure

New:
- `src/lib/format.ts` gains `formatDate(value, opts?)` — one locale-aware date formatter, replacing the hardcoded `'en-US'` calls in touched files.
- `messages/{el,en}.json` gain `employee.settings`, `employee.knowledge`, `salesman.settings`, `salesman.leads`, `salesman.resources` keys as needed.

Modified: roughly 25 files across `src/app/employee`, `src/components/employee`, `src/app/salesman`, `src/components/salesman`, plus `src/app/globals.css`, `scripts/check-design.mjs`, and `e2e/design-identity.spec.ts`.

Deleted: the two dead breadcrumb files (Ruling E).

---

### Task 1: One lift treatment, in one place

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/employee/university/university-browse.tsx`, `src/components/employee/tasks/my-task-card.tsx`, `src/components/employee/projects/project-list.tsx`, `src/app/salesman/resources/resources-page.tsx`

**Interfaces:**
- Produces: a utility class (name it `lift-on-hover`) defined once in `globals.css`, reading the primary token. Later tasks use it and never re-declare the shadow.

The string `hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)]` appears **verbatim in four files**. `rgba(234,179,8,…)` is the amber that the token layer already owns as `--primary`.

- [ ] **Step 1:** Add the utility to `globals.css`, next to the other utilities, expressing the shadow through `color-mix()` over `var(--primary)` so it follows the token in both editions. Include the `-translate-y-0.5` lift and a `prefers-reduced-motion` guard that drops the transform.
- [ ] **Step 2:** Replace the four verbatim copies with the class. Do not change any other class on those elements.
- [ ] **Step 3:** `node scripts/check-design.mjs` — still `ok` (these files are not covered yet; this step only proves nothing broke).
- [ ] **Step 4:** `pnpm build`.
- [ ] **Step 5:** Commit.

---

### Task 2: Priority stops being painted three times

**Files:**
- Modify: `src/components/employee/tasks/my-task-card.tsx`, `src/components/employee/tasks/task-detail.tsx`, `src/components/employee/projects/project-detail.tsx`

Three independent `priorityColorMap` / `priorityBgMap` objects, with different colour choices for the same four priorities.

- [ ] **Step 1: Read what the three screens show today, before changing anything.** Note for each whether the priority *word* on screen comes from a translation, from a label map, or from the raw value. `StatusBadge` builds its label from the raw database value and therefore speaks English (issue #120). **If any of the three currently shows a translated word, replacing it with `StatusBadge` would put English on screen where Greek was — that is a regression, not a migration. If you find that, stop and report it rather than shipping it.** In that case the colour still moves to the tone layer, but the label stays as it is.
- [ ] **Step 2:** Delete all three maps. Take the colour from the tone layer, passing the **raw** priority value, never a translated label (Ruling D and the resolver's own doc comment).
- [ ] **Step 3:** Confirm by reading `src/lib/status-tone.ts` that `urgent` → critical and `high` → caution already hold. Do not edit `TONE_RULES`.
- [ ] **Step 3:** Remove the now-unused imports.
- [ ] **Step 4:** `pnpm build`, `pnpm type-check`.
- [ ] **Step 5:** Commit.

---

### Task 3: The employee dashboard widgets adopt the tokens

**Files:**
- Modify: `src/components/employee/dashboard/my-projects-widget.tsx`, `overdue-tasks.tsx`, `today-tasks.tsx`, `upcoming-tasks.tsx`

Raw amber/red/blue accent and hover classes throughout. `overdue-tasks.tsx` additionally paints its own red.

- [ ] **Step 1:** Accent and hover colours → the primary/border/surface tokens.
- [ ] **Step 2:** In `overdue-tasks.tsx`, everything that means "this is overdue" goes through the tone layer — `overdue` is already in the `critical` list, so `StatusBadge`/`ToneIcon` gives the same meaning with no bespoke red.
- [ ] **Step 3:** `pnpm build`.
- [ ] **Step 4:** Commit.

---

### Task 4: The employee lists adopt the tokens, and dates stop being American

**Files:**
- Modify: `src/lib/format.ts` — add `formatDate`
- Modify: `src/components/employee/tasks/my-task-card.tsx`, `src/components/employee/tasks/my-task-list.tsx`, `src/components/employee/tasks/task-detail.tsx`, `src/components/employee/projects/project-list.tsx`, `src/components/employee/projects/project-detail.tsx`, `src/app/employee/work/deliverables-index.tsx`

- [ ] **Step 1:** Add `formatDate` to `src/lib/format.ts`, built on `Intl.DateTimeFormat('el-GR')`, cached the same way `eurFormatter` is. Export it; do not duplicate the pattern elsewhere.
- [ ] **Step 2:** Replace every `.toLocaleDateString('en-US', …)` in the files above with `formatDate`. **This is a visible change** — month and weekday names appear in Greek where they appeared in English. It is a correctness fix in a Greek-default product; record it in the report so it reaches the PR.
- [ ] **Step 3:** Remaining raw colours in these files (`bg-amber-500/70`, `shadow-[0_0_8px_rgba(234,179,8,0.4)]`, `bg-gray-100`, `text-red-600`, the progress bar) → tokens and the tone layer.
- [ ] **Step 4:** `pnpm build`, `pnpm type-check`.
- [ ] **Step 5:** Commit.

---

### Task 5: The employee knowledge hub speaks Greek

**Files:**
- Modify: `src/app/employee/knowledge/page.tsx`, `src/app/employee/university/[categorySlug]/page.tsx`, `src/app/employee/university/[categorySlug]/[articleSlug]/page.tsx`, `src/components/employee/university/university-browse.tsx`
- Modify: `messages/el.json`, `messages/en.json`

Hardcoded: `"DMS University"` (twice — hub title and article breadcrumb), `"Browse knowledge base articles and learn about DMS"`, `"No content available"`, `"The knowledge base is being set up. Check back soon!"`.

- [ ] **Step 1:** Add the keys under an `employee.knowledge` namespace to **both** catalogues, with identical key trees. Check whether an equivalent admin key already exists and reuse it rather than shipping the same words twice.
- [ ] **Step 2:** Replace the literals with `useTranslations`/`getTranslations` as the file's server/client nature requires.
- [ ] **Step 3:** Remaining raw colours in `university-browse.tsx` (`bg-amber-500/10` icon tile, `text-amber-500`) → tokens. The lift shadow is already gone from Task 1.
- [ ] **Step 4:** Verify both catalogues parse and have matching key trees.
- [ ] **Step 5:** `pnpm build`. Commit.

---

### Task 6: Both settings pages speak Greek

**Files:**
- Modify: `src/app/employee/settings/page.tsx`, `src/app/salesman/settings/page.tsx`
- Modify: `messages/el.json`, `messages/en.json`

These two files are **byte-identical** and neither imports next-intl at all — the only pages in either tree that do not. Hardcoded: `"Settings"`, `"Manage your account settings and preferences"`, `"Profile"`, `"Notifications"`, `"Security"`.

The issue never mentions Settings. It is in scope because the code says so.

- [ ] **Step 1:** Look for existing settings keys used by the admin or client settings pages and **reuse them**; add new ones only for what genuinely has no home.
- [ ] **Step 2:** Translate both files identically.
- [ ] **Step 3:** `pnpm build`. Commit.

---

### Task 7: The salesman dashboard drops its stage palette

**Files:**
- Modify: `src/components/salesman/dashboard/pipeline-summary.tsx`, `today-followups.tsx`, `recent-activity.tsx`
- Modify: `src/components/salesman/leads/lead-activity-feed.tsx`

The guard's own comment (`scripts/check-design.mjs`, near the `COVERED` stat-grid entries) already names `pipeline-summary.tsx` as an exception owed to this slice — remove that comment as part of the task.

- [ ] **Step 1:** "Pipeline by Stage" (the hand-rolled `grid` below the `StatGrid`) — delete `STAGE_COLORS` and render each stage's figure through the shared parts. Per Ruling B, the stage is named by its label, not by a colour of its own.
- [ ] **Step 2:** `recent-activity.tsx` and `lead-activity-feed.tsx` hold **two independent, differently-valued copies** of an activity-type style map. Delete both. If activity type still needs visual distinction, it gets it from one shared map that both import — one map, one set of values, and no raw colour in it.
- [ ] **Step 3:** `today-followups.tsx` accent colours → tokens.
- [ ] **Step 4:** Update the guard comment that named this file as pending.
- [ ] **Step 5:** `pnpm build`. Commit.

---

### Task 8: The salesman lead screens adopt the admin's answers

**Files:**
- Modify: `src/components/salesman/leads/lead-detail.tsx`, `lead-card.tsx`, `lead-column.tsx`, `lead-pipeline.tsx`
- Modify: `src/app/salesman/leads/[leadId]/page.tsx`, `src/app/salesman/leads/[leadId]/edit/page.tsx`
- Modify: `messages/el.json`, `messages/en.json`

Read `src/components/admin/leads/all-leads-table.tsx` first — it is the reference implementation for both questions this task answers.

- [ ] **Step 1:** Lead **stage** → `<StatusBadge status={lead.stage} />`, raw value, exactly as admin does. Delete `stageColors` from `lead-column.tsx`.
- [ ] **Step 2:** Lead **source** → the plain label `LEAD_SOURCE_LABELS[...]` with no colour, exactly as admin does. Delete `sourceColors` from `lead-card.tsx`.
- [ ] **Step 3:** Kanban columns → surface and border tokens (Ruling C). The card content and the card order do not change.
- [ ] **Step 4:** Remaining raw colours in `lead-detail.tsx` (`text-green-600`, the red warning block) → the tone layer.
- [ ] **Step 5:** Translate `"Back to Pipeline"`, `"Edit Lead"`, `"Back to Lead"` and the `` `Edit details for ${...}` `` template. Both catalogues.
- [ ] **Step 6:** `pnpm build`, `pnpm type-check`. Commit.

---

### Task 9: The two salesman dialogs move onto the shared form dialog

**Files:**
- Modify: `src/components/salesman/leads/lead-activity-form.tsx`, `src/components/salesman/leads/lead-convert-dialog.tsx`

Both hand-roll `Dialog`/`DialogContent`/`DialogHeader`. `FormDialog` is imported nowhere in either tree today.

- [ ] **Step 1:** Read `src/components/shared/form-dialog.tsx` including its doc comment. It gained exactly one prop in the previous slice and the comment says a second should prompt a rethink rather than another prop — **if either dialog seems to need a new prop, stop and report it instead of adding one.**
- [ ] **Step 2:** Move both onto `FormDialog`. The submit actions (`createLeadActivity`, `convertLeadToClient`) and their arguments do not change.
- [ ] **Step 3:** Verify by reading that the success and error paths still behave the same, including what closes the dialog.
- [ ] **Step 4:** `pnpm build`, `pnpm type-check`. Commit.

---

### Task 10: The salesman resources adopt the tokens and speak Greek

**Files:**
- Modify: `src/app/salesman/resources/resources-page.tsx`, `src/app/salesman/resources/[categoryId]/page.tsx`, `src/components/salesman/resources/resource-download-button.tsx`
- Modify: `messages/el.json`, `messages/en.json`

- [ ] **Step 1:** `resource-download-button.tsx` hardcodes `"Loading..."` and `"Download"` — translate both.
- [ ] **Step 2:** Remaining raw colours (`bg-amber-500/10`, `text-amber-500`) → tokens. The lift is already gone from Task 1.
- [ ] **Step 3:** `pnpm build`. Commit.

---

### Task 11: The handbook's chrome adopts the language, its content is untouched

**Files:**
- Modify: `src/components/salesman/handbook/sales-handbook.tsx` — **lines 1–86 and 1404–1506 only**

- [ ] **Step 1:** `CopyButton` (lines ~1–60): translate the `'Copy'` fallback label; hover colours → tokens.
- [ ] **Step 2:** `SectionHeader` (lines ~62–82): the `bg-amber-500/10` icon tile and `text-amber-500` icon → tokens. This helper is used by all nine tab bodies, so this single edit re-tones the whole handbook without touching a word of its content.
- [ ] **Step 3:** The nine `TabsTrigger`s in `export function SalesHandbook()` each carry their own copy of `data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400`. Replace all nine with the token equivalent, ideally expressed once.
- [ ] **Step 4:** **Verify by diff that no line between 87 and 1400 changed.** `git diff` on this file must show hunks only outside that range. If a content line moved because line numbers shifted, that is fine; if a content line's *text* changed, revert it.
- [ ] **Step 5:** `pnpm build`. Commit.

---

### Task 12: The guard covers both areas

**Files:**
- Modify: `scripts/check-design.mjs`
- Delete: `src/components/employee/breadcrumbs.tsx`, `src/components/salesman/breadcrumbs.tsx`

This is the task that makes the eleven before it stay true.

- [ ] **Step 1:** Delete the two dead breadcrumb files (Ruling E). Verify by grep that nothing imports them, in any import shape, before deleting.
- [ ] **Step 2:** Add to `COVERED`: `src/app/employee`, `src/components/employee`, `src/app/salesman`, `src/components/salesman`. Add a comment naming the slice, in the style of the entries above it.
- [ ] **Step 3:** Add the same four prefixes (with trailing `/`) to `TABLE_GUARDED_AREAS`. **Write in the comment that this produces zero detections today because neither area has ever had a table**, so the next reader knows the entry is forward-looking and not a claim about work done (Ruling A).
- [ ] **Step 4:** Add one `PENDING` entry for `src/components/salesman/handbook/sales-handbook.tsx` listing the **exact, complete multiset** of raw colours remaining inside its content region. **Do not hand-count — make the guard tell you.** Add the entry first with a deliberately wrong `colours` list (e.g. `['x']`); the guard then fails with `changedPendingDebt`, which prints the exact `found` multiset it computed. Paste that list in verbatim and re-run. The reason on the entry is the issue's own carve-out: this is business copy, not chrome, and #111 must decide its fate.
- [ ] **Step 5:** Run `node scripts/check-design.mjs`. Expect `ok`, with the covered-file count risen from 184 and the table-guarded count risen from 166.
- [ ] **Step 6: The negative test — this step is the task.** For each of the three new protections, inject a violation, run the guard, confirm it **fails**, then restore:
  - a raw colour (e.g. `text-red-500`) in a newly covered employee file, and again in a newly covered salesman file;
  - a `<table>` tag in a newly covered file;
  - a single extra colour added to the handbook's content region, proving the `PENDING` multiset rejects it;
  - and one colour in the handbook's content region **swapped for a different one**, proving the multiset is compared by name and not by count.
  Report the exact command and output for each. A protection that was not made to fail was not tested.
- [ ] **Step 7:** `git status --short` must show no leftover injected changes. `pnpm build`. Commit.

---

### Task 13: Playwright covers both roles

**Files:**
- Modify: `e2e/design-identity.spec.ts`

The existing spec already visits `/employee/work`, `/salesman/library` and `/salesman/library?tab=handbook` for headings, and `/employee/today`, `/salesman/today` for stat cards. Every one of them is `test.skip`'d without `E2E_TEST_USERS_READY`.

- [ ] **Step 1:** Extend the spec for both roles: the lists render, exactly one heading per page, and a salesman create flow opens the shared dialog.
- [ ] **Step 2:** Keep the existing skip guard. **Do not claim these tests protect anything** — they are skipped in this environment (issue #119). Say so in the report.
- [ ] **Step 3:** `pnpm build`. Commit.

---

## Self-review notes

- Every acceptance criterion in #110 maps to a task, except the table criterion, which Ruling A refuses with its reason stated.
- Claim 1 of the issue (bespoke employee dashboard figure cards) is refuted: `task-stats.tsx` was migrated in an earlier slice and is already `COVERED`. The pattern the issue describes is real but lives in the knowledge and resources hubs — Tasks 1, 5 and 10.
- Claim 8 (heading count) is refuted: the heading check already walks all of `src`, and this scope already passes it. No task is needed and none is written.
- Scope found by reading and not named by the issue: both settings pages (Task 6), the download button (Task 10), the duplicated activity map (Task 7), the `en-US` dates (Task 4), the dead breadcrumbs (Task 12).
