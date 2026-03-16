'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SubTaskList } from './sub-task-list';
import { updateTask, deleteTask } from '@/lib/actions/tasks';
import { TASK_STATUSES, TASK_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/constants';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigned_to: string | null;
  due_date: string | null;
  order_index: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

type TaskDetailSheetProps = {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAssignedTo, setEditedAssignedTo] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || '');
      setEditedAssignedTo(task.assigned_to || '');
      setEditedDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    }
  }, [task]);

  if (!task) return null;

  const handleUpdate = async (field: string, value: unknown) => {
    const result = await updateTask(task.id, { [field]: value });

    if (result.error) {
      toast.error(t('failedToUpdate'), {
        description: result.error,
      });
      return;
    }

    toast.success(t('updatedSuccessfully'));
    router.refresh();
  };

  const handleTitleBlur = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      handleUpdate('title', editedTitle.trim());
    } else if (!editedTitle.trim()) {
      setEditedTitle(task.title);
    }
  };

  const handleDescriptionBlur = () => {
    if (editedDescription !== (task.description || '')) {
      handleUpdate('description', editedDescription.trim() || null);
    }
  };

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const handleAssignedToBlur = () => {
    const trimmed = editedAssignedTo.trim();
    if (trimmed === (task.assigned_to || '')) return;

    if (trimmed && !UUID_REGEX.test(trimmed)) {
      toast.error(t('invalidAssigneeId'));
      setEditedAssignedTo(task.assigned_to || '');
      return;
    }

    handleUpdate('assigned_to', trimmed || null);
  };

  const handleDueDateChange = (value: string) => {
    setEditedDueDate(value);
    handleUpdate('due_date', value || null);
  };

  const handleStatusChange = (value: string) => {
    handleUpdate('status', value);
  };

  const handlePriorityChange = (value: string) => {
    handleUpdate('priority', value);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const result = await deleteTask(task.id);

    setIsDeleting(false);

    if (result.error) {
      toast.error(t('failedToDelete'), {
        description: result.error,
      });
    } else {
      toast.success(t('deletedSuccessfully'));
      setShowDeleteDialog(false);
      onOpenChange(false);
      router.refresh();
    }
  };

  const subTasks = (task.metadata?.sub_tasks as SubTask[] | undefined) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('taskDetails')}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="task-title">{t('taskTitle')}</Label>
              <Input
                id="task-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">{t('description')}</Label>
              <Textarea
                id="task-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={t('addDescription')}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-status">{t('status')}</Label>
                <Select value={task.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">{t('priority')}</Label>
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-due-date">{t('dueDate')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="task-due-date"
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-assigned-to">{t('assignedTo')}</Label>
                <Input
                  id="task-assigned-to"
                  value={editedAssignedTo}
                  onChange={(e) => setEditedAssignedTo(e.target.value)}
                  onBlur={handleAssignedToBlur}
                  placeholder={t('assigneePlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <SubTaskList taskId={task.id} initialSubTasks={subTasks} />
            </div>

            <div className="border-t pt-6">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteTask')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('deleteTask')}
        description={t('deleteTaskConfirm')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
