# Client Detail Page Redesign

## Summary

Transform `/admin/clients/[clientId]` from a static contact card into a full **client hub** where admins can view all related data and perform all CRUD operations without leaving the page.

## Current State

- Overview tab: contact info + notes + 3 stats numbers
- Projects tab: EmptyState stub (data fetched but never rendered)
- Invoices tab: EmptyState stub (data fetched but never rendered)
- Contracts tab: partially working but broken i18n keys and dead link to non-existent route
- Activity tab: EmptyState stub
- No inline create/edit — all actions require navigating away

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Tab content | Real data, not stubs | Core requirement |
| Projects display | Cards with summary | Visual, scannable per project |
| Invoices display | Table | Many rows, numeric data, needs sorting |
| Contracts display | Cards | Few items, need space for actions |
| Create/Edit UX | Slide-over drawer (Sheet) | Stays in context, enough space for forms, shadcn Sheet available |
| Activity source | `activity_logs` table | Single source of truth, simple query |
| Messages | Not on client page | Messages belong to project context |
| Data loading | Lazy per tab | Performance: only fetch when tab activated |

## Component Architecture

```
src/app/admin/clients/[clientId]/
  page.tsx                    — Server: fetch client + basic stats only
  client-detail.tsx           — Client: thin orchestrator with tabs + drawer state (~100 lines)

src/components/admin/clients/
  client-overview-tab.tsx     — Stats row + contact info + recent activity
  client-projects-tab.tsx     — Project cards grid + create via drawer
  client-invoices-tab.tsx     — Invoice table + create via drawer
  client-contracts-tab.tsx    — Contract cards grid + create via drawer (refactor existing)
  client-activity-tab.tsx     — Timeline from activity_logs
  client-drawer.tsx           — Shared Sheet shell + mode routing (~80 lines)
  client-form.tsx             — Existing create/edit client form (keep as-is, remove console.error)
```

### Data Flow

1. `page.tsx` (Server Component) fetches: client data + lightweight stats (counts, totals)
2. Passes `client` + `stats` to `client-detail.tsx` — NO `contracts` or `projects` props
3. Each tab component fetches its own data on mount (lazy loading)
4. Drawer receives `mode` prop to determine which form to render
5. After drawer save → callback `onSuccess` from drawer to parent → parent increments a `refreshKey` counter → tabs receive new key and re-fetch

### Drawer Modes

Exported from `src/types/index.ts` (co-located with other shared types):

```typescript
type DrawerMode =
  | { type: 'create-project'; clientId: string }
  | { type: 'edit-project'; projectId: string; clientId: string }
  | { type: 'create-invoice'; clientId: string; projects: { id: string; title: string }[] }
  | { type: 'edit-invoice'; invoiceId: string; clientId: string }
  | { type: 'create-contract'; clientId: string; projects: { id: string; title: string }[] }
  | { type: 'edit-contract'; contractId: string; clientId: string }
```

Note: Invoice and contract creation modes include `projects` list so the form can show a dropdown of this client's projects without an extra fetch.

### Refresh Mechanism

`router.refresh()` alone does NOT refresh client-side state in tab components. Instead:

1. `client-detail.tsx` holds `const [refreshKey, setRefreshKey] = useState(0)`
2. Drawer `onSuccess` calls `setRefreshKey(k => k + 1)` + `router.refresh()` (for server stats)
3. Each tab receives `refreshKey` as a dependency — re-fetches data when it changes
4. Forms used inside the drawer receive `onSuccess?: () => void` callback instead of doing `router.push`

### Refactor Scope for `client-detail.tsx`

**Stays in shell:**
- Tab navigation (Tabs component)
- Drawer state (`drawerOpen`, `drawerMode`)
- `refreshKey` state
- PageHeader with Back, Edit, Invite, Delete buttons
- Delete flow (ConfirmDialog + `deleteClient` call)
- Invite flow (`inviteClient` call)

