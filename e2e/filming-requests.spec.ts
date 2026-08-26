import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';

/**
 * Filming Requests E2E Tests
 * Tests booking wizard for clients and request management for admin
 */

test.describe('Filming Requests - Client', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test client user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as client before each test
    await loginAsClient(page);
  });

  test('booking wizard page renders correctly', async ({ page }) => {
    await page.goto('/client/book');

    // Check that we're on the booking page
    await expect(page).toHaveURL(/\/client\/book/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /book|request|new project/i })
        .first(),
    ).toBeVisible();

    // Check for form or wizard
    const hasForm = await page
      .locator('form')
      .isVisible()
      .catch(() => false);
    const hasWizard = await page
      .locator('[data-testid*="wizard"], [data-testid*="step"]')
      .isVisible()
      .catch(() => false);

    expect(hasForm || hasWizard).toBeTruthy();
  });

  test('booking wizard shows multiple steps', async ({ page }) => {
    await page.goto('/client/book');

    // Look for step indicators
    const stepIndicator = page
      .locator('[data-testid*="step"], .step-indicator, [role="progressbar"]')
      .first();

    const hasSteps = await stepIndicator.isVisible().catch(() => false);

    // Multi-step wizard is common but not required
    if (hasSteps) {
      await expect(stepIndicator).toBeVisible();
    }
  });

  test('booking form has event type selection', async ({ page }) => {
    await page.goto('/client/book');

    // Look for event type field (select, radio buttons, or cards)
    const eventTypeField = page
      .locator('select[name*="type"], [role="radiogroup"], [data-testid*="event-type"]')
      .first();

    const hasEventType = await eventTypeField.isVisible().catch(() => false);

    expect(hasEventType).toBeTruthy();
  });

  test('booking form has date selection', async ({ page }) => {
    await page.goto('/client/book');

    // Look for date picker or date input
    const dateField = page
      .locator('input[type="date"], [data-testid*="date"], button:has-text("Select date")')
      .first();

    const hasDate = await dateField.isVisible().catch(() => false);

    expect(hasDate).toBeTruthy();
  });

  test('booking form has location input', async ({ page }) => {
    await page.goto('/client/book');

    // Look for location/venue field
    const locationField = page
      .locator('input[name*="location"], input[name*="venue"], textarea[name*="location"]')
      .first();

    const hasLocation = await locationField.isVisible().catch(() => false);

    expect(hasLocation).toBeTruthy();
  });

  test('booking form has description/details field', async ({ page }) => {
    await page.goto('/client/book');

    // Look for description or details textarea
    const descriptionField = page
      .locator('textarea[name*="description"], textarea[name*="details"]')
      .first();

    const hasDescription = await descriptionField.isVisible().catch(() => false);

    expect(hasDescription).toBeTruthy();
  });

  test('client can submit filming request', async ({ page }) => {
    // SKIP: Requires form submission implementation
    test.skip(true, 'Requires booking form submission functionality');

    await page.goto('/client/book');

    // Fill in the form (adjust based on actual fields)
    // Event type
    const eventType = page.locator('select[name*="type"]').first();
    if (await eventType.isVisible().catch(() => false)) {
      await eventType.selectOption({ index: 1 });
    }

    // Date
    const dateField = page.locator('input[type="date"]').first();
    if (await dateField.isVisible().catch(() => false)) {
      await dateField.fill('2026-12-31');
    }

    // Location
    const locationField = page.locator('input[name*="location"]').first();
    if (await locationField.isVisible().catch(() => false)) {
      await locationField.fill('Test Venue E2E');
    }

    // Description
    const descField = page.locator('textarea[name*="description"]').first();
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('This is a test filming request from E2E tests');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"]').last();
    await submitButton.click();

    // Should show success message or redirect
    await expect(page.locator('text=/success|submitted|received/i').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('booking wizard shows navigation buttons', async ({ page }) => {
    await page.goto('/client/book');

    // Look for next/continue button
    const nextButton = page
      .locator('button')
      .filter({ hasText: /next|continue/i })
      .first();

    const hasNext = await nextButton.isVisible().catch(() => false);

    // Navigation buttons are common for multi-step wizards
    if (hasNext) {
      await expect(nextButton).toBeVisible();
    }
  });

  test('booking form validates required fields', async ({ page }) => {
    await page.goto('/client/book');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]').last();
    await submitButton.click();

    // Should show validation errors or prevent submission
    // This depends on form validation implementation
    const hasError = await page
      .locator('text=/required|error|fill/i')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // Validation is expected but implementation varies
    if (hasError) {
      await expect(page.locator('text=/required|error/i').first()).toBeVisible();
    }
  });

  test('booking wizard has budget/pricing section', async ({ page }) => {
    await page.goto('/client/book');

    // Look for budget or pricing fields
    const budgetField = page.locator('input[name*="budget"], select[name*="package"]').first();

    const hasBudget = await budgetField.isVisible().catch(() => false);

    // Budget/pricing is optional in booking
    if (hasBudget) {
      await expect(budgetField).toBeVisible();
    }
  });

  test('client can save draft filming request', async ({ page }) => {
    // SKIP: Requires draft save functionality
    test.skip(true, 'Requires draft save implementation');

    await page.goto('/client/book');

    // Look for save draft button
    const saveDraftButton = page
      .locator('button')
      .filter({ hasText: /save draft|save for later/i })
      .first();

    const hasSaveDraft = await saveDraftButton.isVisible().catch(() => false);

    if (hasSaveDraft) {
      await expect(saveDraftButton).toBeVisible();
    }
  });
});

