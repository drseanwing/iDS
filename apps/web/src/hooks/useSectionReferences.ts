import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Reference } from './useReferences';

export interface SectionReferenceLink {
  sectionId: string;
  referenceId: string;
  ordering: number;
  reference: Reference;
}

export function useSectionReferences(sectionId: string | null) {
  return useQuery({
    queryKey: ['section-references', sectionId],
    queryFn: async () => {
      const { data } = await apiClient.get('/links/section-references', {
        params: { sectionId },
      });
      return (data ?? []) as SectionReferenceLink[];
    },
    enabled: !!sectionId,
  });
}
