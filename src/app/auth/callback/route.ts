import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAuthRedirect } from '@/lib/auth/resolve-redirect';

/**
 * Auth callback handler for Supabase PKCE flows (OAuth, magic link, stray `?code=`).
 * Invitations no longer target this route — they go through `/auth/confirm` (ADR-0003).
 *
 * The post-exchange redirect is decided by `resolveAuthRedirect`. On failure the user is
 * sent to the friendly `/link-expired` screen.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      let redirectPath = next;

      if (data.user) {
        const adminClient = createAdminClient();
        const { data: adminUserData } = await adminClient.auth.admin.getUserById(data.user.id);
        const fullUser = adminUserData?.user;

        const isInvited = !!data.user.user_metadata?.invited_by;
        const isRecovery = !!(
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

  // Exchange failed → friendly screen with self-service resend.
  return NextResponse.redirect(new URL('/link-expired', request.url));
}
