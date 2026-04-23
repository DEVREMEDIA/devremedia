'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Returns the ISO offset string (e.g. "+03:00", "+02:00") that applies to
 * Europe/Athens at the given calendar date. Handles DST by probing at noon UTC
 * on the target date and reading the longOffset via Intl.DateTimeFormat.
 */
function athensOffsetFor(filmingDate: string): string {
  const [y, m, d] = filmingDate.split('-').map(Number);
  try {
    const probe = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
    const fmt = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Athens',
      timeZoneName: 'longOffset',
    });
    const offsetPart = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value;
    if (offsetPart?.startsWith('GMT')) {
      const raw = offsetPart.replace('GMT', '').trim();
      return raw || '+00:00';
    }
  } catch {
    // fall through
  }
  return '+02:00';
}

/**
 * Upsert (or remove) the auto-generated filming calendar event for a project.
 *
 * - If the project has filming_date: upsert a calendar_event keyed by project_id
 *   with event_type='filming', title "Γύρισμα: <project title>", and the
 *   assigned_to + location carried across.
 * - If the project lacks filming_date: delete the synced event (if any) so the
 *   calendar stays in sync with source-of-truth data.
 *
 * Idempotent thanks to the partial unique index `uniq_calendar_events_project_filming`
 * from migration 00036.
 *
 * Designed to be called from updateProjectStatus and updateProject, so callers
 * don't need to reason about "already synced or not".
 */
export async function syncProjectFilmingToCalendar(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' };

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, title, status, filming_date, filming_time, location, assigned_to')
    .eq('id', projectId)
    .single();

  if (pErr || !project) {
    return { ok: false, error: pErr?.message ?? 'Project not found' };
  }

  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('project_id', projectId)
    .eq('event_type', 'filming')
    .maybeSingle();

  // No filming_date → detach the synced event if one exists.
  if (!project.filming_date) {
    if (existing) {
      await supabase.from('calendar_events').delete().eq('id', existing.id);
      revalidatePath('/admin/calendar');
    }
    return { ok: true };
  }

  const allDay = !project.filming_time;
  const startIso = allDay
    ? `${project.filming_date}T00:00:00+00:00`
    : `${project.filming_date}T${project.filming_time}:00${athensOffsetFor(project.filming_date)}`;

  const payload = {
    project_id: projectId,
    title: `Γύρισμα: ${project.title}`,
    description: project.location ?? null,
    start_date: startIso,
    end_date: null,
    all_day: allDay,
    color: null,
    event_type: 'filming' as const,
    assigned_to: project.assigned_to ?? null,
  };

  if (existing) {
    const { error: uErr } = await supabase
      .from('calendar_events')
      .update(payload)
      .eq('id', existing.id);
    if (uErr) return { ok: false, error: uErr.message };
  } else {
    const { error: iErr } = await supabase
      .from('calendar_events')
      .insert({ ...payload, created_by: user.id });
    if (iErr) return { ok: false, error: iErr.message };
  }

  revalidatePath('/admin/calendar');
  return { ok: true };
}
