import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverInvitation } from '@/lib/invitations';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import type { UserRole } from '@/lib/constants';

const resendSchema = z.object({
  email: z.string().email().max(255),
});

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 3;

/**
 * Public, self-service "send me a new invitation link" endpoint, reached from the
 * /link-expired screen. Security model (issue #29, stories 19–20):
 * - ALWAYS returns the same generic success — never reveals whether an account exists,
 *   in the response BODY *or* in response TIMING (all account-dependent work is deferred
 *   via `after()`, so the handler returns identically on every path).
 * - Rate-limited per IP *and* per email, evaluated BEFORE any admin work, so the
 *   expensive pending-user lookup cannot be amplified by an unauthenticated caller.
 * - Only acts for a *pending* user (still carrying `invited_by`, i.e. not yet confirmed).
 */
export async function POST(request: Request) {
  const genericOk = NextResponse.json({ ok: true });

  let email: string;
  try {
    const body = await request.json();
    email = resendSchema.parse(body).email.toLowerCase();
  } catch {
    // Malformed/invalid email is a client-side-checkable format error; rejecting it
    // leaks nothing about account existence.
    return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
  }

  // Coarse IP + per-email throttle, evaluated identically on every path and BEFORE any
  // admin work. Over-cap requests return the same generic success without scheduling work.
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const [ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit(`resend-ip:${ip}`, MAX_PER_IP, WINDOW_MS),
    checkRateLimit(`resend-email:${email}`, MAX_PER_EMAIL, WINDOW_MS),
  ]);

  if (!ipAllowed || !emailAllowed) {
    return genericOk;
  }

  // Defer all account-dependent work off the response path so response timing never
  // correlates with whether a pending invite exists.
  after(async () => {
    const adminClient = createAdminClient();
    // NOTE: bounded to the first 1000 auth users (auth-js has no email lookup). Fine for
    // this user base; the IP/email throttle above caps how often this runs.
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existing = usersList?.users.find((u) => u.email === email);
    const invitedBy = existing?.user_metadata?.invited_by as string | undefined;

    if (!existing || !invitedBy) return;

    const locale = (existing.user_metadata?.locale as string) ?? 'el';
    const displayName = existing.user_metadata?.display_name as string | undefined;
    const role = existing.user_metadata?.role as UserRole | undefined;

    const result = await deliverInvitation({ email, invitedBy, locale, displayName, role });

    if (result.ok) {
      await adminClient.from('email_logs').insert({
        email_type: 'invite_resend',
        recipient_email: email,
        subject: 'Invitation link resent',
        status: 'sent',
      });
    }
  });

  return genericOk;
}
