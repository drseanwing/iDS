import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeleteSectionVars {
  id: string;
  guidelineId: string;
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteSectionVars) =>
      apiClient.delete(`/sections/${id}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['sections', guidelineId] });
    },
  });
}
