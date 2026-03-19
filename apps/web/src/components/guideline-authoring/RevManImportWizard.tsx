import { useState, useRef } from 'react';
import { Loader2, Upload, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useParseRevMan,
  useImportRevMan,
  type RevManData,
  type RevManComparison,
} from '../../hooks/useRevManImport';

// ── Types ─────────────────────────────────────────────────────────────────

type WizardStep = 'upload' | 'preview' | 'map' | 'result';

interface Props {
  guidelineId: string;
  picoId: string;
  /** Called after a successful import so the parent can close the wizard */
  onComplete?: (created: number) => void;
  /** Called when the user wants to close/cancel the wizard */
  onClose?: () => void;
}

// ── Step indicator ────────────────────────────────────────────────────────

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'preview', label: 'Preview' },
  { key: 'map', label: 'Select' },
  { key: 'result', label: 'Done' },
];

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 text-sm mb-6">
      {STEPS.map((step, idx) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
              idx < currentIdx
                ? 'bg-green-600 text-white'
                : idx === currentIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500',
            )}
          >
            {idx + 1}
          </span>
          <span
            className={cn(
              'hidden sm:inline',
              idx === currentIdx ? 'font-semibold text-gray-900' : 'text-gray-500',
            )}
          >
            {step.label}
          </span>
          {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300" />}
        </li>
      ))}
    </ol>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function RevManImportWizard({ guidelineId, picoId, onComplete, onClose }: Props) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [parsedData, setParsedData] = useState<RevManData | null>(null);
  const [selectedComparisons, setSelectedComparisons] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRevMan = useParseRevMan();
  const importRevMan = useImportRevMan();

  // ── Step: Upload ─────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    parseRevMan.mutate(
      { file },
      {
        onSuccess: (res) => {
          setParsedData(res.data);
          // Pre-select all comparisons
          setSelectedComparisons(
            new Set(res.data.comparisons.map((_, i) => i)),
          );
          setStep('preview');
        },
      },
    );
  }

  // ── Step: Map/Select ──────────────────────────────────────────────────────

  function toggleComparison(idx: number) {
    setSelectedComparisons((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  // ── Step: Import ──────────────────────────────────────────────────────────

  function handleImport() {
    if (!parsedData) return;

    const comparisons: RevManComparison[] = parsedData.comparisons.filter((_, i) =>
      selectedComparisons.has(i),
    );

    importRevMan.mutate(
      { guidelineId, picoId, comparisons },
      {
        onSuccess: (result) => {
          setStep('result');
          if (result.created > 0) {
            onComplete?.(result.created);
          }
        },
      },
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Import RevMan (.rm5)</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>

      <StepIndicator current={step} />

      {/* ── Upload step ─────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-full bg-blue-50 p-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 text-center max-w-sm">
            Upload a RevMan 5 (.rm5) file. The file will be parsed locally and you can
            review the comparisons before anything is saved.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".rm5,application/xml,text/xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parseRevMan.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {parseRevMan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {parseRevMan.isPending ? 'Parsing…' : 'Choose .rm5 file'}
          </button>
          {parseRevMan.isError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {parseRevMan.error.message}
            </p>
          )}
        </div>
      )}

      {/* ── Preview step ────────────────────────────────────────────── */}
      {step === 'preview' && parsedData && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Found <strong>{parsedData.comparisons.length}</strong> comparison(s) with a total
            of{' '}
            <strong>
              {parsedData.comparisons.reduce((s, c) => s + c.outcomes.length, 0)}
            </strong>{' '}
            outcome(s) in <em>{parsedData.title}</em>.
          </p>

          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Comparison</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Outcomes</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Studies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedData.comparisons.map((comp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{comp.name}</td>
                    <td className="px-4 py-2">
                      <ul className="list-disc list-inside space-y-0.5">
                        {comp.outcomes.map((o, oi) => (
                          <li key={oi} className="text-gray-700">
                            {o.name}{' '}
                            <span className="text-xs text-gray-400">({o.type.toLowerCase()})</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {comp.outcomes.reduce((s, o) => s + o.studies.length, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep('upload')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep('map')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Select Comparisons
            </button>
          </div>
        </div>
      )}

      {/* ── Map/Select step ──────────────────────────────────────────── */}
      {step === 'map' && parsedData && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Choose which comparisons to import as outcomes.
          </p>

          <div className="space-y-2">
            {parsedData.comparisons.map((comp, idx) => (
              <label
                key={idx}
                className="flex items-start gap-3 rounded-md border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={selectedComparisons.has(idx)}
                  onChange={() => toggleComparison(idx)}
                />
                <div>
                  <p className="font-medium text-gray-900">{comp.name}</p>
                  <p className="text-xs text-gray-500">
                    {comp.outcomes.length} outcome(s),{' '}
                    {comp.outcomes.reduce((s, o) => s + o.studies.length, 0)} stud(ies)
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep('preview')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importRevMan.isPending || selectedComparisons.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {importRevMan.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {importRevMan.isPending ? 'Importing…' : 'Import Outcomes'}
            </button>
          </div>

          {importRevMan.isError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {importRevMan.error.message}
            </p>
          )}
        </div>
      )}

      {/* ── Result step ──────────────────────────────────────────────── */}
      {step === 'result' && importRevMan.data && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="rounded-full bg-green-50 p-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Import complete</p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>{importRevMan.data.created}</strong> outcome(s) created,{' '}
              <strong>{importRevMan.data.skipped}</strong> skipped (already exist).
            </p>
            {importRevMan.data.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 text-left list-disc list-inside">
                {importRevMan.data.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
