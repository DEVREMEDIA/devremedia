'use client';

import Link from 'next/link';
import { Calendar, AlertCircle, FileText, FolderKanban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/shared/status-badge';
import { DetailShell } from '@/components/shared/detail-shell';
import { TaskStatusUpdate } from './task-status-update';
import type { Task } from '@/types/index';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

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

export function TaskDetail({ task }: TaskDetailProps) {
  const t = useTranslations('employee.tasks');
  const tCommon = useTranslations('common');

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  const subTasks = (task.metadata?.sub_tasks as SubTask[] | undefined) ?? [];

  return (
    <DetailShell
      backHref="/employee/work?tab=tasks"
      backLabel={t('title')}
      title={task.title}
      meta={`${tCommon('project')}: ${task.project?.title ?? t('unknownProject')}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('taskDetail')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <StatusBadge status={task.priority} />
            </div>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{tCommon('dueDate')}</p>
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isOverdue ? 'text-tone-critical font-semibold' : 'text-foreground',
                )}
              >
                {isOverdue && <AlertCircle className="h-4 w-4" />}
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(task.due_date, {
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
    </DetailShell>
  );
}
