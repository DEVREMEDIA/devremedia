# Project Detail Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve 3 tabs in admin project detail: embed video deliverables, checklist-style tasks, and channel-based messages (client vs team).

**Architecture:** Each tab is independent. Deliverables: auto-detect Google Drive/YouTube URLs and render embedded iframe. Tasks: replace Kanban with simple checklist + create task form. Messages: add `channel` column to messages table, toggle between client/team channels.

**Tech Stack:** Next.js, Supabase (migration), shadcn/ui, next-intl, dnd-kit (remove from tasks).

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/components/admin/deliverables/deliverable-list.tsx` | Add embedded video player for Drive/YouTube |
| Modify | `src/app/admin/projects/[projectId]/tasks-tab.tsx` | Replace Kanban with checklist |
| Create | `src/components/admin/tasks/task-checklist.tsx` | Checklist component with create/toggle |
| Create | `supabase/migrations/00026_messages_channel.sql` | Add channel column to messages |
| Modify | `src/lib/actions/messages.ts` | Filter by channel |
| Modify | `src/lib/schemas/message.ts` | Add channel to schema |
| Modify | `src/types/entities.ts` | Add channel to Message type |
| Modify | `src/app/admin/projects/[projectId]/project-detail.tsx` | Add channel toggle to messages tab |
| Modify | `src/components/shared/message-thread.tsx` | Accept channel prop |
| Modify | `messages/el.json` | Greek translations |
| Modify | `messages/en.json` | English translations |

---

### Task 1: Deliverables — Embedded Video Player

**Files:**
- Modify: `src/components/admin/deliverables/deliverable-list.tsx`

The deliverable-list currently shows a "Watch Video" link button for external URLs. Replace this with an embedded video player that auto-detects Google Drive and YouTube links.

- [ ] **Step 1: Add URL detection helpers and iframe embed to deliverable-list.tsx**

Add these helper functions at the top of the file:

```typescript
const getEmbedUrl = (url: string): string | null => {
  // Google Drive: convert /file/d/ID/view to /file/d/ID/preview
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // YouTube: convert watch?v=ID or youtu.be/ID to embed/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo: convert vimeo.com/ID to player.vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
};
```

For each deliverable card, if `getEmbedUrl` returns a URL, show an iframe embed. Otherwise show the link button. The embed section goes below the description:

```tsx
{isExternalLink(deliverable.file_path) && (
  <>
    {getEmbedUrl(deliverable.file_path) ? (
      <div className="aspect-video rounded-md overflow-hidden bg-muted">
        <iframe
          src={getEmbedUrl(deliverable.file_path)!}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    ) : (
      <Button variant="outline" size="sm" asChild>
        <a href={deliverable.file_path} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          {t('watchVideo')}
        </a>
      </Button>
    )}
  </>
)}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/deliverables/deliverable-list.tsx
git commit -m "feat(deliverables): auto-embed Google Drive/YouTube/Vimeo videos"
```

---

### Task 2: Tasks — Checklist View with Create Form

**Files:**
- Modify: `src/app/admin/projects/[projectId]/tasks-tab.tsx`
- Create: `src/components/admin/tasks/task-checklist.tsx`

Replace the Kanban TaskBoard with a simple checklist. Admin can create tasks, assign them, and toggle completion.

- [ ] **Step 1: Create task-checklist.tsx**

Create `src/components/admin/tasks/task-checklist.tsx` with:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, User, Filter } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { createTask, updateTaskStatus } from '@/lib/actions/tasks';
import { getTeamMembers } from '@/lib/actions/team';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import type { UserProfile } from '@/types';
import { useEffect } from 'react';
import type { Task } from '@/types';

interface TaskChecklistProps {
  projectId: string;
  tasks: Task[];
  onRefresh: () => void;
}

export function TaskChecklist({ projectId, tasks, onRefresh }: TaskChecklistProps) {
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'done'>('all');

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getTeamMembers().then((result) => {
      if (result.data) setTeamMembers(result.data.filter((m) => m.role === 'employee'));
    });
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    setIsSubmitting(true);
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      project_id: projectId,
      assigned_to: assignedTo || undefined,
      priority,
      due_date: dueDate || undefined,
      status: 'todo',
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('taskCreated'));
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setDueDate('');
      setDialogOpen(false);
      onRefresh();
    }
    setIsSubmitting(false);
  };

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const result = await updateTaskStatus(task.id, newStatus);
    if (result.error) {
      toast.error(result.error);
    } else {
      onRefresh();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'done') return task.status === 'done';
    if (filter === 'mine') return task.status !== 'done';
    return true;
  });

  const assigneeName = (userId: string | null) => {
    if (!userId) return null;
    const member = teamMembers.find((m) => m.id === userId);
    return member?.display_name ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('all')}</SelectItem>
              <SelectItem value="mine">{t('pending')}</SelectItem>
              <SelectItem value="done">{t('completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t('addTask')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addTask')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t('taskName')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('taskName')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('assignee')}</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('assignee')} />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.display_name ?? m.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tc('priority')}</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('dueDate')}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleCreateTask} disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? tc('saving') : tc('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('noTasks')}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={task.status === 'done'}
                onCheckedChange={() => handleToggle(task)}
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {assigneeName(task.assigned_to) && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {assigneeName(task.assigned_to)}
                  </span>
                )}
                {task.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.due_date), 'dd/MM')}
                  </span>
                )}
                <StatusBadge status={task.priority} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update tasks-tab.tsx to use TaskChecklist instead of TaskBoard**

Replace the entire content of `src/app/admin/projects/[projectId]/tasks-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TaskChecklist } from '@/components/admin/tasks/task-checklist';
import { getTasksByProject } from '@/lib/actions/tasks';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Task } from '@/types';

