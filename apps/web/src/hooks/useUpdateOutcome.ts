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
    certaintyOverall?: string;
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
