import type { Metadata } from 'next';
import { CalendarViewWrapper } from '@/components/admin/calendar/calendar-view-wrapper';
import { getCalendarEvents } from '@/lib/queries/calendar';

export const metadata: Metadata = { title: 'Ημερολόγιο' };

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ημερολόγιο</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Γυρίσματα, κρατήσεις και προθεσμίες σε ένα σημείο
        </p>
      </header>

      <CalendarViewWrapper events={events} />
    </div>
  );
}
