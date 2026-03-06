import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateRecommendationVars {
  id: string;
  guidelineId: string;
  data: {
    title?: string;
    description?: unknown;
    remark?: unknown;
    rationale?: unknown;
    practicalInfo?: unknown;
    strength?: string;
    recommendationType?: string;
  };
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateRecommendationVars) =>
      apiClient.put(`/recommendations/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', guidelineId] });
    },
  });
}
