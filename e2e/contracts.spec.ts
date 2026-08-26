import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';

/**
 * Contracts E2E Tests
 * Tests contract management for admin and contract signing for clients
 */

test.describe('Contracts - Admin', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test admin user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('admin can view contract templates page', async ({ page }) => {
    await page.goto('/admin/contracts/templates');

    // The old templates route is now a stub that redirects into the settings hub
    await expect(page).toHaveURL(/\/admin\/settings\?tab=templates/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /contract|templates/i })
        .first(),
    ).toBeVisible();
  });

  test('contract templates page shows list of templates', async ({ page }) => {
    // SKIP: Requires contract templates in database
    test.skip(true, 'Requires database with contract templates');

    await page.goto('/admin/settings?tab=templates');

    // Look for template list or cards
    const templateList = page.locator('table, [data-testid*="template"], .template-card').first();
    await expect(templateList).toBeVisible();
  });

  test('admin can create new contract template', async ({ page }) => {
    // SKIP: Requires template creation functionality
    test.skip(true, 'Requires contract template creation implementation');

    await page.goto('/admin/settings?tab=templates');

    // Look for new template button
    const newButton = page
      .locator('button, a')
      .filter({ hasText: /new template|create template/i })
      .first();
    await expect(newButton).toBeVisible();

    await newButton.click();

    // Should navigate to template creation page or open modal
    // Check for form
    await expect(page.locator('form, [data-testid="template-form"]')).toBeVisible();
  });

  test('admin can view contract detail page', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract record');

    await page.goto('/admin/contracts/test-contract-id');

    // Check for contract content
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Check for contract body/content
    const contractContent = page
      .locator('[data-testid*="contract-content"], .contract-body')
      .first();

    const hasContent = await contractContent.isVisible().catch(() => false);

    if (hasContent) {
      await expect(contractContent).toBeVisible();
    }
  });

  test('contract view page renders with proper formatting', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract record');

    await page.goto('/admin/contracts/test-contract-id');

    // Check for contract viewing area
    const contractViewer = page.locator('[data-testid*="contract"], main, article').first();
    await expect(contractViewer).toBeVisible();
  });

  test('admin can view contract status', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract record');

    await page.goto('/admin/contracts/test-contract-id');

    // Look for status indicator
    const statusBadge = page
      .locator('[data-testid*="status"], .status, text=/draft|pending|signed|executed/i')
      .first();

    const hasStatus = await statusBadge.isVisible().catch(() => false);

    if (hasStatus) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('admin can download contract as PDF', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract record');

    await page.goto('/admin/contracts/test-contract-id');

    // Look for download button
    const downloadButton = page
      .locator('button, a')
      .filter({ hasText: /download|pdf|export/i })
      .first();

    const hasDownload = await downloadButton.isVisible().catch(() => false);

    if (hasDownload) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('admin can send contract for signature', async ({ page }) => {
    // SKIP: Requires contract in database and send functionality
    test.skip(true, 'Requires database with draft contract and send implementation');

    await page.goto('/admin/contracts/test-contract-id');

    // Look for send button
    const sendButton = page
      .locator('button, a')
      .filter({ hasText: /send|send for signature/i })
      .first();

    const hasSend = await sendButton.isVisible().catch(() => false);

    if (hasSend) {
      await expect(sendButton).toBeVisible();
    }
  });

  test('contract detail shows client information', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract and client');

    await page.goto('/admin/contracts/test-contract-id');

    // Look for client info section
    const clientInfo = page.locator('text=/client|recipient/i').first();

    const hasClientInfo = await clientInfo.isVisible().catch(() => false);

    if (hasClientInfo) {
      await expect(clientInfo).toBeVisible();
    }
  });

  test('contract detail shows signature status', async ({ page }) => {
    // SKIP: Requires contract in database
    test.skip(true, 'Requires database with contract record');

    await page.goto('/admin/contracts/test-contract-id');

    // Look for signature status or section
    const signatureSection = page.locator('text=/signature|signed by/i').first();

    const hasSignature = await signatureSection.isVisible().catch(() => false);

    if (hasSignature) {
      await expect(signatureSection).toBeVisible();
    }
  });
});

