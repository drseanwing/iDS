import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateEtdJudgmentVars {
  id: string;
  recommendationId: string;
  data: {
    judgment?: string;
    colorCode?: string;
  };
}

interface AddEtdJudgmentVars {
  factorId: string;
  recommendationId: string;
  interventionLabel: string;
}

interface DeleteEtdJudgmentVars {
  id: string;
  recommendationId: string;
}

export function useUpdateEtdJudgment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateEtdJudgmentVars) =>
      apiClient.put(`/etd-judgments/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { recommendationId }) => {
      void queryClient.invalidateQueries({ queryKey: ['etd-factors', recommendationId] });
    },
  });
}

export function useAddEtdJudgment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ factorId, interventionLabel }: AddEtdJudgmentVars) =>
      apiClient
        .post(`/etd-factors/${factorId}/judgments`, { interventionLabel })
        .then((r) => r.data),
    onSuccess: (_result, { recommendationId }) => {
      void queryClient.invalidateQueries({ queryKey: ['etd-factors', recommendationId] });
    },
  });
}

export function useDeleteEtdJudgment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteEtdJudgmentVars) =>
      apiClient.delete(`/etd-judgments/${id}`).then((r) => r.data),
    onSuccess: (_result, { recommendationId }) => {
      void queryClient.invalidateQueries({ queryKey: ['etd-factors', recommendationId] });
    },
  });
}
