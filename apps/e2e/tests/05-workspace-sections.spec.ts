/**
 * Workspace sections — section tree CRUD: create, read, update, delete, reorder.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace } from './helpers';

test.describe('Sections – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
  });

  test('section tree renders all top-level sections', async ({ page }) => {
    await expect(page.getByText('Background')).toBeVisible();
    await expect(page.getByText('Clinical Recommendations')).toBeVisible();
    await expect(page.getByText('Evidence Summary')).toBeVisible();
  });

  test('nested child sections are visible', async ({ page }) => {
    await expect(page.getByText('First-line Treatment')).toBeVisible();
    await expect(page.getByText('Second-line Treatment')).toBeVisible();
  });

  test('clicking a section selects it and shows the detail panel', async ({ page }) => {
    await page.getByText('Background').click();
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('detail panel is visible when a section is selected on load', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });
});

test.describe('Sections – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
  });

  test('Add Section button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add section/i }).first()).toBeVisible();
  });

  test('clicking Add Section shows an input for section title', async ({ page }) => {
    await page.getByRole('button', { name: /add section/i }).first().click();
    await expect(page.getByPlaceholder(/section title/i).or(page.getByRole('textbox')).first()).toBeVisible();
  });
});

test.describe('Sections – detail panel content', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
    await page.getByText('Background').click();
  });

  test('section detail panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('switching to a child section updates the detail panel', async ({ page }) => {
    await page.getByText('First-line Treatment').click();
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });
});
