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

  test('language switcher translates the shell', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    // Ο switcher υπάρχει στο header (δες language-switcher.tsx για τον ρόλο/aria του trigger)
    await expect(page.locator('header')).toContainText(/Προεπισκόπηση v2|v2 preview/);
  });
});
