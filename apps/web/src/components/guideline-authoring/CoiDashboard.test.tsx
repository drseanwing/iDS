import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoiDashboard } from './CoiDashboard';

// ---------------------------------------------------------------------------
// Mock the API client so TanStack Query hooks hit no real network
// ---------------------------------------------------------------------------
const getMock = vi.fn();
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function coiResponse(records: unknown[]) {
  return {
    data: {
      data: records,
      meta: { total: records.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

const sampleRecord = {
  id: 'coi-1',
  guidelineId: 'gl-1',
  userId: 'user-1',
  disclosureText: 'I have a financial interest in the sponsor.',
  conflictType: 'FINANCIAL',
  isExcludedFromVoting: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    displayName: 'Alice Smith',
    email: 'alice@example.com',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CoiDashboard', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the heading and Add Declaration button', async () => {
    getMock.mockResolvedValue(coiResponse([]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    expect(screen.getByText('Conflict of Interest Declarations')).toBeDefined();
    expect(screen.getByRole('button', { name: /add declaration/i })).toBeDefined();
  });

  it('shows empty state when there are no COI records', async () => {
    getMock.mockResolvedValue(coiResponse([]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('No COI declarations recorded')).toBeDefined();
    });
  });

  it('renders a COI record with user name, email and conflict type badge', async () => {
    getMock.mockResolvedValue(coiResponse([sampleRecord]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeDefined();
    });
    expect(screen.getByText('alice@example.com')).toBeDefined();
    // The conflict type badge should be visible
    expect(screen.getAllByText('FINANCIAL').length).toBeGreaterThan(0);
    // Eligible/Excluded badge
    expect(screen.getByText('Eligible')).toBeDefined();
  });

  it('shows Excluded badge when isExcludedFromVoting is true', async () => {
    getMock.mockResolvedValue(coiResponse([{ ...sampleRecord, isExcludedFromVoting: true }]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Excluded')).toBeDefined();
    });
  });

  it('opens the create form when Add Declaration button is clicked', async () => {
    getMock.mockResolvedValue(coiResponse([]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    fireEvent.click(screen.getByRole('button', { name: /add declaration/i }));

    await waitFor(() => {
      expect(screen.getByText('New Declaration')).toBeDefined();
      expect(screen.getByPlaceholderText('User ID')).toBeDefined();
    });
  });

  it('closes the create form when Cancel is clicked', async () => {
    getMock.mockResolvedValue(coiResponse([]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    fireEvent.click(screen.getByRole('button', { name: /add declaration/i }));

    await waitFor(() => {
      expect(screen.getByText('New Declaration')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('New Declaration')).toBeNull();
    });
  });

  it('hides Add Declaration button while the create form is open', async () => {
    getMock.mockResolvedValue(coiResponse([]));
    renderWithQuery(<CoiDashboard guidelineId="gl-1" />);

    fireEvent.click(screen.getByRole('button', { name: /add declaration/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add declaration/i })).toBeNull();
    });
  });
});
