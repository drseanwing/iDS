import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateSectionVars {
  id: string;
  guidelineId: string;
  data: {
    title?: string;
    text?: unknown;
    ordering?: number;
    excludeFromNumbering?: boolean;
  };
}

export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSectionVars) =>
      apiClient.patch(`/sections/${id}`, data).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['sections', guidelineId] });
    },
  });
}
