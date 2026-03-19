import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { DecisionAidData, DecisionAidPico, Outcome } from '../types';
import type { WidgetConfig } from '../types';
import { getTheme, makeStyles } from '../styles';
import { Pictograph } from './Pictograph';

// ── Constants ─────────────────────────────────────────────────────────────

const CERTAINTY_LABELS: Record<string, string> = {
  HIGH: '\u2295\u2295\u2295\u2295 High',
  MODERATE: '\u2295\u2295\u2295\u25ef Moderate',
  LOW: '\u2295\u2295\u25ef\u25ef Low',
  VERY_LOW: '\u2295\u25ef\u25ef\u25ef Very low',
};

const STRENGTH_LABELS: Record<string, string> = {
  STRONG_FOR: 'Strong For',
  CONDITIONAL_FOR: 'Conditional For',
  CONDITIONAL_AGAINST: 'Conditional Against',
  STRONG_AGAINST: 'Strong Against',
  NOT_SET: 'Not Set',
};

type Layer = 'overview' | 'benefits-harms' | 'full-evidence';

const ALL_LAYERS: Array<[Layer, string]> = [
  ['overview', 'Overview'],
  ['benefits-harms', 'Benefits & Harms'],
  ['full-evidence', 'Full Evidence'],
];

// ── Helpers ───────────────────────────────────────────────────────────────

function formatPercent(v: number | null | undefined): string {
  if (v == null) return '\u2014';
  return `${(v * 100).toFixed(1)}\u00a0%`;
}

function formatEffect(v: number | null | undefined, measure: string | null | undefined): string {
  if (v == null) return '\u2014';
  return `${measure ?? ''} ${v.toFixed(2)}`.trim();
}

