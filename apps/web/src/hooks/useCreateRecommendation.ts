import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CreateRecommendationVars {
  guidelineId: string;
  title?: string;
  /** When provided, the new recommendation is automatically linked to this section. */
  sectionId?: string;
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: CreateRecommendationVars) => {
      const rec = await apiClient
        .post('/recommendations', {
          guidelineId: vars.guidelineId,
          title: vars.title,
          description: { type: 'doc', content: [] },
        })
        .then((r) => r.data);

      if (vars.sectionId) {
        await apiClient.post('/links/section-recommendations', {
          sectionId: vars.sectionId,
          recommendationId: rec.id,
        });
      }

      return rec;
    },
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', guidelineId] });
    },
  });
}
