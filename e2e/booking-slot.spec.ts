import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './helpers/auth';

/**
 * Book-a-slot E2E (#77)
 *
 * A Client with an active Agreement books a date+Time Slot from the availability
 * view → a pending Hold is created and the slot stops accepting new Holds once
 * Capacity is reached, so a second Client cannot take the same full slot.
 *
 * These require seeded test users with: an active Agreement for the primary
 * client, configured Time Slots, and Capacity 1. They skip unless the database
 * fixtures are in place (same convention as the other specs).
 */

const SECOND_CLIENT = {
  email: process.env.E2E_SECOND_CLIENT_EMAIL ?? '',
  password: process.env.E2E_SECOND_CLIENT_PASSWORD ?? '',
};

test.describe('Book a slot - Client', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    // These tests CREATE Holds. `E2E_TEST_USERS_READY` means "may log in and
    // read"; writing needs its own, explicit opt-in, because the suite has no
    // fixtures and no teardown (#119) and may be pointed at a real database.
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');
    await login(page, TEST_USERS.client.email, TEST_USERS.client.password);
  });

  test('client with an Agreement sees available slots and can book one', async ({ page }) => {
    await page.goto('/client/book');
    await expect(page).toHaveURL(/\/client\/book/);

    // An available slot exposes a Book button (full/limit slots show a badge instead).
    const bookButton = page.getByRole('button', { name: /book|κράτηση/i }).first();
    await expect(bookButton).toBeVisible();
    await bookButton.click();

    // Confirm the booking (location + note are optional).
    const confirm = page.getByRole('button', { name: /confirm booking|επιβεβαίωση/i });
    await expect(confirm).toBeVisible();
    await confirm.click();

    // A pending Hold was created → success toast.
    await expect(page.locator('text=/pending|εκκρεμεί|booked|κράτηση/i').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('a full slot at Capacity cannot be taken by a second client', async ({ page, browser }) => {
    test.skip(
      !SECOND_CLIENT.email || !SECOND_CLIENT.password,
      'Second client credentials not configured',
    );

    // First client books the only spot in a slot at Capacity 1 (above).
    await page.goto('/client/book');
    const firstBook = page.getByRole('button', { name: /book|κράτηση/i }).first();
    await firstBook.click();
    await page.getByRole('button', { name: /confirm booking|επιβεβαίωση/i }).click();
    await expect(page.locator('text=/pending|εκκρεμεί|booked|κράτηση/i').first()).toBeVisible({
      timeout: 10000,
    });

    // Second client opens the same view: that date+slot now shows Full, not Book.
    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await login(secondPage, SECOND_CLIENT.email, SECOND_CLIENT.password);
    await secondPage.goto('/client/book');

    await expect(secondPage.locator('text=/full|γεμάτο|limit reached/i').first()).toBeVisible();
    await second.close();
  });
});
