import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CalendarViewWrapper } from '@/components/admin/calendar/calendar-view-wrapper';
import { getCalendarEvents } from '@/lib/queries/calendar';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminCalendar');
  return { title: t('title') };
}

export default async function CalendarPage() {
  const t = await getTranslations('shellV2.pages.adminCalendar');
  const events = await getCalendarEvents();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <CalendarViewWrapper events={events} />
    </div>
  );
}
