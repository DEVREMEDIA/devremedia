# Phase 0 (Security) — Review Guide

Implements §2 of [`2026-07-29-platform-audit.md`](./2026-07-29-platform-audit.md).
Branch: `fix/phase-0-security`. **Nothing is applied to the cloud database by this PR** — see
[Applying the migration](#3-applying-the-migration-you-not-the-agent).

Everything here is additive: policies are dropped and recreated, no table, column or row is touched.

---

## 1. What changed and why

| # | Change | Files | Audit |
|---|--------|-------|-------|
| 1 | `messages` SELECT / INSERT / UPDATE policies scoped again | `supabase/migrations/20260729_phase0_security_rls.sql` | §2.1 |
| 2 | `annotation_seen` SELECT scoped to the deliverable's project | same migration | §2.3 |
| 3 | Employees can no longer delete `approved` / `final` deliverables | same migration | §2.3 |
| 4 | Admin-client notification helpers moved out of the `'use server'` file | `src/lib/notification-helpers.ts` (new), `src/lib/actions/notifications.ts` + 16 call sites | §2.2 |
| 5 | Invoice write actions require an admin | `src/lib/actions/invoices.ts` | §2.3 |
| 6 | Lead / lead-activity write actions require admin or salesman | `src/lib/actions/leads.ts`, `lead-activities.ts`, `src/lib/auth-helpers.ts` | §2.3 |

### 1 — messages RLS

`supabase/migrations/20240209_messaging_webhook.sql` recreates the `messages` policies as
"the project exists" (SELECT), "any authenticated user" (INSERT) and `USING (true) WITH CHECK (true)`
(UPDATE). Migrations apply in lexicographic filename order, and `20240209_…` sorts **after** every
`000xx_…` file, so it silently overrides the correct scoped policies from `00017` and `00026`.

The fix reinstates them:

- **SELECT** — admin (`is_admin()`), the project's client (`clients.user_id`), or an assigned
  employee; plus the channel split, so `team` messages stay hidden from the client. This is the
  `00026` policy with `(select auth.uid())` wrapping and **one deliberate extension**: "assigned
  employee" now also covers employees assigned via tasks (`tasks.assigned_to`, multi-member
  assignment from PRs #86/#88), not only the single `projects.assigned_to` owner. `00026` predates
  multi-member assignment — restoring it verbatim would have cut task-assigned employees off from
  their project's messages. The same task-based clause is applied to INSERT and UPDATE below,
  matching what the `annotation_seen` policy in this migration already does.
- **UPDATE** — the `00017` policy (you may only update rows you may read).
- **INSERT** — **this goes one step beyond the literal audit text.** §2.1 names SELECT and UPDATE,
  but the same migration also widened INSERT to "any authenticated user, any project", which lets
  anyone post into any project's thread. Reinstating read scope while leaving write open would be a
  half fix, so the INSERT policy is scoped the same way: you must be the sender, and admin / the
  project's client (client channel only) / the assigned employee. Flagging it explicitly so you can
  veto it.

The migration is named `20260729_phase0_security_rls.sql`, **not** `00065_…` as the audit suggested.
A `00065_` file would sort before `20240209_…` and be overridden again on any fresh environment
(local reset, CI, rebuild). The old migration is left untouched as history.

### 2 — annotation_seen

`00059` shipped `using (auth.uid() is not null)`, so any logged-in user could read who has seen which
annotation, across every client. Now scoped through `video_annotations → deliverables → projects`,
mirroring the `video_annotations` rules (admin / the project's client) **plus** the assigned employee
— employees need it for the bidirectional read receipts on their deliverables page, and excluding
them would break that flow.

### 3 — employee deliverable delete

`00056` let an assigned employee delete any deliverable on their project. The policy now excludes
`status IN ('approved', 'final')`. Admins are unaffected (separate "Admins full access" policy).

### 4 — notification helpers

`src/lib/actions/notifications.ts` starts with `'use server'`, which makes **every export** a publicly
callable Server Action endpoint. Five helpers there — `getClientUserIdFromProject`,
`getClientUserIdFromClientId`, `getAdminUserIds`, `createNotification`, `createNotificationForMany` —
ran on `createAdminClient()` (RLS bypass) with no auth check whatsoever.

They moved verbatim to `src/lib/notification-helpers.ts`, a plain module with **no** `'use server'`
directive, so they are ordinary server functions again. All 16 importers were repointed (13 source
files + 3 test mocks). The user-facing actions stayed in the actions file — they already call
`requireUser()`.

The `server-only` package is not a dependency of this project, so it was not added; the module is
protected by not being a Server Action plus the admin client's server-side env guard. Worth adding
the package as a follow-up if you want the import-time guarantee.

### 5 — invoices

All six write actions checked only `requireUser()`, leaving RLS as the single line of defence, unlike
`contracts.ts` / `clients.ts` which call `requireAdmin()`. Every caller of these actions is an admin
surface (`src/app/admin/*`, `src/components/admin/*`) — verified by grep — and the Stripe webhook
uses the admin client directly, so nothing client-facing is affected.

### 6 — leads

Lead writes had no role check at all. `requireRole(roles)` was added to `src/lib/auth-helpers.ts`
(admins and super_admins always pass; the caller lists the extra roles) with unit tests, and the five
lead writes plus `createLeadActivity` now call `requireRole(['salesman'])`. Reads are unchanged.

> The salesman convert-lead RLS bug (audit §3.1) is **not** touched here — that is Phase 1.

---

## 2. Deliberately NOT changed

| Item | Why |
|------|-----|
| `attachments` storage bucket is **public** (`20240209:58-74`) | Flipping it to private would break every existing message-attachment URL. Needs its own decision + a signed-URL path. **Your call.** |
| `idx_messages_project_created_recent` has a frozen `NOW()` predicate (`20240209:51-53`) | Performance, not security — Phase 2. |
| Everything in audit §3–§7 | Phases 1–3. |

---

## 3. Applying the migration (you, not the agent)

The agent has no access to the cloud database. Run this yourself.

**Step 1 — snapshot the current state** (Supabase SQL editor), so you can compare before/after:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('messages', 'annotation_seen', 'deliverables')
order by tablename, policyname;
```

Note what `messages` looks like today. Which policy actually won on cloud depends on the historical
apply order, not on filename order — so production may or may not currently be open. **Check, don't
assume.**

**Step 2 — apply** `supabase/migrations/20260729_phase0_security_rls.sql` (paste it into the SQL
editor, or `supabase db push` if your CLI is linked).

**Step 3 — re-run the query from step 1** and confirm:

- `messages` SELECT `qual` mentions `clients`, `assigned_to` and `channel` — not just `projects`.
- `messages` UPDATE has a real `qual`/`with_check`, not `true`.
- `messages` INSERT `with_check` mentions `sender_id` and `clients`.
- `annotation_seen` has **"Users can read annotation_seen for their deliverables"**, and the old
  "Authenticated users can read annotation_seen" is gone.
- `deliverables` → `employees_delete_deliverables` `qual` contains `status <> ALL (…approved, final…)`.

---

## 4. Manual smoke test after applying

| Role | Check | Expected |
|------|-------|----------|
| Client | Open a project → Messages | Sees own project's client-channel messages; sends one fine |
| Client | Any other client's project | No messages leak (also verify via the API, not just the UI) |
| Client | Team channel | Not visible |
| Employee | Assigned project → Messages | Sees client + team channel, can post |
| Employee | Deliverable in `approved`/`final` → Delete | Fails (RLS) — the button should be hidden too; if it isn't, that is a Phase 1 UI item |
| Employee | Deliverable in `pending_review` → Delete | Still works |
| Admin | Everything above | Unchanged |
| Admin | Change an invoice status | Still works, and the client still gets the notification (proves the helper move) |
| Admin | Create / edit / delete an invoice, bulk actions | Still work |
| Salesman | Create a lead, add an activity, move a stage | Still work |
| Client / Employee | (if you can craft it) call a lead write action | Rejected with "Forbidden: insufficient permissions" |

Deliverable annotations: open one as client and as employee and confirm the "seen by" receipts still
render — that is the annotation_seen policy in action.

---

## 5. Verification already done

| Gate | Result |
|------|--------|
| `pnpm type-check` | clean |
| `pnpm test` | 190 passed (was 185 — 5 new `requireRole` tests) |
| `pnpm lint` | 0 errors, 31 warnings, all pre-existing |
| `pnpm build` | see the PR body |

The SQL itself has **not** been executed anywhere — there is no local Supabase instance in this
workspace. Step 3 above is the real verification.
