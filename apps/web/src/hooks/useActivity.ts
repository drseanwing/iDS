import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface ActivityEntry {
  id: string;
  guidelineId: string;
  userId: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  entityTitle?: string;
  changeDetails?: Record<string, unknown>;
  comment?: string;
  timestamp: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface ActivityFilters {
  userId?: string;
  entityType?: string;
  actionType?: string;
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse {
  data: ActivityEntry[];
  meta: PaginatedMeta;
}

export function useActivity(
  guidelineId: string | null,
  filters?: ActivityFilters,
  page: number = 1,
  limit: number = 20,
) {
  return useQuery({
    queryKey: ['activity', guidelineId, filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (guidelineId) params.set('guidelineId', guidelineId);
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.entityType) params.set('entityType', filters.entityType);
      if (filters?.actionType) params.set('actionType', filters.actionType);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const { data } = await apiClient.get<PaginatedResponse>(
        `/activity?${params.toString()}`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => ({
      entries: response.data,
      meta: response.meta,
    }),
  });
}
