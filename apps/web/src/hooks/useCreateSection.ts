import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Section } from './useSections';

interface CreateSectionVars {
  guidelineId: string;
  title: string;
  parentId?: string;
  ordering?: number;
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateSectionVars) =>
      apiClient.post<Section>('/sections', vars).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['sections', guidelineId] });
    },
  });
}
