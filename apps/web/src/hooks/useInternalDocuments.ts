import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface InternalDocument {
  id: string;
  guidelineId: string;
  title: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function useInternalDocuments(guidelineId: string) {
  return useQuery({
    queryKey: ['internal-documents', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<InternalDocument[]>(
        `/guidelines/${guidelineId}/documents`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (r) => r,
  });
}

interface UploadDocumentVars {
  guidelineId: string;
  file: File;
  title: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId, file, title }: UploadDocumentVars) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      return apiClient
        .post<InternalDocument>(`/guidelines/${guidelineId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['internal-documents', vars.guidelineId] });
    },
  });
}

interface DeleteDocumentVars {
  id: string;
  guidelineId: string;
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId }: DeleteDocumentVars) =>
      apiClient
        .delete(`/guidelines/${guidelineId}/documents/${id}`)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['internal-documents', vars.guidelineId] });
    },
  });
}

export async function downloadDocument(guidelineId: string, docId: string): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/guidelines/${guidelineId}/documents/${docId}`,
    { responseType: 'blob' },
  );
  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = docId;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
