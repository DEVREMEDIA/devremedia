'use server';

import { createClient } from '@/lib/supabase/server';
import { CALENDAR_EVENT_COLORS } from '@/lib/constants';
import type { CalendarEventType } from '@/lib/constants';

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color: string;
  type: 'project' | 'task' | 'invoice' | 'custom';
  entityId: string;
  subtype?: 'start' | 'deadline';
  projectTitle?: string;
  clientName?: string;
  description?: string;
  eventType?: CalendarEventType;
};

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const supabase = await createClient();

    const [projectsResult, tasksResult, invoicesResult, customResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, start_date, deadline')
        .neq('status', 'archived')
        .not('start_date', 'is', null),
      supabase
        .from('tasks')
        .select('id, title, due_date, project:projects(title)')
        .neq('status', 'done')
        .not('due_date', 'is', null),
      supabase
        .from('invoices')
        .select(
          'id, invoice_number, due_date, project:projects(title), client:clients(contact_name)',
        )
        .in('status', ['sent', 'viewed', 'overdue'])
        .not('due_date', 'is', null),
      supabase
        .from('calendar_events')
        .select('id, title, description, start_date, end_date, all_day, color, event_type'),
    ]);

    const events: CalendarEvent[] = [];

    if (!projectsResult.error && projectsResult.data) {
      projectsResult.data.forEach((project) => {
        if (project.start_date) {
          events.push({
            id: `project-start-${project.id}`,
            title: `Start: ${project.title}`,
            start: project.start_date,
            allDay: true,
            color: 'hsl(var(--primary))',
            type: 'project',
            entityId: project.id,
            subtype: 'start',
          });
        }
        if (project.deadline) {
          events.push({
            id: `project-deadline-${project.id}`,
            title: `Deadline: ${project.title}`,
            start: project.deadline,
            allDay: true,
            color: 'hsl(var(--destructive))',
            type: 'project',
            entityId: project.id,
            subtype: 'deadline',
          });
        }
      });
    }

    if (!tasksResult.error && tasksResult.data) {
      tasksResult.data.forEach((task) => {
        const projectData = task.project as unknown as { title: string } | null;
        if (task.due_date) {
          events.push({
            id: `task-${task.id}`,
            title: `Task: ${task.title}`,
            start: task.due_date,
            allDay: true,
            color: 'hsl(142 76% 36%)',
            type: 'task',
            entityId: task.id,
            projectTitle: projectData?.title,
          });
        }
      });
    }

    if (!invoicesResult.error && invoicesResult.data) {
      invoicesResult.data.forEach((invoice) => {
        const clientData = invoice.client as unknown as { contact_name: string } | null;
        if (invoice.due_date) {
          events.push({
            id: `invoice-${invoice.id}`,
            title: `Invoice Due: ${invoice.invoice_number}`,
            start: invoice.due_date,
            allDay: true,
            color: 'hsl(25 95% 53%)',
            type: 'invoice',
            entityId: invoice.id,
            clientName: clientData?.contact_name,
          });
        }
      });
    }

    if (!customResult.error && customResult.data) {
      customResult.data.forEach((ce) => {
        const evtType = ce.event_type as CalendarEventType;
        events.push({
          id: ce.id,
          title: ce.title,
          start: ce.start_date,
          end: ce.end_date ?? undefined,
          allDay: ce.all_day,
          color: ce.color ?? CALENDAR_EVENT_COLORS[evtType] ?? CALENDAR_EVENT_COLORS.custom,
          type: 'custom',
          entityId: ce.id,
          description: ce.description ?? undefined,
          eventType: evtType,
        });
      });
    }

    return events;
  } catch {
    return [];
  }
}
