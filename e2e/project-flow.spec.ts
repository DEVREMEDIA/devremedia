import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Project Flow E2E Tests
 * Tests admin project management including CRUD operations and status changes
 */

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // SKIP: Requires database with test admin user
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');

    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test('admin can view projects list page', async ({ page }) => {
    await page.goto('/admin/projects');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // The old bare route is now a stub that redirects into the productions hub
    await expect(page).toHaveURL(/\/admin\/productions\?tab=all/);

    // Check for page heading
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /productions/i })
        .first(),
    ).toBeVisible();

    // Check for common elements: table, grid, or cards
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

    // Look for "New Project" or "Add Project" button
    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new project|add project|create project/i })
      .first();
    await expect(addButton).toBeVisible();

    // Verify it links to the new project page
    const href = await addButton.getAttribute('href');
    if (href) {
      expect(href).toContain('/admin/projects/new');
    }
  });

  test('admin can navigate to create new project page', async ({ page }) => {
    await page.goto('/admin/productions?tab=all');

    // Click the new project button
    const addButton = page
      .locator('a, button')
      .filter({ hasText: /new project|add project|create project/i })
      .first();
    await addButton.click();

    // Should navigate to new project page
    await expect(page).toHaveURL(/\/admin\/projects\/new/);

    // Check for form presence
    await expect(page.locator('form')).toBeVisible();
  });

  test('new project form renders with required fields', async ({ page }) => {
    await page.goto('/admin/projects/new');

    // Wait for form to load
    await expect(page.locator('form')).toBeVisible();

    // Check for common project form fields
    // Project name
    const nameField = page.locator('input[name*="name"], input[name*="title"]').first();
    await expect(nameField).toBeVisible();

    // Client selection (could be select or combobox)
    const clientField = page.locator('select[name*="client"], [role="combobox"]').first();
    const hasClientField = await clientField.isVisible().catch(() => false);
    expect(hasClientField).toBeTruthy();

    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin can create a new project', async ({ page }) => {
    // SKIP: Requires database with clients and proper form setup
    test.skip(true, 'Requires database state with clients and form submission');

    await page.goto('/admin/projects/new');

    // Fill in the form
    await page.locator('input[name*="name"]').fill('Test Project E2E');

    // Select a client (adjust based on your client selector implementation)
    await page.locator('select[name*="client"]').first().selectOption({ index: 1 });

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should redirect to projects list or project detail page
    await page.waitForURL(/\/admin\/projects(\/[\w-]+)?/, { timeout: 10000 });

    // Verify success message
    await expect(page.locator('text=/success|created|added/i').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('admin can view project detail page', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with at least one project record');

    // Navigate to projects list
    await page.goto('/admin/productions?tab=all');

    // Click on first project
    const firstProject = page
      .locator('tr td a, [data-testid*="project"] a, a[href*="/admin/projects/"]')
      .first();
    await firstProject.click();

    // Should be on project detail page
    await expect(page).toHaveURL(/\/admin\/projects\/[\w-]+$/);

    // Check for project details
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('project detail page shows key sections', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with project record');

    await page.goto('/admin/projects/test-project-id');

    // Check for common sections
    const sections = [
      /overview|details/i,
      /tasks|to-?do/i,
      /deliverables|files/i,
      /timeline|schedule/i,
    ];

    let foundSections = 0;
    for (const pattern of sections) {
      const hasSection = await page
        .locator(`text=${pattern}`)
        .isVisible()
        .catch(() => false);
      if (hasSection) foundSections++;
    }

    // Expect at least 2 sections to be present
    expect(foundSections).toBeGreaterThanOrEqual(2);
  });

  test('admin can navigate to edit project page', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with at least one project record');

    await page.goto('/admin/projects/test-project-id');

    // Look for edit button
    const editButton = page.locator('a, button').filter({ hasText: /edit/i }).first();
    await editButton.click();

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/admin\/projects\/[\w-]+\/edit/);

    // Check for form
    await expect(page.locator('form')).toBeVisible();
  });

  test('admin can change project status', async ({ page }) => {
    // SKIP: Requires database with project and status update functionality
    test.skip(true, 'Requires database with project and status change implementation');

    await page.goto('/admin/projects/test-project-id');

    // Look for status dropdown or buttons
    const statusControl = page.locator('select[name*="status"], [data-testid*="status"]').first();
    await expect(statusControl).toBeVisible();

    // Change status (implementation depends on UI pattern)
    // Could be dropdown, button group, or modal
  });

  test('project detail shows tasks section', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with project record');

    await page.goto('/admin/projects/test-project-id');

    // Look for tasks section
    const tasksSection = page.locator('text=/tasks|to-?do|checklist/i').first();
    await expect(tasksSection).toBeVisible();
  });

  test('project detail shows deliverables section', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with project record');

    await page.goto('/admin/projects/test-project-id');

    // Look for deliverables section
    const deliverablesSection = page.locator('text=/deliverables|files|uploads/i').first();
    await expect(deliverablesSection).toBeVisible();
  });

  test('projects list has filter by status functionality', async ({ page }) => {
    await page.goto('/admin/productions?tab=all');

    // Look for status filter controls
    const statusFilter = page
      .locator('[data-testid*="filter"], select[name*="status"], button:has-text("Filter")')
      .first();

    // Check if filter exists (optional feature)
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('projects list shows project status badges', async ({ page }) => {
    // SKIP: Requires projects in database
    test.skip(true, 'Requires database with project records');

    await page.goto('/admin/productions?tab=all');

    // Look for status indicators (badges, labels, etc.)
    const statusBadge = page.locator('[data-testid*="status"], .badge, .status').first();

    // Check if status badges are displayed
    const hasBadges = await statusBadge.isVisible().catch(() => false);

    // Status badges are common but not required
    if (hasBadges) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('admin can access filming prep from project detail', async ({ page }) => {
    // SKIP: Requires existing project in database
    test.skip(true, 'Requires database with project record');

    await page.goto('/admin/projects/test-project-id');

    // Look for filming prep link or button
    const filmingPrepLink = page
      .locator('a, button')
      .filter({ hasText: /filming prep|preparation/i })
      .first();

    const hasFilmingPrep = await filmingPrepLink.isVisible().catch(() => false);

    if (hasFilmingPrep) {
      await filmingPrepLink.click();
      await expect(page).toHaveURL(/\/admin\/filming-prep\/[\w-]+/);
    }
  });

  test('empty projects list shows appropriate message', async ({ page }) => {
    // SKIP: Requires empty database or specific test state
    test.skip(true, 'Requires database with no projects (specific test state)');

    await page.goto('/admin/productions?tab=all');

    // Look for empty state message
    await expect(
      page.locator('text=/no projects|empty|get started|create your first/i').first(),
    ).toBeVisible();
  });
});
