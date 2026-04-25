import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShadowOutcomePanel } from './ShadowOutcomePanel';
import type { ShadowOutcome } from '../../hooks/useShadowOutcomes';

// ── Mock hooks ──────────────────────────────────────────────────────────────

const mockCreateShadow = vi.fn();
const mockPromoteShadow = vi.fn();
const mockDeleteShadow = vi.fn();

let mockShadows: ShadowOutcome[] = [];
let mockIsLoading = false;
let mockIsError = false;

vi.mock('../../hooks/useShadowOutcomes', () => ({
  useShadowOutcomes: () => ({
    data: mockShadows,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
  useCreateShadow: () => ({
    mutate: mockCreateShadow,
    isPending: false,
  }),
  usePromoteShadow: () => ({
    mutate: mockPromoteShadow,
    isPending: false,
  }),
  useDeleteShadow: () => ({
    mutate: mockDeleteShadow,
    isPending: false,
  }),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
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

function makeShadow(overrides: Partial<ShadowOutcome> = {}): ShadowOutcome {
  return {
    id: 'shadow-1',
    picoId: 'pico-1',
    title: 'Test Shadow',
    outcomeType: 'DICHOTOMOUS',
    effectMeasure: 'RR',
    relativeEffect: 0.75,
    relativeEffectLower: 0.5,
    relativeEffectUpper: 1.1,
    participants: 200,
    numberOfStudies: 4,
    certaintyOverall: 'MODERATE',
    plainLanguageSummary: 'Some plain language text.',
    isShadow: true,
    shadowOfId: 'outcome-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ShadowOutcomePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShadows = [];
    mockIsLoading = false;
    mockIsError = false;
  });

  it('renders the Evidence Updates heading and Create Shadow button', () => {
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );
    expect(screen.getByText('Evidence Updates')).toBeDefined();
    expect(screen.getByText('Create Shadow')).toBeDefined();
  });

  it('shows empty state when there are no shadow outcomes', () => {
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );
    expect(screen.getByText('No shadow outcomes.')).toBeDefined();
    expect(screen.getByText(/Create one to review updated evidence/)).toBeDefined();
  });

  it('shows an error message when the query fails', () => {
    mockIsError = true;
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );
    expect(screen.getByText('Failed to load shadow outcomes.')).toBeDefined();
  });

  it('renders shadow cards when shadows are returned', () => {
    mockShadows = [makeShadow()];
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );
    expect(screen.getByText('Shadow of: Mortality')).toBeDefined();
    expect(screen.getByText('Pending review')).toBeDefined();
    // Certainty badge
    expect(screen.getByText('Moderate')).toBeDefined();
    // Plain language summary
    expect(screen.getByText('Some plain language text.')).toBeDefined();
  });

  it('calls createShadow mutate when Create Shadow button is clicked', () => {
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-42" outcomeTitle="Adverse events" />,
    );
    fireEvent.click(screen.getByText('Create Shadow'));
    expect(mockCreateShadow).toHaveBeenCalledOnce();
    expect(mockCreateShadow).toHaveBeenCalledWith({ outcomeId: 'outcome-42' });
  });

  it('calls promote mutate after user confirms the promote dialog', () => {
    mockShadows = [makeShadow()];
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );

    fireEvent.click(screen.getByText('Promote'));
    expect(mockPromoteShadow).toHaveBeenCalledOnce();
    expect(mockPromoteShadow).toHaveBeenCalledWith({ outcomeId: 'shadow-1' });
  });

  it('does not call promote mutate when the user cancels the confirm dialog', () => {
    mockShadows = [makeShadow()];
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );

    fireEvent.click(screen.getByText('Promote'));
    expect(mockPromoteShadow).not.toHaveBeenCalled();
  });

  it('shows the count badge when there are multiple shadows', () => {
    mockShadows = [makeShadow({ id: 'shadow-1' }), makeShadow({ id: 'shadow-2' })];
    renderWithQuery(
      <ShadowOutcomePanel outcomeId="outcome-1" outcomeTitle="Mortality" />,
    );
    expect(screen.getByText('2')).toBeDefined();
  });
});
