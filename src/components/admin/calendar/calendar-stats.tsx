'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, AlertTriangle, FileText, FolderOpen } from 'lucide-react';
import type { CalendarEvent } from '@/lib/queries/calendar';
import type { ComponentType } from 'react';

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

  const cards: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    {
      label: t('thisMonthEvents'),
      value: stats.thisMonthEvents,
      icon: CalendarDays,
      color: 'text-primary',
    },
    {
      label: t('upcomingDeadlines'),
      value: stats.upcomingDeadlines,
      icon: AlertTriangle,
      color: 'text-amber-500',
    },
    {
      label: t('overdueInvoices'),
      value: stats.overdueInvoices,
      icon: FileText,
      color: 'text-destructive',
    },
    {
      label: t('activeProjects'),
      value: stats.activeProjects,
      icon: FolderOpen,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg bg-muted p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
