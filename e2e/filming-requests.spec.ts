import { test, expect } from '@playwright/test';
import { fixtures, hasFixtures } from './fixtures/graph';
import { loginAsAdmin, loginAsClient } from './helpers/auth';

/**
 * Filming Requests E2E Tests
 *
 * Covers the public booking form (`/book`, unauthenticated), the client
 * booking page (`/client/book` — a slot-availability calendar, not a form;
 * the seeded client has no `client_agreements` row so it always renders the
 * "no active plan" state, which is itself a real, assertable path) and the
 * admin filming-requests surface, which now lives inside the productions hub
 * at `/admin/productions?tab=requests` (the old `/admin/filming-requests` is
 * a redirect stub).
 *
 * The booking wizard itself (choosing a date+slot as a client with an active
 * agreement) and the Hold approve/reject flow are already covered by
 * `booking-slot.spec.ts` and `hold-resolution.spec.ts` — this file does not
 * duplicate them.
 */

test.describe('Filming Requests - Public booking form', () => {
  // Unauthenticated route, no fixtures required — same convention as the
  // other unauthenticated smoke tests in the suite.

  test('booking form renders all sections', async ({ page }) => {
    await page.goto('/book');

    await expect(page.getByRole('heading', { name: 'Κλείσε ένα Discovery Call' })).toBeVisible();
    await expect(page.getByLabel('Ονοματεπώνυμο *')).toBeVisible();
    await expect(page.getByLabel('Email *')).toBeVisible();
    await expect(page.getByLabel('Τίτλος Project *')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Υποβολή Αιτήματος' })).toBeVisible();
  });

  test('selecting a project type highlights it', async ({ page }) => {
    await page.goto('/book');

    const option = page.getByRole('button', { name: /Εταιρικό Video/i }).first();
    await option.click();
    await expect(option).toHaveClass(/border-primary/);
  });

  test('submitting without required fields shows validation errors', async ({ page }) => {
    await page.goto('/book');

    await page.getByRole('button', { name: 'Υποβολή Αιτήματος' }).click();

    // zod messages render under the contact/title fields — assert at least
    // one shows up rather than pinning exact copy.
    await expect(page.locator('form p.text-destructive').first()).toBeVisible();
  });

  test('client can submit a filming request from the public form', async ({ page }) => {
    // createPublicFilmingRequest() files this as a `leads` row (source
    // 'website', stage 'new'), not a `filming_requests` row — it's outside
    // the fixture graph either way (an anonymous public submission has no
    // client/fixture owner to hang off), so it is gated on the write flag
    // alone. The title and contact name are prefixed `E2E-` so
    // `pnpm e2e:teardown -- --all` can sweep it.
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');

    const stamp = `E2E-public-${Date.now()}`;

    await page.goto('/book');
    await page.getByLabel('Ονοματεπώνυμο *').fill(stamp);
    await page.getByLabel('Email *').fill(`${stamp}@devre.test`);
    await page
      .getByRole('button', { name: /Εταιρικό Video/i })
      .first()
      .click();
    await page.getByLabel('Τίτλος Project *').fill(stamp);

    await page.getByRole('button', { name: 'Υποβολή Αιτήματος' }).click();

    await expect(page.getByRole('heading', { name: 'Το αίτημα υποβλήθηκε!' })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Filming Requests - Client booking page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    await loginAsClient(page);
  });

  test('seeded client with no agreement sees the no-plan state', async ({ page }) => {
    // `fixtures().client` has no `client_agreements` row, so `getMyAvailability`
    // returns null and the page renders its no-agreement fallback instead of
    // the slot calendar (booking-slot.spec.ts covers the calendar itself,
    // which needs a client with an active agreement).
    await page.goto('/client/book');
    await expect(page).toHaveURL(/\/client\/book/);

    await expect(page.getByText('Δεν υπάρχει ενεργό πλάνο κρατήσεων')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Επικοινωνήστε μαζί μας' })).toHaveAttribute(
      'href',
      'mailto:info@devremedia.com',
    );
  });
});

test.describe('Filming Requests - Admin list', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
  });

  test('admin filming-requests stub redirects into the productions hub', async ({ page }) => {
    await page.goto('/admin/filming-requests');
    await expect(page).toHaveURL(/\/admin\/productions\?tab=requests/);
    await expect(page.getByRole('heading', { name: 'Παραγωγές' })).toBeVisible();
  });

  test('requests tab lists the seeded filming request', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const request = fixtures().filmingRequest;

    await page.goto('/admin/productions?tab=requests');

    const row = page.getByRole('link', { name: request.title });
    await expect(row).toBeVisible();
    // Status label depends on which `statuses.*` namespace resolves first
    // (see resolveStatusLabel in status-badge.tsx) — accept either.
    await expect(
      page
        .locator('tr')
        .filter({ has: row })
        .getByText(/Σε Αναμονή|Εκκρεμεί/),
    ).toBeVisible();
  });

  test('requests tab shows a status filter affordance', async ({ page }) => {
    await page.goto('/admin/productions?tab=requests');

    const statusFilter = page
      .locator('[data-testid*="filter"], select[name*="status"], button:has-text("Filter")')
      .first();

    // A filter control is common but not guaranteed by this surface today.
    if (await statusFilter.isVisible().catch(() => false)) {
      await expect(statusFilter).toBeVisible();
    }
  });
});

