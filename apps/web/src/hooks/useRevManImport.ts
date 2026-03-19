import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────

export interface RevManStudy {
  id: string;
  eventsIntervention?: number;
  totalIntervention?: number;
  eventsControl?: number;
  totalControl?: number;
  meanIntervention?: number;
  meanControl?: number;
}

export interface RevManOverallEffect {
  effect?: number;
  ciLower?: number;
  ciUpper?: number;
  totalStudies?: number;
  totalParticipants?: number;
}

export interface RevManOutcome {
  name: string;
  type: 'DICHOTOMOUS' | 'CONTINUOUS';
  studies: RevManStudy[];
  overallEffect?: RevManOverallEffect;
}

export interface RevManComparison {
  name: string;
  outcomes: RevManOutcome[];
}

export interface RevManData {
  title: string;
  comparisons: RevManComparison[];
}

export interface ParseRevManVars {
  file: File;
}

export interface ImportRevManVars {
  guidelineId: string;
  picoId: string;
  comparisons: RevManComparison[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────

/**
 * Upload an .rm5 file to the API for parsing.
 * Returns structured preview data without modifying the database.
 */
export function useParseRevMan() {
  return useMutation<{ data: RevManData }, Error, ParseRevManVars>({
    mutationFn: ({ file }: ParseRevManVars) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient
        .post<{ data: RevManData }>('/revman/parse', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
  });
}

/**
 * Import parsed RevMan comparisons as Outcome records linked to a PICO.
 * Invalidates the picos query on success so the UI refreshes automatically.
 */
export function useImportRevMan() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, ImportRevManVars>({
    mutationFn: (vars: ImportRevManVars) =>
      apiClient.post<ImportResult>('/revman/import', vars).then((r) => r.data),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['picos', vars.guidelineId] });
    },
  });
}
