import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InternalDocumentsPanel } from './InternalDocumentsPanel';
import type { InternalDocument } from '../../hooks/useInternalDocuments';

// ── Mock hooks ──────────────────────────────────────────────────────────────

const mockUploadMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockDownloadDocument = vi.fn();

let mockDocuments: InternalDocument[] = [];
let mockIsLoading = false;
let mockIsError = false;

vi.mock('../../hooks/useInternalDocuments', () => ({
  useInternalDocuments: () => ({
    data: mockDocuments,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
  useUploadDocument: () => ({
    mutate: mockUploadMutate,
    isPending: false,
  }),
  useDeleteDocument: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
  downloadDocument: (...args: unknown[]) => mockDownloadDocument(...args),
}));

// ── Helper ──────────────────────────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeDoc(overrides: Partial<InternalDocument> = {}): InternalDocument {
  return {
    id: 'doc-1',
    guidelineId: 'gl-1',
    title: 'Clinical Guidelines v1.pdf',
    mimeType: 'application/pdf',
    uploadedBy: 'u-1',
    uploadedAt: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('InternalDocumentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocuments = [];
    mockIsLoading = false;
    mockIsError = false;
  });

  it('renders the document list with filename and date', async () => {
    mockDocuments = [makeDoc({ title: 'Clinical Guidelines v1.pdf' })];
    renderWithQuery(<InternalDocumentsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('Clinical Guidelines v1.pdf')).toBeDefined();
    });
    // Should show a formatted date
    expect(screen.getByText(/Jan 15, 2025/)).toBeDefined();
  });

  it('shows empty state when there are no documents', async () => {
    mockDocuments = [];
    renderWithQuery(<InternalDocumentsPanel guidelineId="gl-1" />);
    await waitFor(() => {
      expect(screen.getByText('No internal documents')).toBeDefined();
    });
  });

  it('calls delete mutation after confirm', async () => {
    mockDocuments = [makeDoc({ id: 'doc-1', title: 'Protocol.pdf', guidelineId: 'gl-1' })];
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQuery(<InternalDocumentsPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Protocol.pdf')).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText('delete Protocol.pdf');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { id: 'doc-1', guidelineId: 'gl-1' },
    );
  });

  it('calls upload mutation when a file is selected and upload button clicked', async () => {
    mockDocuments = [];
    renderWithQuery(<InternalDocumentsPanel guidelineId="gl-1" />);

    const fileInput = screen.getByLabelText('file input') as HTMLInputElement;
    const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadBtn);

    expect(mockUploadMutate).toHaveBeenCalledWith(
      { guidelineId: 'gl-1', file, title: 'report.pdf' },
      expect.anything(),
    );
  });

  it('triggers downloadDocument when download button is clicked', async () => {
    mockDocuments = [makeDoc({ id: 'doc-1', title: 'Evidence Summary.pdf', guidelineId: 'gl-1' })];
    renderWithQuery(<InternalDocumentsPanel guidelineId="gl-1" />);

    await waitFor(() => {
      expect(screen.getByText('Evidence Summary.pdf')).toBeDefined();
    });

    const downloadBtn = screen.getByLabelText('download Evidence Summary.pdf');
    fireEvent.click(downloadBtn);

    expect(mockDownloadDocument).toHaveBeenCalledWith('gl-1', 'doc-1');
  });
});
