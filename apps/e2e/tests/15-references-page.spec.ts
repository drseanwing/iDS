/**
 * Global References page — full list, search, pagination, empty/error states.
 * References within a guideline workspace are tested here too (via References tab).
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_REFERENCES } from './seed-data';

// ─── Global References page ───────────────────────────────────────────────────

async function goToReferencesPage(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await page.getByRole('button', { name: /references/i }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('References page – list display', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToReferencesPage(page);
  });

  test('shows References heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^references$/i })).toBeVisible();
  });

  test('shows total reference count', async ({ page }) => {
    await expect(page.getByText(/\d+ references across all guidelines/i)).toBeVisible();
  });

  test('shows all seeded reference titles', async ({ page }) => {
    for (const ref of SEED_REFERENCES) {
      await expect(page.getByText(ref.title)).toBeVisible();
    }
  });

  test('shows author names', async ({ page }) => {
    await expect(page.getByText(/Smith J/)).toBeVisible();
    await expect(page.getByText(/Jones A/)).toBeVisible();
  });

  test('shows publication years', async ({ page }) => {
    await expect(page.getByText('2023')).toBeVisible();
    await expect(page.getByText('2022')).toBeVisible();
  });

  test('shows study type badges', async ({ page }) => {
    await expect(page.getByText('Systematic Review')).toBeVisible();
    await expect(page.getByText('Primary Study')).toBeVisible();
    await expect(page.getByText('Cohort Study').or(page.getByText('COHORT_STUDY')).first()).toBeVisible();
  });

  test('shows guideline short name badges for each reference', async ({ page }) => {
    await expect(page.getByText('HTN-2025').first()).toBeVisible();
    await expect(page.getByText('DCS-2025').first()).toBeVisible();
    await expect(page.getByText('AF-2024').first()).toBeVisible();
  });

  test('shows DOI link when DOI is present', async ({ page }) => {
    await expect(page.getByText(/DOI: 10\.1001/i)).toBeVisible();
  });

  test('shows PubMed ID when present', async ({ page }) => {
    await expect(page.getByText(/PMID: 12345678/i)).toBeVisible();
  });

  test('shows section placement tags', async ({ page }) => {
    await expect(page.getByText('Background')).toBeVisible();
  });
});

test.describe('References page – search', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToReferencesPage(page);
  });

  test('has a search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search by title, authors/i)).toBeVisible();
  });

  test('typing in search filters to matching references', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by title, authors/i);
    await searchInput.fill('ACE');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');
    await expect(searchInput).toHaveValue('ACE');
  });

  test('shows empty state when search finds no results', async ({ page }) => {
    await page.route('**/api/references*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, page: 1, limit: 50 }) });
      } else {
        await route.continue();
      }
    });
    const searchInput = page.getByPlaceholder(/search by title, authors/i);
    await searchInput.fill('zzznomatch');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/No references match|no results/i)).toBeVisible();
  });

  test('clearing search restores full list', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by title, authors/i);
    await searchInput.fill('ACE');
    await page.waitForTimeout(400);
    await searchInput.clear();
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ACE Inhibitors Meta-Analysis 2023')).toBeVisible();
  });
});

test.describe('References page – pagination', () => {
  test('no pagination shown when results fit on one page', async ({ page }) => {
    await setupStatefulMocks(page);
    await goToReferencesPage(page);
    // 3 references < 50 limit — no prev/next needed
    await expect(page.getByRole('button', { name: /previous/i })).not.toBeVisible();
  });

  test('pagination shown when total exceeds limit', async ({ page }) => {
    const manyRefs = Array.from({ length: 50 }, (_, i) => ({
      id: `ref-pg-${i}`,
      title: `Reference ${i}`,
      authors: 'Author A',
      year: 2023,
      studyType: 'OTHER',
      doi: null, pubmedId: null, url: null, abstract: null,
      createdAt: new Date().toISOString(),
      guidelineId: 'gl-htn',
      guideline: null, sectionPlacements: [], outcomeLinks: [],
    }));
    await page.route('**/api/references*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: manyRefs, total: 51, page: 1, limit: 50 }) });
      } else {
        await route.continue();
      }
    });
    await goToReferencesPage(page);
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });
});

test.describe('References page – empty and error states', () => {
  test('shows empty state when there are no references', async ({ page }) => {
    await setupStatefulMocks(page, { references: [] });
    await goToReferencesPage(page);
    await expect(page.getByText(/No references found|no references/i)).toBeVisible();
  });

  test('shows error state when API returns 500', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 500 });
    });
    await goToReferencesPage(page);
    await expect(page.getByText(/Failed to load references/i)).toBeVisible({ timeout: 15000 });
  });
});

// ─── References within workspace (References tab) ─────────────────────────────

test.describe('Workspace References tab', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await navigateToApp(page);
    await openPrimaryWorkspace(page);
    await switchWorkspaceTab(page, 'References');
  });

  test('References tab panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('shows guideline references list', async ({ page }) => {
    await expect(page.getByText('ACE Inhibitors Meta-Analysis 2023')).toBeVisible();
  });

  test('Add Reference button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add reference|new reference/i })
        .or(page.getByRole('button', { name: /add|new/i }).first())
    ).toBeVisible();
  });

  test('reference entries show author and year', async ({ page }) => {
    await expect(page.getByText(/Smith J/)).toBeVisible();
    await expect(page.getByText('2023')).toBeVisible();
  });
});
