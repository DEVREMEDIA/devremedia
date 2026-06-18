# Spike #37 — Role-list unification

**Type:** Investigation spike (HITL). No production code shipped.
**Question:** Should the four role-based list/table pages (admin / client / employee / salesman) be unified behind shared components?
**Decision rule:** *Two-adapters rule* — unify only where **≥2 roles genuinely share behavior** (same data shape + similar columns + similar actions), not superficial visual likeness.
**Recommendation:** **NO-GO on unifying the list pages.** Extract small shared primitives instead.
**Outcome (signed off 2026-06-18):** Accepted → `docs/adr/0004-role-list-pages-stay-separate.md`. Follow-up cleanup tracked as a GitHub issue.

---

## What exists today

### Shared infrastructure
- `src/components/shared/data-table.tsx` — generic TanStack wrapper. Single-column search (`searchKey`), client-side pagination/sort/column-visibility. **No `onRowClick`, no tabs, no status filter, no actions column** (callers supply those externally).
- It is actually used by only **2 pages** (admin projects-list, admin clients). Every other "list" is bespoke.
- A **second, competing** TanStack table exists: `src/components/admin/invoices/invoices-table-view.tsx` (row-selection + bulk actions, its own pagination) — does **not** use the shared `DataTable`.
- An apparently **dead** `src/components/admin/contracts/contract-list.tsx` table exists but the admin contracts page renders the card-based `contracts-list-page.tsx` instead.

### Per-role lists (entity · fetch · UI)
| Role | Entity | Fetch | UI |
|---|---|---|---|
| admin | projects | `getProjects()` (all, joined client) | kanban **or** shared `DataTable` |
| admin | invoices | `getInvoices()` (all) | client-grouped accordion + bespoke `InvoicesTableView` |
| admin | clients | `getClients()` | shared `DataTable` |
| admin | leads | `getLeads()` + analytics | bespoke `<Table>` + tabs |
| admin | contracts | `getAllContracts()` (`requireAdmin`) | bespoke card list |
| admin | filming-requests / proposals / users | per-action | bespoke |
| client | projects | `getProjects({client_id})` (RLS) | bespoke timeline card grid |
| client | invoices | `getInvoices({status, client_id})` | bespoke card list + **Pay Now** (Stripe) |
| client | contracts | `getMyContracts()` (RLS) | bespoke card list + **upload-signed / download** |
| employee | projects | `getMyProjects(userId)` (task-union, slim shape) | bespoke timeline card grid |
| employee | tasks | inline Supabase query | bespoke card grid + status/priority filters |
| salesman | leads | `getLeadsByAssignee(userId)` | `@dnd-kit` **kanban** (drag-to-restage) |

---

## Cross-role comparison (shared entity names)

| Entity | Roles | Verdict |
|---|---|---|
| **Projects** | admin, client, employee (3) | 3 data shapes, 3 fetch strategies, 3 action sets. Client & employee cards *look* alike but use different data and are separate components. **Fails the rule.** |
| **Invoices** | admin, client (2) | Admin = financial mgmt (grouping, bulk status mutations); client = payment surface (Pay Now). Different columns/actions. **Fails.** |
| **Contracts** | admin, client (2) | Different RLS scope, fields (admin shows client; client shows expiry/signing), actions (manage/delete vs sign/download). **Fails.** |
| **Leads** | admin, salesman (2) | Read-only analytical table vs interactive drag kanban; all vs own. **Fails.** |
| Tasks / proposals / users / filming-requests | single role each | No overlap. |

**No entity passes the two-adapters rule.** Each shared pair shares only an *entity name*; columns, RLS scope, and actions diverge materially (manage-vs-pay, manage-vs-sign, analyze-vs-sell).

---

## Recommendation — NO-GO on page unification; YES on 3 small primitives

Unifying the list *pages* would be a premature, single-use abstraction (exactly what the user dislikes). The real, low-risk duplication is narrower:

1. **Production-timeline card** — client `projects-list.tsx` and employee `project-list.tsx` duplicate near-identical stage-timeline card visuals. Extract one **presentational** component (props in, no data fetching).
2. **`PROJECT_STAGES` / stage-label constants** — duplicated across client (×2) and employee files. Source from one place (`src/lib/constants/`).
3. **Admin table convergence** — fold the bespoke `InvoicesTableView` onto the shared `DataTable` *within the admin role only* (where bulk-actions could become a `DataTable` feature), and delete the dead `contract-list.tsx`. This is admin-internal cleanup, not cross-role unification.

These are each ≥2-real-use-cases consolidations of *primitives*, not pages — they pass the rule; page unification does not.

---

## ADR (accepted → `docs/adr/0004-role-list-pages-stay-separate.md`)

> **Title:** Role list pages stay separate; share presentational primitives only
>
> **Context:** Four roles render entity lists. Superficially the same entities recur (projects ×3, invoices/contracts/leads ×2), tempting a unified list abstraction. Investigation (#37) shows each role's list differs in data shape, RLS scope, columns, and actions; only small visual/constant fragments truly repeat.
>
> **Decision:** Do **not** unify role list pages behind a shared list/page abstraction. Keep one bespoke list per (role, entity). Consolidate only three primitives: the production-timeline card, the stage constants, and admin-internal table engines (converge `InvoicesTableView` → `DataTable`, remove dead `contract-list.tsx`).
>
> **Consequences:** Some boilerplate per list remains (accepted — it stays readable and independently evolvable per role/RLS). The shared `DataTable` stays admin-focused; investing in its features benefits few call sites, so do so only when a 2nd admin caller needs it. Extracted primitives reduce the genuine duplication without coupling unrelated role surfaces.
