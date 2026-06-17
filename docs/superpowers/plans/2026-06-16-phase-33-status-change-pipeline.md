# Phase 3 (#33) — Status-Change Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Concentrate the copy-pasted status-change side-effects (notifications, email, calendar sync, revalidation) of the four "clean" entities (project, invoice, deliverable, task) into one pure decision function + one thin executor, with **zero behavior change**.

**Architecture:** A pure `decideStatusEffects(change)` (no I/O) returns a `StatusEffects` data object describing *who* to notify (by recipient role/lookup-key), *which* email to fire, *whether* to calendar-sync, and *which* paths to revalidate. A thin `applyStatusChange(change)` executor resolves recipients to user IDs via existing helpers and mechanically runs the list. The four `update*Status` actions keep their exact public signatures and DB writes; they drop their inline side-effect code and call the executor. Contracts are **not** routed through the orchestrator — they only adopt a shared revalidate-path builder for the one exact-match duplication.

**Tech Stack:** Next.js 16 server actions, Supabase Postgres, Vitest v3 unit tests (`pnpm test:unit`), Playwright/manual runtime verification. No migration (code-only).

**Branch:** Executed on `phase-33`, cut off `refactor/deepening-dms` (the integration branch). Merged back to integration when gates + runtime verification pass. NOT pushed to master.

**ADRs respected:** ADR-0001 (title format), ADR-0002 (Revenue/Collections), ADR-0003 (invite flow) — none touched.

---

## File Structure

- **Create** `src/lib/status-effects.ts` — pure `decideStatusEffects` dispatcher + per-entity decision functions + types (`Recipient`, `NotificationEffect`, `EmailEffect`, `StatusEffects`, `StatusChangeContext`, `StatusChange`) + per-entity revalidate-path builders. **No `'use server'`, no I/O** — this is the unit-test surface.
- **Create** `src/lib/status-effects.test.ts` — Vitest unit tests, one per row of the preserved-side-effects table. Written first (TDD).
- **Create** `src/lib/apply-status-change.ts` — the executor. Resolves recipients and runs the effect list. Plain server-side module (not a `'use server'` action).
- **Modify** `src/lib/actions/projects.ts` — `updateProjectStatus` calls the orchestrator; drop inline side-effects; adjust imports.
- **Modify** `src/lib/actions/invoices.ts` — `updateInvoiceStatus` + `bulkUpdateInvoiceStatus` route through the orchestrator; keep the single-round-trip DB write + `countBulkOutcome`; adjust imports.
- **Modify** `src/lib/actions/deliverables.ts` — `updateDeliverableStatus` fetches actor role then routes through; drop inline side-effects; adjust imports.
- **Modify** `src/lib/actions/tasks.ts` — `updateTaskStatus` routes through; **remove the `[DEBUG updateTaskStatus]` `console.log`**; adjust imports.
- **Modify** `src/lib/actions/contracts.ts` — replace the two identical `reviewSignedContract` revalidate sets with a shared `contractReviewRevalidatePaths` helper. No other contract function is altered.

## Slice → sub-issue mapping

| Task | Sub-issue | Scope |
|------|-----------|-------|
| Task 1 | **#41** (tracer) | Shared modules + types + executor + **project** wired end-to-end |
| Task 2 | **#42** | invoice single + bulk |
| Task 3 | **#43** | deliverable (role-branched) |
| Task 4 | **#44** | task (role-branched) + remove DEBUG log |
| Task 5 | **#45** | contracts revalidate helper |

**Tasks 2–4 all extend `status-effects.ts` + `status-effects.test.ts`.** They run **sequentially on the one `phase-33` branch**, not in parallel. Task 1 establishes the shared modules; each later task adds one decision function + one `switch` case + tests, then rewires its action.

## Verification strategy (why TDD is narrow here)

The codebase does **not** unit-test Supabase I/O (every existing `*.test.ts` is a pure-function test — see `src/lib/finance.test.ts`). `decideStatusEffects` is pure, so it gets full TDD coverage (it is the strong seam the PRD calls out). The executor's I/O (resolving recipients, writing notifications, firing emails, calendar sync, revalidation) is verified **at runtime** per the playbook recipe in Task 7 — confirm each side-effect fires **exactly once** vs. master.

## Key design notes (read before coding)

