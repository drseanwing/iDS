import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CreateGuidelineVars {
  title: string;
  shortName?: string;
  description?: string;
}

export function useCreateGuideline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateGuidelineVars) =>
      apiClient.post('/guidelines', vars).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['guidelines'] });
    },
  });
}
