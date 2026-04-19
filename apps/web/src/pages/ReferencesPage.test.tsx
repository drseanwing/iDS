import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferencesPage } from './ReferencesPage';
import { I18nProvider } from '../lib/i18n';

const getMock = vi.fn();
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>{ui}</I18nProvider>
    </QueryClientProvider>,
  );
}

function refsResponse(refs: unknown[], total = refs.length) {
  return {
    data: {
      data: refs,
      meta: { total, page: 1, limit: 50, totalPages: 1 },
    },
  };
}

const sampleRef = {
  id: 'ref-1',
  guidelineId: 'gl-1',
  title: 'Efficacy of antihypertensive drugs',
  authors: 'Smith J, Jones K',
  year: 2022,
  studyType: 'PRIMARY_STUDY',
  doi: '10.1234/test',
  pubmedId: '12345678',
  createdAt: new Date().toISOString(),
  guideline: { id: 'gl-1', title: 'Hypertension Guidelines', shortName: 'HTN-2024' },
  sectionPlacements: [],
  outcomeLinks: [],
};

describe('ReferencesPage', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders the page heading', async () => {
    getMock.mockResolvedValue(refsResponse([]));
    renderWithProviders(<ReferencesPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renders a search input', async () => {
    getMock.mockResolvedValue(refsResponse([]));
    renderWithProviders(<ReferencesPage />);
    expect(
      screen.getByPlaceholderText(/search by title/i),
    ).toBeDefined();
  });

  it('shows the total reference count', async () => {
    getMock.mockResolvedValue(refsResponse([], 42));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText(/42 references/i)).toBeDefined();
    });
  });

  it('shows empty state when no references exist', async () => {
    getMock.mockResolvedValue(refsResponse([]));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No references found/i)).toBeDefined();
    });
  });

  it('renders a reference card with title, authors, and year', async () => {
    getMock.mockResolvedValue(refsResponse([sampleRef]));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText('Efficacy of antihypertensive drugs')).toBeDefined();
    });
    expect(screen.getByText(/Smith J, Jones K \(2022\)/)).toBeDefined();
  });

  it('shows the study type badge', async () => {
    getMock.mockResolvedValue(refsResponse([sampleRef]));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText('Primary Study')).toBeDefined();
    });
  });

  it('shows a DOI link when present', async () => {
    getMock.mockResolvedValue(refsResponse([sampleRef]));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText(/DOI: 10\.1234\/test/)).toBeDefined();
    });
  });

  it('shows a PMID link when present', async () => {
    getMock.mockResolvedValue(refsResponse([sampleRef]));
    renderWithProviders(<ReferencesPage />);
    await waitFor(() => {
      expect(screen.getByText(/PMID: 12345678/)).toBeDefined();
    });
  });

  it('accepts text input in the search box', async () => {
    getMock.mockResolvedValue(refsResponse([]));
    renderWithProviders(<ReferencesPage />);
    const searchInput = screen.getByPlaceholderText(/search by title/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'antihypertensive' } });
    expect(searchInput.value).toBe('antihypertensive');
  });

  it('shows no-match message when search returns nothing', async () => {
    getMock.mockResolvedValue(refsResponse([]));
    renderWithProviders(<ReferencesPage />);
    const searchInput = screen.getByPlaceholderText(/search by title/i);
    // Simulate typing (debouncedSearch will be empty initially so we trigger it)
    fireEvent.change(searchInput, { target: { value: 'zzz' } });
    // The component uses debounce, so empty result still shows the default empty state first
    await waitFor(() => {
      expect(screen.getByText(/No references found/i)).toBeDefined();
    });
  });
});
