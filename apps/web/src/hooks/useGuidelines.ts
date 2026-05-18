import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';

export function useGuidelines(organizationId?: string) {
  const token = useAuth((state) => state.token);
  return useQuery({
    queryKey: ['guidelines', organizationId],
    queryFn: async () => {
      const params = organizationId ? { organizationId } : {};
      const { data } = await apiClient.get('/guidelines', { params });
      return data;
    },
    enabled: !!token,
  });
}
