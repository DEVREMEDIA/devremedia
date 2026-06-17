# Phase 2 (#32) — Reports Aggregation RPCs + Batched Bulk Ops — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the four reports aggregations into Postgres aggregate RPCs and collapse the two bulk invoice ops into single-round-trip DB writes, with no change to any number or user-visible behavior.

**Architecture:** New `CREATE OR REPLACE` migration adds four `SECURITY DEFINER` aggregate RPCs mirroring the exact TS grouping/summing semantics (ADR-0002 for finance). The `reports.ts` query functions keep identical signatures but become thin `.rpc(...)` adapters. `bulkUpdateInvoiceStatus` / `bulkDeleteInvoices` do their DB write in one `.in('id', ids)` query, then preserve all side-effects (notifications, invoice-sent email, Storage cleanup, Google Calendar sync, revalidation) in aggregate — **Option A**, approved by user.

**Tech Stack:** Next.js 16 server actions, Supabase Postgres (plpgsql RPCs), Vitest v3 unit tests, Playwright runtime A/B verification.

**Branch:** Executed on `phase-32`, cut off `refactor/deepening-dms` (the integration branch). Merged back to integration when gates + runtime verification pass. NOT pushed to master.

---

## File Structure

- **Create** `supabase/migrations/00052_reports_aggregate_rpcs.sql` — the four reports RPCs. (00051 already exists on disk → next number is 00052.)
- **Create** `src/lib/bulk-result.ts` — pure `countBulkOutcome(requestedIds, affectedIds)` helper (the one unit-testable seam; used by both bulk funcs).
- **Create** `src/lib/bulk-result.test.ts` — Vitest unit tests for `countBulkOutcome`.
- **Modify** `src/lib/queries/reports.ts` — `getTopClientsByRevenue`, `getPaymentMethodBreakdown`, `getExpensesByCategory`, `getProjectTypeBreakdown` become thin RPC adapters (signatures unchanged). The other functions (`getMonthlyRevenue`, `getProfitMargin`, `getAverageProjectDuration`) are **out of scope** — leave untouched.
- **Modify** `src/lib/actions/invoices.ts:366-429` — rewrite `bulkUpdateInvoiceStatus` and `bulkDeleteInvoices`.

## Verification strategy (why TDD is narrow here)

The codebase does **not** unit-test Supabase I/O (all six existing `*.test.ts` are pure-function tests). Vitest can't run Postgres, so RPC↔TS parity and the single-round-trip claim are verified **at runtime** with the #34 Playwright A/B method, not in Vitest. The only pure TS logic added in this phase is the bulk succeeded/failed counting → that gets the unit test.

---

## Task 1: Pure bulk-outcome counter (TDD)

**Files:**
- Create: `src/lib/bulk-result.ts`
- Test: `src/lib/bulk-result.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/bulk-result.test.ts
import { describe, it, expect } from 'vitest';
import { countBulkOutcome } from './bulk-result';

describe('countBulkOutcome', () => {
  it('counts all as succeeded when every requested id was affected', () => {
    expect(countBulkOutcome(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({
      succeeded: 3,
      failed: 0,
    });
  });

  it('counts the unaffected ids as failed', () => {
    expect(countBulkOutcome(['a', 'b', 'c'], ['a'])).toEqual({
      succeeded: 1,
      failed: 2,
    });
  });

  it('handles an empty affected set as all failed', () => {
    expect(countBulkOutcome(['a', 'b'], [])).toEqual({ succeeded: 0, failed: 2 });
  });

  it('handles an empty request as zero of each', () => {
    expect(countBulkOutcome([], [])).toEqual({ succeeded: 0, failed: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit src/lib/bulk-result.test.ts`
Expected: FAIL — cannot find module './bulk-result' / `countBulkOutcome is not a function`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/bulk-result.ts
/**
 * Counts the outcome of a batched bulk op: an id "succeeded" if it appears in the
 * set of rows the single .in('id', ids) write actually affected; everything else
 * "failed" (already gone, RLS-filtered, etc.). Keeps the ActionResult contract that
 * the per-id loop used to produce, in one round-trip.
 */
