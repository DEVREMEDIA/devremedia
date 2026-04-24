import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { JWT } from 'google-auth-library';
import { calendar_v3 } from '@googleapis/calendar';

// Diagnostic endpoint — returns JSON summary of why Google sync might be broken.
// Admin-only. Does NOT modify any state.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const report: Record<string, unknown> = {};

  // 1. Env vars
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
  const cronSecret = process.env.CRON_SECRET;

  report.env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? `${email.slice(0, 12)}...` : null,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: rawKey
      ? {
          length: rawKey.length,
          starts_with: rawKey.slice(0, 28),
          ends_with: rawKey.slice(-28),
          has_literal_backslash_n: rawKey.includes('\\n'),
          has_real_newlines: rawKey.includes('\n'),
          looks_valid:
            (rawKey.includes('-----BEGIN PRIVATE KEY-----') ||
              rawKey.includes('-----BEGIN RSA PRIVATE KEY-----')) &&
            rawKey.includes('-----END'),
        }
      : null,
    GOOGLE_CALENDAR_ID: calendarId ?? null,
    GOOGLE_WEBHOOK_URL: webhookUrl ?? null,
    CRON_SECRET_present: Boolean(cronSecret),
  };

  if (!email || !rawKey || !calendarId) {
    return NextResponse.json({ ...report, stopped_at: 'env_vars_missing' }, { status: 200 });
  }

  // 2. Auth test — try to get an access token
  const key = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
  let jwt: JWT | null = null;
  try {
    jwt = new JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const token = await jwt.authorize();
    report.auth = {
      ok: true,
      has_access_token: Boolean(token.access_token),
      expires_at: token.expiry_date ? new Date(token.expiry_date).toISOString() : null,
    };
  } catch (err) {
    report.auth = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json({ ...report, stopped_at: 'auth_failed' }, { status: 200 });
  }

  // 3. Calendar access test — smallest possible API call
  try {
    const cal = new calendar_v3.Calendar({ auth: jwt });
    const meta = await cal.calendars.get({ calendarId });
    report.calendar = {
      ok: true,
      id: meta.data.id,
      summary: meta.data.summary,
      timeZone: meta.data.timeZone,
    };
  } catch (err) {
    const errObj = err as { code?: number; message?: string };
    report.calendar = {
      ok: false,
      code: errObj.code ?? null,
      error: errObj.message ?? String(err),
      hint:
        errObj.code === 404
          ? 'Calendar not found — check GOOGLE_CALENDAR_ID and that the service account has access'
          : errObj.code === 403
            ? 'Access denied — share the calendar with the service account email (Settings → Share with specific people)'
            : null,
    };
  }

  // 4. Events.list test
  try {
    const cal = new calendar_v3.Calendar({ auth: jwt });
    const listRes = await cal.events.list({ calendarId, maxResults: 1 });
    report.events_list = {
      ok: true,
      event_count: listRes.data.items?.length ?? 0,
    };
  } catch (err) {
    const errObj = err as { code?: number; message?: string };
    report.events_list = {
      ok: false,
      code: errObj.code ?? null,
      error: errObj.message ?? String(err),
    };
  }

  // 5. Webhook config state
  const { data: config } = await admin
    .from('google_calendar_config')
    .select(
      'id, sync_token, webhook_channel_id, webhook_resource_id, webhook_expiration, last_sync_at',
    )
    .limit(1)
    .maybeSingle();

  if (!config) {
    report.webhook = {
      ok: false,
      error: 'No row in google_calendar_config. Run setup: POST /api/admin/google-calendar-setup',
    };
  } else {
    const exp = config.webhook_expiration ? new Date(config.webhook_expiration) : null;
    const expired = exp ? exp.getTime() < Date.now() : true;
    report.webhook = {
      has_channel: Boolean(config.webhook_channel_id),
      has_sync_token: Boolean(config.sync_token),
      expiration: config.webhook_expiration,
      expired,
      time_left_hours: exp && !expired ? Math.round((exp.getTime() - Date.now()) / 3_600_000) : 0,
      last_sync_at: config.last_sync_at,
    };
  }

  // 6. Sync queue health
  const { data: syncStats } = await admin
    .from('google_calendar_sync')
    .select('sync_status')
    .limit(2000);

  if (syncStats) {
    const counts: Record<string, number> = {};
    for (const r of syncStats) counts[r.sync_status] = (counts[r.sync_status] ?? 0) + 1;
    report.sync_queue = counts;
  }

  return NextResponse.json(report, { status: 200 });
}
