import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface DeletedGuideline {
  id: string;
  title: string;
  shortName?: string;
  status: string;
  isDeleted: boolean;
  updatedAt: string;
}

export interface DeletedSection {
  id: string;
  title: string;
  ordering: number;
  isDeleted: boolean;
  updatedAt: string;
  children: DeletedSection[];
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedGuidelines {
  data: DeletedGuideline[];
  meta: PaginatedMeta;
}

interface PaginatedSections {
  data: DeletedSection[];
  meta: PaginatedMeta;
}

export function useDeletedGuidelines() {
  return useQuery({
    queryKey: ['guidelines', 'deleted'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedGuidelines>(
        '/guidelines?onlyDeleted=true&limit=100',
      );
      return data;
    },
    select: (response) => response.data,
  });
}

export function useDeletedSections(guidelineId: string) {
  return useQuery({
    queryKey: ['sections', 'deleted', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedSections>(
        `/sections?guidelineId=${guidelineId}&onlyDeleted=true&limit=100`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => response.data,
  });
}

export function useRestoreGuideline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/guidelines/${id}/restore`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guidelines'] });
    },
  });
}

export function useRestoreSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; guidelineId: string }) => {
      const { data } = await apiClient.post(`/sections/${id}/restore`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sections', 'deleted', variables.guidelineId] });
      queryClient.invalidateQueries({ queryKey: ['sections', variables.guidelineId] });
    },
  });
}
