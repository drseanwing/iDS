import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RevManImportWizard } from './RevManImportWizard';

// ── Mock hooks ──────────────────────────────────────────────────────────────

const mockParseRevManMutate = vi.fn();
const mockImportRevManMutate = vi.fn();

vi.mock('../../hooks/useRevManImport', () => ({
  useParseRevMan: () => ({
    mutate: mockParseRevManMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useImportRevMan: () => ({
    mutate: mockImportRevManMutate,
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
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

// ── Helper ──────────────────────────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('RevManImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading and initial upload step', () => {
    renderWithQuery(
      <RevManImportWizard guidelineId="gl-1" picoId="pico-1" />,
    );
    expect(screen.getByText('Import RevMan (.rm5)')).toBeDefined();
    expect(screen.getByText('Choose .rm5 file')).toBeDefined();
    // Step indicator shows all 4 steps
    expect(screen.getByText('Upload')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Select')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <RevManImportWizard guidelineId="gl-1" picoId="pico-1" onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls parseRevMan.mutate when a file is chosen', () => {
    renderWithQuery(
      <RevManImportWizard guidelineId="gl-1" picoId="pico-1" />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['<RevMan/>'], 'test.rm5', { type: 'application/xml' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockParseRevManMutate).toHaveBeenCalledOnce();
    expect(mockParseRevManMutate).toHaveBeenCalledWith(
      { file },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('advances to the preview step after successful parse and shows comparison data', () => {
    // Intercept the mutate call and immediately invoke onSuccess with fake data
    mockParseRevManMutate.mockImplementation((_vars: unknown, { onSuccess }: { onSuccess: (res: { data: { title: string; comparisons: Array<{ name: string; outcomes: Array<{ name: string; type: string; studies: unknown[] }> }> } }) => void }) => {
      onSuccess({
        data: {
          title: 'My RevMan Review',
          comparisons: [
            {
              name: 'Comparison A',
              outcomes: [
                { name: 'Outcome 1', type: 'DICHOTOMOUS', studies: [{}, {}] },
              ],
            },
          ],
        },
      });
    });

    renderWithQuery(
      <RevManImportWizard guidelineId="gl-1" picoId="pico-1" />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['<RevMan/>'], 'test.rm5', { type: 'application/xml' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should now show preview step content
    expect(screen.getByText(/Found/)).toBeDefined();
    expect(screen.getByText('My RevMan Review')).toBeDefined();
    expect(screen.getByText('Comparison A')).toBeDefined();
    expect(screen.getByText('Select Comparisons')).toBeDefined();
  });

  it('does not render a close button when onClose is not provided', () => {
    renderWithQuery(
      <RevManImportWizard guidelineId="gl-1" picoId="pico-1" />,
    );
    expect(screen.queryByLabelText('Close')).toBeNull();
  });
});
