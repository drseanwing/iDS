import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Tag {
  id: string;
  guidelineId: string;
  name: string;
  color?: string;
}

export function useTags(guidelineId: string) {
  return useQuery({
    queryKey: ['tags', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<Tag[]>(
        `/guidelines/${guidelineId}/tags`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (r) => r,
  });
}

interface CreateTagVars {
  guidelineId: string;
  name: string;
  color?: string;
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId, ...body }: CreateTagVars) =>
      apiClient.post<Tag>(`/guidelines/${guidelineId}/tags`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tags', vars.guidelineId] });
    },
  });
}

interface UpdateTagVars {
  id: string;
  guidelineId: string;
  name?: string;
  color?: string;
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId: _guidelineId, ...body }: UpdateTagVars) =>
      apiClient.put<Tag>(`/guidelines/${_guidelineId}/tags/${id}`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tags', vars.guidelineId] });
    },
  });
}

interface DeleteTagVars {
  id: string;
  guidelineId: string;
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId }: DeleteTagVars) =>
      apiClient.delete(`/guidelines/${guidelineId}/tags/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tags', vars.guidelineId] });
    },
  });
}

interface AddTagToRecommendationVars {
  guidelineId: string;
  recId: string;
  tagId: string;
}

export function useAddTagToRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recId, tagId }: AddTagToRecommendationVars) =>
      apiClient.post(`/recommendations/${recId}/tags/${tagId}`, {}).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', vars.guidelineId] });
    },
  });
}

interface RemoveTagFromRecommendationVars {
  guidelineId: string;
  recId: string;
  tagId: string;
}

export function useRemoveTagFromRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recId, tagId }: RemoveTagFromRecommendationVars) =>
      apiClient.delete(`/recommendations/${recId}/tags/${tagId}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', vars.guidelineId] });
    },
  });
}
