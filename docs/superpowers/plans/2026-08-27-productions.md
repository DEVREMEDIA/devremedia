# Productions Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The area with the most hand-written colour in the product stops writing its own, and the shared form dialog is finally born — against the four consumers that actually fit it.

**Architecture:** A `FormDialog` shell wraps the react-hook-form + zod pattern the product already uses, and four dialogs adopt it. Eight independent status/priority colour systems collapse into `statusTone()`. Two lists that were tables wearing list clothes become the shared table. The calendar view itself is untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, next-intl, react-hook-form + zod, TanStack Table 8, FullCalendar, Playwright.

**Spec:** DEVREMEDIA/devremedia#108 (parent PRD #100). Inventory: `.superpowers/sdd/108-productions-inventory.md`.

## Global Constraints

- Touch only the files each task names. Nothing else may appear in a commit.
- Never stage `.npmrc` or `.env.local` — local Windows build workarounds, they stay untracked.
- Never commit `design-explorations/`, `patches/`, `tzeni/`, `.sandcastle/`, `.gitnexus/`, `src/app/dev/prototype-ia/`.
- **What each tab shows, and in what order, does not change.** Filtering, searching, sorting, creation and both filming-request conversion flows behave exactly as before.
- **The calendar view is not touched.** FullCalendar, its `dynamic(ssr:false)` mount, and its interaction stay exactly as they are. Only the chrome around it, its figures and its dialogs are in scope.
- `messages/en.json` and `messages/el.json` end with identical key trees and equal counts. Baseline: `2459 2459 [] []`.
- No `any`, no `@ts-ignore`, no `as` assertions without validation.
- Verification per task: `pnpm type-check` clean, `pnpm lint` `✖ 30 problems (0 errors, 30 warnings)`, `pnpm build` succeeds with both guard scripts printing `ok`.
- `src/middleware.ts`, `src/components/landing/` and `src/lib/` stay untouched unless a task names them.

## The tones this area resolves to

Verified against the real resolver before writing this plan, so no task has to guess:

| status / priority | tone |
|---|---|
| `urgent` | critical |
| `high` | caution |
| `medium`, `low` | **neutral** |
| `briefing`, `pre_production`, `filming`, `editing`, `archived` | **neutral** |
| `review`, `pending_review`, `revision_requested` | caution |
| `delivered`, `approved`, `final` | positive |

`medium` and `low` losing their amber and blue is deliberate and is the same ruling slice #105 made when the blue in-flight states became neutral: a middling priority is not an alarm, and the four-tone system says so.

---

### Task 1: The shared form dialog, born against what actually fits it

**Files:**
- Create: `src/components/shared/form-dialog.tsx`

**Interfaces:**
- Produces: `FormDialog`, consumed by Tasks 3, 4 and 5.

**Context:** slice #105's issue claimed this component would be born in the Clients area. That area turned out to have no add/edit dialogs at all — creating a client, a proposal and a contract are *pages* — so it was deferred rather than designed against nothing. Productions is where it belongs: it holds 10 of the 26 bespoke dialogs in the entire admin app, against Settings' one.

**What it deliberately does NOT swallow, and why.** The issue's criterion says *every* add/edit dialog in the area renders through it. Eleven dialogs were inventoried and they are not one thing:

- **The two multi-step wizards stay bespoke.** `ContractCreator` (487 lines, its own step state) and the invoice upload flow (a `Sheet` whose width changes from `sm:max-w-lg` to `sm:max-w-5xl` between steps, because the review step renders a side-by-side PDF preview). A shell that swallows those owns steps, panes and width — at which point it is not a form dialog, it is a modal framework with a prop for everything.
- **A picker is not a form.** `equipment-catalog-dialog.tsx` is a multi-select checklist with an Apply callback.
- **A view is not a form.** `event-dialog.tsx` is read-only with Edit and Delete buttons.
- **Two "confirm with a note" dialogs stay as they are.** Two consumers is below the rule of three this project follows; a third would earn the component.

That leaves **four real consumers**, which is above the threshold: the calendar event form (Task 5), the task add dialog (Task 3), the deliverable edit dialog and the video upload dialog (Task 4).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Τα πεδία. Το `<form>` και το υποσέλιδο τα δίνει το κέλυφος. */
  children: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel: string;
  /** Όσο τρέχει η υποβολή: κλειδώνει και τα δύο κουμπιά και το κλείσιμο. */
  submitting?: boolean;
  /** Πλάτος, όταν η προεπιλογή δεν φτάνει. */
  className?: string;
}

