import { test, expect } from '@playwright/test';
import { setupApiMocks, navigateToApp, mockData } from './helpers';

test.describe('Guideline Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await navigateToApp(page);

    // Navigate to Guidelines page and open first guideline
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('displays the guideline title in the workspace header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Hypertension Management Guidelines/i })).toBeVisible();
  });

  test('displays the guideline short name badge', async ({ page }) => {
    await expect(page.getByText('HTN-2025').first()).toBeVisible();
  });

  test('displays the guideline status badge', async ({ page }) => {
    await expect(page.getByText('DRAFT').first()).toBeVisible();
  });

  test('displays the back button to return to guidelines list', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Back to guidelines/i })).toBeVisible();
  });

  test('back button returns to guidelines list', async ({ page }) => {
    await page.getByRole('button', { name: /Back to guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('displays all workspace tabs', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    const expectedTabs = [
      'Recommendations', 'Evidence', 'References', 'Settings',
      'Versions', 'Tasks', 'Polls', 'Milestones', 'COI', 'Activity',
    ];
    for (const tab of expectedTabs) {
      await expect(tabBar.getByRole('tab', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('Recommendations tab is active by default', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    const recTab = tabBar.getByRole('tab', { name: 'Recommendations', exact: true });
    await expect(recTab).toHaveAttribute('aria-selected', 'true');
  });

  test('displays the section tree sidebar', async ({ page }) => {
    // Check that section tree is visible (contains section names)
    await expect(page.getByText('Background')).toBeVisible();
    await expect(page.getByText('Clinical Recommendations')).toBeVisible();
  });

  test('can switch to Evidence tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Evidence', exact: true }).click();
    // PicoBuilderPanel should be rendered
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to References tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'References', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to Settings tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Settings', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to Versions tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Versions', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to Tasks tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Tasks', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to Polls tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Polls', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('can switch to Activity tab', async ({ page }) => {
    const tabBar = page.getByRole('tablist', { name: 'Workspace tabs' });
    await tabBar.getByRole('tab', { name: 'Activity', exact: true }).click();
    // Activity log panel should render with its heading
    await expect(page.getByText('Activity Log')).toBeVisible();
  });

  test('section sidebar shows nested sections', async ({ page }) => {
    await expect(page.getByText('First-line Treatment')).toBeVisible();
  });

  test('selecting a section updates the detail panel', async ({ page }) => {
    // Click the Background section
    await page.getByText('Background').click();
    // Section detail panel should respond
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('workspace shows error state when guideline fails to load', async ({ page }) => {
    // Set up error routes before navigating, so the workspace gets errors on load
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const apiPath = url.pathname.replace(/^\/api/, '');
      // Return the guidelines list so we can click into a guideline
      if (apiPath === '/guidelines' && route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.guidelines) });
      }
      // Fail all other API calls (guideline detail, sections, etc.)
      return route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Navigate to guidelines and open the workspace
    await navigateToApp(page);
    await page.getByRole('button', { name: /^guidelines$/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    // Wait for React Query error state
    await expect(page.getByText(/Failed to load guideline workspace/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Guideline Workspace - Section Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('section tree displays Add Section button', async ({ page }) => {
    // SectionTree should have an add section control
    const addButtons = page.getByRole('button', { name: /add section/i });
    // There may be multiple (one per section + root)
    await expect(addButtons.first()).toBeVisible();
  });
});
