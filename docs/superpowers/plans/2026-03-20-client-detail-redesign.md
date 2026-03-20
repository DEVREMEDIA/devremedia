# Client Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/admin/clients/[clientId]` from a static contact card into a full client hub with real data in all tabs and inline create/edit via slide-over drawer.

**Architecture:** Component-split approach — thin orchestrator (`client-detail.tsx`) with lazy-loaded tab components and a shared drawer (shadcn `Sheet`). Each tab fetches its own data on mount. A `refreshKey` counter triggers re-fetches after drawer saves.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, shadcn/ui (Sheet, Tabs, Card), next-intl, react-hook-form + Zod, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-20-client-detail-redesign.md`

---

## File Map

### Files to Create
| File | Responsibility | Est. Lines |
|---|---|---|
| `src/components/admin/clients/client-overview-tab.tsx` | Stats row + contact info + recent activity | ~180 |
| `src/components/admin/clients/client-projects-tab.tsx` | Project cards grid | ~150 |
| `src/components/admin/clients/client-invoices-tab.tsx` | Invoice table + summary | ~200 |
| `src/components/admin/clients/client-activity-tab.tsx` | Timeline from activity_logs | ~120 |
| `src/components/admin/clients/client-drawer.tsx` | Sheet shell + mode routing | ~80 |
| `src/lib/actions/activity.ts` | `getActivityByClient` server action | ~60 |

### Files to Modify
| File | Change | Lines Affected |
|---|---|---|
| `src/types/relations.ts` | Add `DrawerMode` type | append |
| `src/lib/actions/contracts.ts:84-103` | Fix `getContractsByClient` select('*') | lines 94 |
| `src/components/admin/projects/project-form.tsx` | Add `onSuccess` callback prop | lines 37-40, ~72 |
| `src/components/admin/invoices/invoice-form.tsx` | Add `onSuccess` callback prop | props type, submit handler |
| `src/components/admin/clients/client-contracts-tab.tsx` | Fix i18n, remove dead link, self-fetch | full rewrite |
| `src/components/admin/clients/client-form.tsx:84` | Remove `console.error` | line 84 |
| `src/app/admin/clients/[clientId]/page.tsx` | Simplify to client + stats only | lines 36-74 |
| `src/app/admin/clients/[clientId]/client-detail.tsx` | Refactor to thin orchestrator | full rewrite |
| `messages/en.json` | Add new i18n keys | clients section |
| `messages/el.json` | Add new i18n keys | clients section |

---

## Task 1: Foundation — Types + i18n Keys

**Files:**
- Modify: `src/types/relations.ts` (append after line 68)
- Modify: `messages/en.json` (clients section)
- Modify: `messages/el.json` (clients section)

- [ ] **Step 1: Update ContractWithProject type and add DrawerMode to relations.ts**

In `src/types/relations.ts`, first update `ContractWithProject` (line 66-68) to include `id` in project:

```typescript
export type ContractWithProject = Contract & {
  project: { id: string; title: string } | null;
};
```

Then add after it:

```typescript
// Phase 1: Create modes only. Edit modes use existing edit pages via navigation.
export type ClientDrawerMode =
  | { type: 'create-project'; clientId: string }
  | { type: 'create-invoice'; clientId: string; projects: { id: string; title: string; client_id: string }[]; nextInvoiceNumber: string };
