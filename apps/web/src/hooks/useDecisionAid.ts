import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface DecisionAidOutcome {
  id: string;
  title: string;
  outcomeType: string;
  importance: number | null;
  ordering: number;
  certaintyOverall: string | null;
  effectMeasure: string | null;
  relativeEffect: number | null;
  relativeEffectLower: number | null;
  relativeEffectUpper: number | null;
  baselineRisk: number | null;
  absoluteEffectIntervention: number | null;
  absoluteEffectComparison: number | null;
  interventionParticipants: number | null;
  comparisonParticipants: number | null;
  numberOfStudies: number | null;
  plainLanguageSummary: string | null;
}

export interface DecisionAidPracticalIssue {
  id: string;
  category: string;
  title: string;
  description: unknown | null;
}

export interface DecisionAidPico {
  id: string;
  population: string;
  intervention: string;
  comparator: string;
  narrativeSummary: unknown | null;
  outcomes: DecisionAidOutcome[];
  practicalIssues: DecisionAidPracticalIssue[];
}

export interface DecisionAidData {
  recommendation: {
    id: string;
    title: string | null;
    description: unknown;
    strength: string | null;
    recommendationType: string | null;
    remark: unknown | null;
    rationale: unknown | null;
    practicalInfo: unknown | null;
    certaintyOfEvidence: string | null;
  };
  picos: DecisionAidPico[];
}

export function useDecisionAid(recommendationId: string | null) {
  return useQuery({
    queryKey: ['decision-aid', recommendationId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/recommendations/${recommendationId}/decision-aid`);
      return data as DecisionAidData;
    },
    enabled: !!recommendationId,
  });
}
