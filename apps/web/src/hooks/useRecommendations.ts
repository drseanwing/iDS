import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Recommendation {
  id: string;
  guidelineId: string;
  sectionId?: string | null;
  title?: string | null;
  description?: unknown;
  strength?: string | null;
  recommendationType?: string | null;
  status: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useRecommendations(guidelineId: string | null) {
  return useQuery({
    queryKey: ['recommendations', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get('/recommendations', {
        params: { guidelineId, limit: 100 },
      });
      return (data?.data ?? data ?? []) as Recommendation[];
    },
    enabled: !!guidelineId,
  });
}
