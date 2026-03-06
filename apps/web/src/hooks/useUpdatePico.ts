import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdatePicoVars {
  id: string;
  guidelineId: string;
  data: {
    population?: string;
    intervention?: string;
    comparator?: string;
    narrativeSummary?: unknown;
  };
}

export function useUpdatePico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdatePicoVars) =>
      apiClient.put(`/picos/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
