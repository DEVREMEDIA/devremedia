'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/constants';
import type { TaskStatus } from '@/types/index';
import { updateTaskStatus } from '@/lib/actions/tasks';
import { useRouter } from 'next/navigation';

interface TaskStatusUpdateProps {
  taskId: string;
  currentStatus: TaskStatus;
  projectId: string;
}

export function TaskStatusUpdate({ taskId, currentStatus }: TaskStatusUpdateProps) {
  const t = useTranslations('employee.tasks');
  const [status, setStatus] = React.useState<TaskStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    const typedStatus = newStatus as TaskStatus;
    setStatus(typedStatus);
    setIsUpdating(true);

    try {
      const result = await updateTaskStatus(taskId, typedStatus);

      if (result.error) {
        toast.error(t('updateStatus'));
        setStatus(currentStatus);
      } else {
        toast.success(t('updateStatus'));
        router.refresh();
      }
    } catch {
      toast.error(t('updateStatus'));
      setStatus(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
      <SelectTrigger size="sm" className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {TASK_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