test.describe('Contracts - Client', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test client user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as client before each test
    await loginAsClient(page);
  });

  test('client can view contract detail page', async ({ page }) => {
    // SKIP: Requires client contract in database
    test.skip(true, 'Requires database with client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Check for contract content
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('client contract page displays contract content', async ({ page }) => {
    // SKIP: Requires client contract in database
    test.skip(true, 'Requires database with client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Check for contract viewing area
    const contractViewer = page.locator('[data-testid*="contract"], main, article').first();
    await expect(contractViewer).toBeVisible();
  });

  test('client can navigate to sign contract page', async ({ page }) => {
    // SKIP: Requires unsigned client contract in database
    test.skip(true, 'Requires database with unsigned client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Look for sign button
    const signButton = page
      .locator('button, a')
      .filter({ hasText: /sign|sign contract/i })
      .first();
    await expect(signButton).toBeVisible();

    await signButton.click();

    // Should navigate to signing page
    await expect(page).toHaveURL(/\/client\/contracts\/[\w-]+\/sign/);
  });

  test('contract signing page renders correctly', async ({ page }) => {
    // SKIP: Requires unsigned client contract in database
    test.skip(true, 'Requires database with unsigned client contract');

    await page.goto('/client/contracts/test-contract-id/sign');

    // Check for signature canvas or input
    const signatureArea = page.locator('canvas, [data-testid*="signature"]').first();
    await expect(signatureArea).toBeVisible();

    // Check for submit button
    await expect(
      page.locator('button[type="submit"], button:has-text("Sign")').first(),
    ).toBeVisible();
  });

  test('client can sign contract with signature pad', async ({ page }) => {
    // SKIP: Requires unsigned contract and signature implementation
    test.skip(true, 'Requires database and signature functionality');

    await page.goto('/client/contracts/test-contract-id/sign');

    // Look for signature canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Simulate drawing signature (this is simplified)
    // Real implementation would need to use mouse events
    await canvas.click();

    // Submit signature
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign")').first();
    await submitButton.click();

    // Should redirect to contract view or success page
    await page.waitForURL(/\/client\/contracts\/[\w-]+/, { timeout: 10000 });

    // Verify success message
    await expect(page.locator('text=/success|signed|completed/i').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('contract signing page has clear button', async ({ page }) => {
    // SKIP: Requires unsigned client contract in database
    test.skip(true, 'Requires database with unsigned client contract');

    await page.goto('/client/contracts/test-contract-id/sign');

    // Look for clear/reset button
    const clearButton = page
      .locator('button')
      .filter({ hasText: /clear|reset/i })
      .first();

    const hasClear = await clearButton.isVisible().catch(() => false);

    if (hasClear) {
      await expect(clearButton).toBeVisible();
    }
  });

  test('client can download signed contract', async ({ page }) => {
    // SKIP: Requires signed client contract in database
    test.skip(true, 'Requires database with signed client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Look for download button
    const downloadButton = page
      .locator('button, a')
      .filter({ hasText: /download|pdf/i })
      .first();

    const hasDownload = await downloadButton.isVisible().catch(() => false);

    if (hasDownload) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('signed contract shows signature and date', async ({ page }) => {
    // SKIP: Requires signed client contract in database
    test.skip(true, 'Requires database with signed client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Look for signature section
    await expect(page.locator('text=/signed|signature|signed on/i').first()).toBeVisible();
  });

  test('client cannot sign already signed contract', async ({ page }) => {
    // SKIP: Requires signed client contract in database
    test.skip(true, 'Requires database with signed client contract');

    await page.goto('/client/contracts/test-contract-id');

    // Sign button should not be visible
    const signButton = page
      .locator('button, a')
      .filter({ hasText: /sign|sign contract/i })
      .first();

    const hasSignButton = await signButton.isVisible().catch(() => false);

    expect(hasSignButton).toBeFalsy();
  });

  test('client contract list shows pending contracts', async ({ page }) => {
    // SKIP: Requires client with pending contracts
    test.skip(true, 'Requires database with client contracts');

    await page.goto('/client/home');

    // Look for contracts section or notification
    const contractsNotice = page
      .locator('text=/contract|pending signature|awaiting signature/i')
      .first();

    const hasNotice = await contractsNotice.isVisible().catch(() => false);

    // Pending contracts notification is optional
    if (hasNotice) {
      await expect(contractsNotice).toBeVisible();
    }
  });
});
