import { test, expect } from '@playwright/test';
import { setupApiMocks, navigateToApp, mockData } from './helpers';

test.describe('Guidelines Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('displays the Guidelines heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('displays a "New Guideline" button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new guideline/i })).toBeVisible();
  });

  test('displays the list of guidelines from the API', async ({ page }) => {
    await expect(page.getByText('Hypertension Management Guidelines')).toBeVisible();
    await expect(page.getByText('Diabetes Care Standards')).toBeVisible();
  });

  test('displays guideline status badges', async ({ page }) => {
    await expect(page.getByText('DRAFT')).toBeVisible();
    await expect(page.getByText('PUBLISHED')).toBeVisible();
  });

  test('displays guideline short name badges', async ({ page }) => {
    await expect(page.getByText('HTN-2025')).toBeVisible();
    await expect(page.getByText('DCS-2025')).toBeVisible();
  });

  test('shows empty state when no guidelines exist', async ({ page }) => {
    // Override the catch-all mock to return empty guidelines for this test
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const apiPath = url.pathname.replace(/^\/api/, '');
      if (apiPath === '/guidelines' && route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      // Default responses for other endpoints
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 50 } }) });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, app starts at Dashboard - navigate to Guidelines
    await page.getByRole('button', { name: /^guidelines$/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/No guidelines found/i)).toBeVisible();
  });

  test('shows error state when API fails', async ({ page }) => {
    // Override mocks to return server error
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, app starts at Dashboard - navigate to Guidelines
    await page.getByRole('button', { name: /^guidelines$/i }).click();
    // Wait for React Query error state (includes retry delay)
    await expect(page.getByText(/Failed to load guidelines/i)).toBeVisible({ timeout: 15000 });
  });

  test('opens the new guideline form when clicking New Guideline', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).toBeVisible();
    await expect(page.getByPlaceholder(/guideline title/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e.g. GL-2025/i)).toBeVisible();
  });

  test('create guideline form can be cancelled', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).not.toBeVisible();
  });

  test('submit button is disabled when title is empty', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    const submitBtn = page.getByRole('button', { name: /create guideline/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button is enabled when title is filled', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByPlaceholder(/guideline title/i).fill('New Test Guideline');
    const submitBtn = page.getByRole('button', { name: /create guideline/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('creates a new guideline and closes the form on success', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByPlaceholder(/guideline title/i).fill('New Test Guideline');
    await page.getByPlaceholder(/e.g. GL-2025/i).fill('NTG-001');
    await page.getByRole('button', { name: /create guideline/i }).click();

    // After successful creation, form should be hidden
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('form', { name: /new guideline form/i })).not.toBeVisible();
  });

  test('shows loading skeleton while guidelines are being fetched', async ({ page }) => {
    // Override to add delay so we can observe the loading state
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const apiPath = url.pathname.replace(/^\/api/, '');
      if (apiPath === '/guidelines' && route.request().method() === 'GET') {
        // Add artificial delay to observe loading skeleton
        await new Promise((resolve) => setTimeout(resolve, 800));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData.guidelines) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // Navigate to Guidelines (still on Dashboard from beforeEach after reload)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /^guidelines$/i }).click();

    // Animate-pulse skeleton should appear while loading
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  });

  test('guideline card has accessible aria-label', async ({ page }) => {
    const card = page.getByRole('button', { name: /Open guideline: Hypertension/i });
    await expect(card).toBeVisible();
  });
});
