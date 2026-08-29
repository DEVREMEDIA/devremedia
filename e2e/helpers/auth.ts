import { Page } from '@playwright/test';
import path from 'path';

/**
 * Authentication helper utilities for E2E tests
 * Handles login flows and storage state management
 */

// Storage state file paths
export const ADMIN_STORAGE_STATE = path.join(__dirname, '../.auth/admin.json');
export const CLIENT_STORAGE_STATE = path.join(__dirname, '../.auth/client.json');

/**
 * Test credentials, from the environment.
 *
 * These used to be string literals — `Admin123!` for an account with the admin
 * role — in a public repository. Anyone who could read the repo could read the
 * password, so the account could never safely exist anywhere real. Passwords
 * now come from `.env.local`, which is gitignored, and the emails keep their
 * old defaults because an address is not a secret.
 *
 * Nothing here has a password fallback on purpose: with none set, the login
 * helper fails loudly rather than silently trying a known-public password.
 * The specs skip without `E2E_TEST_USERS_READY` anyway.
 */
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@devre.test',
    password: process.env.E2E_ADMIN_PASSWORD ?? '',
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL ?? 'client@devre.test',
    password: process.env.E2E_CLIENT_PASSWORD ?? '',
  },
};

/**
 * Login as admin user via the login form
 * @param page - Playwright page instance
 */
export async function loginAsAdmin(page: Page) {
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
}

/**
 * Login as client user via the login form
 * @param page - Playwright page instance
 */
export async function loginAsClient(page: Page) {
  await login(page, TEST_USERS.client.email, TEST_USERS.client.password);
}

/**
 * Generic login function that fills the login form
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
export async function login(page: Page, email: string, password: string) {
  if (!password) {
    throw new Error(
      `No password configured for ${email}. Set E2E_ADMIN_PASSWORD / E2E_CLIENT_PASSWORD in .env.local. ` +
        'They are deliberately not committed — see TEST_USERS above.',
    );
  }

  // Navigate to login page
  await page.goto('/login');

  // Wait for the login form to be visible
  await page.waitForSelector('form');

  // Fill in email field
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  await emailInput.fill(email);

  // Fill in password field
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.fill(password);

  // Click the submit button
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for navigation to complete (either to the new role landing or error).
  //
  // This was 10 seconds, and it made the whole credentialed suite look broken.
  // The runner starts `pnpm dev`, and Turbopack compiles each route the first
  // time it is requested — the landing pages take well over ten seconds cold.
  // On the first run against a cold server, 30 of 45 tests failed here; on a
  // second run against the same, now-warm server, 30 passed and the remaining
  // 15 failed on exactly this line, all of them the first visit to a route
  // nobody had opened yet. Nothing was wrong with the product: the login
  // itself lands on /admin/today with a real session every time.
  //
  // A generous ceiling costs nothing when the page is warm — `waitForURL`
  // returns the moment the URL matches — and it stops a cold compile from
  // reading as a failure.
  const timeout = Number(process.env.E2E_LOGIN_TIMEOUT_MS ?? 45000);
  await page.waitForURL(/\/(admin|employee|salesman)\/today|\/client\/home/, { timeout });
}

/**
 * Setup authenticated session and save to storage state
 * This can be used in global setup to authenticate once and reuse
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @param storageStatePath - Path to save the storage state
 */
export async function setupAuthSession(
  page: Page,
  email: string,
  password: string,
  storageStatePath: string,
) {
  await login(page, email, password);

  // Save the authenticated state
  await page.context().storageState({ path: storageStatePath });
}

/**
 * Logout the current user
 * @param page - Playwright page instance
 */
export async function logout(page: Page) {
  // Look for logout button/link (adjust selector based on your UI)
  const logoutButton = page
    .locator('[data-testid="logout"], button:has-text("Logout"), a:has-text("Logout")')
    .first();

  if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    // Fallback: navigate to logout endpoint if button not found
    await page.goto('/api/auth/signout');
  }

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Check if user is authenticated
 * @param page - Playwright page instance
 * @returns boolean indicating if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/admin/') || url.includes('/client/');
}

/**
 * Get the current user role from the URL
 * @param page - Playwright page instance
 * @returns 'admin' | 'client' | null
 */
export async function getCurrentUserRole(page: Page): Promise<'admin' | 'client' | null> {
  const url = page.url();
  if (url.includes('/admin/')) return 'admin';
  if (url.includes('/client/')) return 'client';
  return null;
}
