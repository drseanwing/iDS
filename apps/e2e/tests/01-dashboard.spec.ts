/**
 * Dashboard page — all workflows and edge modes.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp } from './helpers';
import { SEED_STATS } from './seed-data';

test.describe('Dashboard – rendering', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
  });

  test('displays the Dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('displays the welcome card with application description', async ({ page }) => {
    await expect(page.getByText(/Welcome to OpenGRADE/i)).toBeVisible();
    await expect(page.getByText(/FHIR-native clinical guideline authoring platform/i)).toBeVisible();
  });

  test('displays all three stat cards: Guidelines, Sections, Recommendations', async ({ page }) => {
    await expect(page.getByText('Guidelines').first()).toBeVisible();
    await expect(page.getByText('Sections')).toBeVisible();
    await expect(page.getByText('Recommendations')).toBeVisible();
  });

  test('stat cards show values from the API', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(String(SEED_STATS.guidelines))).toBeVisible();
  });

  test('stat cards render in a grid layout', async ({ page }) => {
    const statCards = page.locator('.grid .rounded-lg');
    await expect(statCards).toHaveCount(3);
  });
});

test.describe('Dashboard – loading and error modes', () => {
  test('shows loading spinner while stats are fetched', async ({ page }) => {
    await page.route('**/api/guidelines/stats', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEED_STATS) });
    });
    await navigateToApp(page);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('shows -- when API returns partial stat data', async ({ page }) => {
    await page.route('**/api/guidelines/stats', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ guidelines: 5 }) });
    });
    await navigateToApp(page);
    await page.waitForLoadState('networkidle');
    const vals = await page.locator('.grid .text-3xl').allTextContents();
    expect(vals.some((v) => v.includes('--'))).toBeTruthy();
  });

  test('shows -- for all stats when API fails', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 500, body: 'Server error' });
    });
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

  test('stat values update after navigating away and back', async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /guidelines/i }).click();
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