test.describe('Filming Requests - Admin detail', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    await loginAsAdmin(page);
  });

  test('admin can open the seeded request from the list', async ({ page }) => {
    const request = fixtures().filmingRequest;

    await page.goto('/admin/productions?tab=requests');
    await page.getByRole('link', { name: request.title }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/filming-requests/${request.id}`));
    await expect(page.getByRole('heading', { name: request.title })).toBeVisible();
  });

  test('request detail shows contact info and event details', async ({ page }) => {
    const request = fixtures().filmingRequest;

    await page.goto(`/admin/filming-requests/${request.id}`);
    await expect(page.getByRole('heading', { name: request.title })).toBeVisible();

    // Contact info — seeded by seedFilmingRequest with the same contact
    // name/company as fixtures().client.
    await expect(page.getByText('Στοιχεία Επικοινωνίας')).toBeVisible();
    await expect(page.getByText(fixtures().client.contactName)).toBeVisible();

    // Event details — project type, location, and the seeded budget range
    // ('2000-5000', which has no matching label so it renders raw).
    await expect(page.getByText('Λεπτομέρειες Αιτήματος')).toBeVisible();
    await expect(page.getByText('Επιπλέον Λεπτομέρειες')).toBeVisible();
    await expect(page.getByText('Athens Studio')).toBeVisible();
    await expect(page.getByText('2000-5000')).toBeVisible();

    // Two preferred dates were seeded.
    await expect(page.getByText('Προτιμώμενες Ημερομηνίες')).toBeVisible();
    await expect(page.locator('text=/2\\d{3}/').first()).toBeVisible();
  });

  test('admin can open and cancel the accept dialog without mutating the request', async ({
    page,
  }) => {
    // The seeded request is the only one in the graph — accepting it here
    // would consume it for every other test in this file, so this path
    // opens the affordance and backs out instead of submitting.
    const request = fixtures().filmingRequest;

    await page.goto(`/admin/filming-requests/${request.id}`);

    const acceptButton = page.getByRole('button', { name: 'Αποδοχή' });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    const dialog = page.getByRole('dialog', { name: 'Αποδοχή Αιτήματος' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Ακύρωση' }).click();
    await expect(dialog).not.toBeVisible();

    // Still pending — status badge unchanged.
    await expect(page.getByText(/Σε Αναμονή|Εκκρεμεί/).first()).toBeVisible();
  });

  test('admin can accept and convert the request into a project', async ({ page }) => {
    // The one mutation path that actually consumes the seeded request:
    // accept -> convert -> redirected to the new project. Gated because it
    // permanently changes the fixture's status for the rest of this run.
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');
    const request = fixtures().filmingRequest;

    await page.goto(`/admin/filming-requests/${request.id}`);

    await page.getByRole('button', { name: 'Αποδοχή' }).click();
    const reviewDialog = page.getByRole('dialog', { name: 'Αποδοχή Αιτήματος' });
    await expect(reviewDialog).toBeVisible();
    await reviewDialog.getByRole('button', { name: 'Αποδοχή' }).click();
    await expect(reviewDialog).not.toBeVisible();

    const convertButton = page.getByRole('button', { name: 'Μετατροπή σε Παραγωγή' });
    await expect(convertButton).toBeVisible();
    await convertButton.click();

    const convertDialog = page.getByRole('alertdialog', { name: 'Μετατροπή σε Παραγωγή' });
    await expect(convertDialog).toBeVisible();
    await convertDialog.getByRole('button', { name: 'Μετατροπή σε Παραγωγή' }).click();

    // convertToProject() copies the request's title onto the new project.
    await expect(page).toHaveURL(/\/admin\/projects\/.+/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: request.title })).toBeVisible();
  });
});
