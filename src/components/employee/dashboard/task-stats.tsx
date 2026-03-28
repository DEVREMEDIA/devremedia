'use client';

import { CheckSquare, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface TaskStatsProps {
  stats: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };
}

export function TaskStats({ stats }: TaskStatsProps) {
  const t = useTranslations('employee.dashboard');

  const items = [
    {
      label: t('todoCount'),
      value: stats.todo,
      icon: CheckSquare,
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('inProgressCount'),
      value: stats.in_progress,
      icon: Clock,
      accent: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: t('reviewCount'),
      value: stats.review,
      icon: Eye,
      accent: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: t('doneCount'),
      value: stats.done,
      icon: CheckCircle2,
      accent: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              'rounded-xl border bg-card p-5 transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-bold mt-1">{item.value}</p>
              </div>
              <div className={cn('p-3 rounded-xl', item.bg)}>
                <Icon className={cn('h-6 w-6', item.accent)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
