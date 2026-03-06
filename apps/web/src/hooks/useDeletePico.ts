import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeletePicoVars {
  id: string;
  guidelineId: string;
}

export function useDeletePico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeletePicoVars) =>
      apiClient.delete(`/picos/${id}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
