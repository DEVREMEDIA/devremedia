'use client';

import Link from 'next/link';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { TaskStatusUpdate } from './task-status-update';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Task, Priority } from '@/types/index';
import { cn } from '@/lib/utils';

interface MyTaskCardProps {
  task: Task & { project?: { title: string } | null };
}

const priorityColorMap: Record<Priority, string> = {
  low: 'text-blue-600 dark:text-blue-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-orange-600 dark:text-orange-400',
  urgent: 'text-red-600 dark:text-red-400',
};

const priorityBgMap: Record<Priority, string> = {
  low: 'bg-blue-500/10',
  medium: 'bg-amber-500/10',
  high: 'bg-orange-500/10',
  urgent: 'bg-red-500/10',
};

export function MyTaskCard({ task }: MyTaskCardProps) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  const projectTitle = task.project?.title ?? 'Unknown Project';

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-4 transition-all duration-300',
        'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
        isOverdue && 'border-red-500/30',
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/employee/tasks/${task.id}`}
              className="text-base font-semibold hover:text-amber-500 transition-colors line-clamp-2"
            >
              {task.title}
            </Link>
            <Link
              href={`/employee/projects/${task.project_id}`}
              className="text-sm text-muted-foreground mt-1 hover:text-amber-500 transition-colors inline-block"
            >
              {projectTitle}
            </Link>
          </div>
          <TaskStatusUpdate
            taskId={task.id}
            currentStatus={task.status}
            projectId={task.project_id}
          />
        </div>

        {/* Badges and due date */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-md',
              priorityBgMap[task.priority],
              priorityColorMap[task.priority],
            )}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>

          {task.due_date && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-muted-foreground',
              )}
            >
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(task.due_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
