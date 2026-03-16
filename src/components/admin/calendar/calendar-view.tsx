'use client';

import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import elLocale from '@fullcalendar/core/locales/el';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventDialog } from './event-dialog';
import { CalendarStats } from './calendar-stats';
import { UpcomingEvents } from './upcoming-events';
import { CalendarEventForm } from './calendar-event-form';
import type { CalendarEvent } from '@/lib/queries/calendar';
import type { EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';

type FilterType = 'project' | 'task' | 'invoice' | 'custom';

const FILTER_COLORS: Record<FilterType, string> = {
  project: 'hsl(var(--primary))',
  task: 'hsl(142 76% 36%)',
  invoice: 'hsl(25 95% 53%)',
  custom: 'hsl(280 60% 55%)',
};

const FILTER_KEYS: Record<FilterType, string> = {
  project: 'projects',
  task: 'tasks',
  invoice: 'invoices',
  custom: 'filterCustom',
};

interface CalendarViewProps {
  events: CalendarEvent[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const locale = useLocale();
  const t = useTranslations('calendar');
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addEventDefaultDate, setAddEventDefaultDate] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(['project', 'task', 'invoice', 'custom']),
  );

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        if (next.size > 1) next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const filteredEvents = useMemo(
    () => events.filter((e) => activeFilters.has(e.type)),
    [events, activeFilters],
  );

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find((e) => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsDialogOpen(true);
    }
  };

  const handleDateClick = (arg: DateClickArg) => {
    setAddEventDefaultDate(arg.dateStr);
    setIsAddDialogOpen(true);
  };

  const handleMutationSuccess = () => {
    router.refresh();
  };

  const formattedEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
  }));

  return (
    <>
      <CalendarStats events={events} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(['project', 'task', 'invoice', 'custom'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilters.has(filter) ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter(filter)}
                  className="gap-2"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: FILTER_COLORS[filter] }}
                  />
                  {t(FILTER_KEYS[filter])}
                </Button>
              ))}

              <Button
                size="sm"
                onClick={() => {
                  setAddEventDefaultDate('');
                  setIsAddDialogOpen(true);
                }}
                className="ml-auto gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('addEvent')}
              </Button>
            </div>

            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={formattedEvents}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              editable={false}
              selectable={true}
              height="auto"
              dayMaxEvents={3}
              moreLinkClick="popover"
              eventDisplay="block"
              nowIndicator={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
              }}
              locale={locale}
              locales={[elLocale]}
            />
          </CardContent>
        </Card>

        <UpcomingEvents events={events} />
      </div>

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onEventMutated={handleMutationSuccess}
        />
      )}

      <CalendarEventForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        defaultDate={addEventDefaultDate}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}
