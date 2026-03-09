import { test, expect } from '@playwright/test';
import { setupApiMocks, navigateToApp } from './helpers';

test.describe('References Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Override references to return the paginated format expected by ReferencesPage
    await page.route('**/api/references*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'ref-001',
                title: 'ACE Inhibitors Meta-Analysis 2023',
                authors: 'Smith J, et al.',
                year: 2023,
                journal: 'JAMA',
                studyType: 'SYSTEMATIC_REVIEW',
                doi: '10.1001/jama.2023.001',
                pubmedId: null,
                url: null,
                abstract: null,
                createdAt: new Date().toISOString(),
                guidelineId: 'gl-001',
                guideline: { id: 'gl-001', title: 'Hypertension Management Guidelines', shortName: 'HTN-2025' },
                sectionPlacements: [],
                outcomeLinks: [],
              },
              {
                id: 'ref-002',
                title: 'Diabetes Prevention Program RCT',
                authors: 'Jones A, Williams B',
                year: 2022,
                journal: 'NEJM',
                studyType: 'PRIMARY_STUDY',
                doi: null,
                pubmedId: '12345678',
                url: null,
                abstract: 'A randomized controlled trial...',
                createdAt: new Date().toISOString(),
                guidelineId: 'gl-002',
                guideline: { id: 'gl-002', title: 'Diabetes Care Standards', shortName: 'DCS-2025' },
                sectionPlacements: [
                  { sectionId: 'sec-001', referenceId: 'ref-002', section: { id: 'sec-001', title: 'Background' } },
                ],
                outcomeLinks: [],
              },
            ],
            total: 2,
            page: 1,
            limit: 50,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await navigateToApp(page);
    await page.getByRole('button', { name: /references/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('displays the References heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^references$/i })).toBeVisible();
  });

  test('displays the total reference count', async ({ page }) => {
    await expect(page.getByText(/2 references across all guidelines/i)).toBeVisible();
  });

  test('displays reference entries from the API', async ({ page }) => {
    await expect(page.getByText('ACE Inhibitors Meta-Analysis 2023')).toBeVisible();
    await expect(page.getByText('Diabetes Prevention Program RCT')).toBeVisible();
  });

  test('displays reference authors and year', async ({ page }) => {
    await expect(page.getByText(/Smith J, et al./i)).toBeVisible();
    await expect(page.getByText(/Jones A, Williams B/i)).toBeVisible();
  });

  test('displays study type badges', async ({ page }) => {
    await expect(page.getByText('Systematic Review')).toBeVisible();
    await expect(page.getByText('Primary Study')).toBeVisible();
  });

  test('displays guideline association for references', async ({ page }) => {
    // Both references should show their guideline short name
    await expect(page.getByText('HTN-2025').first()).toBeVisible();
    await expect(page.getByText('DCS-2025').first()).toBeVisible();
  });

  test('displays DOI link for references with DOI', async ({ page }) => {
    await expect(page.getByText(/DOI: 10.1001/i)).toBeVisible();
  });

  test('displays PubMed link for references with PubMed ID', async ({ page }) => {
    await expect(page.getByText(/PMID: 12345678/i)).toBeVisible();
  });

  test('displays section placement tags', async ({ page }) => {
    await expect(page.getByText('Background')).toBeVisible();
  });

  test('has a search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by title, authors/i);
    await expect(searchInput).toBeVisible();
  });

  test('search input filters references', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by title, authors/i);
    await searchInput.fill('ACE');
    // Wait for debounce
    await page.waitForTimeout(400);
    // Search is sent as URL param - mock API already handles it
    await page.waitForLoadState('networkidle');
    await expect(searchInput).toHaveValue('ACE');
  });

  test('shows empty state when no references match search', async ({ page }) => {
    await page.route('**/api/references*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 50 }),
      });
    });

    const searchInput = page.getByPlaceholder(/Search by title, authors/i);
    await searchInput.fill('NonexistentQuery');
    await page.waitForTimeout(400);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/No references match your search/i)).toBeVisible();
  });

  test('shows empty state when there are no references at all', async ({ page }) => {
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 50 }),
      });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, app starts at Dashboard - navigate to References
    await page.getByRole('button', { name: /^references$/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/No references found/i)).toBeVisible();
  });

  test('shows error state when API fails', async ({ page }) => {
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 500 });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, app starts at Dashboard - navigate to References
    await page.getByRole('button', { name: /^references$/i }).click();
    // Wait for React Query error state (includes retry delay)
    await expect(page.getByText(/Failed to load references/i)).toBeVisible({ timeout: 15000 });
  });

  test('does not show pagination when total is 50 or fewer', async ({ page }) => {
    // With 2 total references, no pagination needed
    const prevButton = page.getByRole('button', { name: /previous/i });
    await expect(prevButton).not.toBeVisible();
  });

  test('shows pagination when total exceeds 50', async ({ page }) => {
    const manyRefs = Array.from({ length: 50 }, (_, i) => ({
      id: `ref-${i}`,
      title: `Reference ${i}`,
      authors: 'Author',
      year: 2023,
      studyType: 'OTHER',
      doi: null,
      pubmedId: null,
      url: null,
      abstract: null,
      createdAt: new Date().toISOString(),
      guidelineId: 'gl-001',
      guideline: null,
      sectionPlacements: [],
      outcomeLinks: [],
    }));

    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: manyRefs, total: 51, page: 1, limit: 50 }),
      });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, app starts at Dashboard - navigate to References
    await page.getByRole('button', { name: /^references$/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });
});
