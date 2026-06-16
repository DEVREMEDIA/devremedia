---
title: Phase 3 (#33) — Status-change pipeline (applyStatusChange orchestrator)
status: draft
date: 2026-06-16
authors: ntontischris, Claude
applies_to: devremedia
parent: PRD #31 (Phase 3), issue #33
adrs_respected: ADR-0001 (title), ADR-0002 (Revenue/Collections), ADR-0003 (invite flow)
---

# Phase 3 (#33) — Status-change pipeline

## Problem

When an entity's `status` changes, side-effects fire automatically: notifications,
emails, Google Calendar sync, and `revalidatePath`. Today this logic is **copy-pasted
across five action surfaces** (`updateProjectStatus`, `updateInvoiceStatus`,
`updateDeliverableStatus`, `updateTaskStatus`, and contract status flows). Adding a new
side-effect means editing N files and risks forgetting one. `revalidatePath` alone is
repeated 4–5 times per action.

PRD #31 Phase 3 (user stories 12, 13, 16): concentrate the status-change sequence into
**one deep module behind one interface**, so a new side-effect is added in one place.

## Goals

1. One module orchestrates notifications/email/calendar-sync/revalidation for all status
   transitions of the four "clean" entities (project, invoice, deliverable, task).
2. The actions keep their **exact public interfaces** — callers/UI see no change.
3. The "who is notified / which email / which paths" mapping is **data-driven**, in one
   place, not duplicated.
4. **Every existing side-effect preserved byte-for-byte** — change *where* the code
   lives, never *what* it does.
5. Unit-testable: the decision logic is a pure function asserted by Vitest with no mocks.

## Non-Goals

- **Contracts are NOT routed through the orchestrator.** Their multi-step flows
  (`sendContract`, `signContract`, approve/reject upload) keep bespoke pre-checks and
  PDF/signing logic exactly as-is. Only their duplicated `revalidatePath` sets are DRYed
  via a shared per-entity path helper, **and only where the path set matches exactly** —
  no path-set is altered (that would change caching behavior). [Decision: Επιλογή Α]
- No change to Revenue/Collections numbers (ADR-0002), invite flow (ADR-0003), or
  Production title format (ADR-0001).
- Auth seam is Phase #35's job — keep the inline `getUser()` checks in each action; do
  not pre-refactor them.
- No new side-effects, no new email types, no behavior changes.

## Key observation: old status is not needed

Auditing all five surfaces: **no existing side-effect depends on the OLD status.** Every
branch keys off the **new** status (+ the actor's role/identity). Therefore the
orchestrator does **not** fetch the previous status (no extra round-trip). The decision
function takes the new status + a context object built from the already-updated row.

## Architecture — pure decision + thin executor [Decision: Τρόπος Α]

Two cooperating pieces, mirroring the Phase #34 pure-function pattern
(`finance.ts`/`tab-data.ts` + their `.test.ts`):

### 1. `decideStatusEffects` (pure) — the test surface

`src/lib/status-effects.ts`. Signature (illustrative):

```ts
type Recipient =
  | { kind: 'client' }      // resolve via project/client relationship
  | { kind: 'admins' }      // all super_admin + admin
  | { kind: 'uploader' }    // deliverable.uploaded_by
  | { kind: 'assignee' }    // task.assigned_to
  | { kind: 'user'; id: string };

interface NotificationEffect {
  recipient: Recipient;
  type: string;             // NOTIFICATION_TYPES.*
  title: string;
  body?: string;
  actionUrl: string;
}

type EmailEffect =
  | { trigger: 'invoice_sent'; payload: InvoiceSentData }
  | { trigger: 'project_delivered'; payload: ProjectDeliveredData };

interface StatusEffects {
  notifications: NotificationEffect[];
  email: EmailEffect | null;
  calendarSync: boolean;    // project filming sync only
  revalidate: string[];
}

interface StatusChange {
  entity: 'project' | 'invoice' | 'deliverable' | 'task';
  status: string;           // the NEW status
  ctx: StatusChangeContext; // fields pulled from the updated row + actor
}

function decideStatusEffects(change: StatusChange): StatusEffects
```

`StatusChangeContext` carries only what the mapping needs, all already available in the
action after the update: entity id, title, `actorId`, `actorRole`, `clientId`,
`projectId`, `uploadedBy`, `assignedTo`, `invoiceNumber`, `total`, `currency`, `dueDate`.

This function is **pure**: input → `StatusEffects`, no I/O. Notifications are expressed by
**recipient role/relationship**, not resolved user IDs (resolving an ID is I/O → the
executor's job). This is what makes "who gets notified" both data-driven AND testable
without mocks.

### 2. `applyStatusChange` (executor) — the thin I/O layer

`src/lib/apply-status-change.ts`. `async function applyStatusChange(change: StatusChange): Promise<void>`:

1. `const effects = decideStatusEffects(change)`
2. For each notification: resolve `recipient` → user id(s) via existing helpers
   (`getClientUserIdFromProject` / `getClientUserIdFromClientId` / `getAdminUserIds`, or
   direct id), then `createNotification` / `createNotificationForMany`.
3. If `effects.email`: call the matching trigger (`triggerInvoiceSentEmail` /
   `triggerProjectDeliveredEmail`) — **fire-and-forget, exactly as today**.
4. If `effects.calendarSync`: `await syncProjectFilmingToCalendar(id)`.
5. For each `effects.revalidate` path: `revalidatePath(path)`.

The executor has **no branching logic of its own** — it mechanically executes the list.
All "smart" decisions live in the pure function.

### 3. Shared revalidate-path helper

`src/lib/status-effects.ts` also exports per-entity revalidate-path builders (used by the
decision function AND by contract actions for the small DRY win). Pure string builders,
e.g. `projectRevalidatePaths(id)`, `contractRevalidatePaths(id, projectId?)`.

## Preserved side-effects (the contract — must stay byte-identical)

| Entity | New status | Notifications | Email | Calendar | Revalidate |
|--------|-----------|---------------|-------|----------|------------|
| **project** | any | client: `PROJECT_STATUS` "Project \"{title}\" status updated to {status}" → `/client/projects/{id}` | `delivered` (& client_id) → `triggerProjectDeliveredEmail` | `filming` → `syncProjectFilmingToCalendar` | `/admin/projects`, `/admin/projects/{id}`, `/client/projects`, `/client/projects/{id}`, `/client/dashboard` |
| **invoice** | `sent` (& client_id) | client: `INVOICE_SENT` "Invoice {n} sent" / "Amount: €{total}" → `/client/invoices` | `triggerInvoiceSentEmail` | — | `/admin/invoices`, `/admin/invoices/{id}`, `/client/invoices`, `/client/dashboard` |
| **invoice** | `paid` | admins: `INVOICE_PAID` "Invoice {n} paid" / "Amount: €{total}" → `/admin/invoices` | — | — | (same set) |
| **deliverable** | any (actor=admin) | client: `DELIVERABLE_REVIEWED` "...marked as {status}" → `/client/projects/{pid}`; **+ uploader** (if `uploaded_by` && `!= actor`) → `/employee/deliverables/{pid}` | — | — | `/admin/projects/{pid}`, `/client/projects/{pid}`, `/client/dashboard`, `/employee/deliverables/{pid}`, `/employee/projects/{pid}` |
| **deliverable** | any (actor≠admin) | admins: `DELIVERABLE_REVIEWED` "...marked as {status}" → `/admin/projects/{pid}` | — | — | (same set) |
| **task** | any (`assigned_to` && `!= actor`) | assignee: `TASK_UPDATED` "...status changed to {status}" → `/employee/tasks/{id}` | — | — | `/admin/projects/{pid}`, `/employee/tasks`, `/employee/dashboard` |
| **task** | any (`assigned_to == actor`) | admins: `TASK_UPDATED` "...marked as {status}" → `/admin/projects/{pid}?tab=tasks` | — | — | (same set) |

Notes on semantics to preserve exactly:
- Notifications today: projects/invoices fire-and-forget (no `await`); tasks `await`.
  The executor will `await` notification creation uniformly — safe because
  `createNotification` catches its own errors and returns `void` (no behavior change, only
  ordering). Emails stay fire-and-forget. Calendar sync stays awaited.
- Invoice `sent_at`/`paid_at` timestamps are a **DB write**, set in the action before the
  orchestrator call — NOT a side-effect, stays in the action.
- The `updateInvoiceStatus` single path passes the same row fields the bulk path uses.

## Bulk invoice ops

`bulkUpdateInvoiceStatus` (from #32) currently re-inlines invoice side-effects in a loop.
After this phase, that loop calls `applyStatusChange` per affected invoice instead — same
aggregate behavior, one fewer copy. The single `.in('id', ids)` DB write from #32 is
unchanged. `bulkDeleteInvoices` is unaffected (delete, not a status change).

## Cleanup in scope

Remove the leftover `console.log('[DEBUG updateTaskStatus]', …)` block in
`updateTaskStatus` (tasks.ts ~221-229). It is debug cruft inside a function we are
rewriting; project rule forbids `console.log`.

## File plan

- **Create** `src/lib/status-effects.ts` — pure `decideStatusEffects` + types + per-entity
  effect mapping + revalidate-path builders.
- **Create** `src/lib/status-effects.test.ts` — Vitest unit tests (one per entity/scenario
  in the table above), written first (TDD).
- **Create** `src/lib/apply-status-change.ts` — the executor.
- **Modify** `src/lib/actions/projects.ts` — `updateProjectStatus` calls the orchestrator.
- **Modify** `src/lib/actions/invoices.ts` — `updateInvoiceStatus` + `bulkUpdateInvoiceStatus`
  route through the orchestrator.
- **Modify** `src/lib/actions/deliverables.ts` — `updateDeliverableStatus` routes through.
- **Modify** `src/lib/actions/tasks.ts` — `updateTaskStatus` routes through; remove DEBUG log.
- **Modify** `src/lib/actions/contracts.ts` — replace inline `revalidatePath` sets with the
  shared `contractRevalidatePaths` helper, only where the set matches exactly.

## Testing

- **Unit (TDD-first):** `status-effects.test.ts` asserts the `StatusEffects` object for each
  row of the preserved-side-effects table — e.g. "project→delivered emits client
  notification + project_delivered email + delivered-path revalidate", "deliverable by
  client notifies admins only", "task changed by assignee notifies admins". Pure I/O-free
  assertions, no mocks. This is the strong seam the PRD calls out.
- **Gates:** `pnpm build` + `pnpm type-check` + `pnpm lint` + `pnpm test:unit` all green.
- **Runtime verification (playbook #33 recipe):** trigger a real status change per entity;
  confirm each side-effect (notification / email / calendar-sync / revalidate) fires
  **exactly once** — no duplicates, no drops — vs master behavior. Supabase I/O is not
  unit-tested (codebase convention); the executor is verified at runtime.

## Branch & merge (per playbook)

Cut `phase-33` off `refactor/deepening-dms`. TDD → gates → runtime verify → self-review
(diff vs ADR-0001/0002/0003, no deleted/skipped tests) → merge `phase-33` into the
integration branch → comment/label issue #33. **No master PR** (final integration→master
is human-gated after #36). No new migration this phase (code-only).

## Out of Scope

- Routing contracts' status flows through the orchestrator.
- Auth seam (#35), finance single-owner (#36), spikes (#37/#38).
- Any Revenue/Collections, invite-flow, or title-format change.
- Realtime/unread-count redesign.
