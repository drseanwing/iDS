import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DeleteRecommendationVars {
  id: string;
  guidelineId: string;
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteRecommendationVars) =>
      apiClient.delete(`/recommendations/${id}`).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', guidelineId] });
    },
  });
}
