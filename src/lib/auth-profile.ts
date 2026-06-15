import type { UserRole } from '@/lib/constants';

/**
 * The user profile shape the client AuthProvider needs. Mirrors the columns
 * the provider selects from `user_profiles`.
 */
export interface AuthProfile {
  id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Initial profile value for the AuthProvider context.
 *
 * Phase 1 seam: the server (middleware already resolved the user) passes the
 * profile down as a prop so the provider does not have to query
 * `user_profiles` on the client to know who is signed in.
 */
export function resolveInitialAuthProfile(
  serverProfile: AuthProfile | null | undefined,
): AuthProfile | null {
  return serverProfile ?? null;
}

/**
 * Whether the AuthProvider must query `user_profiles` after mounting.
 *
 * It should only do so when the server did NOT provide a profile (e.g. a
 * public/unauthenticated page), avoiding a redundant round-trip on every
 * authenticated mount/session refresh.
 */
export function shouldFetchProfileOnMount(serverProfile: AuthProfile | null | undefined): boolean {
  return resolveInitialAuthProfile(serverProfile) === null;
}
