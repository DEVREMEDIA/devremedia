'use client';

import { Calendar, AlertCircle, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskStatusUpdate } from './task-status-update';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Task, Priority } from '@/types/index';
import { cn } from '@/lib/utils';

interface TaskDetailProps {
  task: Task & { project?: { id: string; title: string } | null };
}

const priorityColorMap: Record<Priority, string> = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export function TaskDetail({ task }: TaskDetailProps) {
  const t = useTranslations('employee.tasks');
  const tCommon = useTranslations('common');

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div className="space-y-6">
      {/* Task details card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('taskDetail')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold">{task.title}</h2>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{tCommon('description')}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{tCommon('status')}</p>
              <TaskStatusUpdate
                taskId={task.id}
                currentStatus={task.status}
                projectId={task.project_id}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{tCommon('priority')}</p>
              <span
                className={cn(
                  'inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-md bg-gray-100',
                  priorityColorMap[task.priority],
                )}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            </div>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{tCommon('dueDate')}</p>
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isOverdue ? 'text-red-600 font-semibold' : 'text-foreground',
                )}
              >
                {isOverdue && <AlertCircle className="h-4 w-4" />}
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(task.due_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
