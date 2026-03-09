import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDecisionAid } from '../../hooks/useDecisionAid';
import type { DecisionAidPico, DecisionAidOutcome } from '../../hooks/useDecisionAid';
import { PictographDisplay } from './PictographDisplay';

// ── Constants ─────────────────────────────────────────────────────────────

const CERTAINTY_LABELS: Record<string, string> = {
  HIGH: '⊕⊕⊕⊕  High',
  MODERATE: '⊕⊕⊕◯  Moderate',
  LOW: '⊕⊕◯◯  Low',
  VERY_LOW: '⊕◯◯◯  Very low',
};

const CERTAINTY_COLORS: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-orange-100 text-orange-800',
  VERY_LOW: 'bg-red-100 text-red-800',
};

const STRENGTH_LABELS: Record<string, string> = {
  STRONG_FOR: 'Strong For',
  CONDITIONAL_FOR: 'Conditional For',
  CONDITIONAL_AGAINST: 'Conditional Against',
  STRONG_AGAINST: 'Strong Against',
  NOT_SET: 'Not Set',
};

const STRENGTH_COLORS: Record<string, string> = {
  STRONG_FOR: 'bg-green-100 text-green-800 border-green-200',
  CONDITIONAL_FOR: 'bg-blue-100 text-blue-800 border-blue-200',
  CONDITIONAL_AGAINST: 'bg-orange-100 text-orange-800 border-orange-200',
  STRONG_AGAINST: 'bg-red-100 text-red-800 border-red-200',
  NOT_SET: 'bg-muted text-muted-foreground border-border',
};

type Layer = 'overview' | 'benefits-harms' | 'full-evidence';

// ── Helpers ────────────────────────────────────────────────────────────────

