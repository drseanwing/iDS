import { cn } from '../../lib/utils';

interface PictographDisplayProps {
  /** Baseline risk for the comparator group (0–1, e.g. 0.05 = 5 %) */
  baselineRisk: number;
  /** Absolute risk for the intervention group (0–1) */
  interventionRisk: number;
  /** Total number of figures to display (default 100) */
  total?: number;
  /** Label for comparator column */
  comparatorLabel?: string;
  /** Label for intervention column */
  interventionLabel?: string;
  className?: string;
}

/**
 * Renders a pair of pictograph panels (icon arrays) comparing baseline and
 * intervention absolute risks.  Each filled figure represents one person in
 * the chosen cohort size experiencing the outcome.
 */
export function PictographDisplay({
  baselineRisk,
  interventionRisk,
  total = 100,
  comparatorLabel = 'Without intervention',
  interventionLabel = 'With intervention',
  className,
}: PictographDisplayProps) {
  const baselineCount = Math.round(baselineRisk * total);
  const interventionCount = Math.round(interventionRisk * total);

  return (
    <div className={cn('flex gap-6', className)}>
      <PictographPanel
        label={comparatorLabel}
        affectedCount={baselineCount}
        total={total}
        filledColor="text-amber-400"
      />
      <PictographPanel
        label={interventionLabel}
        affectedCount={interventionCount}
        total={total}
        filledColor="text-blue-500"
      />
    </div>
  );
}

interface PictographPanelProps {
  label: string;
  affectedCount: number;
  total: number;
  filledColor: string;
}

function PictographPanel({ label, affectedCount, total, filledColor }: PictographPanelProps) {
  const cols = 10;

  return (
    <div className="flex-1">
      <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className="mx-auto grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: 'fit-content' }}
        aria-label={`${affectedCount} of ${total} people affected`}
      >
        {Array.from({ length: total }, (_, i) => (
          <PersonIcon key={i} filled={i < affectedCount} filledColor={filledColor} />
        ))}
      </div>
      <p className="mt-1.5 text-center text-xs text-foreground">
        <span className="font-semibold">{affectedCount}</span> of {total} people
      </p>
    </div>
  );
}

interface PersonIconProps {
  filled: boolean;
  filledColor: string;
}

function PersonIcon({ filled, filledColor }: PersonIconProps) {
  return (
    <svg
      viewBox="0 0 10 18"
      className={cn('h-4 w-2.5', filled ? filledColor : 'text-muted-foreground/20')}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="5" cy="3" r="2.5" />
      {/* Body */}
      <path d="M2 8 Q2 6 5 6 Q8 6 8 8 L8 14 Q8 15 7 15 L7 17 Q7 18 6 18 L4 18 Q3 18 3 17 L3 15 Q2 15 2 14 Z" />
    </svg>
  );
}
