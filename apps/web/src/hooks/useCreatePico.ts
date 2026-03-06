import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CreatePicoVars {
  guidelineId: string;
  population: string;
  intervention: string;
  comparator: string;
}

export function useCreatePico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreatePicoVars) =>
      apiClient.post('/picos', vars).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
