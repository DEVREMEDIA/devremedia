import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { watchCalendar, fetchChangedEvents } from '@/lib/google-calendar';

export async function POST(_request: NextRequest) {
  // Auth check — admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Bootstrap syncToken by doing initial full sync
    const { nextSyncToken } = await fetchChangedEvents(null);

    // 2. Set up webhook watch
    const watchResult = await watchCalendar();

    // 3. Store everything in config
    const { data: config } = await adminClient
      .from('google_calendar_config')
      .select('id')
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No config row found' }, { status: 500 });
    }

    await adminClient
      .from('google_calendar_config')
      .update({
        sync_token: nextSyncToken,
        webhook_channel_id: watchResult.channelId,
        webhook_channel_token: watchResult.channelToken,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiration: watchResult.expiration,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    return NextResponse.json({
      success: true,
      syncToken: nextSyncToken ? 'stored' : 'none',
      webhookExpiration: watchResult.expiration,
    });
  } catch (err) {
    console.error('[Google Setup] Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    );
  }
}
