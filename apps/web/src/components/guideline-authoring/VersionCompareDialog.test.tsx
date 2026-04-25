import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionCompareDialog } from './VersionCompareDialog';
import type { Version } from '../../hooks/useVersions';
import type { VersionCompareResult } from '../../hooks/useVersionCompare';

// ── Mock hooks ──────────────────────────────────────────────────────────────

let mockCompareData: VersionCompareResult | undefined = undefined;
let mockIsLoading = false;
let mockIsError = false;

vi.mock('../../hooks/useVersionCompare', () => ({
  useVersionCompare: () => ({
    data: mockCompareData,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeVersion(overrides: Partial<Version> = {}): Version {
  return {
    id: 'v-1',
    versionNumber: '1.0',
    versionType: 'MAJOR',
    comment: null,
    isPublic: true,
    publishedAt: '2025-01-01T00:00:00Z',
    publishedBy: 'user-1',
    publisherName: 'Alice',
    pdfS3Key: null,
    jsonS3Key: null,
    ...overrides,
  };
}

const VERSION_A = makeVersion({ id: 'v-1', versionNumber: '1.0', versionType: 'MAJOR' });
const VERSION_B = makeVersion({ id: 'v-2', versionNumber: '2.0', versionType: 'MAJOR' });

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VersionCompareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompareData = undefined;
    mockIsLoading = false;
    mockIsError = false;
  });

  it('renders the Compare Versions heading and a Close button', () => {
    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );
    expect(screen.getByText('Compare Versions')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows "Select two different versions" prompt when the same version is selected in both selectors', () => {
    // With only one version both selectors default to the same value
    const singleVersion = [makeVersion({ id: 'v-only', versionNumber: '1.0' })];
    renderWithQuery(
      <VersionCompareDialog versions={singleVersion} onClose={() => {}} />,
    );
    expect(screen.getByText('Select two different versions to compare')).toBeDefined();
  });

  it('populates version selectors with the provided versions', () => {
    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );
    // Each version should appear in both <select> elements — check at least one label
    const options = screen.getAllByRole('option', { name: /v1\.0/ });
    expect(options.length).toBeGreaterThanOrEqual(1);
    const optionsB = screen.getAllByRole('option', { name: /v2\.0/ });
    expect(optionsB.length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading indicator while the comparison is being fetched', () => {
    mockIsLoading = true;
    // Two different versions so the query is enabled
    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );
    // The spinner uses lucide's Loader2 — we check via aria or the svg role
    const spinners = document.querySelectorAll('svg');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows an error message when the comparison query fails', () => {
    mockIsError = true;
    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );
    expect(screen.getByText('Failed to load version comparison')).toBeDefined();
  });

  it('renders a diff table with differences when compare data is available', () => {
    mockCompareData = {
      v1: {
        id: 'v-1',
        versionNumber: '1.0',
        versionType: 'MAJOR',
        publishedAt: '2025-01-01T00:00:00Z',
        comment: null,
        snapshotBundle: { title: 'Old Title', status: 'draft' },
      },
      v2: {
        id: 'v-2',
        versionNumber: '2.0',
        versionType: 'MAJOR',
        publishedAt: '2025-06-01T00:00:00Z',
        comment: null,
        snapshotBundle: { title: 'New Title', status: 'published' },
      },
    };

    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );

    // Should show how many differences were found
    expect(screen.getByText(/differences? found/)).toBeDefined();
    // The changed paths should appear in the table
    expect(screen.getByText('status')).toBeDefined();
    expect(screen.getByText('title')).toBeDefined();
  });

  it('shows "No differences found" when both snapshots are identical', () => {
    const sameBundle = { title: 'Same', status: 'published' };
    mockCompareData = {
      v1: {
        id: 'v-1',
        versionNumber: '1.0',
        versionType: 'MAJOR',
        publishedAt: '2025-01-01T00:00:00Z',
        comment: null,
        snapshotBundle: sameBundle,
      },
      v2: {
        id: 'v-2',
        versionNumber: '2.0',
        versionType: 'MAJOR',
        publishedAt: '2025-06-01T00:00:00Z',
        comment: null,
        snapshotBundle: sameBundle,
      },
    };

    renderWithQuery(
      <VersionCompareDialog versions={[VERSION_A, VERSION_B]} onClose={() => {}} />,
    );

    expect(screen.getByText('No differences found between these versions')).toBeDefined();
  });
});
