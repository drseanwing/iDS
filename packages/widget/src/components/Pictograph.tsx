import { h } from 'preact';
import type { Theme } from '../styles';

// ── Person icon SVG path (simple stick figure) ────────────────────────────

function PersonIcon({ fill, size = 16 }: { fill: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* head */}
      <circle cx="12" cy="5" r="3" fill={fill} />
      {/* body */}
      <rect x="10" y="9" width="4" height="7" rx="1" fill={fill} />
      {/* left leg */}
      <rect
        x="10"
        y="16"
        width="3"
        height="5"
        rx="1"
        transform="rotate(-5 10 16)"
        fill={fill}
      />
      {/* right leg */}
      <rect
        x="12"
        y="16"
        width="3"
        height="5"
        rx="1"
        transform="rotate(5 12 16)"
        fill={fill}
      />
      {/* left arm */}
      <rect
        x="6"
        y="10"
        width="5"
        height="2.5"
        rx="1"
        transform="rotate(15 6 10)"
        fill={fill}
      />
      {/* right arm */}
      <rect
        x="13"
        y="10"
        width="5"
        height="2.5"
        rx="1"
        transform="rotate(-15 13 10)"
        fill={fill}
      />
    </svg>
  );
}

// ── Pictograph ────────────────────────────────────────────────────────────

export interface PictographProps {
  /**
   * Risk in the comparator group (0–1, proportion).
   * These icons will be shown in the "harm" colour.
   */
  baselineRisk: number;
  /**
   * Risk in the intervention group (0–1, proportion).
   * Icons shifted by the difference will be coloured "benefit" (if lower)
   * or "extra harm" (if higher).
   */
  interventionRisk: number;
  interventionLabel?: string;
  comparatorLabel?: string;
  theme: Theme;
}

const TOTAL = 100; // 10 × 10 grid

export function Pictograph({
  baselineRisk,
  interventionRisk,
  interventionLabel = 'With intervention',
  comparatorLabel = 'Without intervention',
  theme,
}: PictographProps) {
  const baseCount = Math.round(Math.min(Math.max(baselineRisk, 0), 1) * TOTAL);
  const interventionCount = Math.round(
    Math.min(Math.max(interventionRisk, 0), 1) * TOTAL,
  );
  const benefit = Math.max(baseCount - interventionCount, 0);
  const extraHarm = Math.max(interventionCount - baseCount, 0);
  const remaining = interventionCount - extraHarm; // baseline events shared

  function colorFor(index: number): string {
    // Icons are ordered: [benefit-avoided | shared-events | extra-harm | neutral]
    // benefit-avoided: indices 0..benefit-1 → green (events avoided)
    // shared baseline events: indices benefit..benefit+remaining-1 → harm colour
    // extra harm: indices benefit+remaining..benefit+remaining+extraHarm-1 → red
    // neutral: rest
    if (index < benefit) return theme.pictoBenefitFill;
    if (index < benefit + remaining) return theme.pictoHarmFill;
    if (index < benefit + remaining + extraHarm) return theme.red.text;
    return theme.pictoNeutralFill;
  }

  const cells = Array.from({ length: TOTAL }, (_, i) => i);

  const gridStyle: Record<string, string | number> = {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 18px)',
    gap: '2px',
  };

  const legendStyle: Record<string, string | number> = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '8px',
    fontSize: '11px',
    color: theme.textMuted,
  };

  const dotStyle = (color: string): Record<string, string | number> => ({
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    marginRight: '4px',
    verticalAlign: 'middle',
  });

  return (
    <div>
      <p style={{ fontSize: '12px', marginBottom: '6px', color: theme.textMuted }}>
        Out of 100 people:
      </p>
      <div style={gridStyle} role="img" aria-label="Pictograph showing outcome risk per 100 people">
        {cells.map((i) => (
          <PersonIcon key={i} fill={colorFor(i)} size={16} />
        ))}
      </div>

      <div style={legendStyle}>
        {benefit > 0 && (
          <span>
            <span style={dotStyle(theme.pictoBenefitFill)} />
            {benefit} fewer events {interventionLabel}
          </span>
        )}
        {remaining > 0 && (
          <span>
            <span style={dotStyle(theme.pictoHarmFill)} />
            {remaining} events in both groups
          </span>
        )}
        {extraHarm > 0 && (
          <span>
            <span style={dotStyle(theme.red.text)} />
            {extraHarm} extra events {interventionLabel}
          </span>
        )}
        <span>
          <span style={dotStyle(theme.pictoNeutralFill)} />
          No event
        </span>
      </div>

      <p style={{ fontSize: '11px', color: theme.textMuted, marginTop: '6px' }}>
        {comparatorLabel}: {(baselineRisk * 100).toFixed(1)}% &nbsp;|&nbsp;{' '}
        {interventionLabel}: {(interventionRisk * 100).toFixed(1)}%
      </p>
    </div>
  );
}
