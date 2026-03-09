import { useState, useEffect } from 'react';
import { Loader2, Download } from 'lucide-react';
import type { Guideline } from '../../hooks/useGuideline';
import { useUpdateGuideline } from '../../hooks/useUpdateGuideline';
import { useExportDocx } from '../../hooks/useExportDocx';
import { PermissionManagementPanel } from './PermissionManagementPanel';
import { RecoverPanel } from './RecoverPanel';

interface GuidelineSettingsPanelProps {
  guideline: Guideline;
}

type EtdMode = 'FOUR_FACTOR' | 'SEVEN_FACTOR' | 'TWELVE_FACTOR';
type PicoDisplay = 'INLINE' | 'ANNEX';

export function GuidelineSettingsPanel({ guideline }: GuidelineSettingsPanelProps) {
  const { mutate: updateGuideline, isPending } = useUpdateGuideline();
  const { exportDocx, isPending: isExporting, error: exportError } = useExportDocx();

  const [form, setForm] = useState({
    title: guideline.title,
    shortName: guideline.shortName ?? '',
    description: guideline.description ?? '',
    language: guideline.language ?? 'en',
    etdMode: (guideline.etdMode ?? 'FOUR_FACTOR') as EtdMode,
    showSectionNumbers: guideline.showSectionNumbers ?? true,
    showCertaintyInLabel: guideline.showCertaintyInLabel ?? false,
    showGradeDescription: guideline.showGradeDescription ?? false,
    showSectionTextPreview: guideline.showSectionTextPreview ?? true,
    trackChangesDefault: guideline.trackChangesDefault ?? false,
    enableSubscriptions: guideline.enableSubscriptions ?? false,
    enablePublicComments: guideline.enablePublicComments ?? false,
    pdfColumnLayout: guideline.pdfColumnLayout ?? 1,
    picoDisplayMode: (guideline.picoDisplayMode ?? 'INLINE') as PicoDisplay,
    coverPageUrl: guideline.coverPageUrl ?? '',
    isPublic: guideline.isPublic ?? false,
  });

  useEffect(() => {
    setForm({
      title: guideline.title,
      shortName: guideline.shortName ?? '',
      description: guideline.description ?? '',
      language: guideline.language ?? 'en',
      etdMode: (guideline.etdMode ?? 'FOUR_FACTOR') as EtdMode,
      showSectionNumbers: guideline.showSectionNumbers ?? true,
      showCertaintyInLabel: guideline.showCertaintyInLabel ?? false,
      showGradeDescription: guideline.showGradeDescription ?? false,
      showSectionTextPreview: guideline.showSectionTextPreview ?? true,
      trackChangesDefault: guideline.trackChangesDefault ?? false,
      enableSubscriptions: guideline.enableSubscriptions ?? false,
      enablePublicComments: guideline.enablePublicComments ?? false,
      pdfColumnLayout: guideline.pdfColumnLayout ?? 1,
      picoDisplayMode: (guideline.picoDisplayMode ?? 'INLINE') as PicoDisplay,
      coverPageUrl: guideline.coverPageUrl ?? '',
      isPublic: guideline.isPublic ?? false,
    });
  }, [guideline]);

  const handleSave = () => {
    updateGuideline({ id: guideline.id, ...form });
  };

  const toggle = (field: keyof typeof form) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="overflow-y-auto p-6 space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Guideline Settings</h2>

      {/* General */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">General</h3>

        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Short Name</span>
          <input
            type="text"
            value={form.shortName}
            onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Language</span>
          <input
            type="text"
            value={form.language}
            onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>
      </section>

      {/* Evidence Framework */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Evidence Framework</h3>

        <label className="block">
          <span className="text-sm font-medium">EtD Mode</span>
          <select
            value={form.etdMode}
            onChange={(e) => setForm((p) => ({ ...p, etdMode: e.target.value as EtdMode }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="FOUR_FACTOR">4-Factor (Original GRADE)</option>
            <option value="SEVEN_FACTOR">7-Factor</option>
            <option value="TWELVE_FACTOR">12-Factor (Full EtD)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">PICO Display Mode</span>
          <select
            value={form.picoDisplayMode}
            onChange={(e) => setForm((p) => ({ ...p, picoDisplayMode: e.target.value as PicoDisplay }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="INLINE">Inline</option>
            <option value="ANNEX">Annex</option>
          </select>
        </label>
      </section>

      {/* Display Options */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Display Options</h3>

        {([
          ['showSectionNumbers', 'Show section numbers'],
          ['showCertaintyInLabel', 'Show certainty in recommendation label'],
          ['showGradeDescription', 'Show GRADE description'],
          ['showSectionTextPreview', 'Show section text preview'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={() => toggle(key)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </section>

      {/* Features */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Features</h3>

        {([
          ['trackChangesDefault', 'Track changes by default'],
          ['enableSubscriptions', 'Enable subscriptions'],
          ['enablePublicComments', 'Enable public comments'],
          ['isPublic', 'Guideline is public'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={() => toggle(key)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </section>

      {/* PDF / Export */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PDF / Export</h3>

        <label className="block">
          <span className="text-sm font-medium">PDF Column Layout</span>
          <select
            value={form.pdfColumnLayout}
            onChange={(e) => setForm((p) => ({ ...p, pdfColumnLayout: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value={1}>1 Column</option>
            <option value={2}>2 Columns</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Cover Page URL</span>
          <input
            type="text"
            value={form.coverPageUrl}
            onChange={(e) => setForm((p) => ({ ...p, coverPageUrl: e.target.value }))}
            placeholder="https://..."
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>

        <div className="pt-2 space-y-2">
          <span className="text-sm font-medium block">Export Guideline</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => exportDocx(guideline.id, `guideline-${guideline.shortName || guideline.id}.docx`)}
              disabled={isExporting}
              aria-label="Export as DOCX"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export DOCX
            </button>
            <a
              href={`/api/guidelines/${guideline.id}/export`}
              download={`guideline-${guideline.shortName || guideline.id}.json`}
              aria-label="Export as JSON"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </a>
          </div>
          {exportError && (
            <p className="text-xs text-destructive">{exportError}</p>
          )}
        </div>
      </section>

      {/* Save button */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>

      {/* Team / Permissions */}
      <section className="border-t pt-6">
        <PermissionManagementPanel guidelineId={guideline.id} />
      </section>

      {/* Recover Deleted Content */}
      <section className="border-t pt-6">
        <RecoverPanel guidelineId={guideline.id} />
      </section>
    </div>
  );
}
