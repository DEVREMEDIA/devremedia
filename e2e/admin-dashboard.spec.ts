import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin Today E2E Tests
 * The old panoramic /admin/dashboard is gone — it's now a redirecting stub to
 * /admin/today, a compact hub of pending-work agenda, at-risk radar, and recent
 * activity. These tests verify the stub redirects land there and that hub
 * renders its sections.
 */

test.describe('Admin Today', () => {
  test('dashboard renders core operational sections for admin', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/today/);

    // Today agenda + at-risk radar are visible to all admin roles
    await expect(page.locator('h1').filter({ hasText: /Σήμερα|Today/i })).toBeVisible();
    await expect(page.getByText(/Κινδυνεύουν|At risk/i).first()).toBeVisible();

    // Recent activity feed
    await expect(page.getByText(/Πρόσφατη Δραστηριότητα|Recent Activity/i).first()).toBeVisible();
  });

  test('hero KPI card navigates to filtered source page when present', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/today/);

    // The KPI strip only renders for super_admin — proceed only if present
    const activeProjectsLink = page
      .getByRole('link', { name: /Active projects|Ενεργά projects/i })
      .first();

    if (await activeProjectsLink.count()) {
      await activeProjectsLink.click();
      await expect(page).toHaveURL(/\/admin\/productions/);
    }
  });

  test('old /admin/dashboard/risk path redirects into the at-risk radar', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard/risk');
    await expect(page).toHaveURL(/\/admin\/today/);

    await expect(page.getByText(/Κινδυνεύουν|At risk/i).first()).toBeVisible();
  });
});
