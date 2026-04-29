/**
 * Error modes — 500 responses, 404s, partial data, and offline-like conditions
 * across all major pages and the workspace.
 */
import { test, expect } from '@playwright/test';
import { navigateToApp, openPrimaryWorkspace } from './helpers';
import { SEED_GUIDELINES } from './seed-data';

// Shared error route: returns 500 for all API calls
async function setupAllErrors(page: Parameters<typeof navigateToApp>[0]) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });
}

// Route that keeps the guidelines list working but fails everything else
async function setupGuidelineOnlyRoute(page: Parameters<typeof navigateToApp>[0]) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace(/^\/api/, '');
    if (apiPath === '/guidelines' && route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEED_GUIDELINES) });
    }
    return route.fulfill({ status: 500, body: 'error' });
  });
}

test.describe('Error modes – Dashboard', () => {
  test('shows -- for all stats on API 500', async ({ page }) => {
    await setupAllErrors(page);
    await navigateToApp(page);
    await page.waitForFunction(
      () => {
        const els = document.querySelectorAll('.text-3xl');
        return els.length > 0 && Array.from(els).every((el) => (el as HTMLElement).textContent?.includes('--'));
      },
      { timeout: 15000 },
    );
    const vals = await page.locator('.grid .text-3xl').allTextContents();
    expect(vals.every((v) => v.includes('--'))).toBeTruthy();
  });

  test('dashboard still renders heading even when API fails', async ({ page }) => {
    await setupAllErrors(page);
    await navigateToApp(page);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Error modes – Guidelines list', () => {
  test('shows error message when guidelines list API fails', async ({ page }) => {
    await setupAllErrors(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByText(/Failed to load guidelines/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows empty state when guidelines list returns empty array', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const apiPath = url.pathname.replace(/^\/api/, '');
      if (apiPath === '/guidelines') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/No guidelines found/i)).toBeVisible();
  });
});

test.describe('Error modes – References page', () => {
  test('shows error message when references API fails', async ({ page }) => {
    await setupAllErrors(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /references/i }).click();
    await expect(page.getByText(/Failed to load references/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows empty state when references returns empty list', async ({ page }) => {
    await page.route('**/api/references*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, page: 1, limit: 50 }) });
      } else {
        await route.continue();
      }
    });
    await navigateToApp(page);
    await page.getByRole('button', { name: /references/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/No references found|no references/i)).toBeVisible();
  });
});

test.describe('Error modes – Workspace', () => {
  test('shows workspace error when guideline detail fails to load', async ({ page }) => {
    await setupGuidelineOnlyRoute(page);
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await expect(page.getByText(/Failed to load guideline workspace/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Error modes – partial data', () => {
  test('dashboard stat cards show -- for missing sections when only guidelines count is returned', async ({ page }) => {
    await page.route('**/api/guidelines/stats', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ guidelines: 5 }) });
    });
    await navigateToApp(page);
    await page.waitForLoadState('networkidle');
    const vals = await page.locator('.grid .text-3xl').allTextContents();
    expect(vals.some((v) => v.includes('--'))).toBeTruthy();
  });

  test('guidelines page still renders New Guideline button when list load fails', async ({ page }) => {
    await page.route('**/api/guidelines', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 500 });
      }
      return route.continue();
    });
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.getByRole('button', { name: /new guideline/i })).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Error modes – slow network', () => {
  test('dashboard still shows heading during slow stat fetch', async ({ page }) => {
    await page.route('**/api/guidelines/stats', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ guidelines: 2, sections: 3, recommendations: 1 }) });
    });
    await navigateToApp(page);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('guidelines list shows loading skeleton during slow fetch', async ({ page }) => {
    await page.route('**/api/guidelines', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((r) => setTimeout(r, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEED_GUIDELINES) });
      } else {
        await route.continue();
      }
    });
    await navigateToApp(page);
    await page.getByRole('button', { name: /guidelines/i }).click();
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  });
});
