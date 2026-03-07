import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface ChecklistItem {
  id: string;
  milestoneId: string;
  title: string;
  category: 'AGREE_II' | 'SNAP_IT' | 'CUSTOM';
  isChecked: boolean;
  checkedBy?: string;
  checkedAt?: string;
  ordering: number;
}

export interface Milestone {
  id: string;
  guidelineId: string;
  title: string;
  targetDate?: string;
  responsiblePerson?: string;
  isCompleted: boolean;
  ordering: number;
  createdAt: string;
  items?: ChecklistItem[];
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedMilestonesResponse {
  data: Milestone[];
  meta: PaginatedMeta;
}

export function useMilestones(guidelineId: string) {
  return useQuery({
    queryKey: ['milestones', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedMilestonesResponse>(
        `/milestones?guidelineId=${guidelineId}`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => response.data,
  });
}

interface CreateMilestoneVars {
  guidelineId: string;
  title: string;
  targetDate?: string;
  responsiblePerson?: string;
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateMilestoneVars) =>
      apiClient.post<Milestone>('/milestones', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['milestones', vars.guidelineId] });
    },
  });
}

interface UpdateMilestoneVars {
  id: string;
  guidelineId: string;
  title?: string;
  targetDate?: string;
  responsiblePerson?: string;
  isCompleted?: boolean;
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId: _guidelineId, ...body }: UpdateMilestoneVars) =>
      apiClient.put<Milestone>(`/milestones/${id}`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['milestones', vars.guidelineId] });
    },
  });
}

interface DeleteMilestoneVars {
  id: string;
  guidelineId: string;
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteMilestoneVars) =>
      apiClient.delete(`/milestones/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['milestones', vars.guidelineId] });
    },
  });
}

interface ToggleChecklistItemVars {
  itemId: string;
  guidelineId: string;
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId }: ToggleChecklistItemVars) =>
      apiClient.put(`/milestones/items/${itemId}/toggle`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['milestones', vars.guidelineId] });
    },
  });
}
