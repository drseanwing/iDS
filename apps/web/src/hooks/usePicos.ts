import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface PicoCode {
  id: string;
  picoId: string;
  codeSystem: string;
  code: string;
  display: string;
  element: string;
}

export interface Outcome {
  id: string;
  picoId: string;
  title: string;
  outcomeType: string;
  state: string;
  ordering: number;
  importance?: number | null;

  // Effect data
  effectMeasure?: string | null;
  relativeEffect?: number | null;
  relativeEffectLower?: number | null;
  relativeEffectUpper?: number | null;
  baselineRisk?: number | null;
  absoluteEffectIntervention?: number | null;
  absoluteEffectComparison?: number | null;
  interventionParticipants?: number | null;
  comparisonParticipants?: number | null;
  numberOfStudies?: number | null;

  // Continuous outcome specifics
  continuousUnit?: string | null;
  continuousScaleLower?: number | null;
  continuousScaleUpper?: number | null;

  // GRADE assessment
  certaintyOverall?: string | null;
  riskOfBias?: string | null;
  inconsistency?: string | null;
  indirectness?: string | null;
  imprecision?: string | null;
  publicationBias?: string | null;
  largeEffect?: string | null;
  doseResponse?: string | null;
  plausibleConfounding?: string | null;

  // Plain language summary
  plainLanguageSummary?: string | null;

  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pico {
  id: string;
  guidelineId: string;
  population: string;
  intervention: string;
  comparator: string;
  narrativeSummary?: unknown;
  outcomes: Outcome[];
  codes: PicoCode[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function usePicos(guidelineId: string | null) {
  return useQuery({
    queryKey: ['picos', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get('/picos', {
        params: { guidelineId, limit: 100 },
      });
      return (data?.data ?? data ?? []) as Pico[];
    },
    enabled: !!guidelineId,
  });
}
