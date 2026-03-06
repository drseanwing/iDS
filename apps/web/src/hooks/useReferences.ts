import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Reference {
  id: string;
  guidelineId: string;
  title: string;
  authors?: string | null;
  year?: number | null;
  abstract?: string | null;
  pubmedId?: string | null;
  doi?: string | null;
  url?: string | null;
  studyType: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useReferences(guidelineId: string | null) {
  return useQuery({
    queryKey: ['references', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get('/references', {
        params: { guidelineId, limit: 200 },
      });
      return (data?.data ?? data ?? []) as Reference[];
    },
    enabled: !!guidelineId,
  });
}
