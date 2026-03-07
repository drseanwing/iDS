import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface VersionSnapshot {
  id: string;
  versionNumber: string;
  versionType: string;
  publishedAt: string;
  comment: string | null;
  snapshotBundle: any;
}

export interface VersionCompareResult {
  v1: VersionSnapshot;
  v2: VersionSnapshot;
}

export function useVersionCompare(v1Id: string | null, v2Id: string | null) {
  return useQuery({
    queryKey: ['version-compare', v1Id, v2Id],
    queryFn: async () => {
      const { data } = await apiClient.get<VersionCompareResult>(
        `/versions/compare?v1=${v1Id}&v2=${v2Id}`,
      );
      return data;
    },
    enabled: !!v1Id && !!v2Id && v1Id !== v2Id,
  });
}
