import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PollsPanel } from './PollsPanel';

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

function pollsResponse(polls: unknown[]) {
  return {
    data: {
      data: polls,
      meta: { total: polls.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

const samplePoll = {
  id: 'poll-1',
  guidelineId: 'gl-1',
  title: 'Should we include RCTs only?',
  pollType: 'OPEN_TEXT' as const,
  isActive: true,
  options: null,
  votes: [],
  createdAt: new Date().toISOString(),
};

describe('PollsPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the Polls & Voting heading and Create Poll button', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    expect(screen.getByText('Polls & Voting')).toBeDefined();
    expect(screen.getByRole('button', { name: /create poll/i })).toBeDefined();
  });

  it('shows empty state when no polls exist', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('No polls yet')).toBeDefined();
    });
  });

  it('renders a poll card with title, type badge, and active status', async () => {
    getMock.mockResolvedValue(pollsResponse([samplePoll]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Should we include RCTs only?')).toBeDefined();
    });
    expect(screen.getByText('Open Text')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('shows vote count on poll cards', async () => {
    getMock.mockResolvedValue(pollsResponse([{ ...samplePoll, votes: [{ id: 'v-1' }] }]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('1 vote')).toBeDefined();
    });
  });

  it('shows voting interface for active open-text polls', async () => {
    getMock.mockResolvedValue(pollsResponse([samplePoll]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your response...')).toBeDefined();
    });
  });

  it('shows Closed badge for inactive polls', async () => {
    getMock.mockResolvedValue(pollsResponse([{ ...samplePoll, isActive: false }]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Closed')).toBeDefined();
    });
  });

  it('opens create form when Create Poll button is clicked', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /create poll/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Poll title...')).toBeDefined();
    });
  });

  it('disables Create in form when poll title is empty', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /create poll/i }));
    await waitFor(() => {
      const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
      expect(createBtn.disabled).toBe(true);
    });
  });

  it('enables Create button after entering poll title', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /create poll/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Poll title...')).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText('Poll title...'), {
      target: { value: 'New poll question' },
    });
    const createBtn = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
  });

  it('closes create form when Cancel is clicked', async () => {
    getMock.mockResolvedValue(pollsResponse([]));
    renderWithQuery(<PollsPanel guidelineId="gl-1" />);
    fireEvent.click(screen.getByRole('button', { name: /create poll/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Poll title...')).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Poll title...')).toBeNull();
    });
  });
});
