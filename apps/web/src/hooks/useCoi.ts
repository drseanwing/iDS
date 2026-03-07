import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface CoiRecord {
  id: string;
  guidelineId: string;
  userId: string;
  disclosureText?: string;
  conflictType?: string;
  interventions?: unknown;
  isExcludedFromVoting: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedCoiResponse {
  data: CoiRecord[];
  meta: PaginatedMeta;
}

export function useCoi(guidelineId: string) {
  return useQuery({
    queryKey: ['coi', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedCoiResponse>(
        `/coi?guidelineId=${guidelineId}`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => response.data,
  });
}

interface CreateCoiVars {
  guidelineId: string;
  userId: string;
  disclosureText?: string;
  conflictType?: string;
  interventions?: unknown;
  isExcludedFromVoting?: boolean;
}

export function useCreateCoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateCoiVars) =>
      apiClient.post<CoiRecord>('/coi', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['coi', vars.guidelineId] });
    },
  });
}

interface UpdateCoiVars {
  id: string;
  guidelineId: string;
  disclosureText?: string;
  conflictType?: string;
  interventions?: unknown;
  isExcludedFromVoting?: boolean;
}

export function useUpdateCoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId: _guidelineId, ...body }: UpdateCoiVars) =>
      apiClient.put<CoiRecord>(`/coi/${id}`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['coi', vars.guidelineId] });
    },
  });
}

interface DeleteCoiVars {
  id: string;
  guidelineId: string;
}

export function useDeleteCoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteCoiVars) =>
      apiClient.delete(`/coi/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['coi', vars.guidelineId] });
    },
  });
}
