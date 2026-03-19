import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Auth callback handler for Supabase authentication flows
 * Handles: email confirmation, magic link, OAuth redirects, invite links
 *
 * After code exchange, checks the user profile to determine redirect:
 * - No display_name → /onboarding (user hasn't completed setup)
 * - Otherwise → uses `next` param or role-based dashboard
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

      // Check if user needs onboarding or is in recovery flow
      if (data.user) {
        const adminClient = createAdminClient();

        const [{ data: profile }, { data: adminUserData }] = await Promise.all([
          adminClient.from('user_profiles').select('display_name').eq('id', data.user.id).single(),
          adminClient.auth.admin.getUserById(data.user.id),
        ]);

        const fullUser = adminUserData?.user;
        const isInvitedAndNotOnboarded = !!data.user.user_metadata?.invited_by;

        const isRecovery =
          fullUser?.recovery_sent_at &&
          Date.now() - new Date(fullUser.recovery_sent_at).getTime() < 10 * 60 * 1000;

        if (!profile?.display_name || isInvitedAndNotOnboarded) {
          redirectPath = '/onboarding';
        } else if (isRecovery) {
          redirectPath = '/update-password';
        }
      }

      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      for (const { name, value, options } of responseCookies) {
        response.cookies.set(name, value, options);
      }
      return response;
    }
  }

  // Return to login with error if authentication failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
