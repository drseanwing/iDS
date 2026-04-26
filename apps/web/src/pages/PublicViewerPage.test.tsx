import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicViewerPage } from './PublicViewerPage';
import { I18nProvider } from '../lib/i18n';

// ---------------------------------------------------------------------------
// Mock api-client
// ---------------------------------------------------------------------------

const getMock = vi.fn();
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>{ui}</I18nProvider>
    </QueryClientProvider>,
  );
}

const onBack = vi.fn();

const sampleGuidelineResponse = {
  guideline: {
    id: 'gl-1',
    title: 'Hypertension Management',
    shortName: 'HTN-2024',
    status: 'PUBLISHED',
    description: 'Evidence-based guidelines for hypertension.',
    isPublic: true,
    updatedAt: '2024-06-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  sections: [
    {
      id: 'sec-1',
      title: 'Introduction',
      parentId: null,
      text: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This section introduces the topic.' }],
          },
        ],
      },
      ordering: 1,
      excludeFromNumbering: false,
      children: [],
    },
    {
      id: 'sec-2',
      title: 'Recommendations',
      parentId: null,
      text: null,
      ordering: 2,
      excludeFromNumbering: false,
      children: [],
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      sectionId: 'sec-2',
      title: 'Use antihypertensives for stage 2 hypertension',
      description: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Recommend pharmacotherapy for stage 2 hypertension.' }],
          },
        ],
      },
      strength: 'STRONG',
    },
  ],
  lastPublishedAt: '2024-06-01T00:00:00.000Z',
  organizationName: 'World Health Organization',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PublicViewerPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    onBack.mockReset();
  });

  it('renders loading skeleton while data is being fetched', () => {
    // Never resolves — keeps loading state
    getMock.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<PublicViewerPage shortName="HTN-2024" onBack={onBack} />);

    expect(screen.getByLabelText('Loading guideline')).toBeDefined();
  });

  it('renders guideline title and sections after data loads', async () => {
    getMock.mockResolvedValue({ data: sampleGuidelineResponse });

    renderWithProviders(<PublicViewerPage shortName="HTN-2024" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getAllByText('Hypertension Management').length).toBeGreaterThan(0);
    });

    // Sections appear (text exists in both TOC links and section headings)
    expect(screen.getAllByText('Introduction').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recommendations').length).toBeGreaterThan(0);

    // Section body text
    expect(screen.getByText('This section introduces the topic.')).toBeDefined();

    // Recommendation
    expect(screen.getByText('Recommend pharmacotherapy for stage 2 hypertension.')).toBeDefined();

    // Strength badge
    expect(screen.getByText('STRONG')).toBeDefined();

    // Organization name
    expect(screen.getByText('World Health Organization')).toBeDefined();

    // Footer published date
    expect(screen.getByText(/Last published/i)).toBeDefined();
  });

  it('shows "Guideline not found" message when API returns 404', async () => {
    const notFoundError = Object.assign(new Error('Not Found'), {
      response: { status: 404 },
    });
    getMock.mockRejectedValue(notFoundError);

    renderWithProviders(<PublicViewerPage shortName="UNKNOWN-SLUG" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('Guideline not found')).toBeDefined();
    });

    expect(screen.getByText(/UNKNOWN-SLUG/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Back to guidelines/i })).toBeDefined();
  });

  it('renders table of contents with top-level section titles', async () => {
    getMock.mockResolvedValue({ data: sampleGuidelineResponse });

    renderWithProviders(<PublicViewerPage shortName="HTN-2024" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeDefined();
    });

    const toc = screen.getByRole('navigation', { name: 'Table of contents' });
    expect(toc.textContent).toContain('Introduction');
    expect(toc.textContent).toContain('Recommendations');
  });

  it('renders status badge for the guideline', async () => {
    getMock.mockResolvedValue({ data: sampleGuidelineResponse });

    renderWithProviders(<PublicViewerPage shortName="HTN-2024" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('PUBLISHED')).toBeDefined();
    });
  });
});
