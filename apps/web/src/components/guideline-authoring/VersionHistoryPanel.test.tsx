import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionHistoryPanel } from './VersionHistoryPanel';

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

function versionsResponse(versions: unknown[]) {
  return {
    data: {
      data: versions,
      meta: { total: versions.length, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders header and Publish New Version button', async () => {
    getMock.mockResolvedValue(versionsResponse([]));
    renderWithQuery(<VersionHistoryPanel guidelineId="gl-1" />);
    expect(screen.getByText('Version History')).toBeDefined();
    expect(screen.getByRole('button', { name: /publish new version/i })).toBeDefined();
  });

  it('shows empty state when there are no versions', async () => {
    getMock.mockResolvedValue(versionsResponse([]));
    renderWithQuery(<VersionHistoryPanel guidelineId="gl-1" />);
    await waitFor(() =>
      expect(screen.getByText(/No versions published yet/)).toBeDefined(),
    );
  });

  it('renders a published version with its number and publisher', async () => {
    getMock.mockResolvedValue(
      versionsResponse([
        {
          id: 'v-1',
          versionNumber: '1.0',
          versionType: 'MAJOR',
          comment: 'Initial release',
          isPublic: true,
          publishedAt: '2024-01-01T10:00:00Z',
          publishedBy: 'u-1',
          publisherName: 'Alice',
          pdfS3Key: null,
          jsonS3Key: null,
        },
      ]),
    );
    renderWithQuery(<VersionHistoryPanel guidelineId="gl-1" />);
    await waitFor(() => expect(screen.getByText('v1.0')).toBeDefined());
    expect(screen.getByText('Initial release')).toBeDefined();
    expect(screen.getByText(/Alice/)).toBeDefined();
    expect(screen.getByText('Latest')).toBeDefined();
  });

  it('shows Compare button when there are at least two versions', async () => {
    getMock.mockResolvedValue(
      versionsResponse([
        {
          id: 'v-2', versionNumber: '2.0', versionType: 'MAJOR', comment: null,
          isPublic: false, publishedAt: '2024-02-01T10:00:00Z',
          publishedBy: 'u-1', publisherName: 'Alice', pdfS3Key: null, jsonS3Key: null,
        },
        {
          id: 'v-1', versionNumber: '1.0', versionType: 'MAJOR', comment: null,
          isPublic: false, publishedAt: '2024-01-01T10:00:00Z',
          publishedBy: 'u-1', publisherName: 'Alice', pdfS3Key: null, jsonS3Key: null,
        },
      ]),
    );
    renderWithQuery(<VersionHistoryPanel guidelineId="gl-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /compare/i })).toBeDefined(),
    );
  });
});
