'use client';

import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Task, Project } from '@/types';

interface TodayTasksProps {
  tasks: (Task & { project: Pick<Project, 'title'> | null })[];
}

export function TodayTasks({ tasks }: TodayTasksProps) {
  const t = useTranslations('common');

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <CalendarDays className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">{t('todayTasks')}</h2>
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        )}
      </div>
      <div className="p-5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('noTasksDueToday')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-all duration-200',
                  'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
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
                  </div>
                </div>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-3 gap-2">
              <Link href="/employee/tasks">
                {t('viewAllTasks')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
