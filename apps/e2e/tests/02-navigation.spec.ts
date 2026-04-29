/**
 * Navigation — sidebar, header, breadcrumb, mobile nav, all routes.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp } from './helpers';

test.describe('Navigation – sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
  });

  test('displays the application name in the sidebar', async ({ page }) => {
    await expect(page.locator('aside').getByText('OpenGRADE', { exact: true })).toBeVisible();
  });

  test('shows version badge in the header', async ({ page }) => {
    await expect(page.getByText(/v\d+\.\d+/)).toBeVisible();
  });

  test('sidebar shows Dashboard nav item', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
  });

  test('sidebar shows Guidelines nav item', async ({ page }) => {
    await expect(page.getByRole('button', { name: /guidelines/i })).toBeVisible();
  });

  test('sidebar shows References nav item', async ({ page }) => {
    await expect(page.getByRole('button', { name: /references/i })).toBeVisible();
  });

  test('navigates to Dashboard by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('clicking Guidelines navigates to Guidelines page', async ({ page }) => {
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('clicking References navigates to References page', async ({ page }) => {
    await page.getByRole('button', { name: /references/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /^references$/i })).toBeVisible();
  });

  test('clicking Dashboard from Guidelines returns to Dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('clicking Dashboard from References returns to Dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /references/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Navigation – header breadcrumb', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
  });

  test('header shows "Dashboard" when on Dashboard', async ({ page }) => {
    await expect(page.locator('header').getByText(/dashboard/i)).toBeVisible();
  });

  test('header updates to "Guidelines" when navigating there', async ({ page }) => {
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.locator('header').getByText(/guidelines/i)).toBeVisible();
  });

  test('header updates to "References" when navigating there', async ({ page }) => {
    await page.getByRole('button', { name: /references/i }).click();
    await expect(page.locator('header').getByText(/references/i)).toBeVisible();
  });
});

test.describe('Navigation – user area', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
  });

  test('shows user placeholder in sidebar when not authenticated', async ({ page }) => {
    await expect(page.locator('aside').last().getByText('User')).toBeVisible();
  });
});

test.describe('Navigation – workspace back navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('workspace shows Back to Guidelines button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Back to guidelines/i })).toBeVisible();
  });

  test('Back to Guidelines button returns to guidelines list', async ({ page }) => {
    await page.getByRole('button', { name: /Back to guidelines/i }).click();
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('sidebar nav items still visible inside workspace', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
  });
});
