'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeDeliverables } from '@/components/employee/deliverables/deliverable-list';
import { MessageThread } from '@/components/shared/message-thread';
import { CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import { PRIORITY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Task, Deliverable, Priority } from '@/types/index';

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
}

const priorityColorMap: Record<Priority, string> = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export function ProjectDetail({
  project,
  tasks,
  deliverables,
  currentUserId,
  projectId,
}: ProjectDetailProps) {
  const t = useTranslations('employee.projects');

  return (
    <Tabs defaultValue="tasks" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tasks">{t('myTasks')}</TabsTrigger>
        <TabsTrigger value="deliverables">{t('deliverables')}</TabsTrigger>
        <TabsTrigger value="messages">{t('messages')}</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="space-y-4">
        {tasks.length === 0 ? (
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
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100',
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
                              {new Date(task.due_date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
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
        )}
      </TabsContent>

      <TabsContent value="deliverables">
        <EmployeeDeliverables projectId={projectId} deliverables={deliverables} />
      </TabsContent>

      <TabsContent value="messages">
        <MessageThread projectId={projectId} currentUserId={currentUserId} />
      </TabsContent>
    </Tabs>
  );
}
