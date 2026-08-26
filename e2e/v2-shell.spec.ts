import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/** Smoke του v2 shell: πλοήγηση, ορφανές σελίδες, εναλλαγή γλώσσας. */
test.describe('V2 shell', () => {
  test('sidebar reaches all six areas', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/today');
    for (const path of ['clients', 'productions', 'calendar', 'finance', 'knowledge']) {
      await page.locator(`aside a[href="/admin/${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/admin/${path}`));
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('orphan pages are reachable by click', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions');
    await expect(page.getByRole('link', { name: /Διαθεσιμότητα|Availability/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Προετοιμασία|Filming prep/i })).toBeVisible();
    await page.goto('/admin/clients?tab=contracts');
    await expect(page.getByRole('link', { name: /Νέο συμφωνητικό|New contract/i })).toBeVisible();
    await page.goto('/admin/clients?tab=chat');
    await expect(page.getByRole('link', { name: /Γνωσιακή βάση|Knowledge base/i })).toBeVisible();
  });

  test('shell chrome is translated', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/today');
    await expect(page.locator('aside a[href="/admin/today"]')).toBeVisible();
  });

  test('today page bridges agenda and activity', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/today');
    // Το page h1 λέει επίσης «Σήμερα»/«Today» — σκοπεύουμε στο card-title του widget, όχι όλη τη σελίδα.
    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: /Σήμερα|Today/i })
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/Πρόσφατη Δραστηριότητα|Recent Activity/i).first()).toBeVisible();
  });

  test('productions overview tab shows crew load', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin/productions?tab=overview');
    await expect(
      page.getByText(/Φόρτος συνεργείου \(14η\)|Crew load \(14d\)/i).first(),
    ).toBeVisible();
  });
});
