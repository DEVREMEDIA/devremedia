'use client';

import Link from 'next/link';
import { Calendar, AlertCircle, FileText, FolderKanban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskStatusUpdate } from './task-status-update';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Task, Priority } from '@/types/index';
import { cn } from '@/lib/utils';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskDetailProps {
  task: Task & {
    project?: { id: string; title: string } | null;
    metadata?: Record<string, unknown>;
  };
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
  const subTasks = (task.metadata?.sub_tasks as SubTask[] | undefined) ?? [];

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

          {/* Project link */}
          {task.project && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FolderKanban className="h-4 w-4" />
                <span>{tCommon('project')}</span>
              </div>
              <Link
                href={`/employee/projects/${task.project.id}`}
                className="text-sm text-primary hover:underline"
              >
                {task.project.title}
              </Link>
            </div>
          )}

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

          {/* Sub-tasks (read-only) */}
          {subTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('subTasks')} ({subTasks.filter((s) => s.completed).length}/{subTasks.length})
              </p>
              <div className="space-y-2">
                {subTasks.map((subTask) => (
                  <div key={subTask.id} className="flex items-center gap-2">
                    <Checkbox checked={subTask.completed} disabled />
                    <span
                      className={cn(
                        'text-sm',
                        subTask.completed && 'line-through text-muted-foreground',
                      )}
                    >
                      {subTask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
