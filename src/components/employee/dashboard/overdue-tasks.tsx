'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Task, Project } from '@/types';

interface OverdueTasksProps {
  tasks: (Task & { project: Pick<Project, 'title'> | null })[];
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function OverdueTasks({ tasks }: OverdueTasksProps) {
  const t = useTranslations('employee.dashboard');
  const tCommon = useTranslations('common');

  return (
    <div className={cn('rounded-xl border bg-card', tasks.length > 0 && 'border-red-500/30')}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <AlertTriangle
          className={cn('h-5 w-5', tasks.length > 0 ? 'text-red-500' : 'text-muted-foreground')}
        />
        <h2
          className={cn(
            'text-lg font-semibold',
            tasks.length > 0 && 'text-red-600 dark:text-red-400',
          )}
        >
          {t('overdueTasks')}
        </h2>
        {tasks.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {tasks.length}
          </Badge>
        )}
      </div>
      <div className="p-5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('noOverdue')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const daysOverdue = task.due_date ? getDaysOverdue(task.due_date) : 0;
              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg transition-all duration-200',
                    'border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">{task.title}</h4>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.project && (
                      <p className="text-xs text-muted-foreground">{task.project.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {daysOverdue} {daysOverdue === 1 ? tCommon('day') : tCommon('days')}{' '}
                        {tCommon('overdue')}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button asChild variant="outline" className="w-full mt-3 gap-2">
              <Link href="/employee/tasks">
                {tCommon('viewAllTasks')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