/**
 * Το κοινό κέλυφος ενός διαλόγου φόρμας: τίτλος, περιγραφή, τα πεδία, και ένα
 * υποσέλιδο που δεν ξαναγράφεται σε κάθε αρχείο.
 *
 * ΤΙ ΔΕΝ ΕΙΝΑΙ: δεν είναι wizard πολλών βημάτων, δεν είναι `Sheet` που αλλάζει
 * πλάτος ανά βήμα, δεν είναι επιλογέας, δεν είναι οθόνη ανάγνωσης. Αυτά
 * υπάρχουν στην περιοχή και μένουν όπως είναι — ένα κέλυφος που τα καταπίνει
 * όλα αποκτά ένα prop για το καθένα και παύει να είναι κέλυφος.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitting = false,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className={cn('max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          {children}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Read `src/components/ui/dialog.tsx` first and confirm every sub-component named above is exported from it under exactly that name. If one is not, report it rather than inventing an alias.

- [ ] **Step 2: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

Nothing renders it yet. Say exactly that in your report — a green build proves it compiles, nothing more.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/form-dialog.tsx
git commit -m "feat(design): the shared form dialog, born where the dialogs actually are"
```

---

### Task 2: The kanban board stops painting itself

**Files:**
- Modify: `src/components/admin/projects/project-column.tsx`
- Modify: `src/components/admin/projects/project-card.tsx`

**Context:** the single biggest colour bypass in the product. `project-column.tsx` carries **three parallel eight-entry maps** for the same `ProjectStatus` the resolver already models — `STATUS_ACCENT`, `STATUS_RING`, `STATUS_BG`, 24 raw tokens between them. `project-card.tsx` carries a **fourth and fifth**, `PRIORITY_BORDER` and `PRIORITY_DOT`, and renders the raw priority string with `capitalize` and no translation.

- [ ] **Step 1: The column headers take their tone from the resolver**

Delete all three maps. The column's accent, ring and background derive from one `statusTone(status)` call. Use the tone tokens: `text-tone-*`, `bg-tone-*-bg`, and `border-tone-*` where a ring or border is wanted.

Read the file first and preserve the geometry exactly — the drop-target highlight, the column width, the header layout and the dnd-kit wiring do not change. Only where the colour comes from changes.

If a visual role has no matching token (a ring at a specific opacity, say), use the tone colour with an opacity modifier — `border-tone-caution/40` — rather than reaching for a palette value.

- [ ] **Step 2: The card's priority stripe takes its tone from the resolver**

Delete `PRIORITY_BORDER` and `PRIORITY_DOT`. Both derive from `statusTone(project.priority)`.

**Note in your report what this changes:** `medium` was amber and `low` was blue; both resolve to neutral. That is deliberate and matches the ruling made in #105 — a middling priority is not an alarm.

- [ ] **Step 3: The priority stops being an untranslated English word**

`{project.priority}` with `capitalize` renders `Urgent` / `High` to a Greek user. Check `messages/el.json` for an existing priority label map — `PRIORITY_LABELS` in `src/lib/constants` is hardcoded English and is used by seventeen files outside this slice, so do **not** touch it. Look for a translated namespace (`statuses.priority` or similar). If one exists, use it. If none exists, add one to **both** catalogues with the four keys `urgent` / `high` / `medium` / `low`, and say so.

- [ ] **Step 4: Verify**

After the change this must return nothing:

```bash
grep -rnE "(text|bg|border|ring|fill|stroke|from|via|to)-(white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)(-[0-9]{2,3})?\b|#[0-9a-fA-F]{3,8}|rgba?\(" src/components/admin/projects/project-column.tsx src/components/admin/projects/project-card.tsx
```

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Catalogue key-tree check if you added keys:

```bash
node -e "const c=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?c(v,p+k+'.'):[p+k]);const el=c(require('./messages/el.json')),en=c(require('./messages/en.json'));const a=new Set(el),b=new Set(en);console.log(el.length,en.length,el.filter(k=>!b.has(k)),en.filter(k=>!a.has(k)))"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/projects/project-column.tsx src/components/admin/projects/project-card.tsx messages/en.json messages/el.json
git commit -m "feat(design): the board's five colour maps become one resolver"
```

---

### Task 3: The task checklist, which has four problems

**Files:**
- Modify: `src/components/admin/tasks/task-checklist.tsx`

**Interfaces:**
- Consumes: `FormDialog` from Task 1; `StatGrid`/`StatCard` from `@/components/shared/stat-grid` and `@/components/shared/stat-card`.

**Context:** 336 lines carrying a **third** independent priority-colour system (whose values disagree with the two Task 2 deleted), a four-tile figure row built from raw colours instead of `StatGrid`, an add dialog that manages its own open state with `useState` per field and no schema, and hardcoded strings in both English and Greek.

- [ ] **Step 1: The third priority map dies**

Delete `PRIORITY_STYLES`. Render the priority through `<ToneChip tone={statusTone(priority)}>` with the translated label — the same one Task 2 established. If Task 2 added a priority namespace, reuse it; do not add a second.

- [ ] **Step 2: The four tiles become a stat grid**

The row of four figures renders through `StatGrid` + `StatCard`. Read `src/components/admin/calendar/calendar-stats.tsx` for a correct example in this same area.

The tiles double as filters — clicking one filters the list. `StatCard` takes an `href`, not an `onClick`. If the filter is client state rather than a URL, keep the clickable behaviour by wrapping each `StatCard`, and say in your report how you did it. **Do not add an `onClick` prop to `StatCard`** — that is a shared component and this is one consumer.

- [ ] **Step 3: The add dialog adopts the shared shell**

Convert it to `FormDialog`. Two things change together:
- Its open state becomes controlled — it currently uses `DialogTrigger` inside itself. The trigger button moves out; the parent holds `open`.
- Its raw `useState`-per-field becomes react-hook-form + zod, matching the pattern used elsewhere in the product. If a task schema already exists in `src/lib/schemas/`, use it. If not, define the schema in this file — do **not** add a new file to `src/lib/schemas/` for one consumer without checking whether the shape already exists there.

The fields, their order, their validation messages and what the submit does stay the same.

- [ ] **Step 4: The strings get keys**

Every hardcoded string — the English label map and the literal JSX, and the Greek stat labels, which are just as hardcoded — goes through `useTranslations`. Add keys to **both** catalogues at the same path and in the same order. List every key you added, with both values, in your report.

- [ ] **Step 5: Verify**

The raw-colour grep from Task 2 Step 4, pointed at this file, must return nothing. `pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`. Run the catalogue key-tree check and paste the real output.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/tasks/task-checklist.tsx messages/en.json messages/el.json
git commit -m "feat(design): the task checklist stops inventing its own everything"
```

---

### Task 4: The deliverables dialogs adopt the shell

**Files:**
- Modify: `src/components/admin/deliverables/deliverable-list.tsx`
- Modify: `src/components/admin/deliverables/video-upload.tsx`
- Modify: `src/components/admin/deliverables/approval-actions.tsx`

**Interfaces:**
- Consumes: `FormDialog`.

**Context:** `deliverable-list.tsx` carries a hand-rolled `StatusBadge` reimplementation — a `STATUS_COLOR` map applied through `<Badge variant="outline">` — and an inline edit dialog with raw `useState` per field. `video-upload.tsx` manages its own open state through `DialogTrigger`. `approval-actions.tsx` holds a "request revision" dialog that collects one note.

- [ ] **Step 1: `STATUS_COLOR` dies**

Replace it with `<StatusBadge status={...} />`, or `<ToneChip tone={statusTone(...)}>` if the call site already has a translated label. The rule from #105 applies: **if a Greek label already exists, keep it** — `StatusBadge` derives English from the raw value, and using it where a translation exists trades Greek for English.

- [ ] **Step 2: The edit dialog and the upload dialog adopt `FormDialog`**

Both become controlled — `video-upload.tsx`'s `DialogTrigger` moves out to its parent. Their fields, validation and submit behaviour do not change.

- [ ] **Step 3: `approval-actions.tsx` keeps its dialog, loses its raw colours**

This one is a confirm-with-a-note, not a resource form, and it stays as it is structurally — that is a deliberate decision recorded in the plan. Only its colours move to tokens, if it has any.

- [ ] **Step 4: Verify**

Raw-colour grep across all three files returns nothing. `pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds. Catalogue check if you touched keys.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/deliverables/ messages/en.json messages/el.json
git commit -m "feat(design): the deliverables dialogs move into the shared shell"
```

---

### Task 5: The calendar's chrome, and its two maps that drifted apart

**Files:**
- Modify: `src/components/admin/calendar/calendar-view.tsx`
- Modify: `src/components/admin/calendar/upcoming-events.tsx`
- Modify: `src/components/admin/calendar/calendar-event-form.tsx`

**Context:** the same event-type→colour map exists in two files, and **they have already drifted**: `custom` is `hsl(280 60% 55%)` in one and `hsl(280 70% 50%)` in the other. That is not a hypothetical argument for sharing — it is the damage, already done, sitting in the repo.

**The calendar view itself does not change.** FullCalendar, its options, its `dynamic(ssr:false)` mount and every interaction stay exactly as they are. Only where the event colours come from changes.

- [ ] **Step 1: One map, one place**

FullCalendar needs real colour values, not Tailwind classes — it writes them into inline styles. So this map cannot become tone classes. Instead: **one exported map**, defined once, imported by both files. Put it beside the calendar components, not in `src/lib` — `src/lib` is not colour-guarded and a colour map there is exactly how the raw palette grows back.

Resolve the `custom` disagreement by picking one value and saying in your report which you kept and why.

- [ ] **Step 2: The event form adopts `FormDialog`**

`calendar-event-form.tsx` already uses react-hook-form + zod, so this is the cleanest of the four adoptions: the shell replaces its `Dialog`/`DialogHeader`/`DialogFooter` scaffolding, and its fields become `FormDialog`'s children. Its schema, its validation and its submit do not change.

It handles both add and edit in one component. `FormDialog` takes a `title` and a `submitLabel`, so the existing add/edit toggle keeps working by passing different strings — do not add a `mode` prop.

- [ ] **Step 3: Verify**

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`.

Confirm in your report that the calendar still mounts through `dynamic(ssr:false)` and that no FullCalendar option changed.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/calendar/
git commit -m "feat(design): the calendar's two colour maps had already drifted apart"
```

---

### Task 6: The filming requests, and a dialog that reinvented one we have

**Files:**
- Modify: `src/components/admin/filming-requests/filming-request-detail.tsx`
- Modify: `src/components/admin/dashboard/production/upcoming-deadlines-grouped.tsx`

**Context:** two opposite failures in one task. The detail screen writes inline green and red availability classes with no tone involved at all. The deadlines panel does the reverse — `<Badge variant="outline">{p.status}</Badge>`, the raw database status rendered untranslated in a neutral badge, with no tone at all.

The detail screen also holds a "Convert to Project" dialog with **zero fields** — a pure confirmation, hand-built out of `Dialog` primitives, reimplementing the `ConfirmDialog` this product already has.

**The conversion flow must not change.** There are two structurally distinct flows sharing this component — a legacy accept-then-convert, and a Hold approve/reject — and they share one terminal status. Read both end to end before touching anything, and confirm in your report that the server action called, the arguments passed and the revalidation are identical before and after.

- [ ] **Step 1: The availability indicator takes tokens**

Green becomes `tone-positive`, red becomes `tone-critical`, in the same geometry.

- [ ] **Step 2: The zero-field dialog becomes `ConfirmDialog`**

Its API is `confirmLabel` + `loading` + `destructive` — not `confirmText` / `isLoading`. A correct usage to copy: `src/components/admin/invoices/invoices-table-view.tsx`.

Converting to a project is not destructive, so do **not** pass `destructive`.

**The "Review" dialog in the same file stays as it is.** It collects a note, which `ConfirmDialog` does not do, and it is one of only two such dialogs in the area — below the threshold for a shared component. Leave it, and say you did.

- [ ] **Step 3: The bare badge takes a tone**

`<Badge variant="outline">{p.status}</Badge>` becomes `<StatusBadge status={p.status} />`, or `ToneChip` with a translated label if one is available at that call site.

- [ ] **Step 4: Verify**

Raw-colour grep across both files returns nothing. `pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/filming-requests/filming-request-detail.tsx src/components/admin/dashboard/production/upcoming-deadlines-grouped.tsx
git commit -m "feat(design): two opposite ways to get a status wrong, in one commit"
```

---

### Task 7: Two lists that were tables all along

**Files:**
- Modify: `src/components/admin/filming-requests/filming-requests-list.tsx`
- Modify: `src/components/admin/filming-prep/shot-list.tsx`

**Interfaces:**
- Consumes: `DataTable`.

**Context:** `filming-requests-list.tsx` is the Requests tab's content and renders a stack of `Card`s — but every card shows the **same five fields** in the same order: title, status badge, contact name and email, project type, created date, and a chevron. It is the same shape slice #105 found in the proposals list: a table wearing a list's clothes.

`shot-list.tsx` is the honest case — it imports the raw table primitives directly.

- [ ] **Step 1: `filming-requests-list.tsx` becomes a table**

Five columns, same order, same content. The whole-card `onClick` that pushes to the detail route becomes an explicit `Link` in the first cell — `DataTable` has no row-click concept and must not grow one. The chevron goes with the click target.

Date columns take `meta: { numeric: true, align: 'left' }` — aligned digits, but a date is not a quantity and must not jump right.

- [ ] **Step 2: `shot-list.tsx` becomes a table**

Same columns, same order, same content. Delete the raw primitives import and any `Card` that existed only to give the table a border — `DataTable` brings its own.

- [ ] **Step 3: Verify**

After the change this must return nothing:

```bash
grep -n "from '@/components/ui/table'\|<table" src/components/admin/filming-requests/filming-requests-list.tsx src/components/admin/filming-prep/shot-list.tsx
```

`pnpm type-check` → clean. `pnpm lint` → 0 errors. `pnpm build` → succeeds with both guards `ok`. Catalogue check if you added keys.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/filming-requests/filming-requests-list.tsx src/components/admin/filming-prep/shot-list.tsx messages/en.json messages/el.json
git commit -m "feat(design): two more lists admit they are tables"
```

---

### Task 8: The four files the inventory missed

**Files:**
- Modify: `src/components/admin/tasks/task-card.tsx`
- Modify: `src/components/admin/tasks/task-column.tsx`
- Modify: `src/components/admin/deliverables/version-history.tsx`
- Modify: `src/components/admin/deliverables/deliverable-detail.tsx`

**Context:** the inventory's colour table listed eight files. There are twelve. These four carry eighteen more raw colours between them, and the guard task after this one covers both of their folders whole — so without this task it fails.

Two of them are the **task board**, and they are the same disease Task 2 cured on the project board: a card with a priority stripe and a column with a status accent, each painting itself. Two are **deliverables**, in the folder Task 4 already worked in.

- [ ] **Step 1: Map each colour to a tone or a structural token**

The tones, verified against the real resolver:

| status / priority | tone |
|---|---|
| `urgent` | critical · `high` | caution · `medium`, `low` | **neutral** |
| `todo`, `in_progress` | neutral · `review` | caution · `done` | positive |
| `pending_review`, `revision_requested` | caution · `approved`, `final` | positive |

Read Task 2's commit before starting — it solved the board-colour problem once already, including why the tone→class map has to stay a static object (Tailwind cannot see a dynamically built class name). Follow the shape it established rather than inventing a second one.

Structural roles take `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-destructive`.

**If a colour maps onto neither a tone nor a structural token, stop and report it.**

- [ ] **Step 2: Any untranslated status or priority takes its label from the catalogues**

`statuses.priority` and `statuses.taskStatus` already exist, fully translated. Reuse them; add nothing. Do **not** touch `PRIORITY_LABELS` in `src/lib/constants` — seventeen files outside this slice import it.

- [ ] **Step 3: Verify**

After the change both of these must return nothing:

```bash
grep -rnE "(text|bg|border|ring|fill|stroke|from|via|to)-(white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)(-[0-9]{2,3})?\b|#[0-9a-fA-F]{3,8}|rgba?\(" src/components/admin/tasks/ src/components/admin/deliverables/
```

`pnpm type-check` → clean. `pnpm build` → succeeds with both guards `ok`. Lint: no new warnings, none in a file you touched.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/tasks/ src/components/admin/deliverables/
git commit -m "feat(design): the four files the inventory did not see"
```

---

### Task 9: Lock the area in

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: `e2e/design-identity.spec.ts`

**Context:** the guard runs inside `pnpm build` and is the only protection that fires here — every credentialed Playwright spec is skipped without test users. Never describe the new tests as protection that is active today.

Read `scripts/check-design.mjs` end to end first. It enforces six rules folded into one exit and distinguishes carefully between `TABLE_DETAIL_EXEMPT`, `TABLE_PENDING` and `TABLE_PENDING_UNDETECTABLE`. Do not blur them. Match its Greek voice.

- [ ] **Step 1: Cover the area**

Add to `COVERED`:

```js
  'src/components/shared/form-dialog.tsx',
  'src/app/admin/productions',
  'src/components/admin/projects',
  'src/components/admin/tasks',
  'src/components/admin/deliverables',
  'src/components/admin/calendar',
  'src/components/admin/filming-requests',
  'src/components/admin/filming-prep',
```

Run the guard. **Tasks 2 through 7 were each verified with their own grep, so nothing should trip.** If something does, that is a real finding: report it before touching it, fix it only if it is a single token on a single line, and if it is more, stop and bring it back.

`src/components/admin/dashboard/production/crew-load-heatmap.tsx` is already declared in the colour `PENDING` list and stays there.

- [ ] **Step 2: Guard the area's tables**

Add to `TABLE_GUARDED_AREAS`:

```js
  'src/app/admin/productions/',
  'src/components/admin/filming-requests/',
  'src/components/admin/filming-prep/',
  'src/components/admin/deliverables/',
  'src/components/admin/tasks/',
```

Run it. `crew-load-heatmap.tsx` builds its own table and is already in the colour pending list — if it now trips the **table** rule, give it a `TABLE_PENDING` entry with a one-line Greek reason. Anything else that trips is a real finding: report it.

- [ ] **Step 3: Prove both rules bite in the new area**

Two negative tests, both mandatory, both reported with exact output:

1. Add `className="text-red-600"` to an element in `src/components/admin/projects/project-card.tsx`. `node scripts/check-design.mjs` → must exit non-zero naming that file and line. Revert; confirm green.
2. Add `import { Table } from '@/components/ui/table';` to `src/components/admin/filming-requests/filming-requests-list.tsx`. → must exit non-zero naming it. Revert; confirm green.

Also add a third, because this area is where it matters: inject a colour hidden behind a Tailwind underscore — `className="shadow-[0_0_8px_rgba(1,2,3,0.4)]"` — into a covered file and confirm the guard catches it. That blind spot was found in slice #107 and the regression test belongs with the areas that use shadows.

Do not commit any temporary edit. Finish with `git status` showing only the untracked `.npmrc`.

- [ ] **Step 4: Extend `e2e/design-identity.spec.ts`**

Match the file's conventions: `test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database')` first in every test, a URL assertion before anything else, `loginAsAdmin`, and a real navigation rather than a hardcoded record id.

Add a `design identity — productions` block:

| route | what it proves |
|---|---|
| `/admin/productions?tab=requests` | the requests list renders through the shared table — assert a `[data-slot="table-container"]` holding a `table` with a header row |
| `/admin/productions?tab=all` | exactly one `[data-slot="page-heading"]`, and the board renders |
| `/admin/calendar` | the calendar still renders — assert FullCalendar's root element is visible, and that the page has exactly one page heading |

Pin the `?tab=` in every URL assertion. A hub opens on its first tab and a test that navigates to the bare URL and looks for another tab's content can never pass — and nobody would notice, because these specs are skipped.

Do **not** write a test that opens a create dialog and completes it. It would write a real record to whatever database the suite points at, and this suite has no fixtures or teardown. Say in your report that you left it out and why, even though the issue asks for it.

- [ ] **Step 5: Full verification**

`pnpm type-check` → clean. `pnpm lint` → `✖ 30 problems (0 errors, 30 warnings)`. `pnpm test:unit` → all pass.
`pnpm exec playwright test e2e/design-identity.spec.ts --list` → the new tests are listed.
`pnpm build` → succeeds, both guards `ok`. Paste the guard's final success line verbatim.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-design.mjs e2e/design-identity.spec.ts
git commit -m "test(design): guard the Productions area, colours and tables alike"
```
