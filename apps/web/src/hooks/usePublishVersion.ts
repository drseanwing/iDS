import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface PublishVersionVars {
  guidelineId: string;
  versionType: 'MAJOR' | 'MINOR';
  comment?: string;
  isPublic?: boolean;
}

export function usePublishVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: PublishVersionVars) =>
      apiClient.post('/versions', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['versions', vars.guidelineId] });
      void queryClient.invalidateQueries({ queryKey: ['guideline', vars.guidelineId] });
    },
  });
}
