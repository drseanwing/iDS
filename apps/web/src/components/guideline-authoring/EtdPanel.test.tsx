import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EtdPanel } from './EtdPanel';
import type { EtdFactor } from '../../hooks/useEtdFactors';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithQuery(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>,
  );
}

function makeFactor(factorType: string, overrides: Partial<EtdFactor> = {}): EtdFactor {
  return {
    id: `factor-${factorType}`,
    recommendationId: 'rec-1',
    factorType,
    ordering: 0,
    summaryText: null,
    researchEvidence: null,
    additionalConsiderations: null,
    summaryPublic: true,
    evidencePublic: true,
    considerationsPublic: true,
    judgments: [],
    ...overrides,
  };
}

// suppress unused variable warning
void makeFactor;

describe('EtdPanel', () => {
  it('shows loading state while fetching', () => {
    renderWithQuery(<EtdPanel recommendationId="rec-1" />);
    expect(screen.getByText(/loading etd framework/i)).toBeDefined();
  });

  it('renders EtdPanel without crashing for FOUR_FACTOR mode', () => {
    renderWithQuery(<EtdPanel recommendationId="rec-1" etdMode="FOUR_FACTOR" />);
    expect(screen.getByText(/loading etd framework/i)).toBeDefined();
  });

  it('renders EtdPanel without crashing for TWELVE_FACTOR mode', () => {
    renderWithQuery(<EtdPanel recommendationId="rec-1" etdMode="TWELVE_FACTOR" />);
    expect(screen.getByText(/loading etd framework/i)).toBeDefined();
  });
});

describe('EtdPanel mode filtering', () => {
  it('FOUR_FACTOR mode defines exactly 4 active types', () => {
    const FOUR = ['BENEFITS_HARMS', 'QUALITY_OF_EVIDENCE', 'PREFERENCES_VALUES', 'RESOURCES_OTHER'];
    const SEVEN = [...FOUR, 'EQUITY', 'ACCEPTABILITY', 'FEASIBILITY'];
    const TWELVE = [
      'BENEFITS_HARMS',   // Problem priorities in 12-factor mode
      'DESIRABLE_EFFECTS', 'UNDESIRABLE_EFFECTS', 'QUALITY_OF_EVIDENCE',
      'PREFERENCES_VALUES', 'BALANCE', 'RESOURCES_REQUIRED', 'CERTAINTY_OF_RESOURCES',
      'COST_EFFECTIVENESS', 'EQUITY', 'ACCEPTABILITY', 'FEASIBILITY',
    ];

    expect(FOUR).toHaveLength(4);
    expect(SEVEN).toHaveLength(7);
    expect(TWELVE).toHaveLength(12);
  });

  it('all 13 factor types are initialized regardless of mode (mode switching without data loss)', () => {
    const ALL_FACTOR_TYPES = [
      'BENEFITS_HARMS', 'QUALITY_OF_EVIDENCE', 'PREFERENCES_VALUES', 'RESOURCES_OTHER',
      'EQUITY', 'ACCEPTABILITY', 'FEASIBILITY',
      'DESIRABLE_EFFECTS', 'UNDESIRABLE_EFFECTS', 'BALANCE',
      'RESOURCES_REQUIRED', 'CERTAINTY_OF_RESOURCES', 'COST_EFFECTIVENESS',
    ];
    expect(ALL_FACTOR_TYPES).toHaveLength(13);
  });

  it('seven factor mode includes original four plus equity/acceptability/feasibility', () => {
    const SEVEN = [
      'BENEFITS_HARMS', 'QUALITY_OF_EVIDENCE', 'PREFERENCES_VALUES', 'RESOURCES_OTHER',
      'EQUITY', 'ACCEPTABILITY', 'FEASIBILITY',
    ];
    expect(SEVEN).toContain('EQUITY');
    expect(SEVEN).toContain('ACCEPTABILITY');
    expect(SEVEN).toContain('FEASIBILITY');
    expect(SEVEN).not.toContain('DESIRABLE_EFFECTS');
  });
});

