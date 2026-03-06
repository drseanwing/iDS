import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RichTextEditor } from '../editor/RichTextEditor';
import { useEtdFactors } from '../../hooks/useEtdFactors';
import { useUpdateEtdFactor } from '../../hooks/useUpdateEtdFactor';
import {
  useUpdateEtdJudgment,
  useAddEtdJudgment,
  useDeleteEtdJudgment,
} from '../../hooks/useEtdJudgments';
import type { EtdFactor } from '../../hooks/useEtdFactors';

// ── Mode definitions ───────────────────────────────────────────────────────

export type EtdMode = 'FOUR_FACTOR' | 'SEVEN_FACTOR' | 'TWELVE_FACTOR';

const FOUR_FACTOR_TYPES = [
  'BENEFITS_HARMS',
  'QUALITY_OF_EVIDENCE',
  'PREFERENCES_VALUES',
  'RESOURCES_OTHER',
];

const SEVEN_FACTOR_TYPES = [
  ...FOUR_FACTOR_TYPES,
  'EQUITY',
  'ACCEPTABILITY',
  'FEASIBILITY',
];

const TWELVE_FACTOR_TYPES = [
  'BENEFITS_HARMS',      // Displayed as "Problem priorities" in 12-factor mode
  'DESIRABLE_EFFECTS',
  'UNDESIRABLE_EFFECTS',
  'QUALITY_OF_EVIDENCE',
  'PREFERENCES_VALUES',
  'BALANCE',
  'RESOURCES_REQUIRED',
  'CERTAINTY_OF_RESOURCES',
  'COST_EFFECTIVENESS',
  'EQUITY',
  'ACCEPTABILITY',
  'FEASIBILITY',
];

function getActiveTypes(mode: EtdMode): string[] {
  switch (mode) {
    case 'FOUR_FACTOR':
      return FOUR_FACTOR_TYPES;
    case 'TWELVE_FACTOR':
      return TWELVE_FACTOR_TYPES;
    default:
      return SEVEN_FACTOR_TYPES;
  }
}

const FACTOR_LABELS: Record<string, string> = {
  BENEFITS_HARMS: 'Benefits & Harms',
  QUALITY_OF_EVIDENCE: 'Quality of Evidence',
  PREFERENCES_VALUES: 'Preferences & Values',
  RESOURCES_OTHER: 'Resources & Other',
  EQUITY: 'Equity',
  ACCEPTABILITY: 'Acceptability',
  FEASIBILITY: 'Feasibility',
  DESIRABLE_EFFECTS: 'Desirable Effects',
  UNDESIRABLE_EFFECTS: 'Undesirable Effects',
  BALANCE: 'Balance of Effects',
  RESOURCES_REQUIRED: 'Resources Required',
  CERTAINTY_OF_RESOURCES: 'Certainty of Resources Evidence',
  COST_EFFECTIVENESS: 'Cost-Effectiveness',
};

/**
 * In 12-factor mode BENEFITS_HARMS represents the "Problem priorities" factor
 * (Is the problem a priority?) — matching the iEtD DECIDE framework.
 */
const TWELVE_FACTOR_LABEL_OVERRIDES: Record<string, string> = {
  BENEFITS_HARMS: 'Problem Priorities',
};

// ── Judgment options per factor ────────────────────────────────────────────

// Factors that use the favors-intervention scale
const EFFECTS_FACTORS = new Set([
  'BENEFITS_HARMS',
  'DESIRABLE_EFFECTS',
  'UNDESIRABLE_EFFECTS',
  'BALANCE',
]);

// Factors that use resources scale
const RESOURCES_FACTORS = new Set([
  'RESOURCES_OTHER',
  'RESOURCES_REQUIRED',
  'COST_EFFECTIVENESS',
]);

interface JudgmentOption {
  value: string;
  label: string;
  color: string;
}

