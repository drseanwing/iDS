import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface UpdateGuidelinePayload {
  title?: string;
  shortName?: string;
  description?: string;
  language?: string;
  guidelineType?: string;
  etdMode?: string;
  showSectionNumbers?: boolean;
  showCertaintyInLabel?: boolean;
  showGradeDescription?: boolean;
  showSectionTextPreview?: boolean;
  trackChangesDefault?: boolean;
  enableSubscriptions?: boolean;
  enablePublicComments?: boolean;
  pdfColumnLayout?: number;
  picoDisplayMode?: string;
  coverPageUrl?: string;
  isPublic?: boolean;
}

export function useUpdateGuideline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateGuidelinePayload & { id: string }) => {
      const { data } = await apiClient.put(`/guidelines/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guideline', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['guidelines'] });
    },
  });
}
