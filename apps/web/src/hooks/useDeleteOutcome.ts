import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeleteOutcomeVars {
  id: string;
  guidelineId: string;
}

export function useDeleteOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteOutcomeVars) =>
      apiClient.delete(`/outcomes/${id}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
