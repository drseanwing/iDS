/**
 * Workspace Versions — version list, publish dialog, export JSON, compare dialog.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_VERSIONS } from './seed-data';

async function goToVersionsTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Versions');
}

test.describe('Versions – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToVersionsTab(page);
  });

  test('Version History heading is visible', async ({ page }) => {
    await expect(page.getByText('Version History')).toBeVisible();
  });

  test('shows seeded versions', async ({ page }) => {
    for (const ver of SEED_VERSIONS) {
      await expect(page.getByText(ver.versionNumber)).toBeVisible();
    }
  });

  test('shows version labels', async ({ page }) => {
    await expect(page.getByText('Initial published version')).toBeVisible();
    await expect(page.getByText(/minor update/i)).toBeVisible();
  });

  test('shows version type badges (MAJOR / MINOR)', async ({ page }) => {
    await expect(page.getByText('MAJOR').or(page.getByText('MINOR')).first()).toBeVisible();
  });

  test('shows created-by user names', async ({ page }) => {
    await expect(page.getByText('Alice Admin').first()).toBeVisible();
  });

  test('read-only banner is shown when versions exist', async ({ page }) => {
    await expect(
      page.getByText(/read-only snapshots|published versions are read-only/i)
    ).toBeVisible();
  });

  test('Publish New Version button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /publish new version/i })).toBeVisible();
  });

  test('Compare button is shown when two or more versions exist', async ({ page }) => {
    await expect(page.getByRole('button', { name: /compare/i })).toBeVisible();
  });
});

test.describe('Versions – no versions state', () => {
  test('shows no versions state when list is empty', async ({ page }) => {
    await setupStatefulMocks(page, { versions: [] });
    await goToVersionsTab(page);
    // When no versions exist, the read-only banner should not appear
    await expect(
      page.getByText(/read-only snapshots/i)
    ).not.toBeVisible();
    // Publish button should still be present
    await expect(page.getByRole('button', { name: /publish new version/i })).toBeVisible();
  });
});

test.describe('Versions – publish dialog', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToVersionsTab(page);
  });

  test('clicking Publish New Version opens the publish dialog', async ({ page }) => {
    await page.getByRole('button', { name: /publish new version/i }).click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/publish version/i)).first()
    ).toBeVisible();
  });

  test('publish dialog has version type selector', async ({ page }) => {
    await page.getByRole('button', { name: /publish new version/i }).click();
    await expect(
      page.getByText(/major|minor/i).first()
        .or(page.locator('select, [role="radio"]').first())
    ).toBeVisible();
  });

  test('publish dialog has a label/notes input', async ({ page }) => {
    await page.getByRole('button', { name: /publish new version/i }).click();
    await expect(
      page.getByPlaceholder(/label|release note|version note/i)
        .or(page.getByRole('textbox').first())
    ).toBeVisible();
  });

  test('can dismiss the publish dialog', async ({ page }) => {
    await page.getByRole('button', { name: /publish new version/i }).click();
    const cancelBtn = page.getByRole('button', { name: /cancel|close/i }).first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    // Dialog should be gone
    await expect(
      page.getByRole('dialog', { name: /publish/i })
    ).not.toBeVisible();
  });
});

test.describe('Versions – export JSON', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToVersionsTab(page);
  });

  test('Export JSON button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /export json|export/i })
        .or(page.locator('button').filter({ hasText: /export/i }).first())
    ).toBeVisible();
  });
});

test.describe('Versions – compare dialog', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToVersionsTab(page);
  });

  test('clicking Compare opens the version compare dialog', async ({ page }) => {
    await page.getByRole('button', { name: /compare/i }).click();
    await expect(
      page.getByRole('dialog').or(page.getByText(/compare versions/i)).first()
    ).toBeVisible();
  });
});
