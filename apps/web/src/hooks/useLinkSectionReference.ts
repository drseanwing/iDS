import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useLinkSectionReference() {
  const queryClient = useQueryClient();

  const link = useMutation({
    mutationFn: ({ sectionId, referenceId }: { sectionId: string; referenceId: string }) =>
      apiClient
        .post('/links/section-references', { sectionId, referenceId })
        .then((r) => r.data),
    onSuccess: (_result, { sectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['section-references', sectionId] });
    },
  });

  const unlink = useMutation({
    mutationFn: ({ sectionId, referenceId }: { sectionId: string; referenceId: string }) =>
      apiClient
        .delete(`/links/section-references/${sectionId}/${referenceId}`)
        .then((r) => r.data),
    onSuccess: (_result, { sectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['section-references', sectionId] });
    },
  });

  return { link, unlink };
}
