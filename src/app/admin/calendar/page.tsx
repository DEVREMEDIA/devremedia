import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CalendarViewWrapper } from '@/components/admin/calendar/calendar-view-wrapper';
import { PageHeading } from '@/components/shared/page-heading';
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
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      <CalendarViewWrapper events={events} />
    </div>
  );
}
