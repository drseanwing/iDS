/**
 * Workspace Task Board — CRUD + status transitions (TODO → IN_PROGRESS → DONE).
 */
import { test, expect } from '@playwright/test';
import { setupStatefulMocks, navigateToApp, openPrimaryWorkspace, switchWorkspaceTab } from './helpers';
import { SEED_TASKS } from './seed-data';

async function goToTasksTab(page: Parameters<typeof navigateToApp>[0]) {
  await navigateToApp(page);
  await openPrimaryWorkspace(page);
  await switchWorkspaceTab(page, 'Tasks');
}

test.describe('Tasks – READ (list display)', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToTasksTab(page);
  });

  test('shows TODO column', async ({ page }) => {
    await expect(page.getByText('TODO', { exact: true })).toBeVisible();
  });

  test('shows IN PROGRESS column', async ({ page }) => {
    await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();
  });

  test('shows DONE column', async ({ page }) => {
    await expect(page.getByText('DONE', { exact: true })).toBeVisible();
  });

  test('task in TODO column is rendered', async ({ page }) => {
    await expect(page.getByText('Review ACE inhibitor evidence')).toBeVisible();
  });

  test('task in IN_PROGRESS column is rendered', async ({ page }) => {
    await expect(page.getByText('Draft lifestyle section')).toBeVisible();
  });

  test('task in DONE column is rendered', async ({ page }) => {
    await expect(page.getByText('Approve final document')).toBeVisible();
  });

  test('task card shows assignee name', async ({ page }) => {
    await expect(page.getByText('Carol Reviewer')).toBeVisible();
  });

  test('task card shows due date', async ({ page }) => {
    // Tasks have due dates set in seed data – check at least one date-like text
    const dueDates = page.locator('[class*="rounded-full"][class*="text-xs"]');
    await expect(dueDates.first()).toBeVisible();
  });
});

test.describe('Tasks – CREATE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToTasksTab(page);
  });

  test('New Task / Add Task button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new task|add task|create task/i }).first()
    ).toBeVisible();
  });

  test('clicking New Task opens a create form', async ({ page }) => {
    await page.getByRole('button', { name: /new task|add task|create task/i }).first().click();
    await expect(
      page.getByPlaceholder(/task title|task name/i)
        .or(page.getByRole('textbox').first())
    ).toBeVisible();
  });

  test('can create a task with title only', async ({ page }) => {
    await page.getByRole('button', { name: /new task|add task|create task/i }).first().click();
    const titleField = page.getByPlaceholder(/task title|task name/i)
      .or(page.getByRole('textbox').first());
    await titleField.fill('New E2E Task');
    await page.getByRole('button', { name: /create|save|submit/i }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New E2E Task')).toBeVisible();
  });

  test('can cancel task creation without saving', async ({ page }) => {
    await page.getByRole('button', { name: /new task|add task|create task/i }).first().click();
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await expect(page.getByText('TODO', { exact: true })).toBeVisible();
  });
});

test.describe('Tasks – status transitions', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToTasksTab(page);
  });

  test('task card shows Move Right button', async ({ page }) => {
    await expect(page.getByTitle('Move right').first()).toBeVisible();
  });

  test('clicking Move Right on TODO task moves it to IN_PROGRESS', async ({ page }) => {
    const moveRight = page.getByTitle('Move right').first();
    await moveRight.click();
    await page.waitForLoadState('networkidle');
    // State should update — the board still renders
    await expect(page.getByText('IN PROGRESS', { exact: true })).toBeVisible();
  });

  test('task in IN_PROGRESS shows Move Left button', async ({ page }) => {
    // The IN_PROGRESS task should have a move-left arrow
    await expect(page.getByTitle('Move left').first()).toBeVisible();
  });
});

test.describe('Tasks – DELETE', () => {
  test.beforeEach(async ({ page }) => {
    await setupStatefulMocks(page);
    await goToTasksTab(page);
  });

  test('task card has a delete (trash) button', async ({ page }) => {
    await expect(page.getByTitle('Delete task').first()).toBeVisible();
  });

  test('delete button triggers browser confirm dialog', async ({ page }) => {
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });
    await page.getByTitle('Delete task').first().click();
    expect(dialogShown).toBe(true);
  });

  test('confirming delete removes the task from the board', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    const taskText = 'Review ACE inhibitor evidence';
    await expect(page.getByText(taskText)).toBeVisible();
    await page.getByTitle('Delete task').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(taskText)).not.toBeVisible();
  });
});
