import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoverPanel } from './RecoverPanel';

// ---------------------------------------------------------------------------
// Mock the API client so TanStack Query hooks hit no real network
// ---------------------------------------------------------------------------
const getMock = vi.fn();
const postMock = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
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

// The component issues two GET calls:
//   1. /sections?guidelineId=...&onlyDeleted=true&limit=100  (deleted sections)
//   2. /guidelines?onlyDeleted=true&limit=100                 (deleted guidelines)
function paginatedResponse<T>(items: T[]) {
  return {
    data: {
      data: items,
      meta: { total: items.length, page: 1, limit: 100, totalPages: 1 },
    },
  };
}

const deletedSection = {
  id: 'sec-1',
  title: 'Introduction (deleted)',
  ordering: 1,
  isDeleted: true,
  updatedAt: '2026-03-15T10:00:00.000Z',
  children: [],
};

const deletedGuideline = {
  id: 'gl-deleted',
  title: 'Old Guideline',
  shortName: 'OG-1',
  status: 'DRAFT',
  isDeleted: true,
  updatedAt: '2026-02-20T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RecoverPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    postMock.mockResolvedValue({ data: {} });
  });

  it('renders section headings for Deleted Sections and Deleted Guidelines', async () => {
    getMock.mockResolvedValue(paginatedResponse([]));
    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    expect(screen.getByText('Deleted Sections')).toBeDefined();
    expect(screen.getByText('Deleted Guidelines')).toBeDefined();
    expect(screen.getByText(/Recover Deleted Content/i)).toBeDefined();
  });

  it('shows empty states when there are no deleted items', async () => {
    getMock.mockResolvedValue(paginatedResponse([]));
    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('No deleted sections')).toBeDefined();
      expect(screen.getByText('No deleted guidelines')).toBeDefined();
    });
  });

  it('renders a deleted section with its title and a Restore button', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('onlyDeleted=true') && url.includes('sections')) {
        return Promise.resolve(paginatedResponse([deletedSection]));
      }
      return Promise.resolve(paginatedResponse([]));
    });

    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Introduction (deleted)')).toBeDefined();
    });

    // There should be a Restore button for the section
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons.length).toBeGreaterThan(0);
  });

  it('renders a deleted guideline with its title, shortName and a Restore button', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('guidelines') && url.includes('onlyDeleted')) {
        return Promise.resolve(paginatedResponse([deletedGuideline]));
      }
      return Promise.resolve(paginatedResponse([]));
    });

    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Old Guideline')).toBeDefined();
    });
    expect(screen.getByText('OG-1')).toBeDefined();

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons.length).toBeGreaterThan(0);
  });

  it('clicking Restore on a deleted section calls the restore mutation', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('sections')) {
        return Promise.resolve(paginatedResponse([deletedSection]));
      }
      return Promise.resolve(paginatedResponse([]));
    });

    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Introduction (deleted)')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/sections/sec-1/restore', undefined);
    });
  });

  it('clicking Restore on a deleted guideline calls the restore mutation', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('guidelines')) {
        return Promise.resolve(paginatedResponse([deletedGuideline]));
      }
      return Promise.resolve(paginatedResponse([]));
    });

    renderWithQuery(<RecoverPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Old Guideline')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/guidelines/gl-deleted/restore', undefined);
    });
  });
});
