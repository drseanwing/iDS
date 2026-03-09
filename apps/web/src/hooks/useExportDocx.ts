import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export function useExportDocx() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportDocx = useCallback(async (guidelineId: string, filename?: string) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await apiClient.get(`/guidelines/${guidelineId}/export/docx`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'guideline.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Export failed';
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { exportDocx, isPending, error };
}
