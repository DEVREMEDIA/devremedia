# Project Employee Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to assign productions to employees directly from the Kanban board, making assigned productions visible on the employee side.

**Architecture:** Add `assigned_to` column to `projects` table (single employee, extensible to many later). Update admin Kanban cards with an assignee selector. Update employee RLS + queries to include directly assigned projects. Reuse existing `TeamMemberSelect` pattern.

**Tech Stack:** Supabase (migration + RLS), Next.js server actions, dnd-kit Kanban, shadcn/ui components, next-intl translations.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/00025_project_assigned_to.sql` | DB column + RLS update |
| Modify | `src/types/entities.ts:51-64` | Add `assigned_to` to Project type |
| Modify | `src/lib/schemas/project.ts:7-23` | Add `assigned_to` to schema |
| Modify | `src/lib/actions/projects.ts` | New `assignProject` action |
| Modify | `src/components/admin/projects/project-card.tsx` | Show assignee avatar + selector |
| Modify | `src/components/admin/projects/project-board.tsx` | Pass team members to cards |
| Modify | `src/app/admin/projects/projects-content.tsx` | Fetch team members |
| Modify | `src/lib/queries/employee-dashboard.ts:55-96` | Include assigned projects |
| Modify | `src/app/employee/projects/[projectId]/page.tsx` | Allow access for assigned projects |
| Modify | `messages/el.json` | Greek translations |
| Modify | `messages/en.json` | English translations |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00025_project_assigned_to.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add assigned_to column to projects (employee responsible for this production)
ALTER TABLE public.projects
  ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for employee lookups
CREATE INDEX idx_projects_assigned_to ON public.projects(assigned_to);

-- Update employee RLS: can also see projects directly assigned to them
DROP POLICY IF EXISTS "employees_select_projects_with_tasks" ON public.projects;

CREATE POLICY "employees_select_projects_with_tasks" ON public.projects
  FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = projects.id
        AND tasks.assigned_to = auth.uid()
      )
      OR projects.assigned_to = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );

-- Also allow employees to see deliverables for projects assigned to them
DROP POLICY IF EXISTS "employees_select_deliverables" ON public.deliverables;

CREATE POLICY "employees_select_deliverables" ON public.deliverables
  FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );

-- Same for employee deliverable inserts
DROP POLICY IF EXISTS "employees_insert_deliverables" ON public.deliverables;

CREATE POLICY "employees_insert_deliverables" ON public.deliverables
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.project_id = deliverables.project_id
        AND tasks.assigned_to = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = deliverables.project_id
        AND projects.assigned_to = auth.uid()
      )
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push` or apply via Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00025_project_assigned_to.sql
git commit -m "feat(db): add assigned_to column to projects with employee RLS"
```

---

### Task 2: Update Types & Schema

**Files:**
- Modify: `src/types/entities.ts:51-64`
- Modify: `src/lib/schemas/project.ts:7-23`

- [ ] **Step 1: Update Project type in entities.ts**

Add `assigned_to` field after `created_by` concept (after line 63, before `created_at`):

```typescript
// In the Project type, add:
  assigned_to: string | null;
```

The full Project type becomes:
```typescript
export type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  budget: number | null;
  deadline: string | null;
  start_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Update project schema in project.ts**

Add `assigned_to` to `createProjectSchema`:

