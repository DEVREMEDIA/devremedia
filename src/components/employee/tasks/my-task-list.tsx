'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { MyTaskCard } from './my-task-card';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TASK_STATUSES, TASK_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/constants';
import type { Task } from '@/types/index';
import { CheckSquare } from 'lucide-react';

interface MyTaskListProps {
  tasks: (Task & { project?: { title: string } | null })[];
}

export function MyTaskList({ tasks }: MyTaskListProps) {
  const t = useTranslations('employee.tasks');
  const tCommon = useTranslations('common');

  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{tCommon('status')}:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('all')}</SelectItem>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{tCommon('priority')}:</span>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('all')}</SelectItem>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || priorityFilter !== 'all') && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {tCommon('clearFilters')}
          </button>
        )}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('noTasks')}
          description={
            statusFilter !== 'all' || priorityFilter !== 'all'
              ? tCommon('tryAdjustingFilters')
              : t('noTasksDescription')
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <MyTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
