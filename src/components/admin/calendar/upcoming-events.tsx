'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { CalendarEvent } from '@/lib/queries/calendar';

interface UpcomingEventsProps {
  events: CalendarEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  project: 'hsl(var(--primary))',
  task: 'hsl(142 76% 36%)',
  invoice: 'hsl(25 95% 53%)',
  custom: 'hsl(280 70% 50%)',
};

const TYPE_KEYS: Record<string, string> = {
  project: 'filterProject',
  task: 'filterTask',
  invoice: 'filterInvoice',
  custom: 'filterCustom',
};

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  const t = useTranslations('calendar');

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter((e) => e.start >= today)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 7);
  }, [events]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {t('upcomingEventsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noUpcomingEvents')}</p>
        ) : (
          upcoming.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[event.type] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.start), 'MMM d')}
                  </span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {t(TYPE_KEYS[event.type])}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