- **Old status is never fetched.** No side-effect depends on the previous status (audited across all five surfaces). The decision function takes only the **new** status + a context built from the already-updated row. Do not add a read.
- **The `client` recipient resolves two ways.** Projects/deliverables resolve via `getClientUserIdFromProject(projectId)`; invoices via `getClientUserIdFromClientId(clientId)`. The `Recipient` type therefore carries the lookup key (`clientByProject` / `clientByClient`) so the executor stays mechanical and the decision function stays pure.
- **Uploader and assignee are plain user IDs** already present on the updated row → expressed as `{ kind: 'user'; id }`.
- **Notifications become uniformly awaited** in the executor. Projects/invoices/deliverables fire them fire-and-forget today; tasks await. `createNotification` swallows its own errors and returns `void`, so awaiting uniformly changes only ordering, not behavior or output. **Emails stay fire-and-forget** (no `await`). **Calendar sync stays awaited.**
- **Invoice `sent_at`/`paid_at` is a DB write**, set in the action before the executor call — it is NOT a side-effect and stays in the action.
- **One intentional, harmless delta (flag for user at review):** routing `bulkUpdateInvoiceStatus` per-invoice through the executor means each affected invoice now also revalidates its own `/admin/invoices/{id}` detail path. Old bulk revalidated only the 3 shared paths once. This is a **cache-only superset** (revalidating freshly-updated detail pages — strictly more correct, no data/user-visible change). The single `updateInvoiceStatus` path is byte-identical.

---

## Task 1 (#41 tracer): Shared modules + executor + project wired

**Files:**
- Create: `src/lib/status-effects.ts`
- Test: `src/lib/status-effects.test.ts`
- Create: `src/lib/apply-status-change.ts`
- Modify: `src/lib/actions/projects.ts:237-297`

- [ ] **Step 1: Write the failing test (project cases)**

```typescript
// src/lib/status-effects.test.ts
import { describe, it, expect } from 'vitest';
import { decideStatusEffects } from './status-effects';

describe('decideStatusEffects — project', () => {
  it('notifies the client and revalidates the project paths on any status', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'in_progress',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: 'c1' },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByProject', projectId: 'p1' },
        type: 'project_status',
        title: 'Project "Acme — Promo" status updated to in_progress',
        actionUrl: '/client/projects/p1',
      },
    ]);
    expect(effects.email).toBeNull();
    expect(effects.calendarSync).toBe(false);
    expect(effects.revalidate).toEqual([
      '/admin/projects',
      '/admin/projects/p1',
      '/client/projects',
      '/client/projects/p1',
      '/client/dashboard',
    ]);
  });

  it('fires the project_delivered email when delivered with a client_id', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'delivered',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: 'c1' },
    });

    expect(effects.email).toEqual({
      trigger: 'project_delivered',
      payload: { projectId: 'p1', projectTitle: 'Acme — Promo', clientId: 'c1' },
    });
  });

  it('does NOT fire the delivered email when client_id is missing', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'delivered',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: null },
    });

    expect(effects.email).toBeNull();
  });

  it('requests calendar sync only when entering filming', () => {
    expect(
      decideStatusEffects({
        entity: 'project',
        status: 'filming',
        ctx: { entityId: 'p1', title: 'X', clientId: 'c1' },
      }).calendarSync,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: FAIL — cannot find module `./status-effects`.

- [ ] **Step 3: Write `status-effects.ts` (types + dispatcher + project + revalidate builders)**

```typescript
// src/lib/status-effects.ts
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export type Recipient =
  | { kind: 'clientByProject'; projectId: string }
  | { kind: 'clientByClient'; clientId: string }
  | { kind: 'admins' }
  | { kind: 'user'; id: string };

export interface NotificationEffect {
  recipient: Recipient;
  type: string;
  title: string;
  body?: string;
  actionUrl: string;
}

export type EmailEffect =
  | {
      trigger: 'invoice_sent';
      payload: {
        invoiceId: string;
        clientId: string;
        invoiceNumber: string;
        total: number;
        currency: string;
        dueDate: string;
      };
    }
  | {
      trigger: 'project_delivered';
      payload: { projectId: string; projectTitle: string; clientId: string };
    };

export interface StatusEffects {
  notifications: NotificationEffect[];
  email: EmailEffect | null;
  calendarSync: boolean;
  revalidate: string[];
}

export interface StatusChangeContext {
  entityId: string;
  title?: string;
  projectId?: string | null;
  clientId?: string | null;
  actorId?: string;
  actorRole?: string;
  uploadedBy?: string | null;
  assignedTo?: string | null;
  invoiceNumber?: string;
  total?: number | null;
  currency?: string | null;
  dueDate?: string | null;
}

export interface StatusChange {
  entity: 'project' | 'invoice' | 'deliverable' | 'task';
  status: string;
  ctx: StatusChangeContext;
}

// --- Revalidate-path builders (pure string lists) ---

export function projectRevalidatePaths(id: string): string[] {
  return [
    '/admin/projects',
    `/admin/projects/${id}`,
    '/client/projects',
    `/client/projects/${id}`,
    '/client/dashboard',
  ];
}

// --- Per-entity decision functions ---

function decideProjectEffects(status: string, ctx: StatusChangeContext): StatusEffects {
  const id = ctx.entityId;
  const notifications: NotificationEffect[] = [
    {
      recipient: { kind: 'clientByProject', projectId: id },
      type: NOTIFICATION_TYPES.PROJECT_STATUS,
      title: `Project "${ctx.title}" status updated to ${status}`,
      actionUrl: `/client/projects/${id}`,
    },
  ];

  const email: EmailEffect | null =
    status === 'delivered' && ctx.clientId
      ? {
          trigger: 'project_delivered',
          payload: { projectId: id, projectTitle: ctx.title ?? '', clientId: ctx.clientId },
        }
      : null;

  return {
    notifications,
    email,
    calendarSync: status === 'filming',
    revalidate: projectRevalidatePaths(id),
  };
}

