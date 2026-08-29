import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';
import { fixtures, hasFixtures } from './fixtures/graph';

/**
 * Contracts E2E Tests
 * Tests contract management for admin and contract signing for clients,
 * against the seeded fixture graph (see e2e/SETUP.md). Records are addressed
 * by their fixture identity — never "the first row".
 */

/** Draws a short stroke across the signature canvas via real mouse events. */
async function drawSignature(page: Page): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Signature canvas has no bounding box');

  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 5 });
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
}

test.describe('Contracts - Admin', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
  });

  test('admin can view contract templates page', async ({ page }) => {
    await page.goto('/admin/contracts/templates');

    // The old templates route is now a stub that redirects into the settings hub
    await expect(page).toHaveURL(/\/admin\/settings\?tab=templates/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /contract|templates|συμβόλαι|πρότυπ/i })
        .first(),
    ).toBeVisible();
  });

  test('contract templates list renders the add-template control', async ({ page }) => {
    // Narrowed: the fixture graph seeds no contract templates (they aren't part
    // of the graph), so this asserts the list surface itself renders — the
    // "new template" control is always present, regardless of how many
    // templates exist.
    await page.goto('/admin/settings?tab=templates');

    await expect(page.getByRole('button', { name: /Νέο Πρότυπο|New Template/i })).toBeVisible();
  });

  test('admin can open the contract template creation form', async ({ page }) => {
    await page.goto('/admin/settings?tab=templates');

    await page.getByRole('button', { name: /Νέο Πρότυπο|New Template/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/Όνομα Προτύπου|Template Name/i)).toBeVisible();
  });

  test.describe('with a seeded contract', () => {
    test.beforeEach(() => {
      test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    });

    test('admin can view a contract detail page', async ({ page }) => {
      const draft = fixtures().contracts.draft;

      await page.goto(`/admin/contracts/${draft.id}`);

      await expect(page.getByRole('heading', { name: draft.title, exact: true })).toBeVisible();
    });

    test('contract view page renders amount and metadata cards', async ({ page }) => {
      const draft = fixtures().contracts.draft;

      await page.goto(`/admin/contracts/${draft.id}`);

      await expect(page.getByText(/Ποσό|Amount/i)).toBeVisible();
      // agreed_amount is seeded as 2500 — assert the formatted total renders,
      // tolerant of thousands-separator differences (2,500 vs 2.500).
      await expect(page.getByText(/€\s?2[.,]500/)).toBeVisible();
    });

    test('admin can view contract status', async ({ page }) => {
      const sent = fixtures().contracts.sent;

      await page.goto(`/admin/contracts/${sent.id}`);

      await expect(page.getByText(/Εστάλη|^Sent$/i).first()).toBeVisible();
    });

    test('admin can download contract as PDF', async ({ page }) => {
      const draft = fixtures().contracts.draft;

      await page.goto(`/admin/contracts/${draft.id}`);

      await expect(page.getByRole('button', { name: /Λήψη PDF|Download PDF/i })).toBeVisible();
    });

    test('contract detail shows client information', async ({ page }) => {
      const draft = fixtures().contracts.draft;
      const client = fixtures().client;

      await page.goto(`/admin/contracts/${draft.id}`);

      await expect(page.getByText(/Πελάτης|Client/i).first()).toBeVisible();
      await expect(page.getByText(client.contactName)).toBeVisible();
    });

    test('contract detail shows signature status for a signed contract', async ({ page }) => {
      const signed = fixtures().contracts.signed;

      await page.goto(`/admin/contracts/${signed.id}`);

      await expect(page.getByText(/Υπογεγραμμένο|^Signed$/i).first()).toBeVisible();
    });
  });

  test.describe('write flows', () => {
    test.beforeEach(() => {
      test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
      // Sending the draft contract permanently moves it to 'sent' for the rest
      // of this run — keep mutations confined to the draft fixture, never the
      // sent/signed ones other tests rely on.
      test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');
    });

    test('admin can send the draft contract for signature', async ({ page }) => {
      const draft = fixtures().contracts.draft;

      await page.goto(`/admin/contracts/${draft.id}`);

      const sendButton = page.getByRole('button', { name: /Αποστολή σε Πελάτη|Send to Client/i });
      await expect(sendButton).toBeVisible();
      await sendButton.click();

      await expect(page.getByText(/Το συμβόλαιο στάλθηκε στον πελάτη|sent to client/i)).toBeVisible(
        { timeout: 10000 },
      );
      await expect(sendButton).toBeHidden();
    });
  });
});

