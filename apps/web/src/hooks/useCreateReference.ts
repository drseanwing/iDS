import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Reference } from './useReferences';

export interface CreateReferenceData {
  guidelineId: string;
  title: string;
  authors?: string;
  year?: number;
  abstract?: string;
  pubmedId?: string;
  doi?: string;
  url?: string;
  studyType?: string;
}

export function useCreateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReferenceData) =>
      apiClient.post<Reference>('/references', data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['references', guidelineId] });
    },
  });
}
