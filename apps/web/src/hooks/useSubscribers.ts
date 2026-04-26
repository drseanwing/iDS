import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Subscriber {
  id: string;
  guidelineId: string;
  email: string;
  subscribedAt: string;
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedSubscribersResponse {
  data: Subscriber[];
  meta: PaginatedMeta;
}

export function useSubscribers(guidelineId: string) {
  return useQuery({
    queryKey: ['subscribers', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedSubscribersResponse>(
        `/guidelines/${guidelineId}/subscribers`,
      );
      return data;
    },
    enabled: !!guidelineId,
  });
}

interface SubscribeVars {
  guidelineId: string;
  email: string;
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId, email }: SubscribeVars) =>
      apiClient
        .post<Subscriber>(`/guidelines/${guidelineId}/subscribers`, { email })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['subscribers', vars.guidelineId] });
    },
  });
}

interface UnsubscribeVars {
  id: string;
  guidelineId: string;
}

export function useUnsubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId }: UnsubscribeVars) =>
      apiClient
        .delete(`/guidelines/${guidelineId}/subscribers/${id}`)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['subscribers', vars.guidelineId] });
    },
  });
}
