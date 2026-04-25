import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createGoogleEvent,
  updateGoogleEvent,
  getGoogleColorId,
  type GoogleEventPayload,
} from '@/lib/google-calendar';
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

type AdminClient = ReturnType<typeof createAdminClient>;

interface PendingRow {
  id: string;
  entity_type: 'custom' | 'project' | 'task' | 'invoice';
  entity_id: string | null;
  subtype: string | null;
  google_event_id: string | null;
  retry_count: number;
  updated_at: string;
}

/**
 * Build the GoogleEventPayload for a pending sync row by re-reading the
 * source entity. Returns null if the entity no longer exists or doesn't
 * have a date to sync (in which case the row is dropped).
 */
async function buildPayloadForRow(
  supabase: AdminClient,
  row: PendingRow,
): Promise<GoogleEventPayload | null> {
  if (!row.entity_id) return null;

  if (row.entity_type === 'custom') {
    const { data } = await supabase
      .from('calendar_events')
      .select('title, description, start_date, end_date, all_day, event_type')
      .eq('id', row.entity_id)
      .single();
    if (!data) return null;
    return {
      title: data.title,
      description: data.description ?? undefined,
      startDate: data.start_date,
      endDate: data.end_date ?? undefined,
      allDay: data.all_day,
      colorId: getGoogleColorId('custom', null, data.event_type),
    };
  }

  if (row.entity_type === 'project') {
    const { data } = await supabase
      .from('projects')
      .select('title, start_date, deadline')
      .eq('id', row.entity_id)
      .single();
    if (!data) return null;
    const isStart = row.subtype === 'start';
    const date = isStart ? data.start_date : data.deadline;
    if (!date) return null;
    return {
      title: `${isStart ? 'Start' : 'Deadline'}: ${data.title}`,
      startDate: date,
      allDay: true,
      colorId: getGoogleColorId('project', row.subtype),
    };
  }

  if (row.entity_type === 'task') {
    const { data } = await supabase
      .from('tasks')
      .select('title, due_date')
      .eq('id', row.entity_id)
      .single();
    if (!data || !data.due_date) return null;
    return {
      title: `Task: ${data.title}`,
      startDate: data.due_date,
      allDay: true,
      colorId: getGoogleColorId('task'),
    };
  }

  if (row.entity_type === 'invoice') {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number, due_date')
      .eq('id', row.entity_id)
      .single();
    if (!data || !data.due_date) return null;
    return {
      title: `Invoice Due: ${data.invoice_number}`,
      startDate: data.due_date,
      allDay: true,
      colorId: getGoogleColorId('invoice'),
    };
  }

  return null;
}

interface RetryResult {
  ok: boolean;
  google_event_id?: string;
  error?: string;
}

async function retryRow(supabase: AdminClient, row: PendingRow): Promise<RetryResult> {
  const payload = await buildPayloadForRow(supabase, row);

  if (!payload) {
    // Entity gone or no longer has a date — drop the orphan mapping
    await supabase.from('google_calendar_sync').delete().eq('id', row.id);
    return { ok: true };
  }

  try {
    if (row.google_event_id) {
      await updateGoogleEvent(row.google_event_id, payload);
      return { ok: true, google_event_id: row.google_event_id };
    }
    const newId = await createGoogleEvent(payload);
    return { ok: true, google_event_id: newId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: pendingRows } = await supabase
    .from('google_calendar_sync')
    .select('id, entity_type, entity_id, subtype, google_event_id, retry_count, updated_at')
    .eq('sync_status', 'pending')
    .order('updated_at', { ascending: true })
    .limit(50);

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, conflicts: 0 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;

  for (const row of pendingRows as PendingRow[]) {
    // Backoff: skip if we tried too recently. 2^retry_count minutes (capped at 1024 min ≈ 17h).
    const backoffMinutes = Math.pow(2, Math.min(row.retry_count, 10));
    const backoffMs = backoffMinutes * 60 * 1000;
    const updatedAt = new Date(row.updated_at).getTime();
    if (Date.now() - updatedAt < backoffMs) continue;

    // Give up after 20 tries or 3 days; surface to admins as a conflict.
    const ageMs = Date.now() - updatedAt;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (row.retry_count > 20 || ageMs > threeDaysMs) {
      await supabase
        .from('google_calendar_sync')
        .update({ sync_status: 'conflict' })
        .eq('id', row.id);

      const adminIds = await getAdminUserIds();
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.GOOGLE_EVENT_CHANGED,
        title: 'Google Calendar sync failed',
        body: `Sync for ${row.entity_type}/${row.entity_id ?? '—'} failed after multiple retries`,
        actionUrl: '/admin/calendar',
      });

      processed++;
      conflicts++;
      continue;
    }

    const result = await retryRow(supabase, row);
    processed++;

    if (result.ok) {
      // result.google_event_id is undefined for orphan-deletes — those rows are gone.
      if (result.google_event_id) {
        await supabase
          .from('google_calendar_sync')
          .update({
            sync_status: 'synced',
            google_event_id: result.google_event_id,
            last_synced_at: new Date().toISOString(),
            retry_count: 0,
          })
          .eq('id', row.id);
      }
      succeeded++;
    } else {
      console.error(`[Cron] Retry failed for ${row.id}: ${result.error}`);
      await supabase
        .from('google_calendar_sync')
        .update({
          retry_count: row.retry_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      failed++;
    }
  }

  return NextResponse.json({ processed, succeeded, failed, conflicts });
}
