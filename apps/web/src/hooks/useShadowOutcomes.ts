import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface ShadowOutcome {
  id: string;
  picoId: string;
  title: string;
  outcomeType: string;
  effectMeasure?: string;
  relativeEffect?: number;
  relativeEffectLower?: number;
  relativeEffectUpper?: number;
  baselineRisk?: number;
  absoluteEffect?: number;
  participants?: number;
  numberOfStudies?: number;
  certaintyOverall?: string;
  riskOfBias?: string;
  inconsistency?: string;
  indirectness?: string;
  imprecision?: string;
  publicationBias?: string;
  plainLanguageSummary?: string;
  isShadow: true;
  shadowOfId: string;
  createdAt: string;
  updatedAt: string;
}

export function useShadowOutcomes(outcomeId: string) {
  return useQuery({
    queryKey: ['shadows', outcomeId],
    queryFn: async () => {
      const { data } = await apiClient.get<ShadowOutcome[]>(
        `/outcomes/${outcomeId}/shadows`,
      );
      return data;
    },
    enabled: !!outcomeId,
  });
}

interface CreateShadowVars {
  outcomeId: string;
}

export function useCreateShadow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ outcomeId }: CreateShadowVars) =>
      apiClient.post<ShadowOutcome>(`/outcomes/${outcomeId}/shadow`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['shadows', vars.outcomeId] });
    },
  });
}

interface PromoteShadowVars {
  outcomeId: string;
}

export function usePromoteShadow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ outcomeId }: PromoteShadowVars) =>
      apiClient.post(`/outcomes/${outcomeId}/promote`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['shadows', vars.outcomeId] });
      void queryClient.invalidateQueries({ queryKey: ['outcomes'] });
    },
  });
}

interface DeleteShadowVars {
  outcomeId: string;
  shadowId: string;
}

export function useDeleteShadow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shadowId }: DeleteShadowVars) =>
      apiClient.delete(`/outcomes/${shadowId}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['shadows', vars.outcomeId] });
    },
  });
}
