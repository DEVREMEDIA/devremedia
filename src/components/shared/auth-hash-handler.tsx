'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Detects Supabase auth errors returned as URL hash fragments
 * (e.g. /#error=access_denied&error_code=otp_expired&error_description=...)
 * and redirects to /login with the error as a query parameter.
 *
 * Must be included in the root layout so it runs on any page.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const errorCode = params.get('error_code');
    const error = params.get('error');

    if (errorCode || error) {
      // Clear the hash fragment from the URL
      window.history.replaceState(null, '', window.location.pathname);
      // Redirect to login with the error code
      router.replace(`/login?error=${errorCode || error}`);
    }
  }, [router]);

  return null;
}
