import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Outcome } from '../../hooks/usePicos';
import { useUpdateOutcome } from '../../hooks/useUpdateOutcome';

// ── Constants ─────────────────────────────────────────────────────────────

const EFFECT_MEASURE_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'RR', label: 'RR (Risk Ratio)' },
  { value: 'OR', label: 'OR (Odds Ratio)' },
  { value: 'HR', label: 'HR (Hazard Ratio)' },
  { value: 'MD', label: 'MD (Mean Difference)' },
  { value: 'SMD', label: 'SMD (Standardised Mean Difference)' },
  { value: 'PROTECTIVE_EFFICACY', label: 'Protective Efficacy' },
];

const CERTAINTY_OPTIONS = [
  { value: '', label: '— Not set —' },
  { value: 'HIGH', label: '⊕⊕⊕⊕  High' },
  { value: 'MODERATE', label: '⊕⊕⊕◯  Moderate' },
  { value: 'LOW', label: '⊕⊕◯◯  Low' },
  { value: 'VERY_LOW', label: '⊕◯◯◯  Very low' },
];

const GRADE_RATING_OPTIONS = [
  { value: 'NOT_SERIOUS', label: 'Not serious' },
  { value: 'SERIOUS', label: 'Serious (−1)' },
  { value: 'VERY_SERIOUS', label: 'Very serious (−2)' },
];

const UPGRADE_RATING_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'PRESENT', label: 'Present (+1)' },
  { value: 'LARGE', label: 'Large (+1)' },
  { value: 'VERY_LARGE', label: 'Very large (+2)' },
];

const DOWNGRADE_FACTORS = [
  { key: 'riskOfBias' as const, label: 'Risk of bias' },
  { key: 'inconsistency' as const, label: 'Inconsistency' },
  { key: 'indirectness' as const, label: 'Indirectness' },
  { key: 'imprecision' as const, label: 'Imprecision' },
  { key: 'publicationBias' as const, label: 'Publication bias' },
];

const UPGRADE_FACTORS = [
  { key: 'largeEffect' as const, label: 'Large effect' },
  { key: 'doseResponse' as const, label: 'Dose-response' },
  { key: 'plausibleConfounding' as const, label: 'Plausible confounding' },
];

// ── Helper ────────────────────────────────────────────────────────────────

