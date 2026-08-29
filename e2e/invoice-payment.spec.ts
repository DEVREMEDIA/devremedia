import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';
import { fixtures, hasFixtures } from './fixtures/graph';

/**
 * Invoice and Payment E2E Tests
 *
 * Card checkout was removed from the client invoice page (issue #93). There is
 * no "Pay Now"/Stripe button any more — the client sees a payment-instructions
 * panel driven by `src/lib/payment-instructions.ts`: an RF code when the
 * invoice has one, bank details as a fallback, or a contact-us message when
 * neither is configured. Admins set the RF code inline on the invoice detail
 * page; the old "send payment link" action now just marks the invoice `sent`.
 *
 * Everything here is addressed against the seeded fixture graph
 * (`e2e/fixtures/graph.ts`) — never against "the first row" of a list.
 */

test.describe('Invoice Management - Admin', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
  });

  test('admin can view invoices list page', async ({ page }) => {
    await page.goto('/admin/invoices');
    await page.waitForLoadState('networkidle');

    // The old bare route is now a stub that redirects into the finance hub
    await expect(page).toHaveURL(/\/admin\/finance\?tab=invoices/);

    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /invoices|τιμολόγια/i })
        .first(),
    ).toBeVisible();

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

  test('invoices list groups the seeded client and shows both fixture invoices', async ({
    page,
  }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { client, invoices } = fixtures();

    await page.goto('/admin/finance?tab=invoices');

    // Narrow to the seeded client via the search box — the list can otherwise
    // contain real production data.
    await page.getByPlaceholder('Αναζήτηση πελάτη...').fill(client.companyName);

    const clientGroup = page.getByRole('button').filter({ hasText: client.companyName });
    await expect(clientGroup).toBeVisible();
    await clientGroup.click();

    await expect(page.getByText(invoices.paid.number)).toBeVisible();
    await expect(page.getByText(invoices.unpaid.number)).toBeVisible();
  });

  test('admin can open the invoice creation drawer from a project', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto(`/admin/projects/${project.id}?tab=invoices`);
    // The fixture project already has invoices (paid + unpaid), so the header
    // "create invoice" button renders — not the EmptyState variant.
    await page.getByRole('button', { name: 'Δημιουργία Τιμολογίου' }).click();

    // Narrowed: invoice creation is now a PDF-upload-and-review flow
    // (InvoiceUploadForm inside CreateInvoiceDrawer), not a standalone form
    // with typed line items. We only assert the drawer opens — actually
    // completing the flow needs a real PDF fixture and is out of scope here.
    await expect(
      page
        .getByRole('dialog')
        .locator('[data-slot="sheet-title"]')
        .filter({ hasText: 'Δημιουργία Τιμολογίου' }),
    ).toBeVisible();
  });

  test('admin can view invoice detail page for the unpaid fixture invoice', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page).toHaveURL(new RegExp(`/admin/invoices/${invoice.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: invoice.number })).toBeVisible();
  });

  test('invoice detail page shows key information', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page.getByText(invoice.number)).toBeVisible();
    // Status 'sent' renders through the shared StatusBadge, localized.
    await expect(page.getByText('Εστάλη')).toBeVisible();
  });

  test('invoice detail page shows line items', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page.getByRole('table')).toBeVisible();
    // The single seeded line item, from e2e/fixtures/records.ts.
    await expect(page.getByText('Production day')).toBeVisible();
  });

  test('admin can set and clear the RF code on an invoice', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');
    const invoice = fixtures().invoices.unpaid;
    const rfCode = 'RF18000000000000000000000012';

    await page.goto(`/admin/invoices/${invoice.id}`);

    await page.getByRole('button', { name: 'Κωδικός RF' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Κωδικός RF').fill(rfCode);
    await dialog.getByRole('button', { name: 'Αποθήκευση' }).click();

    await expect(page.getByText('Ο κωδικός RF αποθηκεύτηκε')).toBeVisible();
    await expect(page.getByText(rfCode)).toBeVisible();

    // Restore the fixture invoice to its seeded (no RF) state so other specs
    // that reuse `invoices.unpaid` are unaffected by this mutation.
    await page.getByRole('button', { name: 'Κωδικός RF' }).click();
    await dialog.getByLabel('Κωδικός RF').fill('');
    await dialog.getByRole('button', { name: 'Αποθήκευση' }).click();
    await expect(page.getByText('Ο κωδικός RF αποθηκεύτηκε')).toBeVisible();
  });

  test('invoice detail shows payment actions, not a card checkout button', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    // Issue #93: in-app card payment is gone. The "send payment link" action
    // is relabelled — it now just marks the invoice as sent.
    await expect(page.getByRole('button', { name: 'Σήμανση ως απεσταλμένο' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Καταγραφή Χειροκίνητης Πληρωμής' }),
    ).toBeVisible();
    await expect(page.getByText(/pay now|stripe|πληρωμή με κάρτα/i)).toHaveCount(0);
  });

  test('paid invoice shows payment received instead of payment actions', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.paid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page.getByText('Η πληρωμή ελήφθη')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Σήμανση ως απεσταλμένο' })).toHaveCount(0);
  });

  test('invoices list displays localized status badges', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { client } = fixtures();

    await page.goto('/admin/finance?tab=invoices');
    await page.getByPlaceholder('Αναζήτηση πελάτη...').fill(client.companyName);
    await page.getByRole('button').filter({ hasText: client.companyName }).click();

    await expect(page.getByText('Πληρωμένο')).toBeVisible();
    await expect(page.getByText('Εστάλη')).toBeVisible();
  });

  test('invoice detail has download/print option', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.paid;

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page.getByRole('button', { name: 'Προεπισκόπηση' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Λήψη' })).toBeVisible();
  });

  test('invoice detail shows client information', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const invoice = fixtures().invoices.unpaid;
    const { client } = fixtures();

    await page.goto(`/admin/invoices/${invoice.id}`);

    await expect(page.getByText(client.companyName)).toBeVisible();
    await expect(page.getByText(client.email)).toBeVisible();
  });

  test('admin can access expenses page', async ({ page }) => {
    await page.goto('/admin/invoices/expenses');

    // The old bare route is now a stub that redirects into the finance hub
    await expect(page).toHaveURL(/\/admin\/finance\?tab=expenses/);

    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /expenses|έξοδα/i })
        .first(),
    ).toBeVisible();
  });

  test('searching for a client with no invoices shows the empty message', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const { emptyClient } = fixtures();

    await page.goto('/admin/finance?tab=invoices');
    await page.getByPlaceholder('Αναζήτηση πελάτη...').fill(emptyClient.companyName);

    // `emptyClient` has no invoices at all, so the search narrows the client
    // list down to nothing — there is no genuinely empty invoices table to
    // point at without a dedicated empty database (see e2e/SETUP.md #6).
    await expect(page.getByText('Δεν βρέθηκαν πελάτες')).toBeVisible();
  });
});

test.describe('Invoice Payment Instructions - Client', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    await loginAsClient(page);
  });

  test('unpaid invoice shows payment instructions, not a pay-now button', async ({ page }) => {
    const invoice = fixtures().invoices.unpaid;

    await page.goto(`/client/invoices/${invoice.id}`);

    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Οδηγίες πληρωμής' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /pay now|πληρωμή με κάρτα/i })).toHaveCount(0);

    // The seeded invoice has no rf_code (see e2e/fixtures/records.ts), so what
    // renders depends on whether the target project has bank details
    // configured in admin settings — assert whichever branch is actually
    // showing rather than assuming one.
    const hasBankDetails = await page
      .getByText('Τραπεζικό έμβασμα')
      .isVisible()
      .catch(() => false);

    if (hasBankDetails) {
      await expect(page.getByText('IBAN')).toBeVisible();
    } else {
      await expect(page.getByText('Δεν έχουν καταχωρηθεί ακόμα στοιχεία πληρωμής')).toBeVisible();
    }
  });

  test('paid invoice hides the payment instructions panel', async ({ page }) => {
    const invoice = fixtures().invoices.paid;

    await page.goto(`/client/invoices/${invoice.id}`);

    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: 'Οδηγίες πληρωμής' }),
    ).toHaveCount(0);
  });

  test('admin-set RF code appears on the client payment instructions panel', async ({
    page,
    browser,
  }) => {
    test.skip(
      !process.env.E2E_WRITE_TESTS,
      'Write tests not enabled (E2E_WRITE_TESTS) — mutates the shared unpaid fixture invoice',
    );
    const invoice = fixtures().invoices.unpaid;
    const rfCode = 'RF18111111111111111111111111';

    // Set the RF code as admin, in a separate browser context so it does not
    // disturb the client session this describe block already logged in.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    try {
      await loginAsAdmin(adminPage);
      await adminPage.goto(`/admin/invoices/${invoice.id}`);
      await adminPage.getByRole('button', { name: 'Κωδικός RF' }).click();
      const dialog = adminPage.getByRole('dialog');
      await dialog.getByLabel('Κωδικός RF').fill(rfCode);
      await dialog.getByRole('button', { name: 'Αποθήκευση' }).click();
      await expect(adminPage.getByText('Ο κωδικός RF αποθηκεύτηκε')).toBeVisible();

      await page.goto(`/client/invoices/${invoice.id}`);
      await expect(page.getByText(rfCode)).toBeVisible();
      await expect(page.getByText('Κωδικός RF')).toBeVisible();

      // Restore state — clear the RF code so the fixture invoice stays
      // reusable for other specs that assume it has none.
      await adminPage.getByRole('button', { name: 'Κωδικός RF' }).click();
      await dialog.getByLabel('Κωδικός RF').fill('');
      await dialog.getByRole('button', { name: 'Αποθήκευση' }).click();
      await expect(adminPage.getByText('Ο κωδικός RF αποθηκεύτηκε')).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});
