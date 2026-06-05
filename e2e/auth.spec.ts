import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsClient, logout } from './helpers/auth';

/**
 * Authentication E2E Tests
 * Tests login flows, redirects, and role-based access control
 */

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Check that the login form is visible
    await expect(page.locator('form')).toBeVisible();

    // Check for email and password inputs
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login with valid admin credentials redirects to admin dashboard', async ({ page }) => {
    // SKIP: Requires database with test admin user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Check for admin-specific elements
    await expect(page.locator('text=/clients|projects|invoices/i')).toBeVisible();
  });

  test('login with valid client credentials redirects to client dashboard', async ({ page }) => {
    // SKIP: Requires database with test client user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsClient(page);

    // Should redirect to client dashboard
    await expect(page).toHaveURL(/\/client\/dashboard/);

    // Check for client-specific elements
    await expect(page.locator('text=/projects|invoices|book/i')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.locator('input[type="email"], input[name="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should show error message (adjust selector based on your error display)
    await expect(page.locator('text=/invalid|error|incorrect|failed/i').first()).toBeVisible({
      timeout: 5000,
    });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login when accessing admin routes', async ({
    page,
  }) => {
    // Try to access admin dashboard without authentication
    await page.goto('/admin/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login when accessing client routes', async ({
    page,
  }) => {
    // Try to access client dashboard without authentication
    await page.goto('/client/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Role-based access control', () => {
    test('admin user cannot access client routes', async ({ page }) => {
      // SKIP: Requires database with test users and proper middleware
      test.skip(
        !process.env.E2E_TEST_USERS_READY,
        'Test users not configured or middleware not enforcing RBAC',
      );

      await loginAsAdmin(page);

      // Try to access client route
      await page.goto('/client/dashboard');

      // Should redirect to admin dashboard or show access denied
      await expect(page).toHaveURL(/\/admin\/|\/unauthorized|\/403/);
    });

    test('client user cannot access admin routes', async ({ page }) => {
      // SKIP: Requires database with test users and proper middleware
      test.skip(
        !process.env.E2E_TEST_USERS_READY,
        'Test users not configured or middleware not enforcing RBAC',
      );

      await loginAsClient(page);

      // Try to access admin route
      await page.goto('/admin/dashboard');

      // Should redirect to client dashboard or show access denied
      await expect(page).toHaveURL(/\/client\/|\/unauthorized|\/403/);
    });
  });

  test('logout functionality works correctly', async ({ page }) => {
    // SKIP: Requires database with test users
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Perform logout
    await logout(page);

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // Try to access protected route again
    await page.goto('/admin/dashboard');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check that the signup form is visible
    await expect(page.locator('form')).toBeVisible();

    // Check for required fields
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('forgot password page renders correctly', async ({ page }) => {
    await page.goto('/forgot-password');

    // Check that the form is visible
    await expect(page.locator('form')).toBeVisible();

    // Check for email input
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('link-expired page renders the request-a-new-link control', async ({ page }) => {
    // Public screen shown when an invitation/confirmation link is expired or invalid.
    await page.goto('/link-expired');

    // Self-service resend form: email input + submit button.
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('invitation → confirmation round-trip', async ({ page }) => {
    // SKIP: needs a real invited user + mailbox to follow a token_hash invite link.
    // Manual/seeded check: follow the invite link → /confirm shows read-only name/email/
    // company + a password field → set password → land on the role dashboard.
    test.skip(
      !process.env.E2E_TEST_USERS_READY,
      'Invite round-trip requires a seeded invited user and a real mailbox',
    );

    await page.goto('/confirm');
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });
});
