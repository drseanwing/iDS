import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Guideline } from './useGuideline';

export interface PublicSection {
  id: string;
  title: string;
  parentId?: string | null;
  text?: unknown;
  ordering: number;
  excludeFromNumbering: boolean;
  children: PublicSection[];
}

export interface PublicRecommendation {
  id: string;
  sectionId?: string | null;
  title?: string | null;
  description?: unknown;
  strength?: string | null;
}

export interface PublicGuidelineResponse {
  guideline: Guideline;
  sections: PublicSection[];
  recommendations: PublicRecommendation[];
  lastPublishedAt?: string | null;
  organizationName?: string | null;
}

export function usePublicGuidelineBySlug(shortName: string | null) {
  return useQuery({
    queryKey: ['public-guideline', shortName],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicGuidelineResponse>(
        `/guidelines/by-slug/${shortName}`,
      );
      return data;
    },
    enabled: !!shortName,
    retry: (failureCount, error) => {
      // Don't retry on 404
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}
