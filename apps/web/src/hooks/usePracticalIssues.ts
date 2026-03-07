import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PracticalIssueCategory } from './usePicos';

interface CreatePracticalIssueVars {
  picoId: string;
  guidelineId: string;
  category: PracticalIssueCategory;
  title: string;
  description?: unknown;
  ordering?: number;
}

interface UpdatePracticalIssueVars {
  picoId: string;
  issueId: string;
  guidelineId: string;
  category?: PracticalIssueCategory;
  title?: string;
  description?: unknown;
  ordering?: number;
}

interface DeletePracticalIssueVars {
  picoId: string;
  issueId: string;
  guidelineId: string;
}

export function useCreatePracticalIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ picoId, guidelineId: _guidelineId, ...body }: CreatePracticalIssueVars) =>
      apiClient
        .post(`/picos/${picoId}/practical-issues`, body)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', vars.guidelineId] });
    },
  });
}

export function useUpdatePracticalIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ picoId, issueId, guidelineId: _guidelineId, ...body }: UpdatePracticalIssueVars) =>
      apiClient
        .put(`/picos/${picoId}/practical-issues/${issueId}`, body)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', vars.guidelineId] });
    },
  });
}

export function useDeletePracticalIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ picoId, issueId }: DeletePracticalIssueVars) =>
      apiClient
        .delete(`/picos/${picoId}/practical-issues/${issueId}`)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', vars.guidelineId] });
    },
  });
}