interface TasksTabProps {
  projectId: string;
}

export function TasksTab({ projectId }: TasksTabProps) {
  const t = useTranslations('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getTasksByProject(projectId);
      if (result.error) {
        setError(result.error);
      } else {
        setTasks(result.data ?? []);
      }
      setIsLoading(false);
    };
    fetchTasks();
  }, [projectId, refreshCounter]);

  const handleRefresh = () => setRefreshCounter((prev) => prev + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">{t('loadError')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <TaskChecklist projectId={projectId} tasks={tasks} onRefresh={handleRefresh} />;
}
```

- [ ] **Step 3: Add missing translation keys**

In el.json under `"tasks"` section add:
```json
"pending": "Εκκρεμείς",
"completed": "Ολοκληρωμένες",
"titleRequired": "Ο τίτλος είναι υποχρεωτικός",
"loadError": "Σφάλμα φόρτωσης"
```

In en.json under `"tasks"` section add:
```json
"pending": "Pending",
"completed": "Completed",
"titleRequired": "Title is required",
"loadError": "Loading error"
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tasks/task-checklist.tsx src/app/admin/projects/[projectId]/tasks-tab.tsx messages/el.json messages/en.json
git commit -m "feat(tasks): replace Kanban with checklist view + create task form"
```

---

### Task 3: Messages — Channel Toggle (Client vs Team)

**Files:**
- Create: `supabase/migrations/00026_messages_channel.sql`
- Modify: `src/types/entities.ts` — add channel to Message type
- Modify: `src/lib/schemas/message.ts` — add channel to schema
- Modify: `src/lib/actions/messages.ts` — filter by channel
- Modify: `src/components/shared/message-thread.tsx` — accept channel prop
- Modify: `src/app/admin/projects/[projectId]/project-detail.tsx` — add channel toggle

- [ ] **Step 1: Create migration**

Create `supabase/migrations/00026_messages_channel.sql`:

```sql
-- Add channel column to messages (client vs team communication)
ALTER TABLE public.messages
  ADD COLUMN channel text NOT NULL DEFAULT 'client'
  CHECK (channel IN ('client', 'team'));

