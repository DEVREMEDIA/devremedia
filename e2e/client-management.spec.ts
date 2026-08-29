import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fixtures, hasFixtures } from './fixtures/graph';

/**
 * Client Management E2E Tests
 * Tests admin client CRUD operations and navigation against the seeded fixture
 * graph (see e2e/SETUP.md). Records are addressed by identity (id / exact
 * company name) — never by list position.
 */

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
  });

  test('admin can view clients list page', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    await page.goto('/admin/clients');
    await expect(page).toHaveURL(/\/admin\/clients$/);

    // Πελάτες — h1 of PageHeading, shared by clients.title / shellV2.pages.adminClients.title.
    await expect(page.locator('h1')).toHaveText('Πελάτες');

    // The default "list" tab renders ClientsContent -> DataTable.
    await expect(page.locator('table')).toBeVisible();
    await expect(
      page.getByRole('link', { name: fixtures().client.contactName, exact: true }),
    ).toBeVisible();
  });

  test('clients list shows add new client button', async ({ page }) => {
    await page.goto('/admin/clients');

    // clients.addClient renders as a Link styled as a button — assert by href,
    // not text, since the Greek label ("Νέος Πελάτης") is presentation detail.
    const addButton = page.locator('a[href="/admin/clients/new"]');
    await expect(addButton).toBeVisible();
  });

  test('admin can navigate to create new client page', async ({ page }) => {
    await page.goto('/admin/clients');

    await page.locator('a[href="/admin/clients/new"]').click();

    await expect(page).toHaveURL(/\/admin\/clients\/new/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('new client form renders with required fields', async ({ page }) => {
    await page.goto('/admin/clients/new');

    await expect(page.locator('form')).toBeVisible();

    // ClientForm (src/components/admin/clients/client-form.tsx) uses stable ids.
    await expect(page.locator('#contact_name')).toBeVisible();
    await expect(page.locator('#email[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin can create a new client', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    test.skip(!process.env.E2E_WRITE_TESTS, 'E2E_WRITE_TESTS not set — write tests disabled');

    // Namespaced with the run's fixture prefix so it is caught by
    // `pnpm e2e:teardown -- --all` if this test fails before its own cleanup.
    const contactName = `${fixtures().namespace} New Contact`;
    const companyName = `${fixtures().namespace} New Co`;
    const email = `e2e-${fixtures().runId}-new@devre.test`;

    await page.goto('/admin/clients/new');
    await page.locator('#contact_name').fill(contactName);
    await page.locator('#email').fill(email);
    await page.locator('#company_name').fill(companyName);
    // Uncheck the portal invite — this client only exists to prove the create
    // flow works, it should not trigger a real invite email.
    await page.locator('#sendInvite').uncheck();
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/admin\/clients\/[\w-]+$/);
    await expect(page.locator('h1')).toHaveText(contactName);

    // Clean up: delete the client this test created (not a seeded fixture).
    await page.getByRole('button', { name: 'Διαγραφή' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Διαγραφή' }).click();
    await page.waitForURL(/\/admin\/clients$/);
  });

  test('admin can view client detail page', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    const client = fixtures().client;
    await page.goto(`/admin/clients/${client.id}`);

    await expect(page).toHaveURL(new RegExp(`/admin/clients/${client.id}$`));
    await expect(page.locator('h1')).toHaveText(client.contactName);
    await expect(page.getByText(client.companyName)).toBeVisible();
  });

  test('client detail page shows projects and invoices sections', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    const client = fixtures().client;
    await page.goto(`/admin/clients/${client.id}`);

    // Overview tab is active by default and links to the tabs directly.
    await page.goto(`/admin/clients/${client.id}?tab=projects`);
    await expect(page.getByText(fixtures().projects.active.title)).toBeVisible();

    await page.goto(`/admin/clients/${client.id}?tab=invoices`);
    await expect(page.getByText(fixtures().invoices.unpaid.number)).toBeVisible();
  });

  test('admin can navigate to edit client page', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    const client = fixtures().client;
    await page.goto(`/admin/clients/${client.id}`);

    await page.locator(`a[href="/admin/clients/${client.id}/edit"]`).click();

    await expect(page).toHaveURL(new RegExp(`/admin/clients/${client.id}/edit`));
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#contact_name')).toHaveValue(client.contactName);
  });

  test('admin can edit a client', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    test.skip(!process.env.E2E_WRITE_TESTS, 'E2E_WRITE_TESTS not set — write tests disabled');

    // Edited under the write gate, then restored — this is `emptyClient`
    // (no projects/invoices/contracts, no portal login), the safe fixture to
    // mutate. Never edit `fixtures().client`, which other tests read from.
    const client = fixtures().emptyClient;
    const originalCompanyName = client.companyName;
    const updatedCompanyName = `${originalCompanyName} Edited`;

    await page.goto(`/admin/clients/${client.id}/edit`);
    await page.locator('#company_name').fill(updatedCompanyName);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(new RegExp(`/admin/clients/${client.id}$`));
    await expect(page.getByText(updatedCompanyName)).toBeVisible();

    // Restore the original value so later runs/tests still see the seeded name.
    await page.goto(`/admin/clients/${client.id}/edit`);
    await page.locator('#company_name').fill(originalCompanyName);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/admin/clients/${client.id}$`));
    await expect(page.getByText(originalCompanyName)).toBeVisible();
  });

  test('clients list has search or filter functionality', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    await page.goto('/admin/clients');

    // SearchInput (src/components/shared/search-input.tsx) is a plain text
    // input; ClientsContent passes clients.description as its placeholder.
    const searchInput = page.getByPlaceholder('Διαχείριση πελατειακών σχέσεων');
    await expect(searchInput).toBeVisible();

    await searchInput.fill(fixtures().client.companyName);
    await expect(
      page.getByRole('link', { name: fixtures().client.contactName, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: fixtures().emptyClient.contactName, exact: true }),
    ).not.toBeVisible();
  });

  test('empty client detail page shows appropriate empty state', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    // Seeding cannot produce a globally empty clients table (see e2e/SETUP.md,
    // "What fixtures cannot give you"), so this narrows the original intent —
    // "no clients" — to the scoped case the fixture graph does provide:
    // `emptyClient` has no projects, invoices or contracts.
    const client = fixtures().emptyClient;
    await page.goto(`/admin/clients/${client.id}?tab=projects`);

    await expect(page.getByText('Δεν υπάρχουν projects')).toBeVisible();
  });
});
