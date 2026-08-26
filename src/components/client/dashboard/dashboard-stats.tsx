'use client';

import { Clapperboard, AlertCircle, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';

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

  return (
    <StatGrid columns={3}>
      <StatCard label={t('activeProjects')} value={activeProjectsCount} icon={Clapperboard} />
      <StatCard
        label={t('pendingActions')}
        value={pendingActionsCount}
        icon={AlertCircle}
        tone={pendingActionsCount > 0 ? 'caution' : 'positive'}
      />
      <StatCard label={t('upcomingFilmings')} value={upcomingFilmingsCount} icon={Calendar} />
    </StatGrid>
  );
}
