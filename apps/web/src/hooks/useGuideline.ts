import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Guideline {
  id: string;
  title: string;
  shortName?: string;
  status: string;
  description?: string;
  organizationId?: string;
  language?: string;
  guidelineType?: string;
  showSectionNumbers?: boolean;
  updatedAt: string;
  createdAt: string;
}

export function useGuideline(id: string | null) {
  return useQuery({
    queryKey: ['guideline', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Guideline>(`/guidelines/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
