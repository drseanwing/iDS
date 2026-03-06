import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface SectionOrderItem {
  id: string;
  ordering: number;
}

interface ReorderSectionsVars {
  guidelineId: string;
  sections: SectionOrderItem[];
}

export function useReorderSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sections }: ReorderSectionsVars) =>
      apiClient.post('/sections/reorder', { sections }).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['sections', guidelineId] });
    },
  });
}
