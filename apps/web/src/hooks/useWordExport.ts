import { useState } from 'react';
import { apiClient } from '../lib/api-client';

export function useWordExport(guidelineId: string) {
  const [isExporting, setIsExporting] = useState(false);

  async function exportDocx(): Promise<void> {
    setIsExporting(true);
    try {
      const response = await apiClient.get<Blob>(
        `/guidelines/${guidelineId}/export/docx`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guideline-${guidelineId}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportDocx, isExporting };
}
