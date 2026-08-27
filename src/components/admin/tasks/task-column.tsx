'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './task-card';
import { QuickAddTask } from './quick-add-task';
import { statusTone, type Tone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  due_date: string | null;
  order_index: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TaskColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  projectId: string;
  onTaskClick: (task: Task) => void;
};

// Tailwind can't see a dynamically built class name, so the map stays
// static — but it now has 4 rows (tone) instead of 4 (status).
const TONE_COLUMN: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg border-tone-critical',
  caution: 'bg-tone-caution-bg border-tone-caution',
  positive: 'bg-tone-positive-bg border-tone-positive',
  neutral: 'bg-tone-neutral-bg border-tone-neutral',
};

export function TaskColumn({ status, tasks, projectId, onTaskClick }: TaskColumnProps) {
  const tTaskStatus = useTranslations('statuses.taskStatus');
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);
  const tone = statusTone(status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border-2 border-dashed p-4 min-h-[600px] transition-colors',
        TONE_COLUMN[tone],
        isOver && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {tTaskStatus(status)}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 mb-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      </SortableContext>

      <QuickAddTask projectId={projectId} status={status} />
    </div>
  );
}
