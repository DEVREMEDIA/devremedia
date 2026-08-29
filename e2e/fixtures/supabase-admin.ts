import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadTestEnv, requireEnv } from './env';

/**
 * Service-role Supabase client for the E2E fixture layer.
 *
 * Everything in this file exists to make one accident impossible: seeding or
 * sweeping a real customer database. The layer therefore reads its own
 * variables — `E2E_SUPABASE_URL` / `E2E_SUPABASE_SERVICE_ROLE_KEY` — and never
 * falls back to the app's `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
 * Pointing them at the same project is refused unless you say so out loud with
 * `E2E_ALLOW_SAME_PROJECT=1`.
 */

export type FixtureDb = SupabaseClient;

/** True when the fixture layer has been given a database to work with. */
export function isFixtureDbConfigured(): boolean {
  loadTestEnv();
  return Boolean(process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_SERVICE_ROLE_KEY);
}

const SAME_PROJECT_MESSAGE = [
  'E2E_SUPABASE_URL points at the same Supabase project as NEXT_PUBLIC_SUPABASE_URL.',
  'That is the application database — seeding it would create rows in a real customer system,',
  'and teardown would delete rows from it.',
  '',
  'Point E2E_SUPABASE_URL at a disposable project (a local `supabase start`, or a scratch cloud',
  'project). If you genuinely mean to use the same project and accept the consequences, set',
  'E2E_ALLOW_SAME_PROJECT=1.',
].join('\n');

function assertNotTheAppDatabase(url: string, key: string): void {
  if (process.env.E2E_ALLOW_SAME_PROJECT === '1') return;

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (appUrl && url === appUrl) throw new Error(SAME_PROJECT_MESSAGE);
  if (appKey && key === appKey) throw new Error(SAME_PROJECT_MESSAGE);
}

/**
 * Build the service-role client, after the safety checks.
 * Throws — loudly and with instructions — rather than degrading.
 */
export function createFixtureDb(): FixtureDb {
  loadTestEnv();

  const url = requireEnv('E2E_SUPABASE_URL');
  const key = requireEnv('E2E_SUPABASE_SERVICE_ROLE_KEY');

  assertNotTheAppDatabase(url, key);

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Short description of the target project, for logs. Never prints the key. */
export function describeFixtureTarget(): string {
  return process.env.E2E_SUPABASE_URL ?? '(unset)';
}
