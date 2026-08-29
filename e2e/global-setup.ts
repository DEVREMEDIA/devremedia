import { chromium } from '@playwright/test';
import { setupAuthSession, ADMIN_STORAGE_STATE, CLIENT_STORAGE_STATE } from './helpers/auth';
import { loadTestEnv } from './fixtures/env';
import { isFixtureDbConfigured } from './fixtures/supabase-admin';
import { runSeed } from './fixtures/seed';
import { reloadManifest } from './fixtures/graph';

/**
 * Global setup: seed → authenticate → run.
 *
 * When `E2E_SUPABASE_URL` is set, the fixture layer seeds a disposable graph and
 * then declares the test users ready itself — if the seed ran, the users exist,
 * so there is nothing left for a human to confirm with `E2E_TEST_USERS_READY`.
 *
 * With no fixture database configured the old behaviour is unchanged: without
 * `E2E_TEST_USERS_READY` no sessions are created and the credentialed specs skip.
 */

interface SessionUser {
  readonly email: string;
  readonly password: string;
  readonly storageState: string;
  readonly label: string;
}

async function saveSession(user: SessionUser): Promise<void> {
  console.log(`  → Authenticating ${user.label} user...`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newContext().then((context) => context.newPage());
    await setupAuthSession(page, user.email, user.password, user.storageState);
    console.log(`  ✓ ${user.label} session saved`);
  } finally {
    await browser.close();
  }
}

/** Seed if a fixture database is configured. Returns the emails to log in with. */
async function seedIfConfigured(): Promise<{ admin: string; client: string } | null> {
  if (!isFixtureDbConfigured()) return null;

  const graph = await runSeed();
  // The seed proves the users exist; nothing else needs to assert it.
  process.env.E2E_TEST_USERS_READY = '1';

  return { admin: graph.users.admin.email, client: graph.users.client.email };
}

async function globalSetup(): Promise<void> {
  loadTestEnv();

  let emails: { admin: string; client: string } | null = null;

  try {
    emails = await seedIfConfigured();
  } catch (error) {
    console.error('❌ Fixture seeding failed:', error instanceof Error ? error.message : error);
    throw error;
  }

  if (!emails) {
    // No fixture database. Fall back to pre-existing users, if the operator says so.
    if (!process.env.E2E_TEST_USERS_READY) {
      console.log('⚠️  No E2E fixture database and E2E_TEST_USERS_READY is unset.');
      console.log('   Set E2E_SUPABASE_URL to seed a disposable graph — see e2e/SETUP.md.');
      return;
    }
    const manifest = reloadManifest();
    emails = {
      admin: manifest?.users.admin.email ?? process.env.E2E_ADMIN_EMAIL ?? 'admin@devre.test',
      client: manifest?.users.client.email ?? process.env.E2E_CLIENT_EMAIL ?? 'client@devre.test',
    };
  }

  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? '';
  const clientPassword = process.env.E2E_CLIENT_PASSWORD ?? '';

  console.log('🔐 Setting up authenticated sessions...');

  try {
    await saveSession({
      email: emails.admin,
      password: adminPassword,
      storageState: ADMIN_STORAGE_STATE,
      label: 'admin',
    });
    await saveSession({
      email: emails.client,
      password: clientPassword,
      storageState: CLIENT_STORAGE_STATE,
      label: 'client',
    });
    console.log('✓ Authentication setup complete');
  } catch (error) {
    console.error('❌ Failed to setup authenticated sessions:', error);
    console.log('   Tests requiring authentication will be skipped.');
    // Don't throw - allow the unauthenticated specs to run.
  }
}

export default globalSetup;
