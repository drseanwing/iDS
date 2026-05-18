import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';

interface DashboardStats {
  guidelines: number;
  sections: number;
  recommendations: number;
}

export function useDashboardStats() {
  const token = useAuth((state) => state.token);
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/guidelines/stats');
      return data;
    },
    enabled: !!token,
  });
}