test.describe('Contracts - Client', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    await loginAsClient(page);
  });

  test('client can view a contract detail page', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto(`/client/contracts/${sent.id}`);

    await expect(page.getByRole('heading', { name: sent.title, exact: true })).toBeVisible();
  });

  test('client contract page displays contract metadata', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto(`/client/contracts/${sent.id}`);

    await expect(page.getByText(/Κατάσταση|Status/i).first()).toBeVisible();
    await expect(page.getByText(/Ποσό|Amount/i)).toBeVisible();
  });

  test('client can navigate to the sign contract page', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto(`/client/contracts/${sent.id}`);

    const signButton = page.getByRole('button', { name: /Ψηφιακή Υπογραφή|Sign Digitally/i });
    await expect(signButton).toBeVisible();
    await signButton.click();

    await expect(page).toHaveURL(new RegExp(`/client/contracts/${sent.id}/sign`));
  });

  test('contract signing page renders the signature pad', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto(`/client/contracts/${sent.id}/sign`);

    await expect(page.locator('canvas')).toBeVisible();

    const submitButton = page.getByRole('button', { name: /Υπογραφή Συμβολαίου|Sign Contract/i });
    await expect(submitButton).toBeVisible();
    // Nothing has been drawn yet — the pad starts disabled.
    await expect(submitButton).toBeDisabled();
  });

  test('contract signing page has a clear button', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto(`/client/contracts/${sent.id}/sign`);

    await expect(page.getByRole('button', { name: /Καθαρισμός|^Clear$/i })).toBeVisible();
  });

  test('client can download a signed contract', async ({ page }) => {
    const signed = fixtures().contracts.signed;

    await page.goto(`/client/contracts/${signed.id}`);

    await expect(page.getByRole('button', { name: /Λήψη PDF|Download PDF/i })).toBeVisible();
  });

  test('signed contract shows signed status', async ({ page }) => {
    // Narrowed: neither the admin nor the client contract view renders an
    // explicit "signed by / signed on" line — only the status badge reflects
    // it — so this asserts the badge instead of a signature/date string.
    const signed = fixtures().contracts.signed;

    await page.goto(`/client/contracts/${signed.id}`);

    await expect(page.getByText(/Υπογεγραμμένο|^Signed$/i).first()).toBeVisible();
  });

  test('client cannot sign an already signed contract', async ({ page }) => {
    const signed = fixtures().contracts.signed;

    await page.goto(`/client/contracts/${signed.id}`);

    await expect(
      page.getByRole('button', { name: /Ψηφιακή Υπογραφή|Sign Digitally/i }),
    ).not.toBeVisible();
  });

  test('client home shows the sent contract as a pending action', async ({ page }) => {
    const sent = fixtures().contracts.sent;

    await page.goto('/client/home');

    await expect(page.getByText(sent.title)).toBeVisible();
  });
});

test.describe('Contracts - signing flow', () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    // Signing moves the draft-turned-sent contract to 'signed' — confined to
    // the draft fixture so the pre-seeded sent/signed fixtures stay intact
    // for the read-only tests above.
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');
  });

  test('admin sends the draft, then the client signs it', async ({ page }) => {
    const draft = fixtures().contracts.draft;

    await loginAsAdmin(page);
    await page.goto(`/admin/contracts/${draft.id}`);
    const sendButton = page.getByRole('button', { name: /Αποστολή σε Πελάτη|Send to Client/i });
    // Already sent by another run of this test, or by the admin write-flow
    // test above — nothing left to send.
    test.skip(!(await sendButton.isVisible().catch(() => false)), 'Draft already sent');
    await sendButton.click();
    await expect(sendButton).toBeHidden();

    await loginAsClient(page);
    await page.goto(`/client/contracts/${draft.id}/sign`);
    await drawSignature(page);

    const submitButton = page.getByRole('button', { name: /Υπογραφή Συμβολαίου|Sign Contract/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByText(/υπογράφηκε επιτυχώς|signed successfully/i)).toBeVisible({
      timeout: 10000,
    });
    await page.waitForURL(new RegExp(`/client/contracts/${draft.id}$`), { timeout: 10000 });
  });
});
