'use client';

import Link from 'next/link';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/shared/status-badge';
import { TaskStatusUpdate } from './task-status-update';
import type { Task } from '@/types/index';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface MyTaskCardProps {
  task: Task & { project?: { title: string } | null };
}

export function MyTaskCard({ task }: MyTaskCardProps) {
  const t = useTranslations('employee.tasks');
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  const projectTitle = task.project?.title ?? t('unknownProject');

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-4 transition-all duration-300',
        'lift-on-hover',
        isOverdue && 'border-tone-critical/30',
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/employee/tasks/${task.id}`}
              className="text-base font-semibold hover:text-primary transition-colors line-clamp-2"
            >
              {task.title}
            </Link>
            <Link
              href={`/employee/projects/${task.project_id}`}
              className="text-sm text-muted-foreground mt-1 hover:text-primary transition-colors inline-block"
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
          <StatusBadge status={task.priority} />

          {task.due_date && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-tone-critical font-semibold' : 'text-muted-foreground',
              )}
            >
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>
                {formatDate(task.due_date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
