'use client';

import { Clapperboard, AlertCircle, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  activeProjectsCount: number;
  pendingActionsCount: number;
  upcomingFilmingsCount: number;
}

export function DashboardStats({
  activeProjectsCount,
  pendingActionsCount,
  upcomingFilmingsCount,
}: DashboardStatsProps) {
  const t = useTranslations('client.dashboard');

  const stats = [
    {
      label: t('activeProjects'),
      value: activeProjectsCount,
      icon: Clapperboard,
      accent: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: t('pendingActions'),
      value: pendingActionsCount,
      icon: AlertCircle,
      accent: pendingActionsCount > 0 ? 'text-orange-500' : 'text-emerald-500',
      bg: pendingActionsCount > 0 ? 'bg-orange-500/10' : 'bg-emerald-500/10',
    },
    {
      label: t('upcomingFilmings'),
      value: upcomingFilmingsCount,
      icon: Calendar,
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'rounded-xl border bg-card p-5 transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <Icon className={cn('h-6 w-6', stat.accent)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
