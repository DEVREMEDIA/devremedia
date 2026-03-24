import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { watchCalendar, stopWatch } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data: config } = await supabase
      .from('google_calendar_config')
      .select('id, webhook_channel_id, webhook_resource_id')
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No config found' }, { status: 500 });
    }

    // Stop existing watch if one exists (may have already expired — ignore errors)
    if (config.webhook_channel_id && config.webhook_resource_id) {
      try {
        await stopWatch(config.webhook_channel_id, config.webhook_resource_id);
      } catch (err) {
        console.error('[Cron] stopWatch failed (may have already expired):', err);
      }
    }

    const result = await watchCalendar();

    await supabase
      .from('google_calendar_config')
      .update({
        webhook_channel_id: result.channelId,
        webhook_channel_token: result.channelToken,
        webhook_resource_id: result.resourceId,
        webhook_expiration: result.expiration,
      })
      .eq('id', config.id);

    return NextResponse.json({
      channelId: result.channelId,
      expiration: result.expiration,
    });
  } catch (err) {
    console.error('[Cron] Webhook renew failed:', err);
    return NextResponse.json({ error: 'Failed to renew webhook' }, { status: 500 });
  }
}
