import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { watchCalendar, stopWatch } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get current watch config
    const { data: config } = await supabase
      .from('google_calendar_config')
      .select('id, webhook_channel_id, webhook_resource_id, webhook_expiration')
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ skipped: 'No config found' });
    }

    // Check if watch expires within 24 hours
    const expiration = config.webhook_expiration ? new Date(config.webhook_expiration) : null;
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (expiration && expiration > oneDayFromNow) {
      return NextResponse.json({
        skipped: 'Watch still valid',
        expires: config.webhook_expiration,
      });
    }

    // Stop old watch if exists
    if (config.webhook_channel_id && config.webhook_resource_id) {
      try {
        await stopWatch(config.webhook_channel_id, config.webhook_resource_id);
      } catch {
        // Old watch may have already expired — continue
      }
    }

    // Create new watch
    const watchResult = await watchCalendar();

    // Update config
    await supabase
      .from('google_calendar_config')
      .update({
        webhook_channel_id: watchResult.channelId,
        webhook_channel_token: watchResult.channelToken,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiration: watchResult.expiration,
      })
      .eq('id', config.id);

    return NextResponse.json({
      renewed: true,
      newExpiration: watchResult.expiration,
    });
  } catch (err) {
    console.error('[Calendar Renew] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Renewal failed' },
      { status: 500 },
    );
  }
}
