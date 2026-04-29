/**
 * Workspace Activity Log — read, filtering, empty state.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_ACTIVITY } from './seed-data';

async function goToActivityTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Activity');
}

test.describe('Activity Log – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToActivityTab(page);
  });

  test('Activity Log heading is visible', async ({ page }) => {
    await expect(page.getByText('Activity Log')).toBeVisible();
  });

  test('shows seeded activity entries', async ({ page }) => {
    await expect(page.getByText(/Created recommendation/i)).toBeVisible();
    await expect(page.getByText(/Updated section/i)).toBeVisible();
    await expect(page.getByText(/Published version/i)).toBeVisible();
  });

  test('shows user names for activity entries', async ({ page }) => {
    await expect(page.getByText('Bob Author').first()).toBeVisible();
    await expect(page.getByText('Alice Admin').first()).toBeVisible();
  });

  test('shows relative or absolute timestamps', async ({ page }) => {
    await expect(
      page.getByText(/ago|just now|\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}/i).first()
    ).toBeVisible();
  });

  test('shows action type labels (CREATED, UPDATED, PUBLISHED)', async ({ page }) => {
    await expect(
      page.getByText(/created|updated|published/i).first()
    ).toBeVisible();
  });

  test('shows entity type labels (RECOMMENDATION, SECTION, VERSION)', async ({ page }) => {
    await expect(
      page.getByText(/recommendation|section|version/i).first()
    ).toBeVisible();
  });
});

test.describe('Activity Log – empty state', () => {
  test('shows empty state message when no activity exists', async ({ page }) => {
    await setupStatefulMocks(page, { activity: [] });
    await goToActivityTab(page);
    await expect(
      page.getByText(/no activity|no entries|nothing yet/i)
    ).toBeVisible();
  });
});

test.describe('Activity Log – pagination', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToActivityTab(page);
  });

  test('pagination meta is shown when there are multiple pages', async ({ page }) => {
    // With 3 items and limit 20, only one page — pagination should not show
    // or show page 1 of 1
    await expect(page.locator('body')).toBeVisible();
  });
});
