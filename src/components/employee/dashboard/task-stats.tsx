'use client';

import { CheckSquare, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { statusTone } from '@/lib/status-tone';

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
    { label: t('todoCount'), value: stats.todo, icon: CheckSquare, status: 'todo' },
    {
      label: t('inProgressCount'),
      value: stats.in_progress,
      icon: Clock,
      status: 'in_progress',
    },
    { label: t('reviewCount'), value: stats.review, icon: Eye, status: 'review' },
    { label: t('doneCount'), value: stats.done, icon: CheckCircle2, status: 'done' },
  ];

  return (
    <StatGrid columns={4}>
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          tone={statusTone(item.status)}
        />
      ))}
    </StatGrid>
  );
}
