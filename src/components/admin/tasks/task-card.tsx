'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statusTone, type Tone } from '@/lib/status-tone';
import { useTranslations } from 'next-intl';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: Priority;
  assigned_to: string | null;
  due_date: string | null;
  order_index: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TaskCardProps = {
  task: Task;
  onClick: (task: Task) => void;
};

// Tailwind can't see a dynamically built class name, so the map stays
// static — but it now has 4 rows (tone) instead of 4 (priority) x 2.
const TONE_DOT: Record<Tone, string> = {
  critical: 'bg-tone-critical',
  caution: 'bg-tone-caution',
  positive: 'bg-tone-positive',
  neutral: 'bg-tone-neutral',
};

const TONE_BADGE: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical border-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution border-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive border-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral border-tone-neutral',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const t = useTranslations('tasks');
  const tPriority = useTranslations('statuses.priority');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const priorityTone = statusTone(task.priority);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow bg-background',
        isDragging && 'opacity-50',
      )}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start gap-2">
        <button
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <div
              className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', TONE_DOT[priorityTone])}
              title={tPriority(task.priority)}
            />
            <h4 className="text-sm font-medium leading-tight flex-1 break-words">{task.title}</h4>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs', TONE_BADGE[priorityTone])}>
              {tPriority(task.priority)}
            </Badge>

            {task.due_date && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'MMM d')}</span>
              </div>
            )}

            {Array.isArray(task.metadata?.sub_tasks) &&
              (task.metadata.sub_tasks as unknown[]).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {
                    (task.metadata.sub_tasks as Array<{ completed: boolean }>).filter(
                      (st) => st.completed,
                    ).length
                  }
                  /{(task.metadata.sub_tasks as Array<unknown>).length} {t('subtasks')}
                </span>
              )}
          </div>
        </div>
      </div>
    </Card>
  );
}
