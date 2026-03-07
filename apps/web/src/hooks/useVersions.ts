import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Version {
  id: string;
  versionNumber: string;
  versionType: 'MAJOR' | 'MINOR';
  comment: string | null;
  isPublic: boolean;
  publishedAt: string;
  publishedBy: string;
  publisherName: string;
  pdfS3Key: string | null;
  jsonS3Key: string | null;
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse {
  data: Version[];
  meta: PaginatedMeta;
}

export function useVersions(guidelineId: string | null) {
  return useQuery({
    queryKey: ['versions', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse>(
        `/versions?guidelineId=${guidelineId}`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => ({
      versions: response.data,
      meta: response.meta,
    }),
  });
}
