import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateOutcomeVars {
  id: string;
  guidelineId: string;
  data: {
    title?: string;
    outcomeType?: string;
    state?: string;
    importance?: number;
    ordering?: number;
    // Effect data
    effectMeasure?: string;
    relativeEffect?: number;
    relativeEffectLower?: number;
    relativeEffectUpper?: number;
    baselineRisk?: number;
    absoluteEffectIntervention?: number;
    absoluteEffectComparison?: number;
    interventionParticipants?: number;
    comparisonParticipants?: number;
    numberOfStudies?: number;
    // Continuous outcome specifics
    continuousUnit?: string;
    continuousScaleLower?: number;
    continuousScaleUpper?: number;
    // GRADE assessment
    certaintyOverall?: string;
    riskOfBias?: string;
    inconsistency?: string;
    indirectness?: string;
    imprecision?: string;
    publicationBias?: string;
    largeEffect?: string;
    doseResponse?: string;
    plausibleConfounding?: string;
    // Plain language summary
    plainLanguageSummary?: string;
  };
}

export function useUpdateOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateOutcomeVars) =>
      apiClient.put(`/outcomes/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
