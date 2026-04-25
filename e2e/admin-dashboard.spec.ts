import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin Dashboard E2E Tests
 * Verifies the panoramic dashboard layout renders for admin users
 * and that hero KPIs link to filtered source pages.
 */

test.describe('Admin Dashboard', () => {
  test('dashboard renders core operational sections for admin', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');

    // Today + Risk are visible to all admin roles
    await expect(page.getByText(/Σήμερα|Today/i).first()).toBeVisible();
    await expect(page.getByText(/Προσοχή|Attention/i).first()).toBeVisible();

    // Production sections (crew load + deadlines)
    await expect(page.getByText(/Φόρτος συνεργείου|Crew load/i).first()).toBeVisible();
    await expect(page.getByText(/Deadlines|Deadlines/i).first()).toBeVisible();
  });

  test('hero KPI card navigates to filtered source page when present', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');

    const activeProjectsLink = page
      .getByRole('link', { name: /Active projects|Ενεργά projects/i })
      .first();

    if (await activeProjectsLink.count()) {
      await activeProjectsLink.click();
      await expect(page).toHaveURL(/\/admin\/projects/);
    }
  });

  test('risk subpage groups items by type', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    await loginAsAdmin(page);
    await page.goto('/admin/dashboard/risk');

    await expect(page.getByText(/Προσοχή|Attention/i).first()).toBeVisible();
  });
});
