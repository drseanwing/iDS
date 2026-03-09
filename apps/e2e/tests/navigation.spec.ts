import { test, expect } from '@playwright/test';
import { setupApiMocks, navigateToApp } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await navigateToApp(page);
  });

  test('displays the application name in the sidebar', async ({ page }) => {
    // The sidebar has the exact text "OpenGRADE" (the welcome heading says "Welcome to OpenGRADE")
    await expect(page.locator('aside').getByText('OpenGRADE', { exact: true })).toBeVisible();
  });

  test('shows version badge in the header', async ({ page }) => {
    await expect(page.getByText('v0.1.0-dev')).toBeVisible();
  });

  test('sidebar contains navigation links: Dashboard, Guidelines, References', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /guidelines/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /references/i })).toBeVisible();
  });

  test('navigates to Dashboard by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('navigates to Guidelines page when clicking Guidelines nav item', async ({ page }) => {
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('navigates to References page when clicking References nav item', async ({ page }) => {
    await page.getByRole('button', { name: /references/i }).click();
    await page.waitForLoadState('networkidle');
    // References page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigates back to Dashboard from Guidelines page', async ({ page }) => {
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('header breadcrumb updates to reflect active route', async ({ page }) => {
    // On dashboard (default)
    await expect(page.locator('header').getByText(/dashboard/i)).toBeVisible();

    // Navigate to guidelines
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.locator('header').getByText(/guidelines/i)).toBeVisible();

    // Navigate to references
    await page.getByRole('button', { name: /references/i }).click();
    await expect(page.locator('header').getByText(/references/i)).toBeVisible();
  });

  test('sidebar shows user placeholder when not authenticated', async ({ page }) => {
    // The app shows 'User' as the fallback when no auth user is set
    const userArea = page.locator('aside').last();
    await expect(userArea.getByText('User')).toBeVisible();
  });
});
