import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface DashboardStats {
  guidelines: number;
  sections: number;
  recommendations: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/guidelines/stats');
      return data;
    },
  });
}