function certaintyBadgeColor(level: string | null | undefined): string {
  switch (level) {
    case 'HIGH': return 'bg-green-100 text-green-800';
    case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
    case 'LOW': return 'bg-orange-100 text-orange-800';
    case 'VERY_LOW': return 'bg-red-100 text-red-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

function certaintySymbols(level: string | null | undefined): string {
  switch (level) {
    case 'HIGH': return '⊕⊕⊕⊕';
    case 'MODERATE': return '⊕⊕⊕◯';
    case 'LOW': return '⊕⊕◯◯';
    case 'VERY_LOW': return '⊕◯◯◯';
    default: return '';
  }
}

function gradeRatingColor(rating: string | null | undefined): string {
  switch (rating) {
    case 'SERIOUS': return 'text-orange-700';
    case 'VERY_SERIOUS': return 'text-red-700';
    default: return 'text-muted-foreground';
  }
}

function parseFloatOrUndefined(val: string): number | undefined {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function parseIntOrUndefined(val: string): number | undefined {
  const n = window.parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

// ── Types ─────────────────────────────────────────────────────────────────

type GradeTab = 'evidence' | 'grade' | 'summary';

interface GradeAssessmentPanelProps {
  outcome: Outcome;
  guidelineId: string;
}

// ── Component ─────────────────────────────────────────────────────────────

export function GradeAssessmentPanel({ outcome, guidelineId }: GradeAssessmentPanelProps) {
  const [activeTab, setActiveTab] = useState<GradeTab>('evidence');
  const { mutate: updateOutcome, isPending } = useUpdateOutcome();

  // Evidence fields
  const [effectMeasure, setEffectMeasure] = useState(outcome.effectMeasure ?? '');
  const [relativeEffect, setRelativeEffect] = useState(outcome.relativeEffect != null ? String(outcome.relativeEffect) : '');
  const [relativeEffectLower, setRelativeEffectLower] = useState(outcome.relativeEffectLower != null ? String(outcome.relativeEffectLower) : '');
  const [relativeEffectUpper, setRelativeEffectUpper] = useState(outcome.relativeEffectUpper != null ? String(outcome.relativeEffectUpper) : '');
  const [baselineRisk, setBaselineRisk] = useState(outcome.baselineRisk != null ? String(outcome.baselineRisk) : '');
  const [absoluteEffectIntervention, setAbsoluteEffectIntervention] = useState(outcome.absoluteEffectIntervention != null ? String(outcome.absoluteEffectIntervention) : '');
  const [absoluteEffectComparison, setAbsoluteEffectComparison] = useState(outcome.absoluteEffectComparison != null ? String(outcome.absoluteEffectComparison) : '');
  const [interventionParticipants, setInterventionParticipants] = useState(outcome.interventionParticipants != null ? String(outcome.interventionParticipants) : '');
  const [comparisonParticipants, setComparisonParticipants] = useState(outcome.comparisonParticipants != null ? String(outcome.comparisonParticipants) : '');
  const [numberOfStudies, setNumberOfStudies] = useState(outcome.numberOfStudies != null ? String(outcome.numberOfStudies) : '');
  const [continuousUnit, setContinuousUnit] = useState(outcome.continuousUnit ?? '');
  const [continuousScaleLower, setContinuousScaleLower] = useState(outcome.continuousScaleLower != null ? String(outcome.continuousScaleLower) : '');
  const [continuousScaleUpper, setContinuousScaleUpper] = useState(outcome.continuousScaleUpper != null ? String(outcome.continuousScaleUpper) : '');

  // GRADE fields
  const [certaintyOverall, setCertaintyOverall] = useState(outcome.certaintyOverall ?? '');
  const [riskOfBias, setRiskOfBias] = useState(outcome.riskOfBias ?? 'NOT_SERIOUS');
  const [inconsistency, setInconsistency] = useState(outcome.inconsistency ?? 'NOT_SERIOUS');
  const [indirectness, setIndirectness] = useState(outcome.indirectness ?? 'NOT_SERIOUS');
  const [imprecision, setImprecision] = useState(outcome.imprecision ?? 'NOT_SERIOUS');
  const [publicationBias, setPublicationBias] = useState(outcome.publicationBias ?? 'NOT_SERIOUS');
  const [largeEffect, setLargeEffect] = useState(outcome.largeEffect ?? 'NONE');
  const [doseResponse, setDoseResponse] = useState(outcome.doseResponse ?? 'NONE');
  const [plausibleConfounding, setPlausibleConfounding] = useState(outcome.plausibleConfounding ?? 'NONE');

  // Plain language summary
  const [plainLanguageSummary, setPlainLanguageSummary] = useState(outcome.plainLanguageSummary ?? '');

  function handleSaveEvidence() {
    updateOutcome({
      id: outcome.id,
      guidelineId,
      data: {
        effectMeasure: effectMeasure || undefined,
        relativeEffect: parseFloatOrUndefined(relativeEffect),
        relativeEffectLower: parseFloatOrUndefined(relativeEffectLower),
        relativeEffectUpper: parseFloatOrUndefined(relativeEffectUpper),
        baselineRisk: parseFloatOrUndefined(baselineRisk),
        absoluteEffectIntervention: parseFloatOrUndefined(absoluteEffectIntervention),
        absoluteEffectComparison: parseFloatOrUndefined(absoluteEffectComparison),
        interventionParticipants: parseIntOrUndefined(interventionParticipants),
        comparisonParticipants: parseIntOrUndefined(comparisonParticipants),
        numberOfStudies: parseIntOrUndefined(numberOfStudies),
        continuousUnit: continuousUnit || undefined,
        continuousScaleLower: parseFloatOrUndefined(continuousScaleLower),
        continuousScaleUpper: parseFloatOrUndefined(continuousScaleUpper),
      },
    });
  }

  function handleSaveGrade() {
    updateOutcome({
      id: outcome.id,
      guidelineId,
      data: {
        certaintyOverall: certaintyOverall || undefined,
        riskOfBias,
        inconsistency,
        indirectness,
        imprecision,
        publicationBias,
        largeEffect,
        doseResponse,
        plausibleConfounding,
      },
    });
  }

  function handleSaveSummary() {
    updateOutcome({
      id: outcome.id,
      guidelineId,
      data: { plainLanguageSummary: plainLanguageSummary || undefined },
    });
  }

  const inputCls = 'rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full';
  const selectCls = 'rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full bg-background';
  const saveBtnCls = 'rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="mt-2 rounded border bg-muted/20 text-sm">
      {/* Tab bar */}
      <div className="flex border-b bg-background rounded-t">
        {(['evidence', 'grade', 'summary'] as GradeTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'evidence' ? 'Effect Data' : tab === 'grade' ? 'GRADE Assessment' : 'Plain Language'}
          </button>
        ))}
        {/* Certainty badge if set */}
        {outcome.certaintyOverall && (
          <span
            className={cn(
              'ml-auto mr-2 my-1.5 rounded-full px-2 py-0.5 text-xs font-mono font-medium flex-shrink-0 self-center',
              certaintyBadgeColor(outcome.certaintyOverall),
            )}
          >
            {certaintySymbols(outcome.certaintyOverall)}
          </span>
        )}
      </div>

      {/* ── Evidence tab ──────────────────────────────────────────────── */}
      {activeTab === 'evidence' && (
        <div className="p-3 space-y-3">
          {/* Effect measure + relative effect */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Effect measure</label>
              <select
                aria-label="Effect measure"
                className={selectCls}
                value={effectMeasure}
                onChange={(e) => setEffectMeasure(e.target.value)}
              >
                {EFFECT_MEASURE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Relative effect</label>
              <input
                aria-label="Relative effect"
                type="number"
                step="any"
                placeholder="e.g. 0.75"
                className={inputCls}
                value={relativeEffect}
                onChange={(e) => setRelativeEffect(e.target.value)}
              />
            </div>
          </div>

          {/* 95% CI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>95% CI lower</label>
              <input
                aria-label="95% CI lower"
                type="number"
                step="any"
                placeholder="e.g. 0.60"
                className={inputCls}
                value={relativeEffectLower}
                onChange={(e) => setRelativeEffectLower(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>95% CI upper</label>
              <input
                aria-label="95% CI upper"
                type="number"
                step="any"
                placeholder="e.g. 0.93"
                className={inputCls}
                value={relativeEffectUpper}
                onChange={(e) => setRelativeEffectUpper(e.target.value)}
              />
            </div>
          </div>

          {/* Participants + studies */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Intervention participants</label>
              <input
                aria-label="Intervention participants"
                type="number"
                min={0}
                placeholder="n"
                className={inputCls}
                value={interventionParticipants}
                onChange={(e) => setInterventionParticipants(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Comparison participants</label>
              <input
                aria-label="Comparison participants"
                type="number"
                min={0}
                placeholder="n"
                className={inputCls}
                value={comparisonParticipants}
                onChange={(e) => setComparisonParticipants(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>No. of studies</label>
              <input
                aria-label="Number of studies"
                type="number"
                min={0}
                placeholder="n"
                className={inputCls}
                value={numberOfStudies}
                onChange={(e) => setNumberOfStudies(e.target.value)}
              />
            </div>
          </div>

          {/* Absolute effects + baseline risk */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Baseline risk</label>
              <input
                aria-label="Baseline risk"
                type="number"
                step="any"
                min={0}
                max={1}
                placeholder="0–1"
                className={inputCls}
                value={baselineRisk}
                onChange={(e) => setBaselineRisk(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Absolute effect (intervention)</label>
              <input
                aria-label="Absolute effect intervention"
                type="number"
                step="any"
                placeholder="per 1000"
                className={inputCls}
                value={absoluteEffectIntervention}
                onChange={(e) => setAbsoluteEffectIntervention(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Absolute effect (comparison)</label>
              <input
                aria-label="Absolute effect comparison"
                type="number"
                step="any"
                placeholder="per 1000"
                className={inputCls}
                value={absoluteEffectComparison}
                onChange={(e) => setAbsoluteEffectComparison(e.target.value)}
              />
            </div>
          </div>

          {/* Continuous-only fields */}
          {(outcome.outcomeType === 'CONTINUOUS' || continuousUnit) && (
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <div>
                <label className={labelCls}>Unit of measurement</label>
                <input
                  aria-label="Continuous unit"
                  type="text"
                  placeholder="e.g. mmHg"
                  className={inputCls}
                  value={continuousUnit}
                  onChange={(e) => setContinuousUnit(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Scale lower bound</label>
                <input
                  aria-label="Scale lower bound"
                  type="number"
                  step="any"
                  className={inputCls}
                  value={continuousScaleLower}
                  onChange={(e) => setContinuousScaleLower(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Scale upper bound</label>
                <input
                  aria-label="Scale upper bound"
                  type="number"
                  step="any"
                  className={inputCls}
                  value={continuousScaleUpper}
                  onChange={(e) => setContinuousScaleUpper(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveEvidence}
              disabled={isPending}
              className={saveBtnCls}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save effect data'}
            </button>
          </div>
        </div>
      )}

      {/* ── GRADE tab ──────────────────────────────────────────────────── */}
      {activeTab === 'grade' && (
        <div className="p-3 space-y-3">
          {/* Overall certainty */}
          <div>
            <label className={labelCls}>Overall certainty of evidence</label>
            <select
              aria-label="Overall certainty of evidence"
              className={cn(selectCls, 'font-medium')}
              value={certaintyOverall}
              onChange={(e) => setCertaintyOverall(e.target.value)}
            >
              {CERTAINTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Downgrade factors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Downgrade factors
            </p>
            <div className="space-y-2">
              {DOWNGRADE_FACTORS.map(({ key, label }) => {
                const vals = { riskOfBias, inconsistency, indirectness, imprecision, publicationBias };
                const setters = {
                  riskOfBias: setRiskOfBias,
                  inconsistency: setInconsistency,
                  indirectness: setIndirectness,
                  imprecision: setImprecision,
                  publicationBias: setPublicationBias,
                };
                const current = vals[key] ?? 'NOT_SERIOUS';
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-foreground flex-shrink-0">{label}</span>
                    <select
                      aria-label={label}
                      className={cn(selectCls, 'flex-1', gradeRatingColor(current))}
                      value={current}
                      onChange={(e) => setters[key](e.target.value)}
                    >
                      {GRADE_RATING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade factors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Upgrade factors
            </p>
            <div className="space-y-2">
              {UPGRADE_FACTORS.map(({ key, label }) => {
                const vals = { largeEffect, doseResponse, plausibleConfounding };
                const setters = {
                  largeEffect: setLargeEffect,
                  doseResponse: setDoseResponse,
                  plausibleConfounding: setPlausibleConfounding,
                };
                const current = vals[key] ?? 'NONE';
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-foreground flex-shrink-0">{label}</span>
                    <select
                      aria-label={label}
                      className={cn(selectCls, 'flex-1', current !== 'NONE' ? 'text-green-700' : 'text-muted-foreground')}
                      value={current}
                      onChange={(e) => setters[key](e.target.value)}
                    >
                      {UPGRADE_RATING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveGrade}
              disabled={isPending}
              className={saveBtnCls}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save GRADE assessment'}
            </button>
          </div>
        </div>
      )}

      {/* ── Plain language summary tab ──────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div className="p-3 space-y-2">
          <label className={labelCls}>
            Plain language summary
            <span className="ml-1 font-normal">
              (brief, patient-friendly description of the evidence)
            </span>
          </label>
          <textarea
            aria-label="Plain language summary"
            rows={5}
            className="w-full resize-y rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Describe the evidence in plain language for patients and the public…"
            value={plainLanguageSummary}
            onChange={(e) => setPlainLanguageSummary(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveSummary}
              disabled={isPending}
              className={saveBtnCls}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save summary'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
