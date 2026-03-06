import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateEtdFactorVars {
  id: string;
  recommendationId: string;
  data: {
    summaryText?: unknown;
    researchEvidence?: unknown;
    additionalConsiderations?: unknown;
    summaryPublic?: boolean;
    evidencePublic?: boolean;
    considerationsPublic?: boolean;
  };
}

export function useUpdateEtdFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateEtdFactorVars) =>
      apiClient.put(`/etd-factors/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { recommendationId }) => {
      void queryClient.invalidateQueries({ queryKey: ['etd-factors', recommendationId] });
    },
  });
}