```

- [ ] **Step 2: Add i18n keys to en.json**

Add these keys inside the `"clients"` object in `messages/en.json`:

```json
"tabs": {
  "overview": "Overview",
  "projects": "Projects",
  "invoices": "Invoices",
  "contracts": "Contracts",
  "activity": "Activity"
},
"stats": {
  "totalProjects": "Total Projects",
  "activeProjects": "active",
  "totalInvoiced": "Total Invoiced",
  "totalPaid": "Total Paid",
  "unpaidBalance": "Unpaid Balance"
},
"projects": {
  "noProjects": "No projects yet",
  "noProjectsDescription": "Create the first project for this client",
  "createFirst": "Create Project",
  "tasks": "Tasks",
  "deliverables": "Deliverables",
  "view": "View Project",
  "edit": "Edit Project"
},
"invoices": {
  "noInvoices": "No invoices yet",
  "noInvoicesDescription": "Create the first invoice for this client",
  "createFirst": "Create Invoice",
  "project": "Project",
  "amount": "Amount",
  "dueDate": "Due Date",
  "summary": "Summary"
},
"contracts": {
  "noContracts": "No contracts yet",
  "noContractsDescription": "Create the first contract for this client",
  "addContract": "New Contract",
  "view": "View",
  "downloadPdf": "Download PDF",
  "resend": "Resend"
},
"activityTab": {
  "title": "Activity",
  "noActivity": "No activity yet",
  "noActivityDescription": "Activity will appear here as you work with this client",
  "viewAll": "View all activity",
  "loadMore": "Load more"
},
"drawer": {
  "createProject": "New Project",
  "createInvoice": "New Invoice",
  "createContract": "New Contract",
  "editProject": "Edit Project",
  "editInvoice": "Edit Invoice",
  "editContract": "Edit Contract"
},
"portalStatus": {
  "active": "Portal Active",
  "notInvited": "Not Invited"
}
```

- [ ] **Step 3: Add matching Greek keys to el.json**

Add the same structure with Greek translations:

```json
"tabs": {
  "overview": "Επισκόπηση",
  "projects": "Projects",
  "invoices": "Τιμολόγια",
  "contracts": "Συμβόλαια",
  "activity": "Δραστηριότητα"
},
"stats": {
  "totalProjects": "Σύνολο Projects",
  "activeProjects": "ενεργά",
  "totalInvoiced": "Τιμολογημένα",
  "totalPaid": "Πληρωμένα",
  "unpaidBalance": "Υπόλοιπο"
},
"projects": {
  "noProjects": "Δεν υπάρχουν projects",
  "noProjectsDescription": "Δημιουργήστε το πρώτο project για αυτόν τον πελάτη",
  "createFirst": "Δημιουργία Project",
  "tasks": "Εργασίες",
  "deliverables": "Παραδοτέα",
  "view": "Προβολή Project",
  "edit": "Επεξεργασία Project"
},
"invoices": {
  "noInvoices": "Δεν υπάρχουν τιμολόγια",
  "noInvoicesDescription": "Δημιουργήστε το πρώτο τιμολόγιο για αυτόν τον πελάτη",
  "createFirst": "Δημιουργία Τιμολογίου",
  "project": "Project",
  "amount": "Ποσό",
  "dueDate": "Ημ. Λήξης",
  "summary": "Σύνοψη"
},
"contracts": {
  "noContracts": "Δεν υπάρχουν συμβόλαια",
  "noContractsDescription": "Δημιουργήστε το πρώτο συμβόλαιο για αυτόν τον πελάτη",
  "addContract": "Νέο Συμβόλαιο",
  "view": "Προβολή",
  "downloadPdf": "Λήψη PDF",
  "resend": "Επαναποστολή"
},
"activityTab": {
  "title": "Δραστηριότητα",
  "noActivity": "Δεν υπάρχει δραστηριότητα",
  "noActivityDescription": "Η δραστηριότητα θα εμφανιστεί εδώ καθώς εργάζεστε με αυτόν τον πελάτη",
  "viewAll": "Δες όλη τη δραστηριότητα",
  "loadMore": "Φόρτωσε περισσότερα"
},
"drawer": {
  "createProject": "Νέο Project",
  "createInvoice": "Νέο Τιμολόγιο",
  "createContract": "Νέο Συμβόλαιο",
  "editProject": "Επεξεργασία Project",
  "editInvoice": "Επεξεργασία Τιμολογίου",
  "editContract": "Επεξεργασία Συμβολαίου"
},
"portalStatus": {
  "active": "Portal Ενεργό",
  "notInvited": "Μη Προσκεκλημένος"
}
```

- [ ] **Step 4: Build to verify no breakage**

Run: `pnpm build`
Expected: PASS (new keys don't break anything, type addition is additive)

- [ ] **Step 5: Commit**

```bash
git add src/types/relations.ts messages/en.json messages/el.json
git commit -m "feat(clients): add DrawerMode type and i18n keys for client detail redesign"
```

---

## Task 2: Server Action — getActivityByClient

**Files:**
- Create: `src/lib/actions/activity.ts`

- [ ] **Step 1: Create the activity server action**

Create `src/lib/actions/activity.ts`:

```typescript
'use server';

import { createClient as createSupabase } from '@/lib/supabase/server';
import type { ActionResult, ActivityLog } from '@/types/index';
import type { ActivityLogWithUser } from '@/types/relations';