function getJudgmentOptions(factorType: string): JudgmentOption[] {
  if (EFFECTS_FACTORS.has(factorType)) {
    return [
      { value: 'FAVORS_COMPARISON', label: 'Favors comparison', color: '#ef4444' },
      { value: 'PROBABLY_FAVORS_COMPARISON', label: 'Probably favors comparison', color: '#f97316' },
      { value: 'UNCERTAIN', label: 'Uncertain', color: '#eab308' },
      { value: 'PROBABLY_FAVORS_INTERVENTION', label: 'Probably favors intervention', color: '#84cc16' },
      { value: 'FAVORS_INTERVENTION', label: 'Favors intervention', color: '#22c55e' },
      { value: 'TRIVIAL', label: 'Trivial', color: '#94a3b8' },
    ];
  }
  if (RESOURCES_FACTORS.has(factorType)) {
    return [
      { value: 'LARGE_COSTS', label: 'Large costs', color: '#ef4444' },
      { value: 'MODERATE_COSTS', label: 'Moderate costs', color: '#f97316' },
      { value: 'NEGLIGIBLE_COSTS', label: 'Negligible costs & savings', color: '#eab308' },
      { value: 'MODERATE_SAVINGS', label: 'Moderate savings', color: '#84cc16' },
      { value: 'LARGE_SAVINGS', label: 'Large savings', color: '#22c55e' },
      { value: 'VARIES', label: 'Varies', color: '#8b5cf6' },
    ];
  }
  // Default yes/no scale for equity, acceptability, feasibility, preferences, quality
  return [
    { value: 'NO', label: 'No', color: '#ef4444' },
    { value: 'PROBABLY_NO', label: 'Probably no', color: '#f97316' },
    { value: 'UNCERTAIN', label: 'Uncertain', color: '#eab308' },
    { value: 'PROBABLY_YES', label: 'Probably yes', color: '#84cc16' },
    { value: 'YES', label: 'Yes', color: '#22c55e' },
    { value: 'VARIES', label: 'Varies', color: '#8b5cf6' },
  ];
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface JudgmentCellProps {
  factorType: string;
  judgment: { id: string; interventionLabel: string; judgment: string | null; colorCode: string | null };
  recommendationId: string;
}

function JudgmentCell({ factorType, judgment, recommendationId }: JudgmentCellProps) {
  const { mutate: updateJudgment, isPending } = useUpdateEtdJudgment();
  const { mutate: deleteJudgment, isPending: isDeleting } = useDeleteEtdJudgment();

  const options = getJudgmentOptions(factorType);
  const selected = options.find((o) => o.value === judgment.judgment);

  return (
    <div className="flex items-center gap-1">
      {isPending || isDeleting ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : null}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
        style={{ backgroundColor: selected?.color ?? '#e2e8f0' }}
        title={selected?.label ?? 'Not set'}
      />
      <select
        value={judgment.judgment ?? ''}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          updateJudgment({
            id: judgment.id,
            recommendationId,
            data: { judgment: e.target.value || undefined, colorCode: opt?.color },
          });
        }}
        className="min-w-0 flex-1 rounded border px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-background"
      >
        <option value="">— Not set —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => deleteJudgment({ id: judgment.id, recommendationId })}
        className="text-muted-foreground hover:text-destructive flex-shrink-0"
        title="Remove intervention"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

interface EtdFactorCardProps {
  factor: EtdFactor;
  recommendationId: string;
  etdMode: EtdMode;
}

type FactorTab = 'summary' | 'evidence' | 'considerations' | 'judgments';

