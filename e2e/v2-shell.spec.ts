import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/** Smoke του v2 shell: πλοήγηση, ορφανές σελίδες, εναλλαγή γλώσσας. */
test.describe('V2 shell', () => {
  test('sidebar reaches all six areas', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    for (const path of ['clients', 'productions', 'calendar', 'finance', 'knowledge']) {
      await page.locator(`aside a[href="/admin-v2/${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/admin-v2/${path}`));
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('orphan pages are reachable by click', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/productions');
    await expect(page.getByRole('link', { name: /Διαθεσιμότητα|Availability/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Προετοιμασία|Filming prep/i })).toBeVisible();
    await page.goto('/admin-v2/clients?tab=contracts');
    await expect(page.getByRole('link', { name: /Νέο συμφωνητικό|New contract/i })).toBeVisible();
    await page.goto('/admin-v2/clients?tab=chat');
    await expect(page.getByRole('link', { name: /Γνωσιακή βάση|Knowledge base/i })).toBeVisible();
  });

  test('shell chrome is translated', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    // Το shell header είναι το πρώτο <header> στο DOM — η σελίδα έχει δικό της.
    await expect(page.locator('header').first()).toContainText(/Προεπισκόπηση v2|v2 preview/);
  });

  test('today page bridges agenda and activity', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    await expect(page.getByText(/Σήμερα|Today/i).first()).toBeVisible();
    await expect(page.getByText(/Πρόσφατη Δραστηριότητα|Recent Activity/i).first()).toBeVisible();
  });

  test('productions overview tab shows crew load', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/productions?tab=overview');
    await expect(
      page.getByText(/Φόρτος συνεργείου \(14η\)|Crew load \(14d\)/i).first(),
    ).toBeVisible();
  });
});
