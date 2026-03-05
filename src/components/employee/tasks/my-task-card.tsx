'use client';

import Link from 'next/link';
import { Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { TaskStatusUpdate } from './task-status-update';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Task, Priority } from '@/types/index';
import { cn } from '@/lib/utils';

interface MyTaskCardProps {
  task: Task & { project?: { title: string } | null };
}

const priorityColorMap: Record<Priority, string> = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export function MyTaskCard({ task }: MyTaskCardProps) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  const projectTitle = task.project?.title ?? 'Unknown Project';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link
                href={`/employee/tasks/${task.id}`}
                className="text-base font-semibold hover:underline line-clamp-2"
              >
                {task.title}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">{projectTitle}</p>
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
                'text-xs font-medium px-2 py-1 rounded-md bg-gray-100',
                priorityColorMap[task.priority],
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>

            {task.due_date && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground',
                )}
              >
                {isOverdue && <AlertCircle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(task.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
