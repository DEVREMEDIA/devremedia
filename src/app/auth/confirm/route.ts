import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type OtpType = 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink';

/**
 * Email confirmation handler for Supabase
 * Handles: signup confirmation, password recovery, email change, invite
 *
 * Uses explicit cookie handling so session cookies are included
 * on the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as OtpType | null;
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (token_hash && type) {
    // Create redirect response first — cookies will be set directly on it
    const redirectResponse = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return redirectResponse;
    }
  }

  // Return to login with error if verification failed
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
}
