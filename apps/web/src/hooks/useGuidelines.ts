import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useGuidelines(organizationId?: string) {
  return useQuery({
    queryKey: ['guidelines', organizationId],
    queryFn: async () => {
      const params = organizationId ? { organizationId } : {};
      const { data } = await apiClient.get('/guidelines', { params });
      return data;
    },
  });
}
