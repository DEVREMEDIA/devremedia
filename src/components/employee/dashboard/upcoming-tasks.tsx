'use client';

import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Task, Project } from '@/types';

interface UpcomingTasksProps {
  tasks: (Task & { project: Pick<Project, 'title'> | null })[];
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const t = useTranslations('employee.dashboard');
  const tCommon = useTranslations('common');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t('upcomingTasks')}</CardTitle>
        </div>
        <CardDescription>
          {tasks.length} {tasks.length === 1 ? tCommon('task') : tCommon('tasks')}{' '}
          {t('dueThisWeek')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('noUpcoming')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
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
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/employee/tasks">
                {tCommon('viewAllTasks')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