function EtdFactorCard({ factor, recommendationId, etdMode }: EtdFactorCardProps) {
  const [activeTab, setActiveTab] = useState<FactorTab>('judgments');
  const [newIntervention, setNewIntervention] = useState('');
  const { mutate: updateFactor, isPending: isSaving } = useUpdateEtdFactor();
  const { mutate: addJudgment, isPending: isAdding } = useAddEtdJudgment();

  const factorLabel =
    etdMode === 'TWELVE_FACTOR' && TWELVE_FACTOR_LABEL_OVERRIDES[factor.factorType]
      ? TWELVE_FACTOR_LABEL_OVERRIDES[factor.factorType]
      : (FACTOR_LABELS[factor.factorType] ?? factor.factorType);

  const labelCls = 'px-2 py-1 text-xs font-medium border-b-2 transition-colors';
  const tabs: { id: FactorTab; label: string }[] = [
    { id: 'judgments', label: 'Judgments' },
    { id: 'summary', label: 'Summary' },
    { id: 'evidence', label: 'Research evidence' },
    { id: 'considerations', label: 'Considerations' },
  ];

  function handleAddIntervention() {
    const label = newIntervention.trim();
    if (!label) return;
    addJudgment({ factorId: factor.id, recommendationId, interventionLabel: label });
    setNewIntervention('');
  }

  return (
    <div className="rounded border bg-card text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="font-medium text-sm">
          {factorLabel}
        </span>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Factor tab bar */}
      <div className="flex border-b bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              labelCls,
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {activeTab === 'judgments' && (
          <div className="space-y-2">
            {factor.judgments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No interventions added yet. Add one below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {factor.judgments.map((j) => (
                  <div key={j.id} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{j.interventionLabel}</p>
                    <JudgmentCell
                      factorType={factor.factorType}
                      judgment={j}
                      recommendationId={recommendationId}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Add intervention */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newIntervention}
                onChange={(e) => setNewIntervention(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddIntervention();
                }}
                placeholder="Intervention label…"
                className="flex-1 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddIntervention}
                disabled={!newIntervention.trim() || isAdding}
                className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
              >
                {isAdding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Add
              </button>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <RichTextEditor
            content={factor.summaryText}
            onBlurSave={(json) =>
              updateFactor({ id: factor.id, recommendationId, data: { summaryText: json } })
            }
            placeholder="Enter summary text…"
          />
        )}

        {activeTab === 'evidence' && (
          <RichTextEditor
            content={factor.researchEvidence}
            onBlurSave={(json) =>
              updateFactor({ id: factor.id, recommendationId, data: { researchEvidence: json } })
            }
            placeholder="Enter research evidence…"
          />
        )}

        {activeTab === 'considerations' && (
          <RichTextEditor
            content={factor.additionalConsiderations}
            onBlurSave={(json) =>
              updateFactor({
                id: factor.id,
                recommendationId,
                data: { additionalConsiderations: json },
              })
            }
            placeholder="Enter additional considerations…"
          />
        )}
      </div>
    </div>
  );
}

// ── Main EtdPanel ─────────────────────────────────────────────────────────

interface EtdPanelProps {
  recommendationId: string;
  etdMode?: EtdMode;
}

/**
 * Evidence to Decision (EtD) panel.
 * Renders the active factors for the current mode (4, 7, or 12 factors).
 * Inactive factors are hidden but their data is preserved in the database.
 */
export function EtdPanel({ recommendationId, etdMode = 'SEVEN_FACTOR' }: EtdPanelProps) {
  const { data: factors, isLoading, isError } = useEtdFactors(recommendationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading EtD framework…
      </div>
    );
  }

  if (isError || !factors) {
    return (
      <p className="py-4 text-sm text-destructive">Failed to load EtD framework.</p>
    );
  }

  const activeTypes = new Set(getActiveTypes(etdMode));
  const activeFactors = factors.filter((f) => activeTypes.has(f.factorType));
  // Sort by the canonical order of activeTypes
  const orderedActiveTypes = getActiveTypes(etdMode);
  activeFactors.sort(
    (a, b) => orderedActiveTypes.indexOf(a.factorType) - orderedActiveTypes.indexOf(b.factorType),
  );

  const modeLabel = {
    FOUR_FACTOR: '4-Factor',
    SEVEN_FACTOR: '7-Factor',
    TWELVE_FACTOR: '12-Factor',
  }[etdMode];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          EtD framework — <span className="font-medium">{modeLabel}</span>
          {' '}({activeFactors.length} factors shown; mode set on guideline settings)
        </p>
      </div>

      {activeFactors.map((factor) => (
        <EtdFactorCard key={factor.id} factor={factor} recommendationId={recommendationId} etdMode={etdMode} />
      ))}

      {activeFactors.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No EtD factors available for this mode.
        </p>
      )}
    </div>
  );
}
