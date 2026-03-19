'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, Filter, ListChecks } from 'lucide-react';
import { createTask, updateTaskStatus } from '@/lib/actions/tasks';
import { getTeamMembers } from '@/lib/actions/team';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import type { UserProfile, Task } from '@/types';

interface TaskChecklistProps {
  projectId: string;
  tasks: Task[];
  onRefresh: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
  medium:
    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskChecklist({ projectId, tasks, onRefresh }: TaskChecklistProps) {
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

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
      toast.error(t('taskName'));
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
    if (filter === 'pending') return task.status !== 'done';
    return true;
  });

  const doneCount = tasks.filter((t) => t.status === 'done').length;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            <span>
              {doneCount}/{tasks.length}
            </span>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('all')}</SelectItem>
              <SelectItem value="pending">
                {t('noTasks') === t('noTasks') ? 'Εκκρεμείς' : 'Pending'}
              </SelectItem>
              <SelectItem value="done">{tc('done') || 'Done'}</SelectItem>
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
                  onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleCreateTask()}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder={t('description')}
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

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
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
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(task.due_date), 'dd/MM/yy')}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${PRIORITY_STYLES[task.priority] ?? ''}`}
                    >
                      {PRIORITY_LABELS[task.priority] ?? task.priority}
                    </Badge>
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
