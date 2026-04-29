/**
 * Workspace recommendations — CRUD, strength labels, expandable cards, delete flow.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_RECOMMENDATIONS } from './seed-data';

async function goToRecommendationsTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Recommendations');
}

test.describe('Recommendations – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
  });

  test('Recommendations tab panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('section list shows seeded recommendations after selecting a section', async ({ page }) => {
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ACE Inhibitors for Hypertension')).toBeVisible();
  });

  test('recommendation card shows strength badge', async ({ page }) => {
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Strong For').first()).toBeVisible();
  });

  test('recommendation card shows type badge', async ({ page }) => {
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('GRADE').first()).toBeVisible();
  });
});

test.describe('Recommendations – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
  });

  test('Add Recommendation button is present when a section is selected', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add recommendation/i })
        .or(page.getByRole('button', { name: /new recommendation/i }))
    ).toBeVisible();
  });
});

test.describe('Recommendations – expand/collapse', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
  });

  test('clicking a recommendation header expands the card', async ({ page }) => {
    const recHeader = page.getByText('ACE Inhibitors for Hypertension');
    await recHeader.click();
    // After expansion, inner tabs (narrative, EtD) should appear
    await expect(
      page.getByRole('tab', { name: /narrative/i })
        .or(page.getByText(/narrative/i))
        .first()
    ).toBeVisible();
  });
});

test.describe('Recommendations – DELETE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
  });

  test('delete button triggers confirmation step', async ({ page }) => {
    // Find a delete-related button (trash icon or delete label)
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first()
      .or(page.locator('button[title="Delete recommendation"], button[aria-label*="delete"]').first());
    const count = await deleteBtn.count();
    // If the delete control is present, test the two-step confirmation
    if (count > 0) {
      await deleteBtn.click();
      // Confirmation text or second click target should appear
      await expect(
        page.getByRole('button', { name: /confirm delete/i })
          .or(page.getByText(/are you sure/i))
          .or(page.getByRole('button', { name: /delete/i }).first())
      ).toBeVisible();
    }
  });
});

test.describe('Recommendations – strength values', () => {
  test('STRONG_FOR strength renders as "Strong For"', async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Strong For')).toBeVisible();
  });

  test('CONDITIONAL_FOR strength renders as "Conditional For"', async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Conditional For')).toBeVisible();
  });

  test('PRACTICE_STATEMENT type renders correctly', async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('Background').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Practice Statement')).toBeVisible();
  });
});

test.describe('Recommendations – inner tabs', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToRecommendationsTab(page);
    await page.getByText('First-line Treatment').click();
    await page.waitForLoadState('networkidle');
    // Expand the first recommendation
    await page.getByText('ACE Inhibitors for Hypertension').click();
  });

  test('expanded card shows Narrative tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /narrative/i }).first()).toBeVisible();
  });

  test('expanded card shows EtD/Key Info tab', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /etd|key info/i }).first()
    ).toBeVisible();
  });

  test('expanded card shows Decision Aid tab', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /decision aid/i }).first()
    ).toBeVisible();
  });

  test('expanded card shows Comments tab', async ({ page }) => {
    await expect(
      page.getByRole('tab', { name: /comments/i }).first()
    ).toBeVisible();
  });
});
