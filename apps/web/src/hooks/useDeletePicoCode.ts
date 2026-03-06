import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeletePicoCodeVars {
  picoId: string;
  codeId: string;
  guidelineId: string;
}

export function useDeletePicoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ picoId, codeId }: DeletePicoCodeVars) =>
      apiClient.delete(`/picos/${picoId}/codes/${codeId}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
