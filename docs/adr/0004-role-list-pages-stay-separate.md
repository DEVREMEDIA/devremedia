# Role list pages stay separate; share presentational primitives only

Each `(role, entity)` list page (admin / client / employee / salesman) stays its own
bespoke component. We do **not** introduce a unified list/page abstraction. The only
consolidation is of small shared fragments: the project-stage constants and dead code.

## Context

Spike #37 mapped every list/table across the four roles. The same *entity names* recur —
projects in 3 roles, invoices / contracts / leads in 2 each — which superficially looks
like extractable duplication. Investigation showed each role's list differs in **data
shape, fetch path, RLS scope, columns, and actions**:

- **Projects**: admin = full management table (edit/delete/create-invoice); client = read-only
  timeline card scoped to its own client via RLS; employee = slimmed card built from
  task-assignment union. Three shapes, three fetches, three action sets.
- **Invoices**: admin = financial console (client grouping, bulk mark-sent/paid); client =
  payment surface (Pay Now / Stripe).
- **Contracts**: admin manages/deletes; client uploads-signed / downloads.
- **Leads**: admin = analytical table + tabs; salesman = `@dnd-kit` drag kanban.

Applying the **two-adapters rule** (unify only where ≥2 roles genuinely share behavior),
**no entity qualifies** — each pair shares an entity name only. The shared `DataTable` is
itself used by just 2 admin pages; every other list is already bespoke.

## Decision

- Do **not** unify role list pages. Keep one bespoke list per `(role, entity)`. A unified
  component would collapse into `if (role === ...)` branching — hiding the difference, not
  removing it, and coupling four independently-evolving surfaces.
- Consolidate only what is genuinely duplicated and correctness-sensitive:
  - **`PROJECT_STAGES` / stage constants** → single source (they describe one truth; two
    copies can disagree about what stages a project has).
  - **Delete the dead `src/components/admin/contracts/contract-list.tsx`** (unused; the
    admin contracts page renders the card-based `contracts-list-page.tsx`).
- The client/employee project-timeline *card* may be extracted into one presentational
  component **only opportunistically** (when it is being edited anyway) — not as standalone
  work. The bespoke `InvoicesTableView` is **left as-is** (working financial code; a rewrite
  onto `DataTable` carries real risk for no meaningful gain).

## Consequences

- Per-list boilerplate remains, by design — each list stays readable and independently
  evolvable per role and RLS policy.
- The shared `DataTable` stays admin-focused; invest in its features (tabs, row-click,
  status filter) only when a second admin caller actually needs them.
- A future engineer should not "DRY up" these lists by entity name without re-reading this
  ADR — the shared name is not shared behavior.
