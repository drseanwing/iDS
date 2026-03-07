import { Loader2, Plus, CheckCircle2, Trash2, GitBranch } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useShadowOutcomes,
  useCreateShadow,
  usePromoteShadow,
  useDeleteShadow,
  type ShadowOutcome,
} from '../../hooks/useShadowOutcomes';

// ── helpers ─────────────────────────────────────────────────────────────────

function certaintyLabel(level: string | null | undefined): string {
  switch (level) {
    case 'HIGH': return 'High';
    case 'MODERATE': return 'Moderate';
    case 'LOW': return 'Low';
    case 'VERY_LOW': return 'Very low';
    default: return '—';
  }
}

function certaintyBadgeColor(level: string | null | undefined): string {
  switch (level) {
    case 'HIGH': return 'bg-green-100 text-green-800';
    case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
    case 'LOW': return 'bg-orange-100 text-orange-800';
    case 'VERY_LOW': return 'bg-red-100 text-red-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatCI(
  effect?: number,
  lower?: number,
  upper?: number,
): string {
  if (effect == null) return '—';
  const ciPart = lower != null && upper != null ? ` (${lower}–${upper})` : '';
  return `${effect}${ciPart}`;
}

// ── ShadowCard ───────────────────────────────────────────────────────────────

interface ShadowCardProps {
  shadow: ShadowOutcome;
  outcomeTitle: string;
}

function ShadowCard({ shadow, outcomeTitle }: ShadowCardProps) {
  const { mutate: promote, isPending: promoting } = usePromoteShadow();
  const { mutate: discard, isPending: discarding } = useDeleteShadow();

  function handlePromote() {
    if (
      !window.confirm(
        `Promote this shadow outcome to replace "${outcomeTitle}"?\n\nThis will overwrite the current outcome data with the shadow values. This action cannot be undone.`,
      )
    ) {
      return;
    }
    promote({ outcomeId: shadow.id });
  }

  function handleDiscard() {
    if (!window.confirm('Discard this shadow outcome? This cannot be undone.')) {
      return;
    }
    discard({ outcomeId: shadow.shadowOfId, shadowId: shadow.id });
  }

  const fields: { label: string; value: string }[] = [
    {
      label: 'Effect measure',
      value: shadow.effectMeasure ?? '—',
    },
    {
      label: 'Relative effect (95% CI)',
      value: formatCI(shadow.relativeEffect, shadow.relativeEffectLower, shadow.relativeEffectUpper),
    },
    {
      label: 'Participants',
      value: shadow.participants != null ? shadow.participants.toLocaleString() : '—',
    },
    {
      label: 'Studies',
      value: shadow.numberOfStudies != null ? String(shadow.numberOfStudies) : '—',
    },
  ];

  return (
    <div className="rounded-md border bg-card overflow-hidden" style={{ borderLeftWidth: '3px', borderLeftColor: 'rgb(34 197 94)' }}>
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-green-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
          <span className="truncate text-sm font-medium text-green-900">
            Shadow of: {outcomeTitle}
          </span>
        </div>
        <span className="flex-shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          Pending review
        </span>
      </div>

      {/* Evidence fields grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-sm text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Certainty row */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Certainty of evidence:
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            certaintyBadgeColor(shadow.certaintyOverall),
          )}
        >
          {certaintyLabel(shadow.certaintyOverall)}
        </span>
      </div>

      {/* Plain language summary */}
      {shadow.plainLanguageSummary && (
        <div className="px-4 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Plain language summary
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {shadow.plainLanguageSummary}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t px-4 py-2.5 bg-muted/20">
        <button
          onClick={handlePromote}
          disabled={promoting || discarding}
          className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {promoting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          Promote
        </button>
        <button
          onClick={handleDiscard}
          disabled={promoting || discarding}
          className="flex items-center gap-1.5 rounded border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          {discarding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          Discard
        </button>
      </div>
    </div>
  );
}

// ── ShadowOutcomePanel ───────────────────────────────────────────────────────

interface ShadowOutcomePanelProps {
  outcomeId: string;
  outcomeTitle: string;
}

export function ShadowOutcomePanel({ outcomeId, outcomeTitle }: ShadowOutcomePanelProps) {
  const { data: shadows = [], isLoading, isError } = useShadowOutcomes(outcomeId);
  const { mutate: createShadow, isPending: creating } = useCreateShadow();

  function handleCreateShadow() {
    createShadow({ outcomeId });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Evidence Updates</h3>
          {shadows.length > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {shadows.length}
            </span>
          )}
        </div>
        <button
          onClick={handleCreateShadow}
          disabled={creating}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Create Shadow
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive py-4 text-center">
          Failed to load shadow outcomes.
        </p>
      ) : shadows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center text-muted-foreground">
          <GitBranch className="mb-2 h-7 w-7 opacity-30" />
          <p className="text-sm">No shadow outcomes.</p>
          <p className="mt-0.5 text-xs">
            Create one to review updated evidence before accepting it.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {shadows.map((shadow) => (
            <li key={shadow.id}>
              <ShadowCard shadow={shadow} outcomeTitle={outcomeTitle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
