import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CreateOutcomeVars {
  picoId: string;
  guidelineId: string;
  title: string;
  outcomeType: string;
  importance?: number;
  ordering?: number;
}

export function useCreateOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId: _g, ...vars }: CreateOutcomeVars) =>
      apiClient.post('/outcomes', vars).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
