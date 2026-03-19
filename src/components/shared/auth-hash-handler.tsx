'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: '/admin/dashboard',
  admin: '/admin/dashboard',
  employee: '/employee/dashboard',
  salesman: '/salesman/dashboard',
  client: '/client/dashboard',
};

/**
 * Handles Supabase auth tokens and errors returned as URL hash fragments.
 *
 * Covers two cases:
 * 1. Error fragments (e.g. /#error=access_denied&error_code=otp_expired)
 *    → redirects to /login with the error.
 * 2. Implicit-flow tokens (e.g. /#access_token=...&refresh_token=...&type=invite)
 *    → sets the session client-side, then redirects to /onboarding (for invites)
 *    or the user's role-based dashboard.
 *
 * Must be included in the root layout so it runs on every page.
 */
export function AuthHashHandler() {
  const router = useRouter();
  const isProcessing = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || isProcessing.current) return;

    const params = new URLSearchParams(hash.substring(1));

    // Case 1: Auth errors
    const errorCode = params.get('error_code');
    const error = params.get('error');

    if (errorCode || error) {
      window.history.replaceState(null, '', window.location.pathname);
      router.replace(`/login?error=${errorCode || error}`);
      return;
    }

    // Case 2: Implicit-flow tokens (invite links, magic links)
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) return;

    isProcessing.current = true;
    const type = params.get('type');

    // Clear hash immediately to prevent re-processing
    window.history.replaceState(null, '', window.location.pathname);

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ data, error: sessionError }) => {
        if (sessionError || !data.user) {
          router.replace('/login?error=session_error');
          return;
        }

        // Invite links or users with invited_by metadata → onboarding
        const isInvited = type === 'invite' || !!data.user.user_metadata?.invited_by;

        if (isInvited) {
          router.replace('/onboarding');
          return;
        }

        // Otherwise, figure out their dashboard from profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, display_name')
          .eq('id', data.user.id)
          .single();

        // User without display_name still needs onboarding
        if (!profile?.display_name) {
          router.replace('/onboarding');
          return;
        }

        const dashboard = ROLE_DASHBOARDS[profile.role] ?? '/client/dashboard';
        router.replace(dashboard);
      })
      .catch(() => {
        router.replace('/login?error=session_error');
      })
      .finally(() => {
        isProcessing.current = false;
      });
  }, [router]);

  return null;
}