const NO_EFFECTS = (): StatusEffects => ({
  notifications: [],
  email: null,
  calendarSync: false,
  revalidate: [],
});

export function decideStatusEffects(change: StatusChange): StatusEffects {
  switch (change.entity) {
    case 'project':
      return decideProjectEffects(change.status, change.ctx);
    default:
      return NO_EFFECTS();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the executor `apply-status-change.ts`**

```typescript
// src/lib/apply-status-change.ts
import { revalidatePath } from 'next/cache';
import {
  createNotificationForMany,
  getClientUserIdFromProject,
  getClientUserIdFromClientId,
  getAdminUserIds,
} from '@/lib/actions/notifications';
import { triggerInvoiceSentEmail } from '@/lib/email/triggers/invoice-sent';
import { triggerProjectDeliveredEmail } from '@/lib/email/triggers/project-delivered';
import { syncProjectFilmingToCalendar } from '@/lib/actions/sync-project-filming';
import { decideStatusEffects, type StatusChange, type Recipient } from '@/lib/status-effects';

async function resolveRecipient(recipient: Recipient): Promise<string[]> {
  switch (recipient.kind) {
    case 'user':
      return [recipient.id];
    case 'admins':
      return getAdminUserIds();
    case 'clientByProject': {
      const id = await getClientUserIdFromProject(recipient.projectId);
      return id ? [id] : [];
    }
    case 'clientByClient': {
      const id = await getClientUserIdFromClientId(recipient.clientId);
      return id ? [id] : [];
    }
  }
}

/**
 * Executes every side-effect implied by a status change. The "what" lives in the
 * pure decideStatusEffects; this layer only does I/O and has no branching of its
 * own. Notifications are awaited (createNotification swallows its own errors);
 * emails stay fire-and-forget; calendar sync stays awaited.
 */
export async function applyStatusChange(change: StatusChange): Promise<void> {
  const effects = decideStatusEffects(change);

  for (const n of effects.notifications) {
    const userIds = await resolveRecipient(n.recipient);
    if (userIds.length === 0) continue;
    await createNotificationForMany(userIds, {
      type: n.type,
      title: n.title,
      body: n.body,
      actionUrl: n.actionUrl,
    });
  }

  if (effects.email) {
    if (effects.email.trigger === 'invoice_sent') {
      triggerInvoiceSentEmail(effects.email.payload);
    } else {
      triggerProjectDeliveredEmail(effects.email.payload);
    }
  }

  if (effects.calendarSync) {
    await syncProjectFilmingToCalendar(change.ctx.entityId);
  }

  for (const path of effects.revalidate) {
    revalidatePath(path);
  }
}
```

- [ ] **Step 6: Run gates to verify the executor type-checks**

Run: `pnpm type-check`
Expected: PASS (the `Recipient` switch is exhaustive; payload shapes structurally match the trigger params).

- [ ] **Step 7: Rewire `updateProjectStatus`**

In `src/lib/actions/projects.ts`, replace the body of `updateProjectStatus` from the `if (error)` check through the `return` (lines ~255-290) with:

```typescript
    if (error) return { data: null, error: error.message };

    await applyStatusChange({
      entity: 'project',
      status,
      ctx: { entityId: id, title: data.title, clientId: data.client_id },
    });

    return { data, error: null };
```

This removes the inline `revalidatePath` block, the client notification, the `triggerProjectDeliveredEmail` call, and the `syncProjectFilmingToCalendar` call (all now handled by the executor).

- [ ] **Step 8: Fix imports in `projects.ts`**

At the top of `src/lib/actions/projects.ts`:
- **Add:** `import { applyStatusChange } from '@/lib/apply-status-change';`
- **Change** line 9 from `import { createNotification, getClientUserIdFromProject } from '@/lib/actions/notifications';` to `import { createNotification } from '@/lib/actions/notifications';` (`getClientUserIdFromProject` was only used in `updateProjectStatus`; `createNotification` is still used by `assignProject`).
- **Remove** line 12: `import { triggerProjectDeliveredEmail } from '@/lib/email/triggers/project-delivered';` (only used in `updateProjectStatus`).
- **Keep** `NOTIFICATION_TYPES` (used by `assignProject`), `syncProjectFilmingToCalendar` (used by `updateProject`), `revalidatePath`, `syncEntityToGoogle`, `getGoogleColorId`.

- [ ] **Step 9: Run gates**

Run: `pnpm type-check && pnpm lint && pnpm test:unit`
Expected: PASS — no unused-import errors, all unit tests green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/status-effects.ts src/lib/status-effects.test.ts src/lib/apply-status-change.ts src/lib/actions/projects.ts
git commit -m "feat(status): add decideStatusEffects + applyStatusChange, route project status (#41)"
```

---

## Task 2 (#42): Route invoice single + bulk

**Files:**
- Modify: `src/lib/status-effects.ts`
- Test: `src/lib/status-effects.test.ts`
- Modify: `src/lib/actions/invoices.ts:250-327` (single) and `:367-445` (bulk)

- [ ] **Step 1: Add the failing invoice tests**

Append to `src/lib/status-effects.test.ts`:

```typescript
describe('decideStatusEffects — invoice', () => {
  const sentCtx = {
    entityId: 'inv1',
    clientId: 'c1',
    invoiceNumber: 'DMS-2026-001',
    total: 1234.5,
    currency: 'EUR',
    dueDate: '2026-07-01',
  };

  it('notifies the client and fires invoice_sent email on sent', () => {
    const effects = decideStatusEffects({ entity: 'invoice', status: 'sent', ctx: sentCtx });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByClient', clientId: 'c1' },
        type: 'invoice_sent',
        title: 'Invoice DMS-2026-001 sent',
        body: 'Amount: €1234.50',
        actionUrl: '/client/invoices',
      },
    ]);
    expect(effects.email).toEqual({
      trigger: 'invoice_sent',
      payload: {
        invoiceId: 'inv1',
        clientId: 'c1',
        invoiceNumber: 'DMS-2026-001',
        total: 1234.5,
        currency: 'EUR',
        dueDate: '2026-07-01',
      },
    });
    expect(effects.revalidate).toEqual([
      '/admin/invoices',
      '/admin/invoices/inv1',
      '/client/invoices',
      '/client/dashboard',
    ]);
  });

  it('emits nothing notification/email-wise on sent without a client_id', () => {
    const effects = decideStatusEffects({
      entity: 'invoice',
      status: 'sent',
      ctx: { ...sentCtx, clientId: null },
    });
    expect(effects.notifications).toEqual([]);
    expect(effects.email).toBeNull();
  });

  it('notifies admins on paid and treats a null total as 0.00', () => {
    const effects = decideStatusEffects({
      entity: 'invoice',
      status: 'paid',
      ctx: { entityId: 'inv1', invoiceNumber: 'DMS-2026-002', total: null },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'invoice_paid',
        title: 'Invoice DMS-2026-002 paid',
        body: 'Amount: €0.00',
        actionUrl: '/admin/invoices',
      },
    ]);
    expect(effects.email).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: FAIL — invoice cases return empty effects (default `NO_EFFECTS`).

- [ ] **Step 3: Add the invoice decision function + revalidate builder + switch case**

In `src/lib/status-effects.ts`, add the builder next to `projectRevalidatePaths`:

```typescript
export function invoiceRevalidatePaths(id: string): string[] {
  return ['/admin/invoices', `/admin/invoices/${id}`, '/client/invoices', '/client/dashboard'];
}
```

Add the decision function:

```typescript
function decideInvoiceEffects(status: string, ctx: StatusChangeContext): StatusEffects {
  const id = ctx.entityId;
  const amount = `Amount: €${(ctx.total ?? 0).toFixed(2)}`;
  const notifications: NotificationEffect[] = [];
  let email: EmailEffect | null = null;

  if (status === 'sent' && ctx.clientId) {
    notifications.push({
      recipient: { kind: 'clientByClient', clientId: ctx.clientId },
      type: NOTIFICATION_TYPES.INVOICE_SENT,
      title: `Invoice ${ctx.invoiceNumber} sent`,
      body: amount,
      actionUrl: '/client/invoices',
    });
    email = {
      trigger: 'invoice_sent',
      payload: {
        invoiceId: id,
        clientId: ctx.clientId,
        invoiceNumber: ctx.invoiceNumber ?? '',
        total: ctx.total ?? 0,
        currency: ctx.currency ?? 'EUR',
        dueDate: ctx.dueDate ?? '',
      },
    };
  }

  if (status === 'paid') {
    notifications.push({
      recipient: { kind: 'admins' },
      type: NOTIFICATION_TYPES.INVOICE_PAID,
      title: `Invoice ${ctx.invoiceNumber} paid`,
      body: amount,
      actionUrl: '/admin/invoices',
    });
  }

  return { notifications, email, calendarSync: false, revalidate: invoiceRevalidatePaths(id) };
}
```

Add the `case` to the dispatcher (before `default`):

```typescript
    case 'invoice':
      return decideInvoiceEffects(change.status, change.ctx);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: PASS (project + invoice tests).

- [ ] **Step 5: Rewire `updateInvoiceStatus`**

In `src/lib/actions/invoices.ts`, **keep** the `updateData` timestamp logic and the DB `update().eq().select().single()` (the `sent_at`/`paid_at` write stays). Replace from the `if (error)` check through the `return` (lines ~279-320) with:

```typescript
    if (error) return { data: null, error: error.message };

    await applyStatusChange({
      entity: 'invoice',
      status,
      ctx: {
        entityId: id,
        clientId: data.client_id,
        invoiceNumber: data.invoice_number,
        total: data.total,
        currency: data.currency,
        dueDate: data.due_date,
      },
    });

    return { data, error: null };
```

- [ ] **Step 6: Rewire `bulkUpdateInvoiceStatus`**

Keep the auth check, the single `.in('id', ids)` write, and `countBulkOutcome`. Replace from `const affected = data ?? [];` through the final `return` (lines ~391-438) with:

```typescript
    const affected = data ?? [];
    const { succeeded, failed } = countBulkOutcome(
      ids,
      affected.map((inv) => inv.id),
    );

    // Route each affected invoice through the orchestrator (Option A: side-effects
    // preserved in aggregate, one fewer copy). Note: this also revalidates each
    // invoice's detail path — a harmless cache-only superset vs. the old 3-path set.
    for (const inv of affected) {
      await applyStatusChange({
        entity: 'invoice',
        status,
        ctx: {
          entityId: inv.id,
          clientId: inv.client_id,
          invoiceNumber: inv.invoice_number,
          total: inv.total,
          currency: inv.currency,
          dueDate: inv.due_date,
        },
      });
    }

    return { data: { succeeded, failed }, error: null };
```

- [ ] **Step 7: Fix imports in `invoices.ts`**

At the top of `src/lib/actions/invoices.ts`:
- **Add:** `import { applyStatusChange } from '@/lib/apply-status-change';`
- **Remove** the notifications import block (lines 8-13: `createNotification`, `createNotificationForMany`, `getClientUserIdFromClientId`, `getAdminUserIds`) — none remain in use (`deleteInvoice`/`bulkDeleteInvoices` use no notifications).
- **Remove** line 14: `import { NOTIFICATION_TYPES } from '@/lib/notification-types';` (now unused).
- **Remove** line 17: `import { triggerInvoiceSentEmail } from '@/lib/email/triggers/invoice-sent';` (now unused).
- **Keep** `countBulkOutcome` (both bulk fns), `syncEntityToGoogle`, `getGoogleColorId`, `revalidatePath` (create/update/delete/bulkDelete).

- [ ] **Step 8: Run gates**

Run: `pnpm type-check && pnpm lint && pnpm test:unit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/status-effects.ts src/lib/status-effects.test.ts src/lib/actions/invoices.ts
git commit -m "refactor(invoices): route single + bulk status through applyStatusChange (#42)"
```

---

## Task 3 (#43): Route deliverable (role-branched)

**Files:**
- Modify: `src/lib/status-effects.ts`
- Test: `src/lib/status-effects.test.ts`
- Modify: `src/lib/actions/deliverables.ts:203-278`

- [ ] **Step 1: Add the failing deliverable tests**

Append to `src/lib/status-effects.test.ts`:

```typescript
describe('decideStatusEffects — deliverable', () => {
  it('admin change notifies client + uploader and revalidates all 5 paths', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'admin1',
        actorRole: 'admin',
        uploadedBy: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByProject', projectId: 'p1' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as approved',
        actionUrl: '/client/projects/p1',
      },
      {
        recipient: { kind: 'user', id: 'emp1' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as approved',
        actionUrl: '/employee/deliverables/p1',
      },
    ]);
    expect(effects.revalidate).toEqual([
      '/admin/projects/p1',
      '/client/projects/p1',
      '/client/dashboard',
      '/employee/deliverables/p1',
      '/employee/projects/p1',
    ]);
  });

  it('admin change does NOT notify the uploader when the admin is the uploader', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'admin1',
        actorRole: 'super_admin',
        uploadedBy: 'admin1',
      },
    });
    expect(effects.notifications).toHaveLength(1);
    expect(effects.notifications[0].recipient).toEqual({ kind: 'clientByProject', projectId: 'p1' });
  });

  it('non-admin (client) change notifies admins only', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'changes_requested',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'client1',
        actorRole: 'client',
        uploadedBy: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as changes_requested',
        actionUrl: '/admin/projects/p1',
      },
    ]);
  });

  it('emits nothing when projectId is missing', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: { entityId: 'd1', title: 'Cut v2', projectId: null, actorRole: 'admin' },
    });
    expect(effects).toEqual({ notifications: [], email: null, calendarSync: false, revalidate: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: FAIL — deliverable cases return empty effects.

- [ ] **Step 3: Add the deliverable decision function + revalidate builder + switch case**

In `src/lib/status-effects.ts`, add the builder:

```typescript
export function deliverableRevalidatePaths(projectId: string): string[] {
  return [
    `/admin/projects/${projectId}`,
    `/client/projects/${projectId}`,
    '/client/dashboard',
    `/employee/deliverables/${projectId}`,
    `/employee/projects/${projectId}`,
  ];
}
```

Add the decision function:

```typescript
function decideDeliverableEffects(status: string, ctx: StatusChangeContext): StatusEffects {
  const projectId = ctx.projectId;
  if (!projectId) return NO_EFFECTS();

  const title = `Deliverable "${ctx.title}" marked as ${status}`;
  const isAdmin = ctx.actorRole === 'super_admin' || ctx.actorRole === 'admin';
  const notifications: NotificationEffect[] = [];

  if (isAdmin) {
    notifications.push({
      recipient: { kind: 'clientByProject', projectId },
      type: NOTIFICATION_TYPES.DELIVERABLE_REVIEWED,
      title,
      actionUrl: `/client/projects/${projectId}`,
    });
    if (ctx.uploadedBy && ctx.uploadedBy !== ctx.actorId) {
      notifications.push({
        recipient: { kind: 'user', id: ctx.uploadedBy },
        type: NOTIFICATION_TYPES.DELIVERABLE_REVIEWED,
        title,
        actionUrl: `/employee/deliverables/${projectId}`,
      });
    }
  } else {
    notifications.push({
      recipient: { kind: 'admins' },
      type: NOTIFICATION_TYPES.DELIVERABLE_REVIEWED,
      title,
      actionUrl: `/admin/projects/${projectId}`,
    });
  }

  return {
    notifications,
    email: null,
    calendarSync: false,
    revalidate: deliverableRevalidatePaths(projectId),
  };
}
```

Add the `case` to the dispatcher:

```typescript
    case 'deliverable':
      return decideDeliverableEffects(change.status, change.ctx);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: PASS (project + invoice + deliverable tests).

- [ ] **Step 5: Rewire `updateDeliverableStatus`**

In `src/lib/actions/deliverables.ts`, replace from the `if (error)` check through the `return` (lines ~223-271) with:

```typescript
    if (error) return { data: null, error: error.message };

    // The decision function branches on the actor's role; resolve it once here.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    await applyStatusChange({
      entity: 'deliverable',
      status,
      ctx: {
        entityId: data.id,
        title: data.title,
        projectId: data.project_id,
        actorId: user.id,
        actorRole: profile?.role,
        uploadedBy: data.uploaded_by,
      },
    });

    return { data, error: null };
