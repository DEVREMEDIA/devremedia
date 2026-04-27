/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import type { TodayItem } from '@/types/dashboard';
import { daysAheadIso, todayIso } from './_utils';

const ATHENS_TZ = 'Europe/Athens';

// HH:MM in Athens local time. Calendar events store start_date as
// timestamptz; without explicit timezone we'd render them in UTC and
// the dashboard time would not match what /admin/calendar shows.
function athensHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: ATHENS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export async function getTodayAgenda(): Promise<TodayItem[]> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const tomorrow = daysAheadIso(1);

    const [filming, meetings, tasks, projectStarts, projectDeadlines, invoicesDue, deliverables] =
      await Promise.all([
        supabase
          .from('calendar_events')
          .select(
            'id, title, description, start_date, all_day, assigned_to, project_id, ' +
              'assignee:user_profiles!calendar_events_assigned_to_user_profiles_fkey(display_name, avatar_url)',
          )
          .eq('event_type', 'filming')
          .gte('start_date', today)
          .lt('start_date', tomorrow),
        supabase
          .from('calendar_events')
          .select(
            'id, title, description, start_date, all_day, event_type, assigned_to, ' +
              'assignee:user_profiles!calendar_events_assigned_to_user_profiles_fkey(display_name, avatar_url)',
          )
          .in('event_type', ['meeting', 'reminder'])
          .gte('start_date', today)
          .lt('start_date', tomorrow),
        supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, project_id, project:projects(title), ' +
              'assignee:user_profiles!tasks_assigned_to_fkey(display_name, avatar_url)',
          )
          .or(`due_date.eq.${today},and(due_date.lt.${today},status.neq.done)`)
          .neq('status', 'done')
          .order('due_date', { ascending: true })
          .limit(20),
        supabase
          .from('projects')
          .select('id, title, start_date, client:clients(contact_name)')
          .eq('start_date', today)
          .not('status', 'eq', 'archived'),
        supabase
          .from('projects')
          .select('id, title, deadline, status, client:clients(contact_name)')
          .eq('deadline', today)
          .not('status', 'in', '(delivered,archived)'),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, client:clients(contact_name)')
          .eq('due_date', today)
          .in('status', ['sent', 'viewed']),
        supabase
          .from('deliverables')
          .select('id, title, project_id, project:projects(title)')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: true })
          .limit(10),
      ]);

    const items: TodayItem[] = [];

    // Filming
    (filming.data ?? []).forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      items.push({
        id: `filming-${row.id}`,
        kind: 'filming',
        title: row.title,
        subtitle: row.description ?? undefined,
        time: row.all_day ? null : athensHHMM(row.start_date),
        href: row.project_id ? `/admin/projects/${row.project_id}` : '/admin/calendar',
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
      });
    });

    // Meetings + reminders
    (meetings.data ?? []).forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      items.push({
        id: `meeting-${row.id}`,
        kind: 'meeting',
        title: row.title,
        subtitle: row.description ?? undefined,
        time: row.all_day ? null : athensHHMM(row.start_date),
        href: '/admin/calendar',
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
      });
    });

    // Tasks
    (tasks.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      const overdue = row.due_date && row.due_date < today;
      items.push({
        id: `task-${row.id}`,
        kind: 'task',
        title: row.title,
        subtitle: project?.title ?? undefined,
        time: null,
        href: `/admin/projects/${row.project_id}/tasks`,
        assigneeName: assignee?.display_name ?? null,
        assigneeAvatarUrl: assignee?.avatar_url ?? null,
        badge: overdue
          ? { label: 'Overdue', tone: 'destructive' }
          : { label: row.priority, tone: 'secondary' },
      });
    });

    // Project starts
    (projectStarts.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `project-start-${row.id}`,
        kind: 'project_start',
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/projects/${row.id}`,
      });
    });

    // Project deadlines
    (projectDeadlines.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `project-deadline-${row.id}`,
        kind: 'project_deadline',
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/projects/${row.id}`,
        badge: { label: row.status, tone: 'outline' },
      });
    });

    // Invoices due
    (invoicesDue.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `invoice-${row.id}`,
        kind: 'invoice_due',
        title: `Invoice ${row.invoice_number}`,
        subtitle: client?.contact_name ?? undefined,
        time: null,
        href: `/admin/invoices/${row.id}`,
      });
    });

    // Deliverables pending review
    (deliverables.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      items.push({
        id: `deliverable-${row.id}`,
        kind: 'deliverable_pending',
        title: row.title,
        subtitle: project?.title ?? undefined,
        time: null,
        href: `/admin/projects/${row.project_id}`,
      });
    });

    return items;
  } catch {
    return [];
  }
}
