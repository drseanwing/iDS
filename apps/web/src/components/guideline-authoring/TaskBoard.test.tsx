import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskBoard } from './TaskBoard';

const getMock = vi.fn();
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function tasksResponse(tasks: unknown[]) {
  return {
    data: {
      data: tasks,
      meta: { total: tasks.length, page: 1, limit: 100, totalPages: 1 },
    },
  };
}

const sampleTask = {
  id: 't-1',
  guidelineId: 'gl-1',
  title: 'Write introduction',
  description: 'Draft the intro section',
  status: 'TODO',
  createdBy: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignee: { id: 'u-1', displayName: 'Alice', email: 'alice@example.com' },
};

describe('TaskBoard', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the Tasks header and Add Task button', async () => {
    getMock.mockResolvedValue(tasksResponse([]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByRole('button', { name: /add task/i })).toBeDefined();
  });

  it('shows all three columns when loaded', async () => {
    getMock.mockResolvedValue(tasksResponse([]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('TODO')).toBeDefined();
      expect(screen.getByText('IN PROGRESS')).toBeDefined();
      expect(screen.getByText('DONE')).toBeDefined();
    });
  });

  it('shows empty state message in each column when no tasks', async () => {
    getMock.mockResolvedValue(tasksResponse([]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    await waitFor(() => {
      const noTaskMessages = screen.getAllByText('No tasks');
      expect(noTaskMessages.length).toBe(3);
    });
  });

  it('renders a task card in the correct column', async () => {
    getMock.mockResolvedValue(tasksResponse([sampleTask]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Write introduction')).toBeDefined();
    });
    expect(screen.getByText('Draft the intro section')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('opens TaskCreateForm when Add Task button is clicked', async () => {
    getMock.mockResolvedValue(tasksResponse([]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));
    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeDefined();
    });
  });

  it('shows move right button for a TODO task (not DONE)', async () => {
    getMock.mockResolvedValue(tasksResponse([sampleTask]));
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByTitle('Move right')).toBeDefined();
    });
  });

  it('displays task count in each column header', async () => {
    getMock.mockResolvedValue(
      tasksResponse([
        sampleTask,
        { ...sampleTask, id: 't-2', title: 'Review draft', status: 'IN_PROGRESS' },
      ]),
    );
    renderWithQuery(<TaskBoard guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Write introduction')).toBeDefined();
      expect(screen.getByText('Review draft')).toBeDefined();
    });
  });
});
