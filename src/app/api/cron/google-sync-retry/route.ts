import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

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
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const row of pendingRows) {
    // Backoff: skip if too soon (2^retry_count minutes)
    const backoffMinutes = Math.pow(2, Math.min(row.retry_count, 10));
    const backoffMs = backoffMinutes * 60 * 1000;
    const updatedAt = new Date(row.updated_at).getTime();
    if (Date.now() - updatedAt < backoffMs) continue;

    // After 20 retries or 3 days, mark as conflict and notify admins
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
        body: `Sync for ${row.entity_type}/${row.entity_id} failed after multiple retries`,
        actionUrl: '/admin/calendar',
      });
      processed++;
      continue;
    }

    // Increment retry_count and updated_at so backoff grows on next run
    try {
      await supabase
        .from('google_calendar_sync')
        .update({
          retry_count: row.retry_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      processed++;
    } catch (err) {
      console.error(`[Cron] Retry failed for ${row.id}:`, err);
    }
  }

  return NextResponse.json({ processed });
}
