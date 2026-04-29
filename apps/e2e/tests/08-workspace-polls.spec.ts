/**
 * Workspace Polls — CRUD, poll types, voting, close poll.
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';

async function goToPollsTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Polls');
}

test.describe('Polls – READ', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPollsTab(page);
  });

  test('polls tab panel is visible', async ({ page }) => {
    await expect(page.locator('main[aria-label="Section detail panel"]')).toBeVisible();
  });

  test('shows open strength vote poll', async ({ page }) => {
    await expect(page.getByText('Recommendation strength vote')).toBeVisible();
  });

  test('shows multiple choice poll', async ({ page }) => {
    await expect(page.getByText('Which outcome is most important?')).toBeVisible();
  });

  test('shows closed open text poll', async ({ page }) => {
    await expect(page.getByText('Team feedback on draft')).toBeVisible();
  });

  test('shows poll type badges', async ({ page }) => {
    await expect(page.getByText('Strength Vote')).toBeVisible();
    await expect(page.getByText('Multiple Choice')).toBeVisible();
    await expect(page.getByText('Open Text')).toBeVisible();
  });

  test('shows vote count for polls with votes', async ({ page }) => {
    await expect(page.getByText(/\d+ vote/i).first()).toBeVisible();
  });
});

test.describe('Polls – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPollsTab(page);
  });

  test('New Poll button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new poll|create poll|add poll/i })
    ).toBeVisible();
  });

  test('clicking New Poll shows the create form', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    await expect(page.getByPlaceholder(/poll title/i)).toBeVisible();
  });

  test('create form has a Poll Type select', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    await expect(
      page.getByRole('combobox').or(page.locator('select')).first()
    ).toBeVisible();
  });

  test('poll type options include OPEN_TEXT, MULTIPLE_CHOICE, STRENGTH_VOTE, ETD_JUDGMENT', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    const select = page.locator('select').first();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('Open Text');
    expect(options).toContain('Multiple Choice');
    expect(options).toContain('Strength Vote');
    expect(options).toContain('EtD Judgment');
  });

  test('Create button is disabled with empty title', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    const createBtn = page.getByRole('button', { name: /^create$/i });
    await expect(createBtn).toBeDisabled();
  });

  test('Create button enables after entering a title', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    await page.getByPlaceholder(/poll title/i).fill('E2E Test Poll');
    await expect(page.getByRole('button', { name: /^create$/i })).toBeEnabled();
  });

  test('can cancel poll creation', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/poll title/i)).not.toBeVisible();
  });

  test('submitting form creates a new poll', async ({ page }) => {
    await page.getByRole('button', { name: /new poll|create poll|add poll/i }).click();
    await page.getByPlaceholder(/poll title/i).fill('New Strength Vote Poll');
    await page.locator('select').first().selectOption('STRENGTH_VOTE');
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New Strength Vote Poll')).toBeVisible();
  });
});

test.describe('Polls – voting', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPollsTab(page);
  });

  test('open poll shows a voting interface', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /vote|submit vote/i }).first()
        .or(page.getByText(/cast vote|your vote/i).first())
    ).toBeVisible();
  });

  test('strength vote options are shown for STRENGTH_VOTE polls', async ({ page }) => {
    await expect(
      page.getByText(/Strong For|Conditional For|Strong Against/i).first()
    ).toBeVisible();
  });
});

test.describe('Polls – close poll', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToPollsTab(page);
  });

  test('open poll shows a Close Poll button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /close poll/i }).first()
    ).toBeVisible();
  });

  test('clicking Close Poll closes the poll', async ({ page }) => {
    await page.getByRole('button', { name: /close poll/i }).first().click();
    await page.waitForLoadState('networkidle');
    // After close the poll should show CLOSED badge or no voting interface
    await expect(page.getByText(/closed/i).first()).toBeVisible();
  });
});
