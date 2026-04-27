/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import type { CrewLoadRow, CrewLoadCell, DeadlineGroup, DeadlineProject } from '@/types/dashboard';
import { daysAgoIso, daysAheadIso, todayIso } from './_utils';

export async function getCrewLoad(daysAhead = 14): Promise<CrewLoadRow[]> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const end = daysAheadIso(daysAhead);

    const { data, error } = await supabase
      .from('calendar_events')
      .select(
        'start_date, assigned_to, ' +
          'assignee:user_profiles!calendar_events_assigned_to_user_profiles_fkey(display_name)',
      )
      .eq('event_type', 'filming')
      .gte('start_date', today)
      .lte('start_date', end);

    if (error || !data) return [];

    type Bucket = { name: string; cells: Map<string, number> };
    const crewMap = new Map<string | null, Bucket>();

    data.forEach((row: any) => {
      const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
      const id = (row.assigned_to as string | null) ?? null;
      const name = assignee?.display_name ?? 'Unassigned';
      const day = String(row.start_date).split('T')[0];
      if (!crewMap.has(id)) crewMap.set(id, { name, cells: new Map() });
      const bucket = crewMap.get(id)!;
      bucket.cells.set(day, (bucket.cells.get(day) ?? 0) + 1);
    });

    const days: string[] = [];
    for (let i = 0; i < daysAhead; i++) {
      days.push(i === 0 ? today : daysAheadIso(i));
    }

    const rows: CrewLoadRow[] = [];
    crewMap.forEach((bucket, id) => {
      const cells: CrewLoadCell[] = days.map((date) => ({
        date,
        count: bucket.cells.get(date) ?? 0,
      }));
      rows.push({ crewMemberId: id, crewMemberName: bucket.name, days: cells });
    });

    rows.sort((a, b) => {
      if (a.crewMemberId == null) return 1;
      if (b.crewMemberId == null) return -1;
      return a.crewMemberName.localeCompare(b.crewMemberName);
    });

    return rows;
  } catch {
    return [];
  }
}

export async function getUpcomingDeadlinesGrouped(daysAhead = 30): Promise<DeadlineGroup> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const end = daysAheadIso(daysAhead);
    const recentlyDeliveredFrom = daysAgoIso(7);

    const [upcoming, delivered] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, deadline, status, client:clients(contact_name)')
        .gte('deadline', today)
        .lte('deadline', end)
        .not('status', 'eq', 'archived')
        .order('deadline', { ascending: true }),
      supabase
        .from('projects')
        .select('id, title, deadline, status, client:clients(contact_name)')
        .eq('status', 'delivered')
        .gte('deadline', recentlyDeliveredFrom)
        .lt('deadline', today)
        .order('deadline', { ascending: false }),
    ]);

    const toRow = (p: any): DeadlineProject => {
      const client = Array.isArray(p.client) ? p.client[0] : p.client;
      const days = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86_400_000);
      return {
        projectId: p.id,
        title: p.title,
        clientName: client?.contact_name ?? null,
        deadline: p.deadline,
        status: p.status,
        daysUntilDeadline: days,
      };
    };

    const atRisk: DeadlineProject[] = [];
    const onTrack: DeadlineProject[] = [];

    (upcoming.data ?? []).forEach((p: any) => {
      const row = toRow(p);
      const isRisk = row.daysUntilDeadline <= 7 && !['review', 'delivered'].includes(row.status);
      if (isRisk) atRisk.push(row);
      else onTrack.push(row);
    });

    return {
      atRisk,
      onTrack,
      recentlyDelivered: (delivered.data ?? []).map(toRow),
    };
  } catch {
    return { atRisk: [], onTrack: [], recentlyDelivered: [] };
  }
}
