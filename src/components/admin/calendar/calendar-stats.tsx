'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { CalendarDays, AlertTriangle, FileText, FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CalendarEvent } from '@/lib/queries/calendar';
import type { Tone } from '@/lib/status-tone';

interface CalendarStatsProps {
  events: CalendarEvent[];
}

export function CalendarStats({ events }: CalendarStatsProps) {
  const t = useTranslations('calendar');

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysFromNow = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const thisMonthEvents = events.filter((e) => {
      const date = new Date(e.start);
      return date >= startOfMonth && date <= endOfMonth;
    }).length;

    const upcomingDeadlines = events.filter((e) => {
      const date = new Date(e.start);
      return e.subtype === 'deadline' && date >= todayStart && date <= thirtyDaysFromNow;
    }).length;

    const overdueInvoices = events.filter((e) => {
      const date = new Date(e.start);
      return e.type === 'invoice' && date < todayStart;
    }).length;

    const activeProjects = new Set(
      events.filter((e) => e.type === 'project').map((e) => e.entityId),
    ).size;

    return { thisMonthEvents, upcomingDeadlines, overdueInvoices, activeProjects };
  }, [events]);

  const cards: { label: string; value: number; icon: LucideIcon; tone?: Tone }[] = [
    { label: t('thisMonthEvents'), value: stats.thisMonthEvents, icon: CalendarDays },
    {
      label: t('upcomingDeadlines'),
      value: stats.upcomingDeadlines,
      icon: AlertTriangle,
      tone: stats.upcomingDeadlines > 0 ? 'caution' : undefined,
    },
    {
      label: t('overdueInvoices'),
      value: stats.overdueInvoices,
      icon: FileText,
      tone: stats.overdueInvoices > 0 ? 'critical' : undefined,
    },
    { label: t('activeProjects'), value: stats.activeProjects, icon: FolderOpen },
  ];

  return (
    <StatGrid columns={4}>
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </StatGrid>
  );
}