```typescript
  assigned_to: z.string().uuid('Invalid user ID').nullable().optional(),
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build passes (assigned_to is optional/nullable so existing code won't break).

- [ ] **Step 4: Commit**

```bash
git add src/types/entities.ts src/lib/schemas/project.ts
git commit -m "feat(types): add assigned_to field to Project type and schema"
```

---

### Task 3: Server Action — assignProject

**Files:**
- Modify: `src/lib/actions/projects.ts`

- [ ] **Step 1: Add assignProject action**

Add at the end of `src/lib/actions/projects.ts`:

```typescript
export async function assignProject(
  projectId: string,
  userId: string | null,
): Promise<ActionResult<Project>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Verify caller is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ assigned_to: userId })
      .eq('id', projectId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath('/employee/projects');
    revalidatePath('/employee/dashboard');

    // Notify the assigned employee
    if (userId) {
      createNotification({
        userId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: `You have been assigned to production "${data.title}"`,
        actionUrl: `/employee/projects/${projectId}`,
      });
    }

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to assign project',
    };
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/projects.ts
git commit -m "feat(actions): add assignProject server action"
```

---

### Task 4: Admin Kanban Card — Show Assignee

**Files:**
- Modify: `src/components/admin/projects/project-card.tsx`
- Modify: `src/components/admin/projects/project-board.tsx`
- Modify: `src/app/admin/projects/projects-content.tsx`

- [ ] **Step 1: Update ProjectCard to show assignee avatar with inline selector**

In `project-card.tsx`, update `ProjectCardProps` and `CardInner`:

```typescript
// Add to imports
import { User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assignProject } from '@/lib/actions/projects';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/index';

interface ProjectCardProps {
  project: ProjectWithClient;
  isOverlay?: boolean;
  teamMembers?: UserProfile[];
}

// Update CardInner to accept and show teamMembers
function CardInner({ project, teamMembers, onAssign }: {
  project: ProjectWithClient;
  teamMembers?: UserProfile[];
  onAssign?: (userId: string | null) => void;
}) {
  const assignee = teamMembers?.find((m) => m.id === project.assigned_to);

  return (
    <>
      <h4 className="font-medium text-xs leading-snug line-clamp-2 mb-1">
        {project.title}
      </h4>

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {project.client?.company_name || project.client?.contact_name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[project.priority] || 'bg-gray-400'}`} />
          <span className="text-[10px] text-muted-foreground capitalize">
            {project.priority}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {project.deadline && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(project.deadline), 'MMM d')}
            </span>
          )}

          {/* Assignee avatar/indicator */}
          {assignee ? (
            <div
              className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary"
              title={assignee.display_name ?? ''}
            >
              {(assignee.display_name ?? '?')[0].toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

The assignee popover selector will be in a separate click handler on the avatar circle, using `stopPropagation` to prevent navigating to the project. Full implementation details:

- Click on the avatar circle → opens a Popover with team member list
- Select a member → calls `assignProject(projectId, memberId)`
- The popover uses `stopPropagation` on its trigger to prevent card click/drag

- [ ] **Step 2: Update ProjectBoard to pass teamMembers**

In `project-board.tsx`, add `teamMembers` prop:

```typescript
interface ProjectBoardProps {
  projects: ProjectWithClient[];
  teamMembers: UserProfile[];
}

export function ProjectBoard({ projects, teamMembers }: ProjectBoardProps) {
  // ... existing code ...

  // Pass to ProjectColumn → ProjectCard
}
```

Update `ProjectColumn` and `ProjectCard` to thread `teamMembers` through.

- [ ] **Step 3: Update ProjectsContent to fetch and pass team members**

In `projects-content.tsx`, fetch team members and pass to ProjectBoard:

```typescript
// At top of component or via prop from server component
const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

useEffect(() => {
  getTeamMembers().then((result) => {
    if (result.data) setTeamMembers(result.data);
  });
}, []);

// Pass to ProjectBoard
<ProjectBoard projects={projects} teamMembers={teamMembers} />
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/projects/project-card.tsx src/components/admin/projects/project-board.tsx src/components/admin/projects/project-column.tsx src/app/admin/projects/projects-content.tsx
git commit -m "feat(admin): show assignee on Kanban cards with inline selector"
```

---

### Task 5: Update Employee Queries & Access

**Files:**
- Modify: `src/lib/queries/employee-dashboard.ts:55-96`
- Modify: `src/app/employee/projects/[projectId]/page.tsx`

- [ ] **Step 1: Update getMyProjects to include directly assigned projects**

Replace `getMyProjects` in `employee-dashboard.ts`:

```typescript
export async function getMyProjects(userId: string) {
  const supabase = await createClient();

  // Get projects where employee has tasks assigned
  const { data: tasks } = await supabase
    .from('tasks')
    .select('project_id, project:projects(id, title, status, project_type, deadline)')
    .eq('assigned_to', userId);

  // Get projects directly assigned to employee
  const { data: assignedProjects } = await supabase
    .from('projects')
    .select('id, title, status, project_type, deadline')
    .eq('assigned_to', userId);

  // Build unified map
  const projectMap = new Map<
    string,
    {
      id: string;
      title: string;
      status: string;
      project_type: string;
      deadline: string | null;
      taskCount: number;
    }
  >();

  // Add task-based projects
  for (const task of tasks ?? []) {
    const project = task.project as unknown as {
      id: string;
      title: string;
      status: string;
      project_type: string;
      deadline: string | null;
    } | null;
    if (!project) continue;
    const existing = projectMap.get(project.id);
    if (existing) {
      existing.taskCount++;
    } else {
      projectMap.set(project.id, { ...project, taskCount: 1 });
    }
  }

  // Add directly assigned projects (if not already in map)
  for (const project of assignedProjects ?? []) {
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, { ...project, taskCount: 0 });
    }
  }

  return Array.from(projectMap.values());
}
```

- [ ] **Step 2: Update employee project detail access check**

In `src/app/employee/projects/[projectId]/page.tsx`, update the access check to also allow directly assigned projects:

```typescript
// Current check: only tasks
// New check: tasks OR assigned_to
const [{ data: taskAccess }, { data: assignedAccess }] = await Promise.all([
  supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assigned_to', user.id)
    .limit(1),
  supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('assigned_to', user.id)
    .limit(1),
]);

