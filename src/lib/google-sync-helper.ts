import { createAdminClient } from '@/lib/supabase/admin';
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar';
import type { GoogleEventPayload } from '@/lib/google-calendar';

interface SyncOptions {
  entityType: 'project' | 'task' | 'invoice' | 'custom';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  eventData?: GoogleEventPayload;
  subtype?: 'start' | 'deadline';
  fromGoogle?: boolean;
}

export async function syncEntityToGoogle({
  entityType,
  entityId,
  operation,
  eventData,
  subtype,
  fromGoogle = false,
}: SyncOptions): Promise<void> {
  if (fromGoogle) return;
  if (!process.env.GOOGLE_CALENDAR_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return;

  const supabase = createAdminClient();

  try {
    if (operation === 'create' && eventData) {
      await handleCreate(supabase, entityType, entityId, eventData, subtype);
    } else if (operation === 'update' && eventData) {
      await handleUpdate(supabase, entityType, entityId, eventData, subtype);
    } else if (operation === 'delete') {
      await handleDelete(supabase, entityType, entityId, subtype);
    }
  } catch (err) {
    console.error(`[Google Sync] ${operation} failed for ${entityType}/${entityId}:`, err);
  }
}

async function handleCreate(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  eventData: GoogleEventPayload,
  subtype?: string,
) {
  let googleEventId: string | null = null;
  let syncStatus: 'synced' | 'pending' = 'pending';

  try {
    googleEventId = await createGoogleEvent(eventData);
    syncStatus = 'synced';
  } catch (err) {
    console.error('[Google Sync] createGoogleEvent failed:', err);
  }

  await supabase.from('google_calendar_sync').insert({
    entity_type: entityType,
    entity_id: entityId,
    subtype: subtype ?? null,
    google_event_id: googleEventId,
    sync_status: syncStatus,
    sync_direction: 'to_google',
    last_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
  });
}

async function handleUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  eventData: GoogleEventPayload,
  subtype?: string,
) {
  let query = supabase
    .from('google_calendar_sync')
    .select('id, google_event_id, sync_status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (subtype) {
    query = query.eq('subtype', subtype);
  } else {
    query = query.is('subtype', null);
  }

  const { data: mapping } = await query.single();

  if (!mapping) {
    await handleCreate(supabase, entityType, entityId, eventData, subtype);
    return;
  }

  if (!mapping.google_event_id) {
    try {
      const googleEventId = await createGoogleEvent(eventData);
      await supabase
        .from('google_calendar_sync')
        .update({
          google_event_id: googleEventId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          retry_count: 0,
        })
        .eq('id', mapping.id);
    } catch (err) {
      console.error('[Google Sync] retry create on update failed:', err);
    }
    return;
  }

  try {
    await updateGoogleEvent(mapping.google_event_id, eventData);
    await supabase
      .from('google_calendar_sync')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', mapping.id);
  } catch (err) {
    console.error('[Google Sync] updateGoogleEvent failed:', err);
    await supabase
      .from('google_calendar_sync')
      .update({ sync_status: 'pending' })
      .eq('id', mapping.id);
  }
}

async function handleDelete(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  subtype?: string,
) {
  let query = supabase
    .from('google_calendar_sync')
    .select('id, google_event_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (subtype) {
    query = query.eq('subtype', subtype);
  } else {
    query = query.is('subtype', null);
  }

  const { data: mapping } = await query.single();

  if (!mapping) return;

  if (mapping.google_event_id) {
    try {
      await deleteGoogleEvent(mapping.google_event_id);
    } catch (err) {
      console.error('[Google Sync] deleteGoogleEvent failed:', err);
    }
  }

  await supabase.from('google_calendar_sync').delete().eq('id', mapping.id);
}
