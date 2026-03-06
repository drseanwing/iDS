import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Section {
  id: string;
  guidelineId: string;
  title: string;
  parentId?: string | null;
  text?: unknown;
  ordering: number;
  excludeFromNumbering: boolean;
  isDeleted: boolean;
  children: Section[];
  createdAt: string;
  updatedAt: string;
}

export function useSections(guidelineId: string | null) {
  return useQuery({
    queryKey: ['sections', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get('/sections', {
        params: { guidelineId, limit: 100 },
      });
      // API returns paginated result: { data, meta }
      return (data?.data ?? data ?? []) as Section[];
    },
    enabled: !!guidelineId,
  });
}