function certBadge(certainty: string | null | undefined) {
  if (!certainty) return null;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        CERTAINTY_COLORS[certainty] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {CERTAINTY_LABELS[certainty] ?? certainty}
    </span>
  );
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)} %`;
}

function formatEffect(value: number | null | undefined, measure: string | null | undefined): string {
  if (value == null) return '—';
  const label = measure ?? '';
  return `${label} ${value.toFixed(2)}`.trim();
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface OutcomeRowProps {
  outcome: DecisionAidOutcome;
  picoIntervention: string;
  picoComparator: string;
}

function OutcomeRow({ outcome, picoIntervention, picoComparator }: OutcomeRowProps) {
  const [showPictograph, setShowPictograph] = useState(false);
  const hasPictograph =
    outcome.absoluteEffectIntervention != null && outcome.absoluteEffectComparison != null;

  return (
    <div className="rounded border bg-card px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{outcome.title}</span>
        {certBadge(outcome.certaintyOverall)}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {outcome.effectMeasure && (
          <span>
            <span className="font-medium">Effect:</span>{' '}
            {formatEffect(outcome.relativeEffect, outcome.effectMeasure)}
            {outcome.relativeEffectLower != null && outcome.relativeEffectUpper != null && (
              <span> (95 % CI {outcome.relativeEffectLower.toFixed(2)}–{outcome.relativeEffectUpper.toFixed(2)})</span>
            )}
          </span>
        )}
        {outcome.baselineRisk != null && (
          <span>
            <span className="font-medium">Baseline risk:</span> {formatPercent(outcome.baselineRisk)}
          </span>
        )}
        {outcome.absoluteEffectIntervention != null && (
          <span>
            <span className="font-medium">With intervention:</span>{' '}
            {formatPercent(outcome.absoluteEffectIntervention)}
          </span>
        )}
        {outcome.numberOfStudies != null && (
          <span>
            <span className="font-medium">Studies:</span> {outcome.numberOfStudies}
          </span>
        )}
      </div>

      {outcome.plainLanguageSummary && (
        <p className="text-xs text-foreground/80 italic">{outcome.plainLanguageSummary}</p>
      )}

      {hasPictograph && (
        <div>
          <button
            type="button"
            onClick={() => setShowPictograph((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showPictograph ? 'Hide pictograph' : 'Show pictograph'}
          </button>
          {showPictograph && (
            <div className="mt-3">
              <PictographDisplay
                baselineRisk={outcome.absoluteEffectComparison!}
                interventionRisk={outcome.absoluteEffectIntervention!}
                comparatorLabel={picoComparator || 'Without intervention'}
                interventionLabel={picoIntervention || 'With intervention'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PicoSectionProps {
  pico: DecisionAidPico;
  showFullEvidence: boolean;
}

function PicoSection({ pico, showFullEvidence }: PicoSectionProps) {
  const criticalOutcomes = pico.outcomes.filter((o) => (o.importance ?? 0) >= 7);
  const importantOutcomes = pico.outcomes.filter((o) => (o.importance ?? 0) >= 4 && (o.importance ?? 0) < 7);
  const otherOutcomes = pico.outcomes.filter((o) => (o.importance ?? 0) < 4);

  // In Benefits & Harms layer show critical + important; in Full Evidence show all
  const displayGroups: { label: string | null; outcomes: DecisionAidOutcome[] }[] = showFullEvidence
    ? [
        { label: criticalOutcomes.length > 0 ? 'Critical outcomes' : null, outcomes: criticalOutcomes },
        { label: importantOutcomes.length > 0 ? 'Important outcomes' : null, outcomes: importantOutcomes },
        { label: otherOutcomes.length > 0 ? 'Other outcomes' : null, outcomes: otherOutcomes },
      ].filter((g) => g.outcomes.length > 0)
    : [
        { label: criticalOutcomes.length > 0 ? 'Critical outcomes' : null, outcomes: criticalOutcomes },
        { label: importantOutcomes.length > 0 ? 'Important outcomes' : null, outcomes: importantOutcomes },
      ].filter((g) => g.outcomes.length > 0);

  const hasAnyVisible = displayGroups.some((g) => g.outcomes.length > 0);

  return (
    <div className="space-y-3">
      <div className="rounded border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
        <p>
          <span className="font-semibold">Population:</span> {pico.population}
        </p>
        <p>
          <span className="font-semibold">Intervention:</span> {pico.intervention}
        </p>
        <p>
          <span className="font-semibold">Comparator:</span> {pico.comparator}
        </p>
      </div>

      {!hasAnyVisible && pico.outcomes.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No outcomes recorded for this PICO.</p>
      )}

      {displayGroups.map((group) => (
        <div key={group.label ?? 'outcomes'} className="space-y-2">
          {group.label && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
          )}
          {group.outcomes.map((outcome) => (
            <OutcomeRow
              key={outcome.id}
              outcome={outcome}
              picoIntervention={pico.intervention}
              picoComparator={pico.comparator}
            />
          ))}
        </div>
      ))}

      {!showFullEvidence && otherOutcomes.length > 0 && (
        <p className="text-xs text-muted-foreground italic">
          {otherOutcomes.length} additional outcome(s) hidden. Switch to "Full Evidence" layer to view all.
        </p>
      )}

      {pico.practicalIssues.length > 0 && showFullEvidence && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Practical issues
          </p>
          {pico.practicalIssues.map((issue) => (
            <div key={issue.id} className="rounded border bg-card px-3 py-2">
              <p className="text-xs">
                <span className="font-medium">{issue.category.replace(/_/g, ' ')}:</span>{' '}
                {issue.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface DecisionAidPreviewProps {
  recommendationId: string;
}

/**
 * Layered decision aid display for a recommendation, sourced from the
 * `GET /recommendations/:id/decision-aid` endpoint.
 *
 * Three layers:
 *  1. Overview — recommendation statement, strength, certainty, plain summary
 *  2. Benefits & Harms — outcome table with pictographs
 *  3. Full Evidence — all outcomes + practical issues
 */
export function DecisionAidPreview({ recommendationId }: DecisionAidPreviewProps) {
  const [layer, setLayer] = useState<Layer>('overview');
  const { data, isLoading, isError } = useDecisionAid(recommendationId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading decision aid…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        Failed to load decision aid data.
      </div>
    );
  }

  const { recommendation: rec, picos } = data;
  const strengthKey = rec.strength ?? 'NOT_SET';

  return (
    <div className="space-y-4">
      {/* Layer tabs */}
      <div className="flex border-b">
        {(
          [
            ['overview', 'Overview'],
            ['benefits-harms', 'Benefits & Harms'],
            ['full-evidence', 'Full Evidence'],
          ] as [Layer, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLayer(key)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              layer === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview layer */}
      {layer === 'overview' && (
        <div className="space-y-4">
          <div
            className={cn(
              'rounded border px-4 py-3',
              STRENGTH_COLORS[strengthKey] ?? 'bg-muted text-muted-foreground border-border',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {STRENGTH_LABELS[strengthKey] ?? strengthKey} recommendation
            </p>
            {rec.certaintyOfEvidence && (
              <div className="mt-1">{certBadge(rec.certaintyOfEvidence)}</div>
            )}
          </div>

          {rec.title && (
            <p className="text-sm font-medium">{rec.title}</p>
          )}

          {picos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No PICO questions have been linked to this recommendation yet.
            </p>
          )}

          {picos.map((pico) => (
            <div key={pico.id} className="rounded border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
              <p>
                <span className="font-semibold">Population:</span> {pico.population}
              </p>
              <p>
                <span className="font-semibold">Intervention:</span> {pico.intervention}
              </p>
              <p>
                <span className="font-semibold">Comparator:</span> {pico.comparator}
              </p>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Switch to the{' '}
            <button
              type="button"
              onClick={() => setLayer('benefits-harms')}
              className="text-primary hover:underline"
            >
              Benefits &amp; Harms
            </button>{' '}
            tab to see outcome data and pictographs.
          </p>
        </div>
      )}

      {/* Benefits & Harms layer */}
      {layer === 'benefits-harms' && (
        <div className="space-y-5">
          {picos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No PICO questions have been linked to this recommendation yet.
            </p>
          )}
          {picos.map((pico) => (
            <PicoSection key={pico.id} pico={pico} showFullEvidence={false} />
          ))}
        </div>
      )}

      {/* Full Evidence layer */}
      {layer === 'full-evidence' && (
        <div className="space-y-5">
          {picos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No PICO questions have been linked to this recommendation yet.
            </p>
          )}
          {picos.map((pico) => (
            <PicoSection key={pico.id} pico={pico} showFullEvidence={true} />
          ))}
        </div>
      )}
    </div>
  );
}
