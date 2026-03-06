import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface EtdJudgment {
  id: string;
  etdFactorId: string;
  interventionLabel: string;
  judgment: string | null;
  colorCode: string | null;
}

export interface EtdFactor {
  id: string;
  recommendationId: string;
  factorType: string;
  ordering: number;
  summaryText: unknown | null;
  researchEvidence: unknown | null;
  additionalConsiderations: unknown | null;
  summaryPublic: boolean;
  evidencePublic: boolean;
  considerationsPublic: boolean;
  judgments: EtdJudgment[];
}

export function useEtdFactors(recommendationId: string | null) {
  return useQuery({
    queryKey: ['etd-factors', recommendationId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/recommendations/${recommendationId}/etd`);
      return data as EtdFactor[];
    },
    enabled: !!recommendationId,
  });
}
