import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GradeAssessmentPanel } from './GradeAssessmentPanel';
import type { Outcome } from '../../hooks/usePicos';

// Mock API client so no real HTTP calls are made
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
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

function makeOutcome(overrides: Partial<Outcome> = {}): Outcome {
  return {
    id: 'o-1',
    picoId: 'pico-1',
    title: 'All-cause mortality',
    outcomeType: 'DICHOTOMOUS',
    state: 'FINISHED',
    ordering: 0,
    importance: null,
    effectMeasure: null,
    relativeEffect: null,
    relativeEffectLower: null,
    relativeEffectUpper: null,
    baselineRisk: null,
    absoluteEffectIntervention: null,
    absoluteEffectComparison: null,
    interventionParticipants: null,
    comparisonParticipants: null,
    numberOfStudies: null,
    continuousUnit: null,
    continuousScaleLower: null,
    continuousScaleUpper: null,
    certaintyOverall: null,
    riskOfBias: 'NOT_SERIOUS',
    inconsistency: 'NOT_SERIOUS',
    indirectness: 'NOT_SERIOUS',
    imprecision: 'NOT_SERIOUS',
    publicationBias: 'NOT_SERIOUS',
    largeEffect: 'NONE',
    doseResponse: 'NONE',
    plausibleConfounding: 'NONE',
    plainLanguageSummary: null,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GradeAssessmentPanel', () => {
  it('renders with Effect Data tab active by default', () => {
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );
    // Tabs should be rendered
    expect(screen.getAllByRole('button', { name: /Effect Data/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /GRADE Assessment/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Plain Language/i })).toBeDefined();

    // Effect data fields should be visible
    expect(screen.getByLabelText('Effect measure')).toBeDefined();
    expect(screen.getByLabelText('Relative effect')).toBeDefined();
    expect(screen.getByLabelText('95% CI lower')).toBeDefined();
    expect(screen.getByLabelText('95% CI upper')).toBeDefined();
  });

  it('shows existing effect data values', () => {
    const outcome = makeOutcome({
      effectMeasure: 'RR',
      relativeEffect: 0.75,
      relativeEffectLower: 0.60,
      relativeEffectUpper: 0.93,
      numberOfStudies: 5,
      interventionParticipants: 500,
      comparisonParticipants: 450,
    });
    renderWithQuery(
      <GradeAssessmentPanel outcome={outcome} guidelineId="gl-1" />,
    );

    expect((screen.getByLabelText('Effect measure') as HTMLSelectElement).value).toBe('RR');
    expect((screen.getByLabelText('Relative effect') as HTMLInputElement).value).toBe('0.75');
    expect((screen.getByLabelText('95% CI lower') as HTMLInputElement).value).toBe('0.6');
    expect((screen.getByLabelText('95% CI upper') as HTMLInputElement).value).toBe('0.93');
    expect((screen.getByLabelText('Number of studies') as HTMLInputElement).value).toBe('5');
  });

  it('switches to GRADE Assessment tab', () => {
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /GRADE Assessment/i }));

    // GRADE fields visible
    expect(screen.getByLabelText('Overall certainty of evidence')).toBeDefined();
    expect(screen.getByLabelText('Risk of bias')).toBeDefined();
    expect(screen.getByLabelText('Inconsistency')).toBeDefined();
    expect(screen.getByLabelText('Indirectness')).toBeDefined();
    expect(screen.getByLabelText('Imprecision')).toBeDefined();
    expect(screen.getByLabelText('Publication bias')).toBeDefined();
    expect(screen.getByLabelText('Large effect')).toBeDefined();
    expect(screen.getByLabelText('Dose-response')).toBeDefined();
    expect(screen.getByLabelText('Plausible confounding')).toBeDefined();
  });

  it('shows existing GRADE values on GRADE tab', () => {
    const outcome = makeOutcome({
      certaintyOverall: 'MODERATE',
      riskOfBias: 'SERIOUS',
      inconsistency: 'NOT_SERIOUS',
      largeEffect: 'LARGE',
    });
    renderWithQuery(
      <GradeAssessmentPanel outcome={outcome} guidelineId="gl-1" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /GRADE Assessment/i }));

    expect((screen.getByLabelText('Overall certainty of evidence') as HTMLSelectElement).value).toBe('MODERATE');
    expect((screen.getByLabelText('Risk of bias') as HTMLSelectElement).value).toBe('SERIOUS');
    expect((screen.getByLabelText('Large effect') as HTMLSelectElement).value).toBe('LARGE');
  });

  it('shows certainty badge when certaintyOverall is set', () => {
    const outcome = makeOutcome({ certaintyOverall: 'HIGH' });
    renderWithQuery(
      <GradeAssessmentPanel outcome={outcome} guidelineId="gl-1" />,
    );
    // ⊕⊕⊕⊕ badge shown in tab bar
    expect(screen.getByText('⊕⊕⊕⊕')).toBeDefined();
  });

  it('switches to Plain Language tab', () => {
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Plain Language/i }));
    expect(screen.getByLabelText('Plain language summary')).toBeDefined();
  });

  it('shows existing plain language summary', () => {
    const outcome = makeOutcome({ plainLanguageSummary: 'The treatment reduces mortality.' });
    renderWithQuery(
      <GradeAssessmentPanel outcome={outcome} guidelineId="gl-1" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Plain Language/i }));
    expect((screen.getByLabelText('Plain language summary') as HTMLTextAreaElement).value).toBe('The treatment reduces mortality.');
  });

  it('calls PUT /outcomes/:id when Save effect data is clicked', async () => {
    const { apiClient } = await import('../../lib/api-client');
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );

    fireEvent.change(screen.getByLabelText('Effect measure'), { target: { value: 'OR' } });
    fireEvent.click(screen.getByRole('button', { name: /Save effect data/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/outcomes/o-1',
        expect.objectContaining({ effectMeasure: 'OR' }),
      );
    });
  });

  it('calls PUT /outcomes/:id with GRADE fields when Save GRADE assessment is clicked', async () => {
    const { apiClient } = await import('../../lib/api-client');
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /GRADE Assessment/i }));
    fireEvent.change(screen.getByLabelText('Overall certainty of evidence'), {
      target: { value: 'LOW' },
    });
    fireEvent.change(screen.getByLabelText('Risk of bias'), {
      target: { value: 'VERY_SERIOUS' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save GRADE assessment/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/outcomes/o-1',
        expect.objectContaining({ certaintyOverall: 'LOW', riskOfBias: 'VERY_SERIOUS' }),
      );
    });
  });

  it('calls PUT /outcomes/:id with plain language summary when Save summary is clicked', async () => {
    const { apiClient } = await import('../../lib/api-client');
    renderWithQuery(
      <GradeAssessmentPanel outcome={makeOutcome()} guidelineId="gl-1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Plain Language/i }));
    fireEvent.change(screen.getByLabelText('Plain language summary'), {
      target: { value: 'The drug works well.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save summary/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/outcomes/o-1',
        expect.objectContaining({ plainLanguageSummary: 'The drug works well.' }),
      );
    });
  });

  it('shows continuous unit fields when outcome type is CONTINUOUS', () => {
    const outcome = makeOutcome({ outcomeType: 'CONTINUOUS' });
    renderWithQuery(
      <GradeAssessmentPanel outcome={outcome} guidelineId="gl-1" />,
    );
    expect(screen.getByLabelText('Continuous unit')).toBeDefined();
    expect(screen.getByLabelText('Scale lower bound')).toBeDefined();
    expect(screen.getByLabelText('Scale upper bound')).toBeDefined();
  });
});