-- Index for channel queries
CREATE INDEX idx_messages_channel ON public.messages(project_id, channel);

-- Employees can view team messages for projects they are assigned to
CREATE POLICY "employees_select_team_messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    channel = 'team'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id
      AND projects.assigned_to = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );

-- Employees can insert team messages for projects they are assigned to
CREATE POLICY "employees_insert_team_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    channel = 'team'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = messages.project_id
      AND projects.assigned_to = auth.uid()
    )
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'employee')
  );
```

- [ ] **Step 2: Update Message type in entities.ts**

Add `channel` field to Message type:

```typescript
export type Message = {
  // ... existing fields ...
  channel: 'client' | 'team';
  created_at: string;
};
```

- [ ] **Step 3: Update message schema**

In `src/lib/schemas/message.ts`, add channel to createMessageSchema:

```typescript
channel: z.enum(['client', 'team']).default('client'),
```

- [ ] **Step 4: Update getMessagesByProject action**

In `src/lib/actions/messages.ts`, add `channel` parameter:

```typescript
export async function getMessagesByProject(
  projectId: string,
  channel: 'client' | 'team' = 'client',
): Promise<ActionResult<Message[]>> {
```

Add `.eq('channel', channel)` to the query.

Also update `createMessage` to include channel in the select and ensure it's passed through.

- [ ] **Step 5: Update MessageThread to accept channel prop**

In `src/components/shared/message-thread.tsx`, add `channel` prop:

```typescript
interface MessageThreadProps {
  projectId: string;
  currentUserId: string;
  channel?: 'client' | 'team';
  className?: string;
}
```

Pass `channel` to `getMessagesByProject(projectId, channel)` and include it when creating messages.

- [ ] **Step 6: Add channel toggle in project-detail.tsx messages tab**

Replace the messages TabsContent with:

```tsx
<TabsContent value="messages">
  {currentUserId ? (
    <MessagesWithChannel projectId={project.id} currentUserId={currentUserId} />
  ) : (
    <EmptyState icon={MessageSquare} title={tc('loading')} description={tc('pleaseWait')} />
  )}
</TabsContent>
```

Add a `MessagesWithChannel` inline component or a separate component that has:
- A dropdown at the top: "Συνομιλία με: Πελάτη / Ομάδα"
- Renders `<MessageThread>` with the selected channel

```tsx
function MessagesWithChannel({ projectId, currentUserId }: { projectId: string; currentUserId: string }) {
  const t = useTranslations('messages');
  const [channel, setChannel] = useState<'client' | 'team'>('client');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('conversationWith')}:</span>
        <Select value={channel} onValueChange={(v) => setChannel(v as 'client' | 'team')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">{t('clientChannel')}</SelectItem>
            <SelectItem value="team">{t('teamChannel')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <MessageThread
        key={channel}
        projectId={projectId}
        currentUserId={currentUserId}
        channel={channel}
      />
    </div>
  );
}
```

- [ ] **Step 7: Add translations**

In el.json under `"messages"`:
```json
"conversationWith": "Συνομιλία με",
"clientChannel": "Πελάτη",
"teamChannel": "Ομάδα"
```

In en.json under `"messages"`:
```json
"conversationWith": "Conversation with",
"clientChannel": "Client",
"teamChannel": "Team"
```

- [ ] **Step 8: Verify build**

Run: `pnpm build`

- [ ] **Step 9: Apply migration on Supabase**

Run migration on both local and production Supabase.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/00026_messages_channel.sql src/types/entities.ts src/lib/schemas/message.ts src/lib/actions/messages.ts src/components/shared/message-thread.tsx src/app/admin/projects/[projectId]/project-detail.tsx messages/el.json messages/en.json
git commit -m "feat(messages): add client/team channel toggle"
```
