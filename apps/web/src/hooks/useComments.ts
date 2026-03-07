import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Comment {
  id: string;
  recommendationId: string;
  parentId?: string;
  userId: string;
  content: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  replies: Comment[];
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse {
  data: Comment[];
  meta: PaginatedMeta;
}

export function useComments(recommendationId: string | null) {
  return useQuery({
    queryKey: ['comments', recommendationId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse>(
        `/comments?recommendationId=${recommendationId}&page=1&limit=50`,
      );
      return data;
    },
    enabled: !!recommendationId,
    select: (response) => ({
      comments: response.data,
      meta: response.meta,
    }),
  });
}

interface CreateCommentVars {
  recommendationId: string;
  content: string;
  parentId?: string;
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateCommentVars) =>
      apiClient.post('/comments', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['comments', vars.recommendationId] });
    },
  });
}

interface UpdateCommentStatusVars {
  id: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  recommendationId: string;
}

export function useUpdateCommentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: UpdateCommentStatusVars) =>
      apiClient.put(`/comments/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['comments', vars.recommendationId] });
    },
  });
}

interface DeleteCommentVars {
  id: string;
  recommendationId: string;
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteCommentVars) =>
      apiClient.delete(`/comments/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['comments', vars.recommendationId] });
    },
  });
}