export function countBulkOutcome(
  requestedIds: string[],
  affectedIds: string[],
): { succeeded: number; failed: number } {
  const succeeded = affectedIds.length;
  return { succeeded, failed: requestedIds.length - succeeded };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit src/lib/bulk-result.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bulk-result.ts src/lib/bulk-result.test.ts
git commit -m "feat(invoices): add countBulkOutcome helper for batched bulk ops"
```

---

## Task 2: Reports aggregate RPCs migration

**Files:**
- Create: `supabase/migrations/00052_reports_aggregate_rpcs.sql`

Mirror the **exact** semantics of the current `reports.ts` TS code, including its quirks, so numbers stay byte-identical:
- `getTopClientsByRevenue`: filter invoices with `status IN (sent,viewed,paid,overdue)` AND, when a range is given, `(issue_date in range) OR (paid_at in range)`. Per client: revenue = `SUM(total)` over revenue-status rows with non-null `issue_date` (the range is NOT re-checked per row — matches `sumFinance`); collections = `SUM(total)` over rows with `status='paid'` AND non-null `paid_at`; `project_count` = **count of invoices** (the TS names it project_count but uses `invoices.length`). `client_name = company_name || contact_name || 'Unknown'`. Sort by revenue desc, limit.
- `getPaymentMethodBreakdown`: `status='paid'`, optional `paid_at` range; group by `metadata->>'payment_method'` (default `'Other'`); sum total, count.
- `getProjectTypeBreakdown`: `status != 'archived'`, optional `created_at` range; group by `project_type`, count.
- `getExpensesByCategory`: optional `date` range; group by `category`; sum amount, count.

All four: `SECURITY DEFINER`, `SET search_path = public`, `is_admin()` guard, and `GRANT EXECUTE ... TO authenticated` — matching migrations 00045/00050. Each returns a `jsonb` array already in the adapter's target shape (like `get_dashboard_kpi`), so the adapter is a pure passthrough. `p_from`/`p_to` are nullable `date` (null = no range).

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- Migration 00052 — Reports aggregate RPCs (Phase 2 / issue #32)
-- Purpose: Move the four reports aggregations off "pull all rows, group in
--          memory" onto SQL aggregate RPCs, mirroring src/lib/queries/reports.ts
--          and src/lib/finance.ts exactly (ADR-0002). No number changes.
--          Pattern matches 00045/00050: SECURITY DEFINER + is_admin() guard,
--          jsonb result, additive CREATE OR REPLACE.
-- Risk: low — read-only, additive, reversible by DROP FUNCTION.
-- Created: 2026-06-16
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_top_clients_by_revenue(p_limit, p_from, p_to)
--   Mirrors getTopClientsByRevenue + sumFinance. Revenue (Τζίρος) =
--   issued invoices by issue_date; Collections (Εισπράξεις) = paid by paid_at.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_clients_by_revenue(
  p_limit integer DEFAULT 10,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'total_revenue' IS NULL, (row->>'total_revenue')::numeric DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'client_id', i.client_id,
      'client_name', COALESCE(NULLIF(c.company_name, ''), NULLIF(c.contact_name, ''), 'Unknown'),
      'total_revenue', COALESCE(SUM(i.total) FILTER (WHERE i.issue_date IS NOT NULL), 0),
      'total_collections', COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid' AND i.paid_at IS NOT NULL), 0),
      'project_count', COUNT(*)
    ) AS row
    FROM public.invoices i
    LEFT JOIN public.clients c ON c.id = i.client_id
    WHERE i.status IN ('sent', 'viewed', 'paid', 'overdue')
      AND (
        p_from IS NULL OR p_to IS NULL
        OR (i.issue_date >= p_from AND i.issue_date <= p_to)
        OR (i.paid_at >= p_from AND i.paid_at <= p_to)
      )
    GROUP BY i.client_id, COALESCE(NULLIF(c.company_name, ''), NULLIF(c.contact_name, ''), 'Unknown')
    ORDER BY COALESCE(SUM(i.total) FILTER (WHERE i.issue_date IS NOT NULL), 0) DESC
    LIMIT GREATEST(p_limit, 0)
  ) ranked;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_top_clients_by_revenue IS
  'Top clients by Revenue (Τζίρος, issued by issue_date) with Collections. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_top_clients_by_revenue(integer, date, date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_payment_method_breakdown(p_from, p_to) — paid invoices grouped by
--   metadata->>'payment_method' (default 'Other'). Mirrors getPaymentMethodBreakdown.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_method_breakdown(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'method', method,
    'amount', amount,
    'count', cnt
  )), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      COALESCE(NULLIF(i.metadata->>'payment_method', ''), 'Other') AS method,
      COALESCE(SUM(i.total), 0) AS amount,
      COUNT(*) AS cnt
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND (p_from IS NULL OR p_to IS NULL OR (i.paid_at >= p_from AND i.paid_at <= p_to))
    GROUP BY COALESCE(NULLIF(i.metadata->>'payment_method', ''), 'Other')
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_payment_method_breakdown IS
  'Paid invoices grouped by payment method. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_payment_method_breakdown(date, date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_project_type_breakdown(p_from, p_to) — non-archived projects grouped
--   by project_type. Mirrors getProjectTypeBreakdown.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_type_breakdown(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', project_type,
    'count', cnt
  )), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT p.project_type, COUNT(*) AS cnt
    FROM public.projects p
    WHERE p.status <> 'archived'
      AND (p_from IS NULL OR p_to IS NULL OR (p.created_at >= p_from AND p.created_at <= p_to))
    GROUP BY p.project_type
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_project_type_breakdown IS
  'Non-archived projects grouped by project_type. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_project_type_breakdown(date, date) TO authenticated;

-- ---------------------------------------------------------------------
-- get_expenses_by_category(p_from, p_to) — expenses grouped by category.
--   Mirrors getExpensesByCategory.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_expenses_by_category(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', category,
    'amount', amount,
    'count', cnt
  )), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT e.category, COALESCE(SUM(e.amount), 0) AS amount, COUNT(*) AS cnt
    FROM public.expenses e
    WHERE (p_from IS NULL OR p_to IS NULL OR (e.date >= p_from AND e.date <= p_to))
    GROUP BY e.category
  ) grouped;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_expenses_by_category IS
  'Expenses grouped by category. Mirrors reports.ts. Admin-only.';
GRANT EXECUTE ON FUNCTION public.get_expenses_by_category(date, date) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
```

- [ ] **Step 2: Sanity-check the SQL parses**

The migration is applied to cloud by the human at merge time (the agent does not have cloud apply). For now, eyeball that every function has a matching `is_admin()` guard, `GRANT`, and `COMMENT`, and that `is_admin()` exists (defined in 00017/00045 — confirm with `grep -rn "FUNCTION public.is_admin" supabase/migrations`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00052_reports_aggregate_rpcs.sql
git commit -m "feat(reports): add aggregate RPCs migration 00052 (#32)"
```

---

## Task 3: Convert reports.ts functions to thin RPC adapters

**Files:**
- Modify: `src/lib/queries/reports.ts`

Replace the bodies of the four functions. Keep signatures, return types, and the `try/catch → return []` contract identical. The RPC returns jsonb already in the target shape, so the adapter casts and returns. Leave the `import` of `REVENUE_STATUSES`/`sumFinance`/`bucketMonthlyFinance` in place **only if** still used by the out-of-scope functions (`getMonthlyRevenue`, `getProfitMargin` still use them — keep the imports; do not remove).

- [ ] **Step 1: Replace `getTopClientsByRevenue`**

```typescript
export async function getTopClientsByRevenue(
  limit: number = 10,
  dateRange?: DateRange,
): Promise<ClientRevenue[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_top_clients_by_revenue', {
      p_limit: limit,
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ClientRevenue[];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Replace `getPaymentMethodBreakdown`**

```typescript
export async function getPaymentMethodBreakdown(
  dateRange?: DateRange,
): Promise<PaymentMethodBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_payment_method_breakdown', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as PaymentMethodBreakdown[];
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Replace `getProjectTypeBreakdown`**

```typescript
export async function getProjectTypeBreakdown(
  dateRange?: DateRange,
): Promise<ProjectTypeBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_project_type_breakdown', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ProjectTypeBreakdown[];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Replace `getExpensesByCategory`**

```typescript
export async function getExpensesByCategory(
  dateRange?: DateRange,
): Promise<ExpenseCategoryBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_expenses_by_category', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ExpenseCategoryBreakdown[];
  } catch {
    return [];
  }
}
```

- [ ] **Step 5: Verify imports**

After editing, confirm `ProjectType`/`ExpenseCategory` type imports are still referenced (they are — used in the `ProjectTypeBreakdown`/`ExpenseCategoryBreakdown` type aliases). Confirm `FinanceInvoice` import is now unused (it was only used in the old `getTopClientsByRevenue` grouping) and **remove it** from the import on line 6 to keep lint green. Keep `REVENUE_STATUSES`, `bucketMonthlyFinance`, `sumFinance` (still used by `getMonthlyRevenue`/`getProfitMargin`).

- [ ] **Step 6: Run gates**

Run: `pnpm type-check && pnpm lint`
Expected: PASS (no unused-import errors, RPC call types resolve).

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/reports.ts
git commit -m "refactor(reports): make 4 report queries thin RPC adapters (#32)"
```

---

## Task 4: Batch `bulkUpdateInvoiceStatus` (preserve side-effects — Option A)

**Files:**
- Modify: `src/lib/actions/invoices.ts:366-397`

One `.in('id', ids)` update sets `status` plus `sent_at`/`paid_at` uniformly (all ids share the same target status, so the timestamp logic that the per-id loop applied is identical applied in bulk). Then preserve the per-status side-effects in aggregate over the returned rows: client notification + invoice-sent email on `sent`; admin notifications on `paid`. Revalidate the same paths `updateInvoiceStatus` did, once.

- [ ] **Step 1: Replace the function body**

```typescript
export async function bulkUpdateInvoiceStatus(
  ids: string[],
  status: InvoiceStatus,
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const updateData: Record<string, unknown> = { status };
    const nowIso = new Date().toISOString();
    if (status === 'sent') updateData.sent_at = nowIso;
    if (status === 'paid') updateData.paid_at = nowIso;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .in('id', ids)
      .select('id, client_id, invoice_number, total, currency, due_date');

    if (error) return { data: null, error: error.message };

    const affected = data ?? [];
    const { succeeded, failed } = countBulkOutcome(
      ids,
      affected.map((inv) => inv.id),
    );

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');

    // Preserve the per-invoice side-effects updateInvoiceStatus fires, in aggregate.
    if (status === 'sent') {
      for (const inv of affected) {
        if (!inv.client_id) continue;
        const clientUserId = await getClientUserIdFromClientId(inv.client_id);
        if (clientUserId) {
          createNotification({
            userId: clientUserId,
            type: NOTIFICATION_TYPES.INVOICE_SENT,
            title: `Invoice ${inv.invoice_number} sent`,
            body: `Amount: €${inv.total?.toFixed(2) ?? '0.00'}`,
            actionUrl: '/client/invoices',
          });
        }
        triggerInvoiceSentEmail({
          invoiceId: inv.id,
          clientId: inv.client_id,
          invoiceNumber: inv.invoice_number,
          total: inv.total ?? 0,
          currency: inv.currency ?? 'EUR',
          dueDate: inv.due_date,
        });
      }
    }

    if (status === 'paid') {
      const adminIds = await getAdminUserIds();
      for (const inv of affected) {
        createNotificationForMany(adminIds, {
          type: NOTIFICATION_TYPES.INVOICE_PAID,
          title: `Invoice ${inv.invoice_number} paid`,
          body: `Amount: €${inv.total?.toFixed(2) ?? '0.00'}`,
          actionUrl: `/admin/invoices`,
        });
      }
    }

    return { data: { succeeded, failed }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to bulk update invoices',
    };
  }
}
```

- [ ] **Step 2: Add the import**

At the top of `src/lib/actions/invoices.ts`, add:

```typescript
import { countBulkOutcome } from '@/lib/bulk-result';
```

- [ ] **Step 3: Run gates**

Run: `pnpm type-check && pnpm lint`
Expected: PASS. (Note: `triggerInvoiceSentEmail`, `createNotification`, `getClientUserIdFromClientId`, `getAdminUserIds`, `createNotificationForMany`, `NOTIFICATION_TYPES` are already imported — confirm, don't duplicate.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "perf(invoices): batch bulkUpdateInvoiceStatus to one round-trip, keep side-effects (#32)"
```

---

## Task 5: Batch `bulkDeleteInvoices` (preserve Storage + Google sync)

**Files:**
- Modify: `src/lib/actions/invoices.ts:399-429`

Mirror `deleteInvoice`'s behavior in aggregate: fetch all `file_path`s in one query, remove all Storage files in one `.remove([...])`, delete in one `.in('id', ids)`, revalidate the same 3 paths once, then `syncEntityToGoogle` per deleted id (external API, inherently per-entity).

- [ ] **Step 1: Replace the function body**

```typescript
export async function bulkDeleteInvoices(
  ids: string[],
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Fetch file_paths for Storage cleanup (one round-trip).
    const { data: rows } = await supabase
      .from('invoices')
      .select('id, file_path')
      .in('id', ids);

    const filePaths = (rows ?? [])
      .map((r) => r.file_path)
      .filter((p): p is string => Boolean(p));
    if (filePaths.length > 0) {
      await supabase.storage.from('invoices').remove(filePaths);
    }

    const { data: deleted, error } = await supabase
      .from('invoices')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) return { data: null, error: error.message };

    const deletedIds = (deleted ?? []).map((r) => r.id);
    const { succeeded, failed } = countBulkOutcome(ids, deletedIds);

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');

    for (const id of deletedIds) {
      await syncEntityToGoogle({ entityType: 'invoice', entityId: id, operation: 'delete' });
    }

    return { data: { succeeded, failed }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to bulk delete invoices',
    };
  }
}
```

- [ ] **Step 2: Run gates**

Run: `pnpm type-check && pnpm lint`
Expected: PASS (`syncEntityToGoogle` already imported; `countBulkOutcome` imported in Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "perf(invoices): batch bulkDeleteInvoices to one round-trip, keep storage+sync (#32)"
```

---

## Task 6: Full gates

- [ ] **Step 1: Run all gates**

Run: `pnpm build && pnpm type-check && pnpm lint && pnpm test:unit`
Expected: all green. If `pnpm build` fails on something unrelated (pre-existing), note it; do not paper over a failure this phase introduced.

- [ ] **Step 2: Self-review the diff**

Run: `git diff refactor/deepening-dms...phase-32 --stat` and review:
- Only the 6 files in File Structure changed.
- No deleted/skipped tests anywhere.
- No Revenue/Collections rule rewritten in TS (ADR-0002 respected — the rule now lives in SQL + the untouched `finance.ts`).
- Bulk side-effects preserved (Option A), not dropped.

---

## Task 7: Runtime verification (the playbook A/B recipe for #32)

This is the verification that replaces unit-testing Supabase I/O. **Requires the dev server + admin login.** Admin creds are user-provided in-session — ask the user when ready. Script reads `VEMAIL`/`VPASS`; it is a throwaway, never committed.

- [ ] **Step 1: Confirm cloud has migration 00052**

The four RPCs must exist in cloud before the adapters return real data (otherwise `.rpc(...)` errors → adapter returns `[]` → reports look empty). Ask the user to apply `00052` to cloud (Supabase SQL editor) before runtime verification, OR verify against a branch DB that has it. Without it, the A/B will show the new branch returning empty reports — that's the missing migration, not a code bug.

- [ ] **Step 2: A/B — reports parity**

Write a throwaway `verify32.mjs` that logs in as admin and, for each of the four reports, calls the server action and records the returned aggregates. Run it on `phase-32`, then `git checkout master`, restart dev, run again. Assert the aggregate arrays are equal (same clients/methods/categories/types with same amounts/counts). Expected: **identical numbers** (ADR-0002 preserved).

- [ ] **Step 3: A/B — bulk round-trips**

With the dev server's Supabase request log (or a network counter in the Playwright script), select N invoices in the admin Invoices table and run a bulk status change + a bulk delete. Confirm the DB write is **one** `.in(...)` round-trip (not N), and that on bulk `sent` the invoice-sent email/notification side-effects still fire (check `email_logs` / notifications). Expected: round-trips drop from O(N) to O(1) for the write; side-effects intact.

- [ ] **Step 4: Clean up**

Delete `verify32.mjs`. Stop the dev server.

---

## Done criteria (issue #32 acceptance)

- [ ] Four report functions are thin RPC adapters; grouping/summing is in SQL.
- [ ] Each returns aggregated rows, not all raw rows.
- [ ] Both bulk ops do the DB write in one round-trip, correct succeeded/failed via `countBulkOutcome`.
- [ ] Migration 00052 added (human applies to cloud and confirms).
- [ ] Report signatures unchanged; runtime A/B confirms RPC == old TS on the same data.
- [ ] No Revenue/Collections number changed (ADR-0002).
- [ ] `pnpm build` + `pnpm test:unit` pass; merged to integration via the playbook (no direct master push).
```
