import { chromium } from '@playwright/test';
import {
  setupAuthSession,
  ADMIN_STORAGE_STATE,
  CLIENT_STORAGE_STATE,
  TEST_USERS,
} from './helpers/auth';

/**
 * Global setup for Playwright tests
 * Authenticates test users once and saves their session state
 * This improves test performance by avoiding repeated logins
 *
 * To use this, uncomment the globalSetup line in playwright.config.ts
 */
async function globalSetup() {
  // Skip authentication setup if test users aren't ready
  if (!process.env.E2E_TEST_USERS_READY) {
    console.log('⚠️  E2E test users not configured. Skipping authentication setup.');
    console.log('   Set E2E_TEST_USERS_READY=1 when test users are created in database.');
    return;
  }

  console.log('🔐 Setting up authenticated sessions...');

  try {
    // Setup admin session
    console.log('  → Authenticating admin user...');
    const adminBrowser = await chromium.launch();
    const adminContext = await adminBrowser.newContext();
    const adminPage = await adminContext.newPage();

    await setupAuthSession(
      adminPage,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
      ADMIN_STORAGE_STATE,
    );

    await adminBrowser.close();
    console.log('  ✓ Admin session saved');

    // Setup client session
    console.log('  → Authenticating client user...');
    const clientBrowser = await chromium.launch();
    const clientContext = await clientBrowser.newContext();
    const clientPage = await clientContext.newPage();

    await setupAuthSession(
      clientPage,
      TEST_USERS.client.email,
      TEST_USERS.client.password,
      CLIENT_STORAGE_STATE,
    );

    await clientBrowser.close();
    console.log('  ✓ Client session saved');

    console.log('✓ Authentication setup complete');
  } catch (error) {
    console.error('❌ Failed to setup authenticated sessions:', error);
    console.log('   Tests requiring authentication will be skipped.');
    // Don't throw - allow tests to run but skip authenticated ones
  }
}

export default globalSetup;
