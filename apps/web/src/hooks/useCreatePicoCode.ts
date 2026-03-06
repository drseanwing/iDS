import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CreatePicoCodeVars {
  picoId: string;
  guidelineId: string;
  codeSystem: string;
  code: string;
  display: string;
  element: string;
}

export function useCreatePicoCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ picoId, guidelineId: _g, ...body }: CreatePicoCodeVars) =>
      apiClient.post(`/picos/${picoId}/codes`, body).then((r) => r.data),
    onSuccess: (_result, { guidelineId }) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', guidelineId] });
    },
  });
}