if ((!taskAccess || taskAccess.length === 0) && (!assignedAccess || assignedAccess.length === 0)) {
  notFound();
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/employee-dashboard.ts src/app/employee/projects/[projectId]/page.tsx
git commit -m "feat(employee): show directly assigned projects on employee side"
```

---

### Task 6: Translations

**Files:**
- Modify: `messages/el.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add translation keys**

In `messages/el.json` under `"projects"` section:
```json
"assignedTo": "Ανατεθειμένο σε",
"assignEmployee": "Ανάθεση σε υπάλληλο",
"unassigned": "Χωρίς ανάθεση",
"assignSuccess": "Η παραγωγή ανατέθηκε επιτυχώς",
"removeAssignment": "Αφαίρεση ανάθεσης"
```

In `messages/en.json` under `"projects"` section:
```json
"assignedTo": "Assigned to",
"assignEmployee": "Assign employee",
"unassigned": "Unassigned",
"assignSuccess": "Production assigned successfully",
"removeAssignment": "Remove assignment"
```

- [ ] **Step 2: Commit**

```bash
git add messages/el.json messages/en.json
git commit -m "feat(i18n): add project assignment translation keys"
```

---

### Task 7: Final Integration & Verification

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: Clean build, no errors.

- [ ] **Step 2: Manual test checklist**

1. Go to `/admin/projects` — Kanban cards show assignee circle
2. Click assignee circle on a card — popover with team members appears
3. Select an employee — toast success, card updates with initials
4. Login as that employee — project appears in `/employee/projects`
5. Employee can access `/employee/projects/[id]` for the assigned project
6. Remove assignment from admin — project disappears from employee side
7. Assign different employee — previous employee loses access, new one gains it

- [ ] **Step 3: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "feat(projects): complete project employee assignment feature"
```

---

## Future Extension: Multiple Employees

When needed, the single `assigned_to` column can be replaced with a junction table:

```sql
CREATE TABLE project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'lead', 'member'
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
```

The UI would change from a single-select to a multi-select popover. RLS policies would check `project_members` instead of `projects.assigned_to`. This is a natural evolution that doesn't require rearchitecting — just a table swap.
