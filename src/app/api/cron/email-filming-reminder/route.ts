import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, hasEmailBeenSent } from '@/lib/email/send-email';
import { FilmingReminderEmail } from '@/lib/email/templates/filming-reminder';
import { getEmailTranslations } from '@/lib/email/translations';
import { getFilmingReminderRecipients } from '@/lib/email/filming-reminder-recipients';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.devremedia.com';

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if today is the 25th (Athens timezone)
  const now = new Date();
  const athensDay = parseInt(
    now.toLocaleDateString('en-GB', { timeZone: 'Europe/Athens', day: 'numeric' }),
    10,
  );

  if (athensDay !== 25) {
    return NextResponse.json({ skipped: true, reason: 'Not the 25th of the month' });
  }

  const supabase = createAdminClient();

  // Recipients come from active Agreements (Package per Client) — the source of
  // truth for "who gets a reminder + which Package", not a hardcoded list.
  const recipients = await getFilmingReminderRecipients(supabase);

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'No active agreements with a package' });
  }

  const currentMonth = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).slice(0, 7); // YYYY-MM
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipient of recipients) {
    // Dedup check
    const alreadySent = await hasEmailBeenSent({
      emailType: 'filming_reminder',
      clientId: recipient.clientId,
      dateKey: currentMonth,
    });

    if (alreadySent) {
      skipped++;
      continue;
    }

    const locale = recipient.locale;
    const t = getEmailTranslations(locale).filmingReminder;

    const result = await sendEmail({
      to: recipient.email,
      subject: t.subject,
      react: FilmingReminderEmail({
        clientName: recipient.contactName,
        packageName: recipient.packageName,
        packageDeliverables: recipient.packageDeliverables,
        locale,
        ctaUrl: `${APP_URL}/client/home`,
      }),
      emailType: 'filming_reminder',
      clientId: recipient.clientId,
      metadata: {
        packageId: recipient.packageId,
        packageName: recipient.packageName,
        month: currentMonth,
      },
    });

    if (result.success) {
      sent++;
    } else {
      errors++;
    }
  }

  return NextResponse.json({ sent, skipped, errors, totalClients: recipients.length });
}

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
