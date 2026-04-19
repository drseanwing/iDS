import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MilestonesPanel } from './MilestonesPanel';

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

function milestonesResponse(milestones: unknown[]) {
  return {
    data: {
      data: milestones,
      meta: { total: milestones.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

const sampleMilestone = {
  id: 'ms-1',
  guidelineId: 'gl-1',
  title: 'Draft completion',
  targetDate: '2027-06-01',
  responsiblePerson: 'Alice',
  isCompleted: false,
  ordering: 1,
  createdAt: new Date().toISOString(),
  items: [],
};

describe('MilestonesPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the Milestones heading and Add Milestone button', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    expect(screen.getByText('Milestones')).toBeDefined();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeDefined();
  });

  it('shows empty state when no milestones exist', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('No milestones yet')).toBeDefined();
    });
  });

  it('renders a milestone card with title, responsible person, and target date', async () => {
    getMock.mockResolvedValue(milestonesResponse([sampleMilestone]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Draft completion')).toBeDefined();
    });
    expect(screen.getByText('Alice')).toBeDefined();
    // Date should be formatted
    expect(screen.getByText(/Jun 1, 2027/)).toBeDefined();
  });

  it('shows progress bar when milestones exist', async () => {
    getMock.mockResolvedValue(
      milestonesResponse([
        sampleMilestone,
        { ...sampleMilestone, id: 'ms-2', title: 'Expert review', isCompleted: true },
      ]),
    );
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    await waitFor(() => {
      // Progress bar shows "X/Y (Z%)"
      expect(screen.getByText(/1\/2/)).toBeDefined();
    });
  });

  it('opens create form when Add Milestone button is clicked', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Milestone title...')).toBeDefined();
    });
  });

  it('disables Create button in form when title is empty', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    await waitFor(() => {
      const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
      expect(createBtn.disabled).toBe(true);
    });
  });

  it('enables Create button after entering a milestone title', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Milestone title...')).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText('Milestone title...'), {
      target: { value: 'New milestone' },
    });
    const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('closes create form when Cancel is clicked', async () => {
    getMock.mockResolvedValue(milestonesResponse([]));
    renderWithQuery(<MilestonesPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Milestone title...')).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Milestone title...')).toBeNull();
    });
  });
});