interface ActivityFilters {
  limit?: number;
  offset?: number;
}

export async function getActivityByClient(
  clientId: string,
  filters?: ActivityFilters,
): Promise<ActionResult<ActivityLogWithUser[]>> {
  try {
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    // Get all project IDs for this client
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', clientId);

    const projectIds = (projects ?? []).map((p) => p.id);

    // Build filter: client entity OR project entities
    // activity_logs has entity_type + entity_id but no client_id column
    let query = supabase
      .from('activity_logs')
      .select('id, entity_type, entity_id, action, user_id, changes, created_at, user:user_profiles(id, display_name, avatar_url, role)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectIds.length > 0) {
      // Client-related OR project-related activity
      query = query.or(
        `and(entity_type.eq.client,entity_id.eq.${clientId}),and(entity_type.eq.project,entity_id.in.(${projectIds.join(',')}))`
      );
    } else {
      // Only client-related activity
      query = query.eq('entity_type', 'client').eq('entity_id', clientId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as ActivityLogWithUser[], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch activity' };
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/activity.ts
git commit -m "feat(activity): add getActivityByClient server action"
```

---

## Task 3: Fix getContractsByClient select('*')

**Files:**
- Modify: `src/lib/actions/contracts.ts` (line 94)

- [ ] **Step 1: Fix the select to use explicit columns**

In `src/lib/actions/contracts.ts`, find the `getContractsByClient` function (~line 94). Change:

```typescript
.select('*, project:projects(title)')
```

To:

```typescript
.select('id, title, status, client_id, project_id, sent_at, viewed_at, signed_at, created_at, project:projects(id, title)')
```

- [ ] **Step 2: Fix return type**

Change the function return type from `Promise<ActionResult<Contract[]>>` to `Promise<ActionResult<ContractWithProject[]>>`.

Add the import at the top:

```typescript
import type { ContractWithProject } from '@/types/relations';
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: PASS (or may need to fix callers that expect full `Contract` type — check the client-detail page cast)

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/contracts.ts
git commit -m "fix(contracts): use explicit columns in getContractsByClient instead of select('*')"
```

---

## Task 4: Add onSuccess Callback to ProjectForm and InvoiceForm

**Files:**
- Modify: `src/components/admin/projects/project-form.tsx` (lines 37-40, submit handler)
- Modify: `src/components/admin/invoices/invoice-form.tsx` (props type, submit handler)
- Modify: `src/components/admin/clients/client-form.tsx` (line 84)

- [ ] **Step 1: Add onSuccess to ProjectForm**

In `src/components/admin/projects/project-form.tsx`:

1. Update the props interface (~line 37-40):

```typescript
interface ProjectFormProps {
  project?: ProjectWithClient;
  clients: Client[];
  onSuccess?: () => void;
}
```

2. Update the component to destructure `onSuccess`:

```typescript
export function ProjectForm({ project, clients, onSuccess }: ProjectFormProps) {
```

3. In the submit handler, after `toast.success(...)`, add before `router.push`:

```typescript
if (onSuccess) {
  onSuccess();
  return;
}
```

This way, when used in the drawer, it calls the callback instead of navigating.

- [ ] **Step 2: Add onSuccess to InvoiceForm**

Same pattern in `src/components/admin/invoices/invoice-form.tsx`:

1. Add `onSuccess?: () => void` to the props interface
2. Destructure it in the component
3. In submit handler, after `toast.success(...)`, add `if (onSuccess) { onSuccess(); return; }` before `router.push`

- [ ] **Step 3: Remove console.error from client-form.tsx**

In `src/components/admin/clients/client-form.tsx`, line 84, remove:

```typescript
console.error('Invite failed:', inviteResult.error);
```

The `toast.warning` on line 85 already handles user feedback.

- [ ] **Step 4: Build to verify**

Run: `pnpm build`
Expected: PASS (adding optional prop is non-breaking)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/projects/project-form.tsx src/components/admin/invoices/invoice-form.tsx src/components/admin/clients/client-form.tsx
git commit -m "feat(forms): add onSuccess callback to ProjectForm and InvoiceForm, remove console.error from ClientForm"
```

---

## Task 5: Create Client Drawer Component

**Files:**
- Create: `src/components/admin/clients/client-drawer.tsx`

**Dependency:** Task 4 must be completed first (ProjectForm and InvoiceForm need `onSuccess` prop).

- [ ] **Step 1: Create the drawer shell**

Create `src/components/admin/clients/client-drawer.tsx`. Phase 1 supports only create-project and create-invoice. Contract creation and all edit modes link to existing pages.

```typescript
'use client';

import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProjectForm } from '@/components/admin/projects/project-form';
import { InvoiceForm } from '@/components/admin/invoices/invoice-form';
import type { ClientDrawerMode } from '@/types/relations';
import type { Client } from '@/types/index';

interface ClientDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ClientDrawerMode | null;
  client: Client;
  onSuccess: () => void;
}

const DRAWER_TITLES: Record<ClientDrawerMode['type'], string> = {
  'create-project': 'drawer.createProject',
  'create-invoice': 'drawer.createInvoice',
};

export function ClientDrawer({ open, onOpenChange, mode, client, onSuccess }: ClientDrawerProps) {
  const t = useTranslations('clients');

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode ? t(DRAWER_TITLES[mode.type]) : ''}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mode?.type === 'create-project' && (
            <ProjectForm clients={[client]} onSuccess={handleSuccess} />
          )}
          {mode?.type === 'create-invoice' && (
            <InvoiceForm
              clients={[{ id: client.id, company_name: client.company_name, contact_name: client.contact_name }]}
              projects={mode.projects}
              nextInvoiceNumber={mode.nextInvoiceNumber}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Key decisions:
- Only `create-project` and `create-invoice` are supported in the drawer (Phase 1)
- `InvoiceForm` receives `nextInvoiceNumber` from the mode — the tab fetches it before opening the drawer
- Contract creation links to `/admin/contracts/new` (ContractCreator expects full `Project` object with multi-step wizard — doesn't fit drawer)
- Edit modes link to existing edit pages via navigation

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-drawer.tsx
git commit -m "feat(clients): create ClientDrawer component with Sheet shell"
```

---

## Task 6: Create Client Overview Tab

**Files:**
- Create: `src/components/admin/clients/client-overview-tab.tsx`

- [ ] **Step 1: Create the overview tab component**

Extract all overview content from `client-detail.tsx` lines 163-276 into a new component. The component receives `client`, `stats`, and an `onViewAllActivity` callback.

Create `src/components/admin/clients/client-overview-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import type { ActivityLogWithUser } from '@/types/relations';
import { getActivityByClient } from '@/lib/actions/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Mail, Phone, MapPin, FileText, Shield, ShieldOff,
  Briefcase, Receipt, CreditCard, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientStats {
  totalProjects: number;
  totalInvoiced: number;
  totalPaid: number;
}

interface ClientOverviewTabProps {
  client: Client;
  stats: ClientStats;
  onViewAllActivity: () => void;
}

export function ClientOverviewTab({ client, stats, onViewAllActivity }: ClientOverviewTabProps) {
  const t = useTranslations('clients');
  const [recentActivity, setRecentActivity] = useState<ActivityLogWithUser[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const unpaidBalance = stats.totalInvoiced - stats.totalPaid;

  useEffect(() => {
    async function fetchActivity() {
      const result = await getActivityByClient(client.id, { limit: 5 });
      if (!result.error && result.data) {
        setRecentActivity(result.data);
      }
      setIsLoadingActivity(false);
    }
    fetchActivity();
  }, [client.id]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('stats.totalProjects')}
          value={stats.totalProjects.toString()}
          icon={Briefcase}
        />
        <StatCard
          label={t('stats.totalInvoiced')}
          value={formatCurrency(stats.totalInvoiced)}
          icon={Receipt}
        />
        <StatCard
          label={t('stats.totalPaid')}
          value={formatCurrency(stats.totalPaid)}
          icon={CreditCard}
        />
        <StatCard
          label={t('stats.unpaidBalance')}
          value={formatCurrency(unpaidBalance)}
          icon={AlertCircle}
          highlight={unpaidBalance > 0}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Client Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={client.email} href={`mailto:${client.email}`} />
              {client.phone && (
                <>
                  <Separator />
                  <InfoRow icon={Phone} label={t('phoneNumber')} value={client.phone} href={`tel:${client.phone}`} />
                </>
              )}
              {client.address && (
                <>
                  <Separator />
                  <InfoRow icon={MapPin} label={t('address')} value={client.address} />
                </>
              )}
              {client.vat_number && (
                <>
                  <Separator />
                  <InfoRow icon={FileText} label={t('taxId')} value={client.vat_number} />
                </>
              )}
              <Separator />
              <div className="flex items-start gap-3">
                {client.user_id ? (
                  <Shield className="mt-0.5 h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {client.user_id ? t('portalStatus.active') : t('portalStatus.notInvited')}
                </span>
              </div>
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('clientNotes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('activityTab.title')}</CardTitle>
            <Button variant="link" size="sm" onClick={onViewAllActivity}>
              {t('activityTab.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('activityTab.noActivity')}</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ label, value, icon: Icon, highlight }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-muted-foreground hover:underline">{value}</a>
        ) : (
          <p className="text-sm text-muted-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function ActivityEntry({ entry }: { entry: ActivityLogWithUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {entry.action} {entry.entity_type}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
      </span>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-overview-tab.tsx
git commit -m "feat(clients): create ClientOverviewTab with stats, contact info, and recent activity"
```

---

## Task 7: Create Client Projects Tab

**Files:**
- Create: `src/components/admin/clients/client-projects-tab.tsx`

- [ ] **Step 1: Create the projects tab component**

Create `src/components/admin/clients/client-projects-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getProjects } from '@/lib/actions/projects';
import type { ProjectWithClient } from '@/types/relations';
import type { ClientDrawerMode } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Plus, ExternalLink, ListTodo, Package, Pencil } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ClientProjectsTabProps {
  clientId: string;
  refreshKey: number;
  onOpenDrawer: (mode: ClientDrawerMode) => void;
}

export function ClientProjectsTab({ clientId, refreshKey, onOpenDrawer }: ClientProjectsTabProps) {
  const t = useTranslations('clients');
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      const result = await getProjects({ client_id: clientId });
      if (!result.error && result.data) {
        setProjects(result.data);
      }
      setIsLoading(false);
    }
    fetchProjects();
  }, [clientId, refreshKey]);

  const handleCreate = () => {
    onOpenDrawer({ type: 'create-project', clientId });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Briefcase}
            title={t('projects.noProjects')}
            description={t('projects.noProjectsDescription')}
            action={{ label: t('projects.createFirst'), onClick: handleCreate }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.projects')} ({projects.length})
        </h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('drawer.createProject')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectWithClient }) {
  const t = useTranslations('clients');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{project.title}</CardTitle>
          <StatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.start_date && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(project.start_date), 'MMM d, yyyy')}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            {t('projects.tasks')}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            {t('projects.deliverables')}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}`}>
              <ExternalLink className="mr-1 h-3 w-3" />
              {t('projects.view')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}/edit`}>
              <Pencil className="mr-1 h-3 w-3" />
              {t('projects.edit')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-projects-tab.tsx
git commit -m "feat(clients): create ClientProjectsTab with project cards grid"
```

---

## Task 8: Create Client Invoices Tab

**Files:**
- Create: `src/components/admin/clients/client-invoices-tab.tsx`

- [ ] **Step 1: Create the invoices tab component**

Create `src/components/admin/clients/client-invoices-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from '@/lib/actions/invoices';
import { getProjects } from '@/lib/actions/projects';
import type { InvoiceWithRelations, ClientDrawerMode } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt, Plus, MoreHorizontal, Eye, Download, Pencil, CreditCard } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ClientInvoicesTabProps {
  clientId: string;
  refreshKey: number;
  onOpenDrawer: (mode: ClientDrawerMode) => void;
}

export function ClientInvoicesTab({ clientId, refreshKey, onOpenDrawer }: ClientInvoicesTabProps) {
  const t = useTranslations('clients');
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [clientProjects, setClientProjects] = useState<{ id: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [invoiceResult, projectResult] = await Promise.all([
        getInvoices({ client_id: clientId }),
        getProjects({ client_id: clientId }),
      ]);
      if (!invoiceResult.error && invoiceResult.data) {
        setInvoices(invoiceResult.data);
      }
      if (!projectResult.error && projectResult.data) {
        setClientProjects(projectResult.data.map((p) => ({ id: p.id, title: p.title, client_id: p.client_id ?? clientId })));
      }
      setIsLoading(false);
    }
    fetchData();
  }, [clientId, refreshKey]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const unpaid = totalInvoiced - totalPaid;

  const handleCreate = async () => {
    // Fetch nextInvoiceNumber before opening drawer — InvoiceForm requires it
    // getNextInvoiceNumber returns Promise<string> directly (not ActionResult)
    const nextNumber = await getNextInvoiceNumber();
    onOpenDrawer({ type: 'create-invoice', clientId, projects: clientProjects, nextInvoiceNumber: nextNumber });
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const result = await updateInvoiceStatus(invoiceId, 'paid');
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Invoice marked as paid');
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status: 'paid' as const } : inv));
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Receipt}
            title={t('invoices.noInvoices')}
            description={t('invoices.noInvoicesDescription')}
            action={{ label: t('invoices.createFirst'), onClick: handleCreate }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.invoices')} ({invoices.length})
        </h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('drawer.createInvoice')}
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t('invoices.project')}</TableHead>
              <TableHead className="text-right">{t('invoices.amount')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t('invoices.dueDate')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled'
                && invoice.due_date && new Date(invoice.due_date) < new Date();

              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.project.title ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total ?? 0)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                    {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/invoices/${invoice.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/api/invoices/pdf?id=${invoice.id}`} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </Link>
                        </DropdownMenuItem>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'draft' && (
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Row */}
        <div className="border-t px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('invoices.summary')}</span>
          <div className="flex items-center gap-6">
            <span>{t('stats.totalInvoiced')}: <strong>{formatCurrency(totalInvoiced)}</strong></span>
            <span>{t('stats.totalPaid')}: <strong>{formatCurrency(totalPaid)}</strong></span>
            <span className={unpaid > 0 ? 'text-destructive font-medium' : ''}>
              {t('stats.unpaidBalance')}: <strong>{formatCurrency(unpaid)}</strong>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-invoices-tab.tsx
git commit -m "feat(clients): create ClientInvoicesTab with invoice table and summary"
```

---

## Task 9: Refactor Client Contracts Tab

**Files:**
- Modify: `src/components/admin/clients/client-contracts-tab.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the contracts tab**

Replace the entire contents of `src/components/admin/clients/client-contracts-tab.tsx` with:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getContractsByClient } from '@/lib/actions/contracts';
import type { ContractWithProject } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, Plus, ExternalLink, Download, Send } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ClientContractsTabProps {
  clientId: string;
  refreshKey: number;
}

export function ClientContractsTab({ clientId, refreshKey }: ClientContractsTabProps) {
  const t = useTranslations('clients');
  const [contracts, setContracts] = useState<ContractWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const contractsResult = await getContractsByClient(clientId);
      if (!contractsResult.error && contractsResult.data) {
        setContracts(contractsResult.data);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [clientId, refreshKey]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={FileSignature}
            title={t('contracts.noContracts')}
            description={t('contracts.noContractsDescription')}
            action={{ label: t('contracts.addContract'), onClick: () => window.location.href = '/admin/contracts/new' }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.contracts')} ({contracts.length})
        </h3>
        <Button size="sm" asChild>
          <Link href="/admin/contracts/new">
          <Plus className="mr-2 h-4 w-4" />
          {t('contracts.addContract')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {contracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractWithProject }) {
  const t = useTranslations('clients');

  const displayDate = contract.signed_at ?? contract.viewed_at ?? contract.sent_at ?? contract.created_at;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{contract.title}</CardTitle>
          <StatusBadge status={contract.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {contract.project && (
          <p className="text-sm text-muted-foreground">{contract.project.title}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {format(new Date(displayDate), 'MMM d, yyyy')}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/contracts/${contract.id}`}>
              <ExternalLink className="mr-1 h-3 w-3" />
              {t('contracts.view')}
            </Link>
          </Button>
          {contract.status === 'signed' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/api/contracts/pdf?id=${contract.id}`} target="_blank">
                <Download className="mr-1 h-3 w-3" />
                {t('contracts.downloadPdf')}
              </Link>
            </Button>
          )}
          {(contract.status === 'sent' || contract.status === 'viewed') && (
            <Button variant="outline" size="sm">
              <Send className="mr-1 h-3 w-3" />
              {t('contracts.resend')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-contracts-tab.tsx
git commit -m "refactor(clients): rewrite ClientContractsTab with correct i18n, self-fetch, and drawer integration"
```

---

## Task 10: Create Client Activity Tab

**Files:**
- Create: `src/components/admin/clients/client-activity-tab.tsx`

- [ ] **Step 1: Create the activity tab component**

Create `src/components/admin/clients/client-activity-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getActivityByClient } from '@/lib/actions/activity';
import type { ActivityLogWithUser } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const PAGE_SIZE = 20;
const RECENT_THRESHOLD_DAYS = 7;

interface ClientActivityTabProps {
  clientId: string;
  refreshKey: number;
}

export function ClientActivityTab({ clientId, refreshKey }: ClientActivityTabProps) {
  const t = useTranslations('clients');
  const [entries, setEntries] = useState<ActivityLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function fetchInitial() {
      setIsLoading(true);
      const result = await getActivityByClient(clientId, { limit: PAGE_SIZE, offset: 0 });
      if (!result.error && result.data) {
        setEntries(result.data);
        setHasMore(result.data.length === PAGE_SIZE);
      }
      setIsLoading(false);
    }
    fetchInitial();
  }, [clientId, refreshKey]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const result = await getActivityByClient(clientId, {
      limit: PAGE_SIZE,
      offset: entries.length,
    });
    if (!result.error && result.data) {
      setEntries((prev) => [...prev, ...result.data!]);
      setHasMore(result.data.length === PAGE_SIZE);
    }
    setIsLoadingMore(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Activity}
            title={t('activityTab.noActivity')}
            description={t('activityTab.noActivityDescription')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('activityTab.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => {
            const date = new Date(entry.created_at);
            const isRecent = (Date.now() - date.getTime()) < RECENT_THRESHOLD_DAYS * 86400000;

            return (
              <div key={entry.id} className="flex items-center gap-3">
                <ActivityDot action={entry.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {entry.action} {entry.entity_type}
                  </p>
                  {entry.user && (
                    <p className="text-xs text-muted-foreground">
                      {entry.user.display_name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {isRecent
                    ? formatDistanceToNow(date, { addSuffix: true })
                    : format(date, 'dd/MM/yyyy')
                  }
                </span>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? '...' : t('activityTab.loadMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  updated: 'bg-yellow-500',
  deleted: 'bg-red-500',
  paid: 'bg-green-500',
  sent: 'bg-purple-500',
  signed: 'bg-green-600',
};

function ActivityDot({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? 'bg-muted-foreground';
  return <div className={`h-2 w-2 rounded-full ${color}`} />;
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clients/client-activity-tab.tsx
git commit -m "feat(clients): create ClientActivityTab with timeline and pagination"
```

---

## Task 11: Refactor page.tsx + client-detail.tsx (Atomic — must be done together)

**Files:**
- Modify: `src/app/admin/clients/[clientId]/page.tsx`
- Modify: `src/app/admin/clients/[clientId]/client-detail.tsx`

- [ ] **Step 1: Simplify page.tsx to fetch client + stats only**

Replace the entire `ClientDetailPage` function in `page.tsx`:

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getClient } from '@/lib/actions/clients';
import { getProjects } from '@/lib/actions/projects';
import { getInvoices } from '@/lib/actions/invoices';
import { Client } from '@/types/index';
import { ClientDetail } from './client-detail';

interface ClientDetailPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { clientId } = await params;
  const result = await getClient(clientId);
  const t = await getTranslations('clients');

  if (result.error || !result.data) {
    return { title: t('clientDetails') };
  }

  return { title: (result.data as Client).contact_name };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;

  // Fetch client + lightweight stats only — tabs fetch their own data lazily
  const [clientResult, projectsResult, invoicesResult] = await Promise.all([
    getClient(clientId),
    getProjects({ client_id: clientId }),
    getInvoices({ client_id: clientId }),
  ]);

  if (clientResult.error || !clientResult.data) {
    notFound();
  }

  const client = clientResult.data as Client;
  const invoices = invoicesResult.data ?? [];
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  return (
    <ClientDetail
      client={client}
      stats={{
        totalProjects: (projectsResult.data ?? []).length,
        totalInvoiced,
        totalPaid,
      }}
    />
  );
}
```

Key changes:
- Removed `getContractsByClient` import and call
- Removed `contracts` prop from `ClientDetail`
- Removed the `ContractItem` type cast
- Kept stats computation (lightweight)

- [ ] **Step 2: Rewrite client-detail.tsx as thin orchestrator**

Replace the entire `src/app/admin/clients/[clientId]/client-detail.tsx` with:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import type { ClientDrawerMode } from '@/types/relations';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ClientOverviewTab } from '@/components/admin/clients/client-overview-tab';
import { ClientProjectsTab } from '@/components/admin/clients/client-projects-tab';
import { ClientInvoicesTab } from '@/components/admin/clients/client-invoices-tab';
import { ClientContractsTab } from '@/components/admin/clients/client-contracts-tab';
import { ClientActivityTab } from '@/components/admin/clients/client-activity-tab';
import { ClientDrawer } from '@/components/admin/clients/client-drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { deleteClient } from '@/lib/actions/clients';
import { inviteClient } from '@/lib/actions/auth';
import { toast } from 'sonner';

interface ClientDetailProps {
  client: Client;
  stats: {
    totalProjects: number;
    totalInvoiced: number;
    totalPaid: number;
  };
}

export function ClientDetail({ client, stats }: ClientDetailProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const router = useRouter();

  // Shell state
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<ClientDrawerMode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenDrawer = (mode: ClientDrawerMode) => {
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const handleDrawerSuccess = () => {
    setRefreshKey((k) => k + 1);
    router.refresh();
  };

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      const result = await inviteClient(client.email, client.contact_name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('inviteSent'));
        router.refresh();
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteClient(client.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('clientDeleted'));
        router.push('/admin/clients');
        router.refresh();
      }
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={client.contact_name}
        description={client.company_name || t('clientDetails')}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc('back')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/clients/${client.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            {tc('edit')}
          </Link>
        </Button>
        {!client.user_id && (
          <Button variant="outline" onClick={handleInvite} disabled={isInviting}>
            <Mail className="mr-2 h-4 w-4" />
            {t('inviteToPortal')}
          </Button>
        )}
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash className="mr-2 h-4 w-4" />
          {tc('delete')}
        </Button>
      </PageHeader>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <UserAvatar name={client.contact_name} src={client.avatar_url} className="h-20 w-20" />
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{client.contact_name}</h2>
                {client.company_name && (
                  <p className="text-muted-foreground">{client.company_name}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <StatusBadge status={client.status} />
                <span className="text-sm text-muted-foreground">
                  {t('created')} {format(new Date(client.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="projects">{t('tabs.projects')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('tabs.invoices')}</TabsTrigger>
            <TabsTrigger value="contracts">{t('tabs.contracts')}</TabsTrigger>
            <TabsTrigger value="activity">{t('tabs.activity')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <ClientOverviewTab
            client={client}
            stats={stats}
            onViewAllActivity={() => setActiveTab('activity')}
          />
        </TabsContent>

        <TabsContent value="projects">
          <ClientProjectsTab
            clientId={client.id}
            refreshKey={refreshKey}
            onOpenDrawer={handleOpenDrawer}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ClientInvoicesTab
            clientId={client.id}
            refreshKey={refreshKey}
            onOpenDrawer={handleOpenDrawer}
          />
        </TabsContent>

        <TabsContent value="contracts">
          <ClientContractsTab
            clientId={client.id}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ClientActivityTab
            clientId={client.id}
            refreshKey={refreshKey}
          />
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <ClientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        client={client}
        onSuccess={handleDrawerSuccess}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t('deleteClient')}
        description={t('deleteConfirm')}
        confirmLabel={tc('delete')}
        loading={isDeleting}
        destructive
      />
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm build`
Expected: PASS — all components are now connected

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:3000/admin/clients/` → click on a client → verify:
1. Overview tab shows stats + contact info + recent activity
2. Projects tab shows project cards (or empty state)
3. Invoices tab shows invoice table (or empty state)
4. Contracts tab shows contract cards (or empty state)
5. Activity tab shows timeline (or empty state)
6. "New Project" button opens drawer
7. Tab labels are correct (not "Total Projects" or "Status")

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/clients/[clientId]/page.tsx src/app/admin/clients/[clientId]/client-detail.tsx
git commit -m "refactor(clients): rewrite client detail as thin orchestrator with lazy tab components"
```

---

## Task 12: Final Build Verification + Cleanup

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: PASS with no errors

- [ ] **Step 2: Check for TypeScript errors**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Lint check**

Run: `pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 4: Verify no unused imports in modified files**

Check that old imports (like the `ContractItem` type, the stale `EmptyState` icons in `client-detail.tsx`) have been removed.

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(clients): cleanup unused imports and lint fixes"
```