**Moves to tab components:**
- All overview content (stats cards, contact info, notes) → `client-overview-tab.tsx`
- Projects EmptyState → `client-projects-tab.tsx` (replaced with real cards)
- Invoices EmptyState → `client-invoices-tab.tsx` (replaced with real table)
- Contracts list → `client-contracts-tab.tsx` (refactored)
- Activity EmptyState → `client-activity-tab.tsx` (replaced with timeline)

## Tab Designs

### Overview Tab

**Layout: stats row + 2-column grid**

**Stats Row (4 cards):**
- Total Projects (badge showing active count)
- Total Invoiced (EUR)
- Total Paid (EUR)
- Unpaid Balance (EUR, red if > 0)

**Left Column — Client Info:**
- Email, phone, company, VAT, address (with icons)
- Portal status: active (has `user_id`) or "Not invited" + invite button
- Notes section

**Right Column — Recent Activity:**
- Last 5 entries from `activity_logs` filtered by client
- Each: icon + description + relative time
- "View all" link → switches to Activity tab
- **Loading state:** Skeleton with 5 placeholder rows while fetching

**Data:** Stats from server component props. Recent activity fetched client-side on mount with loading skeleton.

### Projects Tab

**Grid of project cards (2 cols desktop, 1 mobile) + "New Project" button**

**Each card shows:**
- Title
- Status badge (planning / active / on_hold / completed / cancelled)
- Task progress: done/total
- Deliverables count
- Start date
- Actions: "View" → `/admin/projects/[id]`, "Edit" → opens drawer

Note: Unread messages badge deferred — requires a batch count query or DB view. Can add later without changing the card layout.

**"+ New Project" button:**
- Opens drawer with pre-filled `client_id` (locked, not selectable)
- Save → close drawer → `onSuccess` callback → refresh cards

**Empty state:** "No projects yet" + "Create first project" button

**Data:** New `getProjectsByClient(clientId)` action with explicit column list (no `select('*')`):
```typescript
.select('id, title, status, start_date, created_at, tasks_count, tasks_done, deliverables_count')
```
Note: `tasks_count`, `tasks_done`, `deliverables_count` need to be derived — either via a DB view/function or by fetching tasks/deliverables counts in a separate lightweight query.

### Invoices Tab

**Table + summary row + "New Invoice" button**

**Table columns:**
- # — full invoice number (`DMS-2026-012`) displayed as-is for clarity
- Project (title from joined project)
- Amount (EUR, formatted)
- Status (StatusBadge: draft/sent/viewed/paid/overdue/cancelled)
- Due date (red text + icon if overdue)
- Actions menu: View, Edit, Download PDF, Mark as paid

**Summary row at bottom:**
- Total invoiced, total paid, unpaid balance (red if > 0)

**Sorting:** Default by date desc. Clickable headers.

**"+ New Invoice" button:**
- Tab fetches this client's projects list on mount
- Opens drawer with `{ type: 'create-invoice', clientId, projects }` — projects list passed in mode
- Save → close → `onSuccess` → refresh table

**Empty state:** "No invoices yet" + create button

**Data:** `getInvoices({ client_id })` on tab mount (already has explicit column list).

### Contracts Tab (refactor existing)

**Grid of contract cards (2 cols desktop, 1 mobile) + "New Contract" button**

**Each card shows:**
- Title
- Project name
- Status badge (sent / viewed / signed / cancelled)
- Date based on status (sent_at / viewed_at / signed_at)
- Actions: "View" → `/admin/contracts/[id]`, "PDF" (if signed), "Resend" (if unsigned)

**"+ New Contract" button:**
- Uses same projects list from tab (fetched on mount)
- Opens drawer with `{ type: 'create-contract', clientId, projects }`

**Fix existing issues:**
- Replace wrong i18n keys (`addClient` → `addContract`, `noClients` → `noContracts`)
- Remove dead link to `/admin/clients/[id]/contracts/new`
- Wire up to drawer instead
- Fix tab trigger key (`tc('status')` → `t('tabs.contracts')`)

