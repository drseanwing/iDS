import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────

interface ImportResult {
  created: {
    picos: number;
    outcomes: number;
    recommendations: number;
  };
  skipped: number;
}

interface GradeProImportDialogProps {
  guidelineId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ImportResult) => void;
}

type DialogStep = 'select' | 'preview' | 'importing' | 'success' | 'error';

// ── Component ──────────────────────────────────────────────────────────────

export function GradeProImportDialog({
  guidelineId,
  isOpen,
  onClose,
  onSuccess,
}: GradeProImportDialogProps) {
  const [step, setStep] = useState<DialogStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedFile(null);
      setResult(null);
      setErrorMessage('');
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen]);

  // Escape key closes dialog
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setStep('preview');
  }

  function handleCancel() {
    onClose();
  }

  async function handleImport() {
    if (!selectedFile) return;
    setStep('importing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post<ImportResult>(
        `/guidelines/${guidelineId}/gradepro/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const importResult = response.data;
      setResult(importResult);
      setStep('success');
      onSuccess?.(importResult);

      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.';
      setErrorMessage(message);
      setStep('error');
    }
  }

  function handleTryAgain() {
    setSelectedFile(null);
    setErrorMessage('');
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Import GradePro</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Step: Select file */}
        {step === 'select' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-blue-50 p-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 text-center max-w-sm">
              Upload a GradePro JSON export file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              data-testid="file-input"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Choose .json file
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && selectedFile && (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">Selected file</p>
              <p className="mt-1 text-sm text-gray-900 break-all">{selectedFile.name}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Importing GradePro data…</p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && result && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="rounded-full bg-green-50 p-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Import complete</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>
                  <strong>{result.created.picos}</strong> PICO(s) created
                </li>
                <li>
                  <strong>{result.created.outcomes}</strong> outcome(s) created
                </li>
                <li>
                  <strong>{result.created.recommendations}</strong> recommendation(s) created
                </li>
                <li>
                  <strong>{result.skipped}</strong> skipped (already exist)
                </li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="rounded-full bg-red-50 p-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Import failed</p>
              <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
            </div>
            <button
              onClick={handleTryAgain}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