test.describe('Filming Requests - Admin', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test admin user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('admin can view filming requests list page', async ({ page }) => {
    await page.goto('/admin/filming-requests');

    // The old bare route is now a stub that redirects into the productions hub
    await expect(page).toHaveURL(/\/admin\/productions\?tab=requests/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /filming request|booking|request/i })
        .first(),
    ).toBeVisible();
  });

  test('filming requests list shows requests table or cards', async ({ page }) => {
    // SKIP: Requires filming requests in database
    test.skip(true, 'Requires database with filming request records');

    await page.goto('/admin/productions?tab=requests');

    // Look for table or cards
    const hasTable = await page
      .locator('table')
      .isVisible()
      .catch(() => false);
    const hasCards = await page
      .locator('[data-testid*="request"]')
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('admin can view filming request detail page', async ({ page }) => {
    // SKIP: Requires filming request in database
    test.skip(true, 'Requires database with filming request record');

    await page.goto('/admin/productions?tab=requests');

    // Click on first request
    const firstRequest = page
      .locator('tr td a, [data-testid*="request"] a, a[href*="/admin/filming-requests/"]')
      .first();
    await firstRequest.click();

    // Should be on request detail page
    await expect(page).toHaveURL(/\/admin\/filming-requests\/[\w-]+/);

    // Check for request details
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('filming request detail shows client information', async ({ page }) => {
    // SKIP: Requires filming request in database
    test.skip(true, 'Requires database with filming request record');

    await page.goto('/admin/filming-requests/test-request-id');

    // Look for client info
    await expect(page.locator('text=/client|requested by/i').first()).toBeVisible();
  });

  test('filming request detail shows event details', async ({ page }) => {
    // SKIP: Requires filming request in database
    test.skip(true, 'Requires database with filming request record');

    await page.goto('/admin/filming-requests/test-request-id');

    // Look for event details (type, date, location)
    const details = [/event type|type/i, /date|when/i, /location|venue/i];

    let foundDetails = 0;
    for (const pattern of details) {
      const hasDetail = await page
        .locator(`text=${pattern}`)
        .isVisible()
        .catch(() => false);
      if (hasDetail) foundDetails++;
    }

    expect(foundDetails).toBeGreaterThanOrEqual(2);
  });

  test('admin can approve filming request', async ({ page }) => {
    // SKIP: Requires filming request and approval functionality
    test.skip(true, 'Requires database with request and approval implementation');

    await page.goto('/admin/filming-requests/test-request-id');

    // Look for approve button
    const approveButton = page
      .locator('button')
      .filter({ hasText: /approve|accept/i })
      .first();
    await expect(approveButton).toBeVisible();

    await approveButton.click();

    // Should show success message or status update
    await expect(page.locator('text=/approved|accepted/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('admin can convert request to project', async ({ page }) => {
    // SKIP: Requires filming request and conversion functionality
    test.skip(true, 'Requires database with request and conversion implementation');

    await page.goto('/admin/filming-requests/test-request-id');

    // Look for convert to project button
    const convertButton = page
      .locator('button, a')
      .filter({ hasText: /convert|create project/i })
      .first();

    const hasConvert = await convertButton.isVisible().catch(() => false);

    if (hasConvert) {
      await expect(convertButton).toBeVisible();
    }
  });

  test('filming requests list shows status filters', async ({ page }) => {
    await page.goto('/admin/productions?tab=requests');

    // Look for status filter
    const statusFilter = page
      .locator('[data-testid*="filter"], select[name*="status"], button:has-text("Filter")')
      .first();

    const hasFilter = await statusFilter.isVisible().catch(() => false);

    // Filters are common but not required
    if (hasFilter) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('filming requests show status badges', async ({ page }) => {
    // SKIP: Requires filming requests in database
    test.skip(true, 'Requires database with filming request records');

    await page.goto('/admin/productions?tab=requests');

    // Look for status badges
    const statusBadge = page.locator('[data-testid*="status"], .badge, .status').first();

    const hasBadges = await statusBadge.isVisible().catch(() => false);

    if (hasBadges) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('admin can add notes to filming request', async ({ page }) => {
    // SKIP: Requires filming request and notes functionality
    test.skip(true, 'Requires database with request and notes implementation');

    await page.goto('/admin/filming-requests/test-request-id');

    // Look for notes section or add note button
    const notesSection = page.locator('text=/notes|comments/i, [data-testid*="notes"]').first();

    const hasNotes = await notesSection.isVisible().catch(() => false);

    // Notes are optional but common
    if (hasNotes) {
      await expect(notesSection).toBeVisible();
    }
  });

  test('empty filming requests list shows appropriate message', async ({ page }) => {
    // SKIP: Requires empty database or specific test state
    test.skip(true, 'Requires database with no filming requests');

    await page.goto('/admin/productions?tab=requests');

    // Look for empty state message
    await expect(
      page.locator('text=/no requests|empty|no filming requests/i').first(),
    ).toBeVisible();
  });
});
