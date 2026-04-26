import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PubmedLookupWidget } from './PubmedLookupWidget';

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

const sampleResult = {
  pubmedId: '12345678',
  title: 'Effect of aspirin on cardiovascular outcomes',
  authors: 'Smith J, Jones A, Brown B',
  year: 2022,
  abstract:
    'This study examines the long-term effect of aspirin on cardiovascular outcomes in a population-based cohort.',
  doi: '10.1016/j.example.2022.01.001',
  studyType: 'OTHER' as const,
};

describe('PubmedLookupWidget', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders PMID input and Lookup button', () => {
    renderWithQuery(<PubmedLookupWidget onAddReference={vi.fn()} />);
    expect(screen.getByPlaceholderText('Enter PMID…')).toBeDefined();
    expect(screen.getByRole('button', { name: /lookup/i })).toBeDefined();
  });

  it('lookup triggers hook fetch when Lookup button is clicked', async () => {
    getMock.mockResolvedValue({ data: sampleResult });
    renderWithQuery(<PubmedLookupWidget onAddReference={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter PMID…');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith('/references/pubmed-lookup/12345678'),
    );
  });

  it('shows citation card with title, authors, year and abstract preview after lookup', async () => {
    getMock.mockResolvedValue({ data: sampleResult });
    renderWithQuery(<PubmedLookupWidget onAddReference={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter PMID…');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() =>
      expect(screen.getByText('Effect of aspirin on cardiovascular outcomes')).toBeDefined(),
    );
    expect(screen.getByText('Smith J, Jones A, Brown B')).toBeDefined();
    expect(screen.getByText('2022')).toBeDefined();
    // Abstract is short enough to show in full
    expect(screen.getByText(/aspirin on cardiovascular/i)).toBeDefined();
  });

  it('calls onAddReference with result data when Add to references is clicked', async () => {
    getMock.mockResolvedValue({ data: sampleResult });
    const onAddReference = vi.fn();
    renderWithQuery(<PubmedLookupWidget onAddReference={onAddReference} />);

    const input = screen.getByPlaceholderText('Enter PMID…');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to references/i })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to references/i }));

    expect(onAddReference).toHaveBeenCalledWith({
      title: sampleResult.title,
      authors: sampleResult.authors,
      year: sampleResult.year,
      abstract: sampleResult.abstract,
      doi: sampleResult.doi,
      pubmedId: sampleResult.pubmedId,
      studyType: sampleResult.studyType,
    });
  });

  it('shows error state when lookup fails', async () => {
    getMock.mockRejectedValue(new Error('Network error'));
    renderWithQuery(<PubmedLookupWidget onAddReference={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter PMID…');
    fireEvent.change(input, { target: { value: '99999999' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() => expect(screen.getByText('Network error')).toBeDefined());
  });
});
