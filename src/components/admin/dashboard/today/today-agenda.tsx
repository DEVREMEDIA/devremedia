import { getTranslations } from 'next-intl/server';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TodayItem } from './today-item';
import { getTodayAgenda } from '@/lib/queries/dashboard/today';
import type { TodayItem as TodayItemType, TodayItemKind } from '@/types/dashboard';

const GROUP_ORDER: TodayItemKind[] = [
  'filming',
  'meeting',
  'task',
  'project_start',
  'project_deadline',
  'invoice_due',
  'deliverable_pending',
];

export async function TodayAgenda() {
  const t = await getTranslations('dashboard.today');
  const items = await getTodayAgenda();

  const grouped = new Map<TodayItemKind, TodayItemType[]>();
  items.forEach((item) => {
    if (!grouped.has(item.kind)) grouped.set(item.kind, []);
    grouped.get(item.kind)!.push(item);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-auto font-mono tabular-nums">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          GROUP_ORDER.filter((kind) => grouped.has(kind)).map((kind) => (
            <div key={kind} className="space-y-2">
              <h4 className="border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t(`groups.${kind}`)}
              </h4>
              <div className="space-y-2">
                {grouped.get(kind)!.map((item) => (
                  <TodayItem key={item.id} item={item} allDayLabel={t('allDay')} />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
