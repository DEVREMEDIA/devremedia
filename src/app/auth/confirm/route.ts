import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAuthRedirect } from '@/lib/auth/resolve-redirect';

type OtpType = 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink';

/**
 * Email confirmation handler for Supabase.
 * Handles: signup confirmation, password recovery, email change, invite.
 *
 * Supports both flows:
 * - token_hash: direct OTP verification (our branded invite/recovery emails)
 * - code: PKCE code exchange (Supabase Cloud default)
 *
 * The post-verification redirect is decided by `resolveAuthRedirect`. On failure the
 * invitee is sent to the friendly `/link-expired` screen (self-service resend), not a
 * generic login error.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const type = searchParams.get('type') as OtpType | null;
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if ((token_hash && type) || code) {
    // Collect cookies to set on the final redirect response
    const responseCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            responseCookies.push(
              ...cookiesToSet.map(({ name, value, options }) => ({
                name,
                value,
                options: options as Record<string, unknown>,
              })),
            );
          },
        },
      },
    );

    // Use token_hash (OTP) or code (PKCE) to establish session
    const { data, error } =
      token_hash && type
        ? await supabase.auth.verifyOtp({ type, token_hash })
        : await supabase.auth.exchangeCodeForSession(code!);

    if (!error) {
      let redirectPath = next;

      if (data.user) {
        const adminClient = createAdminClient();

        // Full user via admin API for recovery_sent_at (recovery detection).
        const { data: adminUserData } = await adminClient.auth.admin.getUserById(data.user.id);
        const fullUser = adminUserData?.user;

        const isInvited = !!data.user.user_metadata?.invited_by;
        const isRecovery =
          type === 'recovery' ||
          !!(
            fullUser?.recovery_sent_at &&
            Date.now() - new Date(fullUser.recovery_sent_at).getTime() < 10 * 60 * 1000
          );

        redirectPath = resolveAuthRedirect({ isInvited, isRecovery, next });
      }

      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      for (const { name, value, options } of responseCookies) {
        response.cookies.set(name, value, options);
      }
      return response;
    }
  }

  // Verification failed (expired/invalid link) → friendly screen with self-service resend.
  return NextResponse.redirect(new URL('/link-expired', request.url));
}
