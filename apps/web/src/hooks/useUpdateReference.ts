import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface UpdateReferenceData {
  title?: string;
  authors?: string;
  year?: number;
  abstract?: string;
  pubmedId?: string;
  doi?: string;
  url?: string;
  studyType?: string;
}

interface UpdateReferenceVars {
  id: string;
  guidelineId: string;
  data: UpdateReferenceData;
}

export function useUpdateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateReferenceVars) =>
      apiClient.put(`/references/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['references', guidelineId] });
    },
  });
}
