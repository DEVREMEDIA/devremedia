'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeDeliverables } from '@/components/employee/deliverables/deliverable-list';
import { MessageThread } from '@/components/shared/message-thread';
import { DetailShell } from '@/components/shared/detail-shell';
import type { SectionTab } from '@/components/shell-v2/section-tabs';
import { CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { Task, Deliverable } from '@/types/index';

/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const PROJECT_TABS: readonly string[] = ['tasks', 'deliverables', 'messages'];

interface ProjectDetailProps {
  project: {
    id: string;
    title: string;
    status: string;
    project_type: string;
    deadline: string | null;
    description: string | null;
  };
  tasks: Task[];
  deliverables: Deliverable[];
  currentUserId: string;
  projectId: string;
  activeTab: string;
}

export function ProjectDetail({
  project,
  tasks,
  deliverables,
  currentUserId,
  projectId,
  activeTab,
}: ProjectDetailProps) {
  const t = useTranslations('employee.projects');

  const TABS: SectionTab[] = [
    { key: 'tasks', label: t('myTasks') },
    { key: 'deliverables', label: t('deliverables') },
    { key: 'messages', label: t('messages') },
  ];

  return (
    <DetailShell
      backHref="/employee/productions"
      backLabel={t('title')}
      title={project.title}
      meta={<StatusBadge status={project.status} />}
      tabs={{ items: TABS, active: activeTab, basePath: `/employee/projects/${projectId}` }}
    >
      {activeTab === 'tasks' &&
        (tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={t('noTasks')}
            description={t('noTasksDescription')}
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue =
                task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

              return (
                <Link key={task.id} href={`/employee/tasks/${task.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StatusBadge status={task.priority} />
                        {task.due_date && (
                          <div
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              isOverdue
                                ? 'text-tone-critical font-semibold'
                                : 'text-muted-foreground',
                            )}
                          >
                            {isOverdue && <AlertCircle className="h-3 w-3" />}
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(task.due_date, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ))}

      {activeTab === 'deliverables' && (
        <EmployeeDeliverables projectId={projectId} deliverables={deliverables} />
      )}

      {activeTab === 'messages' && (
        <MessageThread projectId={projectId} currentUserId={currentUserId} />
      )}
    </DetailShell>
  );
}
