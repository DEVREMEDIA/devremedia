import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchChangedEvents } from '@/lib/google-calendar';
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import type { calendar_v3 } from '@googleapis/calendar';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // 1. Validate channel token
    const channelToken = request.headers.get('x-goog-channel-token');
    const { data: config } = await supabase
      .from('google_calendar_config')
      .select('webhook_channel_token, sync_token')
      .limit(1)
      .single();

    if (!config?.webhook_channel_token || channelToken !== config.webhook_channel_token) {
      return NextResponse.json({ error: 'Invalid channel token' }, { status: 403 });
    }

    // 2. Fetch changed events using syncToken
    const { events, nextSyncToken } = await fetchChangedEvents(config.sync_token);

    // 3. Update syncToken atomically
    if (nextSyncToken) {
      await supabase
        .from('google_calendar_config')
        .update({
          sync_token: nextSyncToken,
          last_sync_at: new Date().toISOString(),
        })
        .not('id', 'is', null);
    }

    // 4. Process each changed event
    const adminIds = await getAdminUserIds();

    for (const event of events) {
      await processGoogleEvent(supabase, event, adminIds);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Google Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function processGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: calendar_v3.Schema$Event,
  adminIds: string[],
) {
  if (!event.id) return;

  // Check existing mapping
  const { data: mapping } = await supabase
    .from('google_calendar_sync')
    .select('id, entity_type, entity_id, subtype, sync_status, last_synced_at')
    .eq('google_event_id', event.id)
    .single();

  // Already synced or ignored — skip
  if (mapping?.sync_status === 'ignored') return;

  const isCancelled = event.status === 'cancelled';

  if (!mapping) {
    // New event from Google — AUTO-CREATE in platform + notify
    if (isCancelled) return;

    const startDate = event.start?.dateTime ?? event.start?.date ?? '';
    const endDate = event.end?.dateTime ?? event.end?.date ?? null;
    const isAllDay = !event.start?.dateTime;

    // Get a system admin user ID for created_by
    const createdBy = adminIds[0];
    if (!createdBy) return;

    // Create calendar event in Supabase automatically
    const { data: newEvent, error } = await supabase
      .from('calendar_events')
      .insert({
        title: event.summary ?? 'Google Calendar Event',
        description: event.description ?? null,
        start_date: startDate,
        end_date: endDate,
        all_day: isAllDay,
        event_type: 'meeting',
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error || !newEvent) {
      console.error('[Google Webhook] Failed to create event:', error?.message);
      return;
    }

    // Create sync mapping
    await supabase.from('google_calendar_sync').insert({
      entity_type: 'custom',
      entity_id: newEvent.id,
      google_event_id: event.id,
      sync_status: 'synced',
      sync_direction: 'from_google',
      last_synced_at: new Date().toISOString(),
    });

    // Notify admins (info only, no action needed)
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_NEW_EVENT,
      title: 'Νέο event από Google Calendar',
      body: `"${event.summary ?? 'Untitled'}" προστέθηκε αυτόματα στο calendar`,
      actionUrl: '/admin/calendar',
    });
    return;
  }

  // Existing mapping
  if (isCancelled) {
    // Event deleted from Google — auto-delete from platform + notify
    if (mapping.entity_id) {
      if (mapping.entity_type === 'custom') {
        await supabase.from('calendar_events').delete().eq('id', mapping.entity_id);
      }
    }

    // Remove mapping
    await supabase.from('google_calendar_sync').delete().eq('id', mapping.id);

    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_EVENT_DELETED,
      title: 'Event διαγράφηκε από Google Calendar',
      body: `"${event.summary ?? 'Event'}" αφαιρέθηκε αυτόματα`,
      actionUrl: '/admin/calendar',
    });
    return;
  }

  // Event modified — auto-update in platform
  if (mapping.entity_id) {
    const updateData: Record<string, unknown> = {
      title: event.summary ?? undefined,
      description: event.description ?? null,
      start_date: event.start?.dateTime ?? event.start?.date ?? undefined,
      end_date: event.end?.dateTime ?? event.end?.date ?? null,
      all_day: !event.start?.dateTime,
      updated_at: new Date().toISOString(),
    };

    if (mapping.entity_type === 'custom') {
      await supabase.from('calendar_events').update(updateData).eq('id', mapping.entity_id);
    } else if (mapping.entity_type === 'project') {
      const field = mapping.subtype === 'start' ? 'start_date' : 'deadline';
      await supabase
        .from('projects')
        .update({ [field]: event.start?.dateTime ?? event.start?.date })
        .eq('id', mapping.entity_id);
    } else if (mapping.entity_type === 'task') {
      await supabase
        .from('tasks')
        .update({ due_date: event.start?.dateTime ?? event.start?.date })
        .eq('id', mapping.entity_id);
    } else if (mapping.entity_type === 'invoice') {
      await supabase
        .from('invoices')
        .update({ due_date: event.start?.dateTime ?? event.start?.date })
        .eq('id', mapping.entity_id);
    }

    await supabase
      .from('google_calendar_sync')
      .update({ last_synced_at: new Date().toISOString(), sync_status: 'synced' })
      .eq('id', mapping.id);

    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_EVENT_CHANGED,
      title: 'Event ενημερώθηκε από Google Calendar',
      body: `"${event.summary ?? 'Event'}" ενημερώθηκε αυτόματα`,
      actionUrl: '/admin/calendar',
    });
  }
}

function formatEventDate(event: calendar_v3.Schema$Event): string {
  const date = event.start?.dateTime ?? event.start?.date ?? '';
  try {
    return new Date(date).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}
