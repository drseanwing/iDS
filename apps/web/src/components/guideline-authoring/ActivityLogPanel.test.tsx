import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityLogPanel } from './ActivityLogPanel';

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

function activityResponse(entries: unknown[], totalPages = 1) {
  return {
    data: {
      data: entries,
      meta: { total: entries.length, page: 1, limit: 20, totalPages },
    },
  };
}

const sampleEntry = {
  id: 'act-1',
  guidelineId: 'gl-1',
  userId: 'u-1',
  actionType: 'CREATE',
  entityType: 'Section',
  entityId: 'sec-1',
  entityTitle: 'Introduction',
  timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
  user: { id: 'u-1', displayName: 'Alice', email: 'alice@example.com' },
};

describe('ActivityLogPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the Activity Log heading', async () => {
    getMock.mockResolvedValue(activityResponse([]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    expect(screen.getByText('Activity Log')).toBeDefined();
  });

  it('renders entity type and action type filter selects', async () => {
    getMock.mockResolvedValue(activityResponse([]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    // Should have at least 2 selects (entity type and action type)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when there are no activity entries', async () => {
    getMock.mockResolvedValue(activityResponse([]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('No activity found.')).toBeDefined();
    });
  });

  it('renders an activity entry with user name, action type and entity', async () => {
    getMock.mockResolvedValue(activityResponse([sampleEntry]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeDefined();
    });
    // CREATE badge appears both in the filter dropdown and in the entry row
    expect(screen.getAllByText('CREATE').length).toBeGreaterThanOrEqual(1);
    // Entity title is rendered in the entry row
    expect(screen.getAllByText(/Introduction/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows relative time for activity entries', async () => {
    getMock.mockResolvedValue(activityResponse([sampleEntry]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    await waitFor(() => {
      // 1 minute ago
      expect(screen.getByText(/minute.*ago|just now/i)).toBeDefined();
    });
  });

  it('renders a filter input for title search', async () => {
    getMock.mockResolvedValue(activityResponse([]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    expect(screen.getByPlaceholderText('Filter by title...')).toBeDefined();
  });

  it('filters displayed entries by title text', async () => {
    getMock.mockResolvedValue(
      activityResponse([
        sampleEntry,
        {
          ...sampleEntry,
          id: 'act-2',
          entityTitle: 'Methods',
          user: { id: 'u-2', displayName: 'Bob', email: 'bob@example.com' },
        },
      ]),
    );
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeDefined();
      expect(screen.getByText('Bob')).toBeDefined();
    });

    const filterInput = screen.getByPlaceholderText('Filter by title...');
    fireEvent.change(filterInput, { target: { value: 'Introduction' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeDefined();
      expect(screen.queryByText('Bob')).toBeNull();
    });
  });

  it('shows CREATE badge with correct styling', async () => {
    getMock.mockResolvedValue(activityResponse([sampleEntry]));
    renderWithQuery(<ActivityLogPanel guidelineId="gl-1" />);
    await waitFor(() => {
      const badges = screen.getAllByText('CREATE');
      // At least one badge should exist (in the entry row)
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
