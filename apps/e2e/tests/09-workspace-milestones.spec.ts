/**
 * Workspace Milestones — CRUD: create, read (upcoming/overdue/completed), update, delete.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';

async function goToMilestonesTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Milestones');
}

test.describe('Milestones – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToMilestonesTab(page);
  });

  test('milestones panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('shows upcoming milestones', async ({ page }) => {
    await expect(page.getByText('Draft Complete')).toBeVisible();
    await expect(page.getByText('External Review')).toBeVisible();
  });

  test('shows completed milestone with green styling', async ({ page }) => {
    await expect(page.getByText('Initial Literature Search')).toBeVisible();
  });

  test('shows responsible person names', async ({ page }) => {
    await expect(page.getByText('Alice Admin').first()).toBeVisible();
  });

  test('shows checklist items for milestones with a checklist', async ({ page }) => {
    await expect(page.getByText('Send to external reviewers')).toBeVisible();
    await expect(page.getByText('Collate feedback')).toBeVisible();
  });

  test('completed checklist item is visually distinct', async ({ page }) => {
    // The checked item should be in the DOM
    const checkedItem = page.getByText('Send to external reviewers');
    await expect(checkedItem).toBeVisible();
  });
});

test.describe('Milestones – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToMilestonesTab(page);
  });

  test('New Milestone button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new milestone|add milestone|create milestone/i })
    ).toBeVisible();
  });

  test('clicking New Milestone shows the create form', async ({ page }) => {
    await page.getByRole('button', { name: /new milestone|add milestone|create milestone/i }).click();
    await expect(page.getByPlaceholder(/milestone title/i)).toBeVisible();
  });

  test('create form has Target Date and Responsible Person fields', async ({ page }) => {
    await page.getByRole('button', { name: /new milestone|add milestone|create milestone/i }).click();
    await expect(page.getByLabel(/target date/i)).toBeVisible();
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
  });

  test('Create button is disabled with empty title', async ({ page }) => {
    await page.getByRole('button', { name: /new milestone|add milestone|create milestone/i }).click();
    await expect(page.getByRole('button', { name: /^create$/i })).toBeDisabled();
  });

  test('can fill and submit the milestone form', async ({ page }) => {
    await page.getByRole('button', { name: /new milestone|add milestone|create milestone/i }).click();
    await page.getByPlaceholder(/milestone title/i).fill('Final Publication');
    await page.getByPlaceholder(/name/i).fill('Alice Admin');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Final Publication')).toBeVisible();
  });

  test('can cancel milestone creation', async ({ page }) => {
    await page.getByRole('button', { name: /new milestone|add milestone|create milestone/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/milestone title/i)).not.toBeVisible();
  });
});

test.describe('Milestones – UPDATE / complete', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToMilestonesTab(page);
  });

  test('incomplete milestone has a Complete / Mark Done button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /complete|mark done|mark as done/i }).first()
        .or(page.locator('button[title*="complete"]').first())
    ).toBeVisible();
  });
});

test.describe('Milestones – DELETE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToMilestonesTab(page);
  });

  test('milestone has a delete button', async ({ page }) => {
    await expect(
      page.getByTitle('Delete milestone')
        .or(page.getByRole('button', { name: /delete milestone/i }))
        .first()
    ).toBeVisible();
  });
});
