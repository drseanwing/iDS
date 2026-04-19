import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DecisionAidPreview } from './DecisionAidPreview';

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

function aidResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      recommendation: {
        id: 'rec-1',
        title: 'Use Drug X for adults',
        description: null,
        strength: 'STRONG_FOR',
        recommendationType: 'GRADE',
        remark: null,
        rationale: null,
        practicalInfo: null,
        certaintyOfEvidence: 'HIGH',
      },
      picos: [],
      ...overrides,
    },
  };
}

describe('DecisionAidPreview', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders all three layer tabs after data loads', async () => {
    getMock.mockResolvedValue(aidResponse());
    renderWithQuery(<DecisionAidPreview recommendationId="rec-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Overview' })).toBeDefined(),
    );
    expect(screen.getAllByRole('button', { name: 'Benefits & Harms' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Full Evidence' })).toBeDefined();
  });

  it('shows strength and title in Overview layer', async () => {
    getMock.mockResolvedValue(aidResponse());
    renderWithQuery(<DecisionAidPreview recommendationId="rec-1" />);
    await waitFor(() =>
      expect(screen.getByText(/Strong For recommendation/i)).toBeDefined(),
    );
    expect(screen.getByText('Use Drug X for adults')).toBeDefined();
  });

  it('shows an empty-PICOs notice when no PICOs are linked', async () => {
    getMock.mockResolvedValue(aidResponse());
    renderWithQuery(<DecisionAidPreview recommendationId="rec-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(/No PICO questions have been linked/i),
      ).toBeDefined(),
    );
  });

  it('switches to Benefits & Harms layer when its tab is clicked', async () => {
    getMock.mockResolvedValue(
      aidResponse({
        picos: [
          {
            id: 'p-1',
            population: 'Adults with hypertension',
            intervention: 'Drug X',
            comparator: 'Placebo',
            narrativeSummary: null,
            outcomes: [],
            practicalIssues: [],
          },
        ],
      }),
    );
    renderWithQuery(<DecisionAidPreview recommendationId="rec-1" />);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Benefits & Harms' }).length).toBeGreaterThan(0),
    );
    // Click the tab (first button with this name); the other is an inline link.
    fireEvent.click(screen.getAllByRole('button', { name: 'Benefits & Harms' })[0]);
    expect(screen.getByText('Adults with hypertension')).toBeDefined();
    expect(screen.getByText('Drug X')).toBeDefined();
  });

  it('renders an error state when the API fails', async () => {
    getMock.mockRejectedValue(new Error('boom'));
    renderWithQuery(<DecisionAidPreview recommendationId="rec-1" />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load decision aid data/i)).toBeDefined(),
    );
  });
});
