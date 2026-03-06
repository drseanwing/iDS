import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeleteReferenceVars {
  id: string;
  guidelineId: string;
}

export function useDeleteReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteReferenceVars) =>
      apiClient.delete(`/references/${id}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['references', guidelineId] });
    },
  });
}