// ── Spinner ───────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{ animation: 'og-spin 0.75s linear infinite', display: 'block' }}
      aria-hidden="true"
    >
      <style>{`@keyframes og-spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray="40 60"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── OutcomeRow ────────────────────────────────────────────────────────────

interface OutcomeRowProps {
  outcome: Outcome;
  picoIntervention: string;
  picoComparator: string;
  styles: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof getTheme>;
}

function OutcomeRow({ outcome, picoIntervention, picoComparator, styles, theme }: OutcomeRowProps) {
  const [showPicto, setShowPicto] = useState(false);
  const hasPicto =
    outcome.absoluteEffectIntervention != null && outcome.absoluteEffectComparison != null;

  return (
    <div style={styles.outcomeCard}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontWeight: '500', fontSize: '13px' }}>{outcome.title}</span>
        {outcome.certaintyOverall && (
          <span style={styles.certBadgeStyle(outcome.certaintyOverall)}>
            {CERTAINTY_LABELS[outcome.certaintyOverall] ?? outcome.certaintyOverall}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: theme.textMuted }}>
        {outcome.effectMeasure && (
          <span>
            <strong>Effect:</strong>{' '}
            {formatEffect(outcome.relativeEffect, outcome.effectMeasure)}
            {outcome.relativeEffectLower != null && outcome.relativeEffectUpper != null && (
              <span>
                {' '}(95% CI {outcome.relativeEffectLower.toFixed(2)}&ndash;
                {outcome.relativeEffectUpper.toFixed(2)})
              </span>
            )}
          </span>
        )}
        {outcome.baselineRisk != null && (
          <span><strong>Baseline risk:</strong> {formatPercent(outcome.baselineRisk)}</span>
        )}
        {outcome.absoluteEffectIntervention != null && (
          <span><strong>With intervention:</strong> {formatPercent(outcome.absoluteEffectIntervention)}</span>
        )}
        {outcome.numberOfStudies != null && (
          <span><strong>Studies:</strong> {outcome.numberOfStudies}</span>
        )}
      </div>

      {outcome.plainLanguageSummary && (
        <p style={{ fontSize: '12px', fontStyle: 'italic', margin: '6px 0 0', color: theme.text }}>
          {outcome.plainLanguageSummary}
        </p>
      )}

      {hasPicto && (
        <div style={{ marginTop: '6px' }}>
          <button
            type="button"
            style={styles.linkBtn}
            onClick={() => setShowPicto((v: boolean) => !v)}
          >
            {showPicto ? 'Hide pictograph' : 'Show pictograph'}
          </button>
          {showPicto && (
            <div style={{ marginTop: '10px' }}>
              <Pictograph
                baselineRisk={outcome.absoluteEffectComparison!}
                interventionRisk={outcome.absoluteEffectIntervention!}
                interventionLabel={picoIntervention || 'With intervention'}
                comparatorLabel={picoComparator || 'Without intervention'}
                theme={theme}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PicoSection ───────────────────────────────────────────────────────────

interface PicoSectionProps {
  pico: DecisionAidPico;
  showFull: boolean;
  styles: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof getTheme>;
}

function PicoSection({ pico, showFull, styles, theme }: PicoSectionProps) {
  const critical = pico.outcomes.filter((o) => (o.importance ?? 0) >= 7);
  const important = pico.outcomes.filter((o) => (o.importance ?? 0) >= 4 && (o.importance ?? 0) < 7);
  const other = pico.outcomes.filter((o) => (o.importance ?? 0) < 4);

  const groups = showFull
    ? [
        { label: critical.length > 0 ? 'Critical outcomes' : null, items: critical },
        { label: important.length > 0 ? 'Important outcomes' : null, items: important },
        { label: other.length > 0 ? 'Other outcomes' : null, items: other },
      ].filter((g) => g.items.length > 0)
    : [
        { label: critical.length > 0 ? 'Critical outcomes' : null, items: critical },
        { label: important.length > 0 ? 'Important outcomes' : null, items: important },
      ].filter((g) => g.items.length > 0);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={styles.picoBox}>
        <div><strong>Population:</strong> {pico.population}</div>
        <div><strong>Intervention:</strong> {pico.intervention}</div>
        <div><strong>Comparator:</strong> {pico.comparator}</div>
      </div>

      {pico.outcomes.length === 0 && (
        <p style={styles.mutedText}>No outcomes recorded for this PICO.</p>
      )}

      {groups.map((g) => (
        <div key={g.label ?? 'outcomes'}>
          {g.label && <p style={styles.sectionTitle}>{g.label}</p>}
          {g.items.map((outcome) => (
            <OutcomeRow
              key={outcome.id}
              outcome={outcome}
              picoIntervention={pico.intervention}
              picoComparator={pico.comparator}
              styles={styles}
              theme={theme}
            />
          ))}
        </div>
      ))}

      {!showFull && other.length > 0 && (
        <p style={styles.mutedText}>
          {other.length} additional outcome(s) hidden. Switch to &ldquo;Full Evidence&rdquo; layer to view all.
        </p>
      )}

      {showFull && pico.practicalIssues.length > 0 && (
        <div>
          <p style={styles.sectionTitle}>Practical issues</p>
          {pico.practicalIssues.map((issue) => (
            <div key={issue.id} style={{ ...styles.outcomeCard, marginBottom: '6px' }}>
              <span style={{ fontSize: '12px' }}>
                <strong>{issue.category.replace(/_/g, ' ')}:</strong> {issue.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Widget component ─────────────────────────────────────────────────

export interface WidgetProps {
  config: WidgetConfig;
}

export function Widget({ config }: WidgetProps) {
  const { apiUrl, recommendationId, theme: themeMode = 'light', layers } = config;
  const theme = getTheme(themeMode);
  const styles = makeStyles(theme);

  const allowedLayers: Layer[] = layers ?? ['overview', 'benefits-harms', 'full-evidence'];
  const visibleTabs = ALL_LAYERS.filter(([key]) => allowedLayers.includes(key));
  const [activeLayer, setActiveLayer] = useState<Layer>(allowedLayers[0] ?? 'overview');

  const [data, setData] = useState<DecisionAidData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = `${apiUrl.replace(/\/$/, '')}/recommendations/${recommendationId}/decision-aid`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DecisionAidData>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, [apiUrl, recommendationId]);

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={styles.spinnerWrap}>
          <Spinner color={theme.textMuted} />
          <span>Loading decision aid\u2026</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.root}>
        <div style={styles.errorBox}>
          <span style={{ fontSize: '16px' }}>&#9888;</span>
          Failed to load decision aid data{error ? `: ${error}` : ''}.
        </div>
      </div>
    );
  }

  const { recommendation: rec, picos } = data;
  const strengthKey = rec.strength ?? 'NOT_SET';

  return (
    <div style={styles.root}>
      {/* Layer tab bar */}
      {visibleTabs.length > 1 && (
        <div style={styles.tabBar} role="tablist">
          {visibleTabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeLayer === key}
              style={activeLayer === key ? styles.tabActive : styles.tabBase}
              onClick={() => setActiveLayer(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Overview layer */}
      {activeLayer === 'overview' && (
        <div>
          <div style={styles.strengthCard(strengthKey)}>
            <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, margin: '0 0 4px' }}>
              {STRENGTH_LABELS[strengthKey] ?? strengthKey} recommendation
            </p>
            {rec.certaintyOfEvidence && (
              <span style={styles.certBadgeStyle(rec.certaintyOfEvidence)}>
                {CERTAINTY_LABELS[rec.certaintyOfEvidence] ?? rec.certaintyOfEvidence}
              </span>
            )}
          </div>

          {rec.title && (
            <p style={{ fontWeight: '500', fontSize: '13px', margin: '0 0 12px' }}>{rec.title}</p>
          )}

          {picos.length === 0 && (
            <p style={styles.mutedText}>No PICO questions have been linked to this recommendation yet.</p>
          )}

          {picos.map((pico: DecisionAidPico) => (
            <div key={pico.id} style={styles.picoBox}>
              <div><strong>Population:</strong> {pico.population}</div>
              <div><strong>Intervention:</strong> {pico.intervention}</div>
              <div><strong>Comparator:</strong> {pico.comparator}</div>
            </div>
          ))}

          {visibleTabs.some(([k]) => k === 'benefits-harms') && (
            <p style={{ ...styles.mutedText, marginTop: '8px' }}>
              Switch to the{' '}
              <button
                type="button"
                style={styles.linkBtn}
                onClick={() => setActiveLayer('benefits-harms')}
              >
                Benefits &amp; Harms
              </button>{' '}
              tab to see outcome data and pictographs.
            </p>
          )}
        </div>
      )}

      {/* Benefits & Harms layer */}
      {activeLayer === 'benefits-harms' && (
        <div>
          {picos.length === 0 && (
            <p style={styles.mutedText}>No PICO questions have been linked to this recommendation yet.</p>
          )}
          {picos.map((pico: DecisionAidPico) => (
            <PicoSection key={pico.id} pico={pico} showFull={false} styles={styles} theme={theme} />
          ))}
        </div>
      )}

      {/* Full Evidence layer */}
      {activeLayer === 'full-evidence' && (
        <div>
          {picos.length === 0 && (
            <p style={styles.mutedText}>No PICO questions have been linked to this recommendation yet.</p>
          )}
          {picos.map((pico: DecisionAidPico) => (
            <PicoSection key={pico.id} pico={pico} showFull={true} styles={styles} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