```

This removes the inline `if (data?.project_id) { revalidate…; profile fetch; isAdmin branch; notifications }` block (the profile fetch moves up unconditionally — harmless, the executor no-ops when `projectId` is absent).

- [ ] **Step 6: Fix imports in `deliverables.ts`**

At the top of `src/lib/actions/deliverables.ts`:
- **Add:** `import { applyStatusChange } from '@/lib/apply-status-change';`
- **Change** the notifications import (lines 12-17) to drop `createNotificationForMany` and `getAdminUserIds` (only used in `updateDeliverableStatus`), keeping `createNotification` and `getClientUserIdFromProject` (still used by `createDeliverable`/`updateDeliverable`):

```typescript
import { createNotification, getClientUserIdFromProject } from '@/lib/actions/notifications';
```

- **Keep** `NOTIFICATION_TYPES` (used by create/update), `revalidatePath`.

- [ ] **Step 7: Run gates**

Run: `pnpm type-check && pnpm lint && pnpm test:unit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/status-effects.ts src/lib/status-effects.test.ts src/lib/actions/deliverables.ts
git commit -m "refactor(deliverables): route status through applyStatusChange (#43)"
```

---

## Task 4 (#44): Route task (role-branched) + remove DEBUG log

**Files:**
- Modify: `src/lib/status-effects.ts`
- Test: `src/lib/status-effects.test.ts`
- Modify: `src/lib/actions/tasks.ts:186-257`

- [ ] **Step 1: Add the failing task tests**

Append to `src/lib/status-effects.test.ts`:

```typescript
describe('decideStatusEffects — task', () => {
  it('notifies the assignee when someone else changed the status', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'in_progress',
      ctx: { entityId: 't1', title: 'Edit reel', projectId: 'p1', actorId: 'admin1', assignedTo: 'emp1' },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'user', id: 'emp1' },
        type: 'task_updated',
        title: 'Task "Edit reel" status changed to in_progress',
        actionUrl: '/employee/tasks/t1',
      },
    ]);
    expect(effects.revalidate).toEqual(['/admin/projects/p1', '/employee/tasks', '/employee/dashboard']);
  });

  it('notifies admins when the assignee changed their own task', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'completed',
      ctx: { entityId: 't1', title: 'Edit reel', projectId: 'p1', actorId: 'emp1', assignedTo: 'emp1' },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'task_updated',
        title: 'Task "Edit reel" marked as completed',
        actionUrl: '/admin/projects/p1?tab=tasks',
      },
    ]);
  });

  it('emits no notification for an unassigned task but still revalidates', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'todo',
      ctx: { entityId: 't1', title: 'Edit reel', projectId: 'p1', actorId: 'admin1', assignedTo: null },
    });
    expect(effects.notifications).toEqual([]);
    expect(effects.revalidate).toEqual(['/admin/projects/p1', '/employee/tasks', '/employee/dashboard']);
  });

  it('omits the admin-project path when projectId is missing', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'todo',
      ctx: { entityId: 't1', title: 'Edit reel', projectId: null, actorId: 'a', assignedTo: null },
    });
    expect(effects.revalidate).toEqual(['/employee/tasks', '/employee/dashboard']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: FAIL — task cases return empty effects.

- [ ] **Step 3: Add the task decision function + revalidate builder + switch case**

In `src/lib/status-effects.ts`, add the builder:

```typescript
export function taskRevalidatePaths(projectId: string | null): string[] {
  const base = ['/employee/tasks', '/employee/dashboard'];
  return projectId ? [`/admin/projects/${projectId}`, ...base] : base;
}
```

Add the decision function:

```typescript
function decideTaskEffects(status: string, ctx: StatusChangeContext): StatusEffects {
  const id = ctx.entityId;
  const notifications: NotificationEffect[] = [];

  if (ctx.assignedTo && ctx.assignedTo !== ctx.actorId) {
    // Someone other than the assignee changed it → notify the assignee.
    notifications.push({
      recipient: { kind: 'user', id: ctx.assignedTo },
      type: NOTIFICATION_TYPES.TASK_UPDATED,
      title: `Task "${ctx.title}" status changed to ${status}`,
      actionUrl: `/employee/tasks/${id}`,
    });
  } else if (ctx.assignedTo && ctx.assignedTo === ctx.actorId) {
    // The assignee changed their own task → notify admins.
    notifications.push({
      recipient: { kind: 'admins' },
      type: NOTIFICATION_TYPES.TASK_UPDATED,
      title: `Task "${ctx.title}" marked as ${status}`,
      actionUrl: `/admin/projects/${ctx.projectId}?tab=tasks`,
    });
  }

  return {
    notifications,
    email: null,
    calendarSync: false,
    revalidate: taskRevalidatePaths(ctx.projectId ?? null),
  };
}
```

Add the `case` to the dispatcher:

```typescript
    case 'task':
      return decideTaskEffects(change.status, change.ctx);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit src/lib/status-effects.test.ts`
Expected: PASS (all four entities).

- [ ] **Step 5: Rewire `updateTaskStatus` and remove the DEBUG log**

In `src/lib/actions/tasks.ts`, replace from the `if (error)` check through the `return` (lines ~212-250) with:

```typescript
    if (error) return { data: null, error: error.message };

    await applyStatusChange({
      entity: 'task',
      status,
      ctx: {
        entityId: data.id,
        title: data.title,
        projectId: data.project_id,
        actorId: user.id,
        assignedTo: data.assigned_to,
      },
    });

    return { data, error: null };
```

This removes the inline `revalidatePath` block, the `console.log('[DEBUG updateTaskStatus]', …)` block, and the assignee/admin notification branch.

- [ ] **Step 6: Fix imports in `tasks.ts`**

At the top of `src/lib/actions/tasks.ts`:
- **Add:** `import { applyStatusChange } from '@/lib/apply-status-change';`
- **Change** the notifications import (lines 8-12) to drop `createNotificationForMany` and `getAdminUserIds` (only used in `updateTaskStatus`), keeping `createNotification` (used by `createTask`/`updateTask`):

```typescript
import { createNotification } from '@/lib/actions/notifications';
```

- **Keep** `NOTIFICATION_TYPES` (create/update use `TASK_ASSIGNED`), `syncEntityToGoogle`, `getGoogleColorId`, `revalidatePath`.

- [ ] **Step 7: Run gates**

Run: `pnpm type-check && pnpm lint && pnpm test:unit`
Expected: PASS. `pnpm lint` must show no `console.log` (the DEBUG block is gone).

- [ ] **Step 8: Commit**

```bash
git add src/lib/status-effects.ts src/lib/status-effects.test.ts src/lib/actions/tasks.ts
git commit -m "refactor(tasks): route status through applyStatusChange, drop DEBUG log (#44)"
```

---

## Task 5 (#45): Contracts shared revalidate helper

**Files:**
- Modify: `src/lib/status-effects.ts`
- Modify: `src/lib/actions/contracts.ts:399-448`

Contracts are **not** routed through the orchestrator (their multi-step send/sign/review flows keep bespoke logic). The only exact-match revalidate duplication is the two branches of `reviewSignedContract` (approve and reject), which both revalidate the identical set `['/admin/contracts', '/admin/contracts/{id}', '/client/contracts']`. Extract that one set; leave every other contract function's divergent path set untouched (altering a path set would change caching behavior — out of scope).

- [ ] **Step 1: Add the contract revalidate builder**

In `src/lib/status-effects.ts`, add next to the other builders:

```typescript
export function contractReviewRevalidatePaths(id: string): string[] {
  return ['/admin/contracts', `/admin/contracts/${id}`, '/client/contracts'];
}
```

- [ ] **Step 2: Apply it in `reviewSignedContract` (approve branch)**

In `src/lib/actions/contracts.ts`, in the `decision === 'approve'` branch, replace:

```typescript
    revalidatePath('/admin/contracts');
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/client/contracts');
    return { data, error: null };
```

with:

```typescript
    for (const path of contractReviewRevalidatePaths(id)) revalidatePath(path);
    return { data, error: null };
```

- [ ] **Step 3: Apply it in `reviewSignedContract` (reject branch)**

At the end of the same function (reject path), replace:

```typescript
  revalidatePath('/admin/contracts');
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath('/client/contracts');
  return { data, error: null };
```

with:

```typescript
  for (const path of contractReviewRevalidatePaths(id)) revalidatePath(path);
  return { data, error: null };
```

- [ ] **Step 4: Add the import in `contracts.ts`**

At the top of `src/lib/actions/contracts.ts`, add:

```typescript
import { contractReviewRevalidatePaths } from '@/lib/status-effects';
```

- [ ] **Step 5: Run gates**

Run: `pnpm type-check && pnpm lint`
Expected: PASS (the two branches produce identical `revalidatePath` calls in the same order as before).

- [ ] **Step 6: Commit**

```bash
git add src/lib/status-effects.ts src/lib/actions/contracts.ts
git commit -m "refactor(contracts): share reviewSignedContract revalidate paths (#45)"
```

---

## Task 6: Full gates + self-review

- [ ] **Step 1: Run all gates**

Run: `pnpm build && pnpm type-check && pnpm lint && pnpm test:unit`
Expected: all green. If `pnpm build` fails on something unrelated/pre-existing, note it; do not paper over a failure this phase introduced.

- [ ] **Step 2: Self-review the diff against the contract**

Run: `git diff refactor/deepening-dms...phase-33 --stat` and review:
- Only the 7 files in File Structure changed (3 created + 4 actions modified + contracts).
- No deleted or skipped tests anywhere.
- Each row of the preserved-side-effects table (design spec §"Preserved side-effects") has a passing unit assertion.
- No Revenue/Collections, invite-flow, or title-format change (ADR-0001/0002/0003 untouched).
- The `[DEBUG updateTaskStatus]` `console.log` is gone; no new `console.log` introduced.
- Emails still fire-and-forget; calendar sync still awaited; notifications now uniformly awaited.

---

## Task 7: Runtime verification (the playbook recipe for #33)

Supabase I/O is not unit-tested (codebase convention), so the executor is verified at runtime. **Requires the dev server + a login per role.** Credentials are user-provided in-session — ask the user when ready. For each entity, trigger a real status change and confirm each side-effect fires **exactly once** — no duplicates, no drops — matching master.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Project — `delivered` and `filming`**

As admin, change a project (with a linked client) to `delivered`: confirm (a) the client gets one `project_status` notification, (b) one `project_delivered` email row appears in `email_logs` (deduped — a second change same day must NOT resend), (c) the four+`dashboard` project paths refresh. Then change a project with a `filming_date` to `filming`: confirm exactly one synced `calendar_events` filming row (idempotent — repeating does not duplicate).

- [ ] **Step 3: Invoice — single `sent`/`paid` and bulk**

Single: set an invoice to `sent` → one client `invoice_sent` notification + one `invoice_sent` email; set another to `paid` → admins get one `invoice_paid` notification each. Bulk: select N invoices, bulk-set `sent` → the DB write is **one** `.in(...)` round-trip (check the Supabase request log), and each affected invoice fires its client notification + email exactly once.

- [ ] **Step 4: Deliverable — admin vs client actor**

As admin, change a deliverable's status → client + uploading-employee each get one `deliverable_reviewed` notification (and none to the admin if the admin uploaded it). As the client, change a deliverable's status → only admins get notified.

- [ ] **Step 5: Task — assignee vs other actor**

As admin, change an assigned task's status → the assignee gets one `task_updated` notification. As that employee, change their own task → all admins get one each. Confirm **no** `[DEBUG updateTaskStatus]` line appears in the server console.

- [ ] **Step 6: Stop the dev server.**

---

## Done criteria (issue #33 acceptance)

- [ ] `decideStatusEffects` is pure and unit-tested for every entity/scenario in the preserved-side-effects table.
- [ ] `applyStatusChange` is the single executor; the four `update*Status` actions call it and contain no inline notification/email/calendar/revalidate logic.
- [ ] All four entities' public action signatures are unchanged; the DB writes (incl. invoice `sent_at`/`paid_at`) stay in the actions.
- [ ] Bulk invoice status still does one `.in(...)` write and routes side-effects through the executor.
- [ ] `reviewSignedContract`'s two branches share `contractReviewRevalidatePaths`; no other contract path set changed.
- [ ] The `[DEBUG updateTaskStatus]` `console.log` is removed.
- [ ] `pnpm build` + `pnpm type-check` + `pnpm lint` + `pnpm test:unit` pass.
- [ ] Runtime verification confirms each side-effect fires exactly once per entity vs. master.
- [ ] Merged to `refactor/deepening-dms` via the playbook (no direct master push); no new migration.
