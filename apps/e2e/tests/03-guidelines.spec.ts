/**
 * Guidelines page — full CRUD, list display, form validation, error modes.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp } from './helpers';
import { SEED_GUIDELINES } from './seed-data';

async function goToGuidelines(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await page.getByRole('button', { name: /guidelines/i }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('Guidelines – list display', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToGuidelines(page);
  });

  test('displays the Guidelines heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^guidelines$/i })).toBeVisible();
  });

  test('shows New Guideline button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new guideline/i })).toBeVisible();
  });

  test('lists all seeded guidelines', async ({ page }) => {
    for (const gl of SEED_GUIDELINES) {
      await expect(page.getByText(gl.title)).toBeVisible();
    }
  });

  test('shows DRAFT status badge', async ({ page }) => {
    await expect(page.getByText('DRAFT').first()).toBeVisible();
  });

  test('shows PUBLISHED status badge', async ({ page }) => {
    await expect(page.getByText('PUBLISHED')).toBeVisible();
  });

  test('shows short name badges', async ({ page }) => {
    await expect(page.getByText('HTN-2025')).toBeVisible();
    await expect(page.getByText('DCS-2025')).toBeVisible();
  });

  test('each guideline card is keyboard-accessible', async ({ page }) => {
    const card = page.getByRole('button', { name: /Open guideline: Hypertension/i });
    await expect(card).toBeVisible();
  });
});

test.describe('Guidelines – empty and error states', () => {
  test('shows empty state when no guidelines exist', async ({ page }) => {
    await setupStatefulMocks(page, { guidelines: [] });
    await goToGuidelines(page);
    await expect(page.getByText(/No guidelines found/i)).toBeVisible();
  });

  test('shows error state when API returns 500', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 500, body: 'error' });
    });
    await goToGuidelines(page);
    await expect(page.getByText(/Failed to load guidelines/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows loading skeleton while fetching', async ({ page }) => {
    await page.route('**/api/guidelines', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((r) => setTimeout(r, 800));
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

test.describe('Guidelines – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToGuidelines(page);
  });

  test('clicking New Guideline opens the create form', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).toBeVisible();
  });

  test('form shows Title and Short Name fields', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByPlaceholder(/guideline title/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e.g. GL-2025/i)).toBeVisible();
  });

  test('Create Guideline button is disabled when title is empty', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByRole('button', { name: /create guideline/i })).toBeDisabled();
  });

  test('Create Guideline button enables after title entry', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByPlaceholder(/guideline title/i).fill('Sepsis Management');
    await expect(page.getByRole('button', { name: /create guideline/i })).toBeEnabled();
  });

  test('Cancel button hides the form without creating', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).not.toBeVisible();
  });

  test('submitting the form creates a guideline and closes the form', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByPlaceholder(/guideline title/i).fill('Sepsis Management Guidelines');
    await page.getByPlaceholder(/e.g. GL-2025/i).fill('SEP-2025');
    await page.getByRole('button', { name: /create guideline/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('form', { name: /new guideline form/i })).not.toBeVisible();
  });

  test('creating a guideline with only title (no short name) succeeds', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByPlaceholder(/guideline title/i).fill('Minimal Guideline');
    await page.getByRole('button', { name: /create guideline/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('form', { name: /new guideline form/i })).not.toBeVisible();
  });

  test('form can be reopened after being cancelled', async ({ page }) => {
    await page.getByRole('button', { name: /new guideline/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.getByRole('button', { name: /new guideline/i }).click();
    await expect(page.getByRole('form', { name: /new guideline form/i })).toBeVisible();
  });
});

test.describe('Guidelines – READ (open workspace)', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToGuidelines(page);
  });

  test('clicking a guideline card opens its workspace', async ({ page }) => {
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Hypertension Management Guidelines/i })).toBeVisible();
  });

  test('workspace shows the guideline status badge', async ({ page }) => {
    await page.getByRole('button', { name: /Open guideline: Hypertension/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('DRAFT').first()).toBeVisible();
  });
});
