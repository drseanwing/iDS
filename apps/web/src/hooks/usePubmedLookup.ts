import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface PubmedResult {
  pubmedId: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  doi: string | null;
  studyType: 'OTHER';
}

export function usePubmedLookup(pmid: string | null) {
  return useQuery({
    queryKey: ['pubmed-lookup', pmid],
    queryFn: async () => {
      const { data } = await apiClient.get<PubmedResult>(
        `/references/pubmed-lookup/${pmid}`,
      );
      return data;
    },
    enabled: !!pmid,
  });
}