**Data:** Refactor `getContractsByClient(clientId)` to use explicit column list:
```typescript
.select('id, title, status, sent_at, viewed_at, signed_at, created_at, project:projects(id, title)')
```

**Type:** Add `ContractWithProject` to `src/types/relations.ts`:
```typescript
interface ContractWithProject extends Contract {
  project: { id: string; title: string } | null;
}
```

### Activity Tab

**Timeline list with pagination**

**Each entry:**
- Colored dot by type (green: payment, blue: creation, yellow: sent, etc.)
- Description of action
- Relative time (recent) → absolute date (older)

**Pagination:** 20 per page + "Load more" button

**Empty state:** "No activity yet"

**Data filter logic:** The `activity_logs` table has `entity_type` + `entity_id` but NO `client_id` column. Filter strategy:
1. First fetch this client's project IDs: `getProjects({ client_id })` → extract IDs
2. Query `activity_logs` with: `entity_type = 'client' AND entity_id = clientId` OR `entity_type = 'project' AND entity_id IN (projectIds)` OR `entity_type IN ('invoice', 'contract', 'deliverable') AND entity_id IN (related entity IDs)`
3. Simplified approach: Create a new server action `getActivityByClient(clientId, { limit, offset })` that does the multi-step query server-side and returns a flat paginated list.

## Files to Create

1. `src/components/admin/clients/client-overview-tab.tsx` — new
2. `src/components/admin/clients/client-projects-tab.tsx` — new
3. `src/components/admin/clients/client-invoices-tab.tsx` — new
4. `src/components/admin/clients/client-activity-tab.tsx` — new
5. `src/components/admin/clients/client-drawer.tsx` — new (Sheet shell + mode routing, ~80 lines)
6. `src/lib/actions/activity.ts` — new: `getActivityByClient(clientId, { limit, offset })` server action

## Files to Modify

1. `src/app/admin/clients/[clientId]/page.tsx` — simplify: fetch client + stats only, remove contracts/projects/invoices fetching
2. `src/app/admin/clients/[clientId]/client-detail.tsx` — refactor to thin orchestrator: remove all tab content, add drawer state + refreshKey
3. `src/components/admin/clients/client-contracts-tab.tsx` — fix i18n keys, remove dead link, wire to drawer, fetch own data on mount
4. `src/components/admin/clients/client-form.tsx` — remove `console.error`, ensure `onSuccess` callback works for drawer usage
5. `src/lib/actions/contracts.ts` — fix `getContractsByClient` to use explicit column list instead of `select('*')`
6. `src/lib/actions/projects.ts` — add `getProjectsByClient(clientId)` with explicit columns (or modify `getProjects`)
7. `src/types/index.ts` — add `DrawerMode` type
8. `src/types/relations.ts` — add `ContractWithProject` type
9. `messages/en.json` + `messages/el.json` — add new i18n keys

## Files to Delete

None — we refactor, not replace.

## i18n Keys Needed

New keys in `messages/en.json` and `messages/el.json` under `clients` namespace:
- `tabs.overview`, `tabs.projects`, `tabs.invoices`, `tabs.contracts`, `tabs.activity`
- `stats.totalProjects`, `stats.totalInvoiced`, `stats.totalPaid`, `stats.unpaidBalance`
- `activity.viewAll`, `activity.loadMore`, `activity.noActivity`
- `drawer.createProject`, `drawer.createInvoice`, `drawer.createContract`
- `contracts.addContract`, `contracts.noContracts`, `contracts.noContractsDescription`
- `projects.noProjects`, `projects.noProjectsDescription`, `projects.createFirst`
- `invoices.noInvoices`, `invoices.noInvoicesDescription`
- Project card labels, invoice table headers, etc.

## Out of Scope

- Avatar upload (remains disabled)
- Client-level messaging (stays per project)
- Unread messages badge on project cards (needs batch query or DB view — add later)
- Server-side filtering on client list (separate concern)
- Role checks on `getClients`/`getClient` actions (security fix, tracked in FIXES.md)
