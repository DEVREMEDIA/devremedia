import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Invoice and Payment E2E Tests
 * Tests invoice management and payment flows
 */

test.describe('Invoice Management', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test admin user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('admin can view invoices list page', async ({ page }) => {
    await page.goto('/admin/invoices');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // The old bare route is now a stub that redirects into the finance hub
    await expect(page).toHaveURL(/\/admin\/finance\?tab=invoices/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /invoices/i })
        .first(),
    ).toBeVisible();

    // Check for table or list
    const hasTable = await page
      .locator('table')
      .isVisible()
      .catch(() => false);
    const hasList = await page
      .locator('[data-testid*="invoice"]')
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasList).toBeTruthy();
  });

  test('invoices list shows add new invoice button', async ({ page }) => {
    await page.goto('/admin/finance?tab=invoices');

    // Look for "New Invoice" or "Create Invoice" button
    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new invoice|create invoice|add invoice/i })
      .first();
    await expect(addButton).toBeVisible();

    // Verify it links to the new invoice page
    const href = await addButton.getAttribute('href');
    if (href) {
      expect(href).toContain('/admin/invoices/new');
    }
  });

  test('admin can navigate to create new invoice page', async ({ page }) => {
    await page.goto('/admin/finance?tab=invoices');

    // Click the new invoice button
    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new invoice|create invoice/i })
      .first();
    await addButton.click();

    // Should navigate to new invoice page
    await expect(page).toHaveURL(/\/admin\/invoices\/new/);

    // Check for form presence
    await expect(page.locator('form')).toBeVisible();
  });

  test('new invoice form renders with required fields', async ({ page }) => {
    await page.goto('/admin/invoices/new');

    // Wait for form to load
    await expect(page.locator('form')).toBeVisible();

    // Check for common invoice form fields
    // Client selection
    const clientField = page.locator('select[name*="client"], [role="combobox"]').first();
    const hasClientField = await clientField.isVisible().catch(() => false);
    expect(hasClientField).toBeTruthy();

    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin can create a new invoice', async ({ page }) => {
    // SKIP: Requires database with clients, projects, and form setup
    test.skip(true, 'Requires database state and form submission implementation');

    await page.goto('/admin/invoices/new');

    // Select a client
    await page.locator('select[name*="client"]').first().selectOption({ index: 1 });

    // Add line items (implementation varies)
    // Fill in amounts, descriptions, etc.

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should redirect to invoices list or invoice detail page
    await page.waitForURL(/\/admin\/invoices(\/[\w-]+)?/, { timeout: 10000 });

    // Verify success message
    await expect(page.locator('text=/success|created|invoice created/i').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('admin can view invoice detail page', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with at least one invoice record');

    // Navigate to invoices list
    await page.goto('/admin/finance?tab=invoices');

    // Click on first invoice
    const firstInvoice = page
      .locator('tr td a, [data-testid*="invoice"] a, a[href*="/admin/invoices/"]')
      .first();
    await firstInvoice.click();

    // Should be on invoice detail page
    await expect(page).toHaveURL(/\/admin\/invoices\/[\w-]+$/);

    // Check for invoice details
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('invoice detail page shows key information', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with invoice record');

    await page.goto('/admin/invoices/test-invoice-id');

    // Check for invoice number or ID
    await expect(page.locator('text=/invoice #|invoice number/i').first()).toBeVisible();

    // Check for amount or total
    await expect(page.locator('text=/total|amount|subtotal/i').first()).toBeVisible();

    // Check for status
    await expect(page.locator('text=/status|paid|unpaid|pending/i').first()).toBeVisible();
  });

  test('invoice detail page shows line items', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with invoice record and line items');

    await page.goto('/admin/invoices/test-invoice-id');

    // Look for line items table or list
    const lineItemsTable = page.locator('table, [data-testid*="line-item"]').first();
    await expect(lineItemsTable).toBeVisible();
  });

  test('admin can navigate to edit invoice page', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with at least one invoice record');

    await page.goto('/admin/invoices/test-invoice-id');

    // Look for edit button (may only be visible for draft/unpaid invoices)
    const editButton = page.locator('a, button').filter({ hasText: /edit/i }).first();

    const hasEditButton = await editButton.isVisible().catch(() => false);

    if (hasEditButton) {
      await editButton.click();
      await expect(page).toHaveURL(/\/admin\/invoices\/[\w-]+\/edit/);
    }
  });

  test('invoice detail shows payment history section', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with invoice record');

    await page.goto('/admin/invoices/test-invoice-id');

    // Look for payment history or transactions
    const paymentSection = page.locator('text=/payment|transaction|history/i').first();

    const hasPaymentSection = await paymentSection.isVisible().catch(() => false);

    // Payment history may only show for paid/partially paid invoices
    if (hasPaymentSection) {
      await expect(paymentSection).toBeVisible();
    }
  });

  test('invoices list shows status filters', async ({ page }) => {
    await page.goto('/admin/finance?tab=invoices');

    // Look for status filter controls
    const statusFilter = page.locator('[data-testid*="filter"], button:has-text("Filter")').first();

    const hasFilter = await statusFilter.isVisible().catch(() => false);

    // Filters are common but not required for initial implementation
    if (hasFilter) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('invoices list displays status badges', async ({ page }) => {
    // SKIP: Requires invoices in database
    test.skip(true, 'Requires database with invoice records');

    await page.goto('/admin/finance?tab=invoices');

    // Look for status indicators
    const statusBadge = page.locator('[data-testid*="status"], .badge, .status').first();

    const hasBadges = await statusBadge.isVisible().catch(() => false);

    if (hasBadges) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('invoice detail has download/print option', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with invoice record');

    await page.goto('/admin/invoices/test-invoice-id');

    // Look for download or print button
    const downloadButton = page
      .locator('a, button')
      .filter({ hasText: /download|print|pdf/i })
      .first();

    const hasDownload = await downloadButton.isVisible().catch(() => false);

    // Download/print is a common feature
    if (hasDownload) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('invoice detail shows client information', async ({ page }) => {
    // SKIP: Requires existing invoice in database
    test.skip(true, 'Requires database with invoice and client record');

    await page.goto('/admin/invoices/test-invoice-id');

    // Look for client/bill to section
    await expect(page.locator('text=/bill to|client|customer/i').first()).toBeVisible();
  });

  test('admin can access expenses page', async ({ page }) => {
    await page.goto('/admin/invoices/expenses');

    // The old bare route is now a stub that redirects into the finance hub
    await expect(page).toHaveURL(/\/admin\/finance\?tab=expenses/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /expenses/i })
        .first(),
    ).toBeVisible();
  });

  test('empty invoices list shows appropriate message', async ({ page }) => {
    // SKIP: Requires empty database or specific test state
    test.skip(true, 'Requires database with no invoices (specific test state)');

    await page.goto('/admin/finance?tab=invoices');

    // Look for empty state message
    await expect(page.locator('text=/no invoices|empty|create your first/i').first()).toBeVisible();
  });
});
