/**
 * Workspace COI (Conflict of Interest) — CRUD: create, read, update, delete.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_COI_RECORDS } from './seed-data';

async function goToCoiTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'COI');
}

test.describe('COI – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToCoiTab(page);
  });

  test('COI panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('shows COI record for Bob Author with FINANCIAL conflict', async ({ page }) => {
    await expect(page.getByText('Bob Author')).toBeVisible();
    await expect(page.getByText('FINANCIAL').first()).toBeVisible();
  });

  test('shows COI record for Carol Reviewer with NONE conflict', async ({ page }) => {
    await expect(page.getByText('Carol Reviewer')).toBeVisible();
    await expect(page.getByText('NONE').first()).toBeVisible();
  });

  test('shows disclosure text', async ({ page }) => {
    await expect(page.getByText(/speaker fees/i)).toBeVisible();
  });

  test('shows Excluded from Voting badge for excluded user', async ({ page }) => {
    await expect(
      page.getByText(/excluded from voting/i).first()
    ).toBeVisible();
  });
});

test.describe('COI – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToCoiTab(page);
  });

  test('Add COI / New COI button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i })
    ).toBeVisible();
  });

  test('clicking Add COI shows the create form', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await expect(page.getByPlaceholder(/user id/i)).toBeVisible();
  });

  test('form has Conflict Type select', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('conflict type options include all required values', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    const select = page.locator('select').first();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('NONE');
    expect(options).toContain('FINANCIAL');
    expect(options).toContain('INTELLECTUAL');
    expect(options).toContain('PERSONAL');
    expect(options).toContain('OTHER');
  });

  test('form has Excluded from Voting checkbox', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await expect(page.getByLabel(/excluded from voting/i)).toBeVisible();
  });

  test('form has Disclosure Text textarea', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await expect(page.getByPlaceholder(/describe the conflict/i)).toBeVisible();
  });

  test('can fill and submit the COI form', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await page.getByPlaceholder(/user id/i).fill('user-new');
    await page.locator('select').first().selectOption('INTELLECTUAL');
    await page.getByPlaceholder(/describe the conflict/i).fill('Advisory board member for research institute.');
    await page.getByRole('button', { name: /save|create|submit/i }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Advisory board member for research institute.')).toBeVisible();
  });

  test('can cancel COI creation', async ({ page }) => {
    await page.getByRole('button', { name: /add coi|new coi|declare coi|add declaration/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/user id/i)).not.toBeVisible();
  });
});

test.describe('COI – UPDATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToCoiTab(page);
  });

  test('each COI record has an edit button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /edit/i }).first()
        .or(page.locator('button[title="Edit COI"], button[aria-label*="edit"]').first())
    ).toBeVisible();
  });

  test('clicking edit opens an update form pre-populated with existing data', async ({ page }) => {
    await page.getByRole('button', { name: /edit/i }).first().click();
    // Form should appear with some pre-populated content
    const textarea = page.getByPlaceholder(/describe the conflict/i);
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});

test.describe('COI – DELETE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToCoiTab(page);
  });

  test('each COI record has a delete button', async ({ page }) => {
    await expect(
      page.getByTitle('Delete COI record')
        .or(page.getByRole('button', { name: /delete/i }).first())
    ).toBeVisible();
  });
});
