/**
 * Workspace core — header, all tabs present and switchable, section tree sidebar.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';

const ALL_WORKSPACE_TABS = [
  'Recommendations', 'Evidence', 'References', 'Settings',
  'Versions', 'Tasks', 'Polls', 'Milestones', 'COI', 'Activity',
];

test.describe('Workspace – header', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
  });

  test('shows guideline title in workspace header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Hypertension Management Guidelines/i })).toBeVisible();
  });

  test('shows short name badge', async ({ page }) => {
    await expect(page.getByText('HTN-2025').first()).toBeVisible();
  });

  test('shows status badge', async ({ page }) => {
    await expect(page.getByText('DRAFT').first()).toBeVisible();
  });

  test('shows Back to Guidelines button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Back to guidelines/i })).toBeVisible();
  });

  test('Back to Guidelines returns to the list', async ({ page }) => {
    await page.getByRole('button', { name: /Back to guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });
});

test.describe('Workspace – tab bar', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
  });

  test('all expected tabs are visible', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    for (const tab of ALL_WORKSPACE_TABS) {
      await expect(tabBar.getByRole('tab', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('Recommendations tab is active by default', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await expect(tabBar.getByRole('tab', { name: 'Recommendations', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  for (const tabName of ALL_WORKSPACE_TABS) {
    test(`can switch to ${tabName} tab`, async ({ page }) => {
      await switchWorkspaceTab(page, tabName);
      const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
      await expect(tabBar.getByRole('tab', { name: tabName, exact: true })).toHaveAttribute('aria-selected', 'true');
    });
  }
});

test.describe('Workspace – section tree sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
  });

  test('displays top-level sections in the sidebar', async ({ page }) => {
    await expect(page.getByText('Background')).toBeVisible();
    await expect(page.getByText('Clinical Recommendations')).toBeVisible();
    await expect(page.getByText('Evidence Summary')).toBeVisible();
  });

  test('displays nested child sections', async ({ page }) => {
    await expect(page.getByText('First-line Treatment')).toBeVisible();
    await expect(page.getByText('Second-line Treatment')).toBeVisible();
  });

  test('clicking a section shows the section detail panel', async ({ page }) => {
    await page.getByText('Background').click();
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('Add Section button is visible in the section tree', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add section/i }).first()).toBeVisible();
  });
});

test.describe('Workspace – error mode', () => {
  test('shows error state when guideline fails to load', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const apiPath = url.pathname.replace(/^\/api/, '');
      if (apiPath === '/guidelines' && route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'gl-htn', title: 'Hypertension Management Guidelines', shortName: 'HTN-2025', status: 'DRAFT', description: null, updatedAt: new Date().toISOString() }]) });
      }
      return route.fulfill({ status: 500, body: 'error' });
    });
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await expect(page.getByText(/Failed to load guideline workspace/i)).toBeVisible({ timeout: 15000 });
  });
});
