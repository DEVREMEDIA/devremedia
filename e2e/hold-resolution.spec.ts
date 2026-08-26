import { test, expect } from '@playwright/test';
import { login, loginAsAdmin, TEST_USERS } from './helpers/auth';

/**
 * Hold resolution E2E (#78)
 *
 * A Client books a date+Time Slot (a pending Hold); an admin then resolves it
 * from the filming-requests review surface:
 *   • APPROVE → the Hold becomes a confirmed Filming (a Production is created),
 *   • REJECT  → the date+Slot returns to Free and is bookable again.
 *
 * These require seeded test users with: an active Agreement for the client,
 * configured Time Slots, and Capacity 1. They skip unless the database fixtures
 * are in place (same convention as the other booking specs).
 */

async function bookFirstAvailableSlot(page: import('@playwright/test').Page) {
  await page.goto('/client/book');
  const bookButton = page.getByRole('button', { name: /book|κράτηση/i }).first();
  await expect(bookButton).toBeVisible();
  await bookButton.click();
  const confirm = page.getByRole('button', { name: /confirm booking|επιβεβαίωση/i });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.locator('text=/pending|εκκρεμεί|booked|κράτηση/i').first()).toBeVisible({
    timeout: 10000,
  });
}

async function openLatestHold(page: import('@playwright/test').Page) {
  await page.goto('/admin/productions?tab=requests');
  // The newest request (the Hold just created) is first.
  const firstRow = page
    .getByRole('link')
    .filter({ hasText: /booking|κράτηση/i })
    .first();
  await firstRow.click();
  await expect(page).toHaveURL(/\/admin\/filming-requests\/.+/);
}

test.describe('Hold resolution - Admin', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
  });

  test('book → admin approves → confirmed Filming (Production) is created', async ({ page }) => {
    await login(page, TEST_USERS.client.email, TEST_USERS.client.password);
    await bookFirstAvailableSlot(page);

    await loginAsAdmin(page);
    await openLatestHold(page);

    // Approving a Hold redirects to the newly created Production.
    await page.getByRole('button', { name: /approve|έγκριση/i }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/.+/, { timeout: 10000 });
  });

  test('book → admin rejects → the slot is bookable again', async ({ page }) => {
    await login(page, TEST_USERS.client.email, TEST_USERS.client.password);
    await bookFirstAvailableSlot(page);

    await loginAsAdmin(page);
    await openLatestHold(page);

    await page.getByRole('button', { name: /reject|απόρριψη/i }).click();
    // After rejection the request reads as declined.
    await expect(page.locator('text=/declined|απορρίφθηκε|rejected/i').first()).toBeVisible({
      timeout: 10000,
    });

    // The freed date+Slot can be booked again by the client.
    await login(page, TEST_USERS.client.email, TEST_USERS.client.password);
    await page.goto('/client/book');
    await expect(page.getByRole('button', { name: /book|κράτηση/i }).first()).toBeVisible();
  });
});
