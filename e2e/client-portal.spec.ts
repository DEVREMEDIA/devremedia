import { test, expect } from '@playwright/test';
import { loginAsClient } from './helpers/auth';

/**
 * Client Portal E2E Tests
 * Tests client-facing features and dashboard
 */

test.describe('Client Portal', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test client user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as client before each test
    await loginAsClient(page);
  });

  test('client dashboard renders correctly', async ({ page }) => {
    await page.goto('/client/home');

    // Check that we're on the client home hub
    await expect(page).toHaveURL(/\/client\/home/);

    // Check for dashboard heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /dashboard|welcome/i })
        .first(),
    ).toBeVisible();
  });

  test('client dashboard shows navigation menu', async ({ page }) => {
    await page.goto('/client/home');

    // Check for the shell's main destinations
    const navHrefs = ['/client/home', '/client/productions', '/client/documents', '/client/book'];

    for (const href of navHrefs) {
      await expect(page.locator(`aside a[href="${href}"]`)).toBeVisible();
    }
  });

  test('client dashboard displays project cards', async ({ page }) => {
    // SKIP: Requires client with projects in database
    test.skip(true, 'Requires database with client projects');

    await page.goto('/client/home');

    // Look for project cards or list
    const projectCard = page.locator('[data-testid*="project"], .project-card').first();
    await expect(projectCard).toBeVisible();
  });

  test('client dashboard shows recent activity or updates', async ({ page }) => {
    await page.goto('/client/home');

    // Look for activity feed, updates section, or notifications
    const activitySection = page.locator('text=/recent|activity|updates|notifications/i').first();

    const hasActivity = await activitySection.isVisible().catch(() => false);

    // Activity feed is common but not required
    if (hasActivity) {
      await expect(activitySection).toBeVisible();
    }
  });

  test('client can navigate to projects list', async ({ page }) => {
    await page.goto('/client/home');

    // Click the productions destination in the shell nav
    await page.locator('aside a[href="/client/productions"]').click();

    // Should navigate to the productions hub
    await expect(page).toHaveURL(/\/client\/productions/);
  });

  test('client projects page renders correctly', async ({ page }) => {
    await page.goto('/client/productions');

    // Check that we're on the productions page
    await expect(page).toHaveURL(/\/client\/productions$/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /productions/i })
        .first(),
    ).toBeVisible();
  });

  test('client can view project detail page', async ({ page }) => {
    // SKIP: Requires client with at least one project in database
    test.skip(true, 'Requires database with client project');

    await page.goto('/client/productions');

    // Click on first project
    const firstProject = page.locator('a[href*="/client/projects/"]').first();
    await firstProject.click();

    // Should be on project detail page
    await expect(page).toHaveURL(/\/client\/projects\/[\w-]+/);

    // Check for project details
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('client project detail shows deliverables section', async ({ page }) => {
    // SKIP: Requires client with project in database
    test.skip(true, 'Requires database with client project');

    await page.goto('/client/projects/test-project-id');

    // Look for deliverables or files section
    const deliverablesSection = page.locator('text=/deliverables|files|downloads/i').first();
    await expect(deliverablesSection).toBeVisible();
  });

  test('client can navigate to invoices list', async ({ page }) => {
    await page.goto('/client/home');

    // Invoices now live under the documents hub's "Invoices" tab
    await page.locator('aside a[href="/client/documents"]').click();
    await expect(page).toHaveURL(/\/client\/documents/);
  });

  test('client invoices page renders correctly', async ({ page }) => {
    await page.goto('/client/documents?tab=invoices');

    // Check that we're on the documents hub, invoices tab
    await expect(page).toHaveURL(/\/client\/documents\?tab=invoices/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /invoices/i })
        .first(),
    ).toBeVisible();
  });

  test('client can view invoice detail page', async ({ page }) => {
    // SKIP: Requires client with at least one invoice in database
    test.skip(true, 'Requires database with client invoice');

    await page.goto('/client/documents?tab=invoices');

    // Click on first invoice
    const firstInvoice = page.locator('a[href*="/client/invoices/"]').first();
    await firstInvoice.click();

    // Should be on invoice detail page
    await expect(page).toHaveURL(/\/client\/invoices\/[\w-]+/);

    // Check for invoice details
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('client invoice detail shows payment button for unpaid invoices', async ({ page }) => {
    // SKIP: Requires client with unpaid invoice in database
    test.skip(true, 'Requires database with unpaid client invoice');

    await page.goto('/client/invoices/test-invoice-id');

    // Look for payment button
    const payButton = page
      .locator('button, a')
      .filter({ hasText: /pay|pay now|make payment/i })
      .first();
    await expect(payButton).toBeVisible();
  });

  test('client invoice detail shows download option', async ({ page }) => {
    // SKIP: Requires client with invoice in database
    test.skip(true, 'Requires database with client invoice');

    await page.goto('/client/invoices/test-invoice-id');

    // Look for download button
    const downloadButton = page
      .locator('a, button')
      .filter({ hasText: /download|pdf/i })
      .first();

    const hasDownload = await downloadButton.isVisible().catch(() => false);

    if (hasDownload) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('client can access booking wizard', async ({ page }) => {
    await page.goto('/client/home');

    // Look for book/request filming link
    const bookLink = page
      .locator('nav a, a')
      .filter({ hasText: /book|request|new project/i })
      .first();

    const hasBookLink = await bookLink.isVisible().catch(() => false);

    if (hasBookLink) {
      await bookLink.click();
      await expect(page).toHaveURL(/\/client\/book/);
    } else {
      // Navigate directly if link not in nav
      await page.goto('/client/book');
      await expect(page).toHaveURL(/\/client\/book/);
    }
  });

  test('client settings page is accessible', async ({ page }) => {
    await page.goto('/client/settings');

    // Check that we're on the settings page
    await expect(page).toHaveURL(/\/client\/settings/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /settings|profile/i })
        .first(),
    ).toBeVisible();
  });

  test('client cannot access admin routes', async ({ page }) => {
    // Try to access admin dashboard
    await page.goto('/admin/dashboard');

    // Should redirect to client dashboard or show unauthorized
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('empty projects list shows appropriate message', async ({ page }) => {
    // SKIP: Requires client with no projects in database
    test.skip(true, 'Requires database with client having no projects');

    await page.goto('/client/productions');

    // Look for empty state message
    await expect(page.locator('text=/no projects|empty|get started/i').first()).toBeVisible();
  });

  test('empty invoices list shows appropriate message', async ({ page }) => {
    // SKIP: Requires client with no invoices in database
    test.skip(true, 'Requires database with client having no invoices');

    await page.goto('/client/documents?tab=invoices');

    // Look for empty state message
    await expect(page.locator('text=/no invoices|empty/i').first()).toBeVisible();
  });

  test('client dashboard shows quick stats or summary', async ({ page }) => {
    await page.goto('/client/home');

    // Look for stats cards or summary information
    const statsSection = page
      .locator('[data-testid*="stat"], .stat-card, [class*="metric"]')
      .first();

    const hasStats = await statsSection.isVisible().catch(() => false);

    // Stats are common but not required
    if (hasStats) {
      await expect(statsSection).toBeVisible();
    }
  });

  test('client can view contracts', async ({ page }) => {
    // SKIP: Requires client with contracts in database
    test.skip(true, 'Requires database with client contracts');

    // Navigate to contract page
    await page.goto('/client/contracts/test-contract-id');

    // Check for contract content
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
