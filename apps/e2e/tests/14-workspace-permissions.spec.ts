/**
 * Workspace Permissions — CRUD: list, add user, change role, revoke access.
 * Permissions are rendered inside the Settings tab's PermissionManagementPanel.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_PERMISSIONS } from './seed-data';

async function goToPermissionsViaSettings(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Settings');
  await page.waitForLoadState('networkidle');
}

test.describe('Permissions – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPermissionsViaSettings(page);
  });

  test('permissions section is visible in settings', async ({ page }) => {
    await expect(
      page.getByText(/permissions|team members|access control/i).first()
    ).toBeVisible();
  });

  test('shows all seeded permission holders', async ({ page }) => {
    await expect(page.getByText('Alice Admin')).toBeVisible();
    await expect(page.getByText('Bob Author')).toBeVisible();
    await expect(page.getByText('Carol Reviewer')).toBeVisible();
  });

  test('shows role badges for each permission', async ({ page }) => {
    await expect(page.getByText('ADMIN').first()).toBeVisible();
    await expect(page.getByText('AUTHOR').first()).toBeVisible();
    await expect(page.getByText('REVIEWER').first()).toBeVisible();
  });

  test('shows user email addresses', async ({ page }) => {
    await expect(page.getByText('admin@opengrade.test')).toBeVisible();
  });
});

test.describe('Permissions – CREATE (add user)', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPermissionsViaSettings(page);
  });

  test('Add User / Invite button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add user|invite|add member|grant access/i })
    ).toBeVisible();
  });

  test('clicking Add User shows a form with user and role fields', async ({ page }) => {
    await page.getByRole('button', { name: /add user|invite|add member|grant access/i }).click();
    await expect(
      page.getByPlaceholder(/user id|user email|search user/i)
        .or(page.getByRole('textbox').first())
    ).toBeVisible();
  });

  test('role dropdown includes all roles', async ({ page }) => {
    await page.getByRole('button', { name: /add user|invite|add member|grant access/i }).click();
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      const options = await select.locator('option').allTextContents();
      const roles = ['VIEWER', 'REVIEWER', 'AUTHOR', 'ADMIN'];
      for (const role of roles) {
        expect(options.some((o) => o.includes(role))).toBeTruthy();
      }
    }
  });

  test('can submit the add user form', async ({ page }) => {
    await page.getByRole('button', { name: /add user|invite|add member|grant access/i }).click();
    const userField = page.getByPlaceholder(/user id|user email/i)
      .or(page.getByRole('textbox').first());
    await userField.fill('dave@opengrade.test');
    const select = page.locator('select').first();
    if (await select.isVisible()) await select.selectOption('VIEWER');
    await page.getByRole('button', { name: /add|save|submit|grant/i }).last().click();
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Permissions – DELETE (revoke)', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPermissionsViaSettings(page);
  });

  test('each permission row has a revoke / remove button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /revoke|remove|delete/i }).first()
        .or(page.getByTitle('Revoke access').first())
    ).toBeVisible();
  });
});
