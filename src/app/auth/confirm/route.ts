import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

type OtpType = 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink';

/**
 * Email confirmation handler for Supabase
 * Handles: signup confirmation, password recovery, email change, invite
 *
 * After OTP verification, checks the user profile to determine redirect:
 * - No display_name → /onboarding (user hasn't completed setup)
 * - Otherwise → uses `next` param or home
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as OtpType | null;
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (token_hash && type) {
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

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      let redirectPath = next;

      // Check if user needs onboarding
      if (data.user) {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from('user_profiles')
          .select('display_name')
          .eq('id', data.user.id)
          .single();

        const isInvitedAndNotOnboarded = !!data.user.user_metadata?.invited_by;

        if (!profile?.display_name || isInvitedAndNotOnboarded) {
          redirectPath = '/onboarding';
        }
      }

      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      for (const { name, value, options } of responseCookies) {
        response.cookies.set(name, value, options);
      }
      return response;
    }
  }

  // Return to login with error if verification failed
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
}
