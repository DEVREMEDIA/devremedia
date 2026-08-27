'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/shared/form-dialog';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone } from '@/lib/status-tone';
import { Plus, Calendar, User, Filter, ListChecks } from 'lucide-react';
import { createTask, updateTaskStatus } from '@/lib/actions/tasks';
import { getTeamMembers } from '@/lib/actions/team';
import { createTaskSchema } from '@/lib/schemas/task';
import { PRIORITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import type { UserProfile, Task } from '@/types';

interface TaskChecklistProps {
  projectId: string;
  tasks: Task[];
  onRefresh: () => void;
}

// project_id/status/sort_order aren't fields the user edits here — the first
// is fixed by the parent, the second is always 'todo' on create, the third
// isn't set on create at all. The visible form validates only what it shows.
const taskFormSchema = createTaskSchema.omit({
  project_id: true,
  status: true,
  sort_order: true,
});
type TaskFormValues = z.input<typeof taskFormSchema>;

type StatFilter = 'todo' | 'in_progress' | 'review' | 'done';

export function TaskChecklist({ projectId, tasks, onRefresh }: TaskChecklistProps) {
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const tPriority = useTranslations('statuses.priority');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'todo' | 'in_progress' | 'review' | 'done' | 'pending'
  >('all');

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assigned_to: undefined,
      priority: 'medium',
      due_date: undefined,
    },
  });

  useEffect(() => {
    getTeamMembers().then((result) => {
      if (result.data) setTeamMembers(result.data.filter((m) => m.role === 'employee'));
    });
  }, []);

  const handleCreateTask = async (values: TaskFormValues) => {
    const result = await createTask({
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      project_id: projectId,
      assigned_to: values.assigned_to || undefined,
      priority: values.priority,
      due_date: values.due_date || undefined,
      status: 'todo',
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t('taskCreated'));
    form.reset({
      title: '',
      description: '',
      assigned_to: undefined,
      priority: 'medium',
      due_date: undefined,
    });
    setDialogOpen(false);
    onRefresh();
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
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'done';
    return task.status === filter;
  });

  const todoCount = tasks.filter((tk) => tk.status === 'todo').length;
  const inProgressCount = tasks.filter((tk) => tk.status === 'in_progress').length;
  const reviewCount = tasks.filter((tk) => tk.status === 'review').length;
  const doneCount = tasks.filter((tk) => tk.status === 'done').length;

  const statTiles: { key: StatFilter; label: string; value: number }[] = [
    { key: 'todo', label: t('filterTodo'), value: todoCount },
    { key: 'in_progress', label: t('filterInProgress'), value: inProgressCount },
    { key: 'review', label: t('filterReview'), value: reviewCount },
    { key: 'done', label: t('filterDone'), value: doneCount },
  ];

  const assigneeName = (userId: string | null) => {
    if (!userId) return null;
    return teamMembers.find((m) => m.id === userId)?.display_name ?? null;
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
  };

  return (
    <div className="space-y-4">
      {/* Status counters — also double as filters */}
      <StatGrid columns={4}>
        {statTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setFilter(filter === tile.key ? 'all' : tile.key)}
            aria-pressed={filter === tile.key}
            className={cn('text-left', filter === tile.key && 'ring-2 ring-inset ring-ring')}
          >
            <StatCard label={tile.label} value={tile.value} tone={statusTone(tile.key)} />
          </button>
        ))}
      </StatGrid>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addTask')}
        </Button>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t('addTask')}
        onSubmit={form.handleSubmit(handleCreateTask)}
        submitLabel={form.formState.isSubmitting ? tc('saving') : tc('create')}
        cancelLabel={tc('cancel')}
        submitting={form.formState.isSubmitting}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('taskName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('taskName')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc('description')}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder={t('description')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assignee')}</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('assignee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.display_name ?? m.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc('priority')}</FormLabel>
                  <Select value={field.value ?? 'medium'} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {tPriority(priority)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('dueDate')}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-tone-positive transition-all duration-500"
            style={{ width: `${(doneCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">{t('noTasks')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('noTasksDescription')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'done';
            const overdue = !isDone && isOverdue(task.due_date);
            const name = assigneeName(task.assigned_to);

            return (
              <div
                key={task.id}
                className={`
                  flex items-start gap-3 rounded-lg border p-3 transition-colors
                  ${isDone ? 'bg-muted/40 border-muted' : 'bg-card hover:bg-accent/30'}
                `}
              >
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => handleToggle(task)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {name && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
                        <User className="h-2.5 w-2.5" />
                        {name}
                      </span>
                    )}
                    {task.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 ${
                          overdue
                            ? 'bg-tone-critical-bg text-tone-critical'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(task.due_date), 'dd/MM/yy')}
                      </span>
                    )}
                    <ToneChip tone={statusTone(task.priority)}>{tPriority(task.priority)}</ToneChip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
