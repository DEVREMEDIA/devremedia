'use client';

import { useState, useEffect } from 'react';
import { TaskChecklist } from '@/components/admin/tasks/task-checklist';
import { getTasksByProject } from '@/lib/actions/tasks';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Task } from '@/types';

interface TasksTabProps {
  projectId: string;
}

export function TasksTab({ projectId }: TasksTabProps) {
  const t = useTranslations('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getTasksByProject(projectId);
      if (result.error) {
        setError(result.error);
      } else {
        setTasks(result.data ?? []);
      }
      setIsLoading(false);
    };
    fetchTasks();
  }, [projectId, refreshCounter]);

  const handleRefresh = () => setRefreshCounter((prev) => prev + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">{t('title')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <TaskChecklist projectId={projectId} tasks={tasks} onRefresh={handleRefresh} />;
}
