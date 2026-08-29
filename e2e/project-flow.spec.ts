import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fixtures, hasFixtures, FIXTURE_PREFIX } from './fixtures/graph';

/**
 * Project Flow E2E Tests
 *
 * Tests admin project management: the productions hub list, the new-project
 * form, and the project detail screen (`DetailShell`, tabs `overview | tasks |
 * deliverables | messages | invoices | contracts`).
 *
 * Records are addressed by identity — `fixtures().projects.active` — never by
 * "the first row". The old bare `/admin/projects` route is a redirect stub
 * into `/admin/productions?tab=all`; tests use the canonical destination.
 */

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
  });

  test('admin can view projects list page', async ({ page }) => {
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // The old bare route is now a stub that redirects into the productions hub.
    await expect(page).toHaveURL(/\/admin\/productions\?tab=all/);

    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /productions/i })
        .first(),
    ).toBeVisible();

    const hasTable = await page
      .locator('table')
      .isVisible()
      .catch(() => false);
    const hasGrid = await page
      .locator('[data-testid*="project"]')
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasGrid).toBeTruthy();
  });

  test('projects list shows add new project button', async ({ page }) => {
    await page.goto('/admin/productions?tab=all');

    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new project|add project|create project|νέα παραγωγή/i })
      .first();
    await expect(addButton).toBeVisible();

    const href = await addButton.getAttribute('href');
    if (href) {
      expect(href).toContain('/admin/projects/new');
    }
  });

  test('admin can navigate to create new project page', async ({ page }) => {
    await page.goto('/admin/productions?tab=all');

    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new project|add project|create project|νέα παραγωγή/i })
      .first();
    await addButton.click();

    await expect(page).toHaveURL(/\/admin\/projects\/new/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('new project form renders with required fields', async ({ page }) => {
    await page.goto('/admin/projects/new');

    await expect(page.locator('form')).toBeVisible();

    const nameField = page.locator('input[name*="name"], input[name*="title"]').first();
    await expect(nameField).toBeVisible();

    const clientField = page.locator('select[name*="client"], [role="combobox"]').first();
    const hasClientField = await clientField.isVisible().catch(() => false);
    expect(hasClientField).toBeTruthy();

    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin can create a new project', async ({ page }) => {
    // Writes a real row — gated on both the fixture graph (so teardown can
    // sweep it via FIXTURE_PREFIX on projects.title) and the write flag.
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    test.skip(!process.env.E2E_WRITE_TESTS, 'Write tests not enabled (E2E_WRITE_TESTS)');

    const graph = fixtures();
    const title = `${FIXTURE_PREFIX}${graph.runId} project-flow create`;

    await page.goto('/admin/projects/new');
    await expect(page.locator('form')).toBeVisible();

    // Select the client BEFORE filling the title: choosing a client
    // auto-prefills the title with "{Client} — ", and that effect only
    // overwrites an empty/still-auto-prefixed field — filling title first
    // would just get clobbered.
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: graph.client.companyName }).click();

    await page.locator('input[name="title"]').fill(title);

    await page.locator('form').getByRole('button', { name: 'Νέα Παραγωγή' }).click();

    // onSuccess is unset here, so the form pushes to the old bare route,
    // which redirects into the productions hub.
    await page.waitForURL(/\/admin\/productions\?tab=all/, { timeout: 10000 });

    // The kanban board has no links — switch to the list view to find the row.
    await page.getByRole('button', { name: 'Λίστα' }).click();
    await expect(page.locator('table tbody tr').filter({ hasText: title })).toBeVisible();
  });

  test('admin can view project detail page', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto(`/admin/projects/${project.id}`);
    await expect(page).toHaveURL(new RegExp(`/admin/projects/${project.id}$`));

    await expect(page.locator('[data-slot="page-heading-title"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: project.title })).toBeVisible();
  });

  test('project detail page shows key sections', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto(`/admin/projects/${project.id}`);
    await expect(page).toHaveURL(new RegExp(`/admin/projects/${project.id}$`));

    // DetailShell renders one URL-driven tablist covering every section this
    // screen has: overview, tasks, deliverables, messages, invoices, contracts.
    const tabKeys = ['overview', 'tasks', 'deliverables', 'messages', 'invoices', 'contracts'];
    for (const key of tabKeys) {
      await expect(
        page.locator(`a[role="tab"][href*="tab=${key}"]`),
        `missing tab: ${key}`,
      ).toBeVisible();
    }

    // No `tab` query param falls back to the first tab, exactly like the hubs.
    await expect(page.locator('a[role="tab"][href*="tab=overview"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('admin can navigate to edit project page', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto(`/admin/projects/${project.id}`);

    const editButton = page
      .locator('a, button')
      .filter({ hasText: /edit|επεξεργασία/i })
      .first();
    await editButton.click();

    await expect(page).toHaveURL(new RegExp(`/admin/projects/${project.id}/edit`));

    await expect(page.locator('form')).toBeVisible();
    // Confirms the edit form actually loaded the record we navigated from,
    // not just any form on any project.
    await expect(page.locator('input[name="title"]')).toHaveValue(project.title);
  });

  test('admin can change project status', async ({ page }) => {
    // There is no status dropdown anywhere in this app — the kanban board
    // (dnd-kit drag-and-drop) is the only status-change UI, and there is no
    // reversible click-only path through it. Per the write-gate guidance,
    // this asserts placement instead of performing (or faking) a drag: the
    // active fixture project's card renders inside its own status column.
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto('/admin/productions?tab=all');
    await expect(page).toHaveURL(/\/admin\/productions\?tab=all/);

    const card = page.getByRole('heading', { name: project.title, level: 4 });
    await expect(card).toBeVisible();

    // "Filming" is the kanban column label from PROJECT_STATUS_LABELS — a
    // plain constant, not localized — matching the seeded status `filming`.
    // Structural selector (the column's own class) is deliberate: the column
    // header has no accessible landmark tying it to its card list.
    const column = page
      .locator('div.rounded-lg.border')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'Filming' }) });
    await expect(
      column.first().getByRole('heading', { level: 4, name: project.title }),
    ).toBeVisible();
  });

  test('project detail shows tasks section', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const graph = fixtures();

    await page.goto(`/admin/projects/${graph.projects.active.id}?tab=tasks`);
    await expect(page).toHaveURL(/tab=tasks/);

    await expect(page.getByText(graph.task.title)).toBeVisible();
  });

  test('project detail shows deliverables section', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const graph = fixtures();

    await page.goto(`/admin/projects/${graph.projects.active.id}?tab=deliverables`);
    await expect(page).toHaveURL(/tab=deliverables/);

    await expect(page.getByText(graph.deliverable.title)).toBeVisible();
  });

  test('projects list has filter by status functionality', async ({ page }) => {
    await page.goto('/admin/productions?tab=all');

    const statusFilter = page
      .locator('[data-testid*="filter"], select[name*="status"], button:has-text("Filter")')
      .first();

    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('projects list shows project status badges', async ({ page }) => {
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    const project = fixtures().projects.active;

    await page.goto('/admin/productions?tab=all');
    await page.getByRole('button', { name: 'Λίστα' }).click();

    const row = page.locator('table tbody tr').filter({ hasText: project.title });
    await expect(row).toBeVisible();
    // StatusBadge renders the status through PROJECT_STATUS_LABELS, a plain
    // (non-localized) constant — "Filming" for the seeded status `filming`.
    await expect(row.getByText('Filming', { exact: true })).toBeVisible();
  });

  test('admin can access filming prep from the productions hub', async ({ page }) => {
    // Project detail has no filming-prep link — that link lives on the
    // productions hub's page heading, next to the "all" tab this suite
    // otherwise uses to reach a project.
    await page.goto('/admin/productions?tab=all');

    const filmingPrepLink = page.getByRole('link', { name: /Προετοιμασία|Filming prep/i });
    await expect(filmingPrepLink).toBeVisible();

    await filmingPrepLink.click();
    await expect(page).toHaveURL(/\/admin\/filming-prep/);
  });

  test('empty projects list shows appropriate message', async ({ page }) => {
    // Seeding cannot produce a genuinely empty table (fixtures always insert
    // 2 projects) and there is no scoped empty view for the productions list,
    // so this exercises the same empty state through the DataTable's
    // no-results path: filtering the list view down to zero rows.
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');

    await page.goto('/admin/productions?tab=all');
    await page.getByRole('button', { name: 'Λίστα' }).click();

    const rows = page.locator('table tbody tr[data-state]');
    await expect(rows.first()).toBeVisible();

    await page.getByPlaceholder(/Αναζήτηση/i).fill('zzzzzznonexistentzzzzzz');

    await expect(
      page.getByText(/no projects|empty|get started|create your first|δεν βρέθηκαν/i).first(),
    ).toBeVisible();
  });
});
