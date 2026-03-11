import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';

interface PdfExportOptions {
  pdfColumnLayout?: number;
  picoDisplayMode?: string;
  showSectionNumbers?: boolean;
  includeTableOfContents?: boolean;
  coverPageUrl?: string;
}

type PdfJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface PdfJobState {
  jobId: string | null;
  status: PdfJobStatus | null;
  error: string | null;
  isPending: boolean;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 120; // ~3 minutes max

export function useExportPdf() {
  const [state, setState] = useState<PdfJobState>({
    jobId: null,
    status: null,
    error: null,
    isPending: false,
  });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    abortRef.current = true;
  }, []);

  const downloadPdf = useCallback(async (jobId: string) => {
    const response = await apiClient.get(`/pdf-jobs/${jobId}/download`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const disposition = response.headers['content-disposition'];
    const filenameMatch = disposition?.match(/filename="(.+?)"/);
    link.download = filenameMatch?.[1] ?? 'guideline.pdf';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const pollForCompletion = useCallback(
    async (jobId: string, attempt = 0) => {
      if (abortRef.current || attempt >= MAX_POLL_ATTEMPTS) {
        if (attempt >= MAX_POLL_ATTEMPTS) {
          setState((prev) => ({
            ...prev,
            isPending: false,
            error: 'PDF generation timed out. Please try again.',
          }));
        }
        return;
      }

      try {
        const { data } = await apiClient.get(`/pdf-jobs/${jobId}`);

        setState((prev) => ({ ...prev, status: data.status }));

        if (data.status === 'COMPLETED') {
          await downloadPdf(jobId);
          setState((prev) => ({ ...prev, isPending: false }));
          return;
        }

        if (data.status === 'FAILED') {
          setState((prev) => ({
            ...prev,
            isPending: false,
            error: data.errorMessage || 'PDF generation failed.',
          }));
          return;
        }

        // Still pending or processing — poll again
        pollTimerRef.current = setTimeout(
          () => pollForCompletion(jobId, attempt + 1),
          POLL_INTERVAL_MS,
        );
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isPending: false,
          error: err?.message || 'Failed to check PDF status.',
        }));
      }
    },
    [downloadPdf],
  );

  const exportPdf = useCallback(
    async (guidelineId: string, options?: PdfExportOptions) => {
      cleanup();
      abortRef.current = false;

      setState({
        jobId: null,
        status: 'PENDING',
        error: null,
        isPending: true,
      });

      try {
        const { data } = await apiClient.post(
          `/guidelines/${guidelineId}/export/pdf`,
          options ?? {},
        );

        setState((prev) => ({
          ...prev,
          jobId: data.jobId,
          status: data.status,
        }));

        // Start polling
        pollForCompletion(data.jobId);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || 'Failed to start PDF export.';
        setState((prev) => ({
          ...prev,
          isPending: false,
          error: message,
        }));
      }
    },
    [cleanup, pollForCompletion],
  );

  const cancel = useCallback(() => {
    cleanup();
    setState((prev) => ({ ...prev, isPending: false }));
  }, [cleanup]);

  return {
    exportPdf,
    cancel,
    jobId: state.jobId,
    status: state.status,
    isPending: state.isPending,
    error: state.error,
  };
}
