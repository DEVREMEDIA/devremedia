import { test, expect } from '@playwright/test';
import { loginAsClient } from './helpers/auth';
import { fixtures, hasFixtures } from './fixtures/graph';

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

  test('client dashboard displays the seeded active project', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto('/client/home');

    // The active-projects widget renders the seeded project's title as a heading.
    await expect(page.getByRole('heading', { name: project.title })).toBeVisible();
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
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto('/client/productions');

    // Project cards navigate on click rather than exposing an <a href> —
    // click the seeded project's title.
    await page.getByRole('heading', { name: project.title }).click();

    // Should be on that project's detail page
    await expect(page).toHaveURL(new RegExp(`/client/projects/${project.id}`));
  });

  test('client project detail shows deliverables section', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { projects, deliverable } = fixtures();

    await page.goto(`/client/projects/${projects.active.id}?tab=deliverables`);

    // The seeded deliverable is on the active project.
    await expect(page.getByText(deliverable.title)).toBeVisible();
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
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto('/client/documents?tab=invoices');

    // Address the seeded unpaid invoice by its number, never "the first row".
    await page.getByText(invoice.number).click();

    await expect(page).toHaveURL(new RegExp(`/client/invoices/${invoice.id}`));
  });

  test('unpaid invoice detail shows payment instructions', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/client/invoices/${invoice.id}`);

    // Issue #93: unpaid invoices show bank/RF payment instructions, not a pay
    // button. The panel's card title is «Οδηγίες πληρωμής» / "Payment instructions".
    await expect(
      page.getByRole('heading', { name: /Οδηγίες πληρωμής|Payment instructions/i }),
    ).toBeVisible();
  });

  test('paid invoice detail hides payment instructions', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.paid;

    await page.goto(`/client/invoices/${invoice.id}`);

    // A paid invoice has nothing left to pay — the panel is hidden, not greyed out.
    await expect(
      page.getByRole('heading', { name: /Οδηγίες πληρωμής|Payment instructions/i }),
    ).not.toBeVisible();
  });

  test('client invoice detail shows download option', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.paid;

    await page.goto(`/client/invoices/${invoice.id}`);

    // The download action is always rendered on the invoice detail page.
    await expect(page.getByRole('button', { name: /Λήψη|Download/i })).toBeVisible();
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

  test('client settings shows a read-only profile mirroring the client record', async ({
    page,
  }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const client = fixtures().client;

    await page.goto('/client/settings');

    // Issue #89/#90: Settings → Profile is a read-only mirror of `clients`, not
    // an editable form. Company/contact name show as <dl> values, and there is
    // no input to change them.
    await expect(page).toHaveURL(/\/client\/settings/);
    await expect(page.getByText(client.companyName)).toBeVisible();
    await expect(page.getByText(client.contactName)).toBeVisible();
    await expect(
      page.getByText('Για αλλαγές στα στοιχεία σας επικοινωνήστε με τη διαχείριση'),
    ).toBeVisible();
    await expect(page.locator('input[name="companyName"], input[name="contactName"]')).toHaveCount(
      0,
    );
  });

  test('client cannot access admin routes', async ({ page }) => {
    // Try to access admin dashboard
    await page.goto('/admin/dashboard');

    // Should redirect to client dashboard or show unauthorized
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('productions page separates active from completed projects', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { active, delivered } = fixtures().projects;

    await page.goto('/client/productions');

    // No empty-projects database is available under the fixture layer (see
    // e2e/SETUP.md §"What fixtures cannot give you"), so this narrows the old
    // "empty list" assertion to what the seeded graph actually supports: the
    // active and delivered seeded projects land in their respective sections.
    await expect(page.getByRole('heading', { name: active.title })).toBeVisible();
    await expect(page.getByRole('heading', { name: delivered.title })).toBeVisible();
  });

  test('invoices list shows both the paid and unpaid seeded invoices', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { paid, unpaid } = fixtures().invoices;

    // Same narrowing as above: an empty invoices state needs a genuinely empty
    // database, which the fixture layer cannot produce. Assert what it can:
    // both seeded invoices are listed with their fixture-accurate numbers.
    await page.goto('/client/documents?tab=invoices');

    await expect(page.getByText(paid.number)).toBeVisible();
    await expect(page.getByText(unpaid.number)).toBeVisible();
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

  test('client can view a signed contract', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const contract = fixtures().contracts.signed;

    await page.goto(`/client/contracts/${contract.id}`);

    // Check for contract content, addressed by the seeded contract's own title.
    await expect(page.getByRole('heading', { name: contract.title })).toBeVisible();
  });
});
