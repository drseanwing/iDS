// ── CSS-in-JS scoped styles ────────────────────────────────────────────────
// All styles are plain JS objects so there is zero dependency on external CSS.

type CSSProps = Record<string, string | number>;

// ── Theme tokens ──────────────────────────────────────────────────────────

export interface Theme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  tabActiveBorder: string;

  // severity colours
  green: { bg: string; text: string; border: string };
  blue: { bg: string; text: string; border: string };
  yellow: { bg: string; text: string; border: string };
  orange: { bg: string; text: string; border: string };
  red: { bg: string; text: string; border: string };

  // pictograph
  pictoBenefitFill: string;
  pictoHarmFill: string;
  pictoNeutralFill: string;
}

const light: Theme = {
  bg: '#ffffff',
  surface: '#f8f9fa',
  border: '#e2e8f0',
  text: '#1a202c',
  textMuted: '#718096',
  primary: '#2b6cb0',
  primaryText: '#ffffff',
  tabActiveBorder: '#2b6cb0',

  green:  { bg: '#f0fff4', text: '#276749', border: '#9ae6b4' },
  blue:   { bg: '#ebf8ff', text: '#2c5282', border: '#90cdf4' },
  yellow: { bg: '#fffff0', text: '#744210', border: '#f6e05e' },
  orange: { bg: '#fffaf0', text: '#7b341e', border: '#fbd38d' },
  red:    { bg: '#fff5f5', text: '#742a2a', border: '#feb2b2' },

  pictoBenefitFill: '#276749',
  pictoHarmFill:    '#c53030',
  pictoNeutralFill: '#cbd5e0',
};

const dark: Theme = {
  bg: '#1a202c',
  surface: '#2d3748',
  border: '#4a5568',
  text: '#e2e8f0',
  textMuted: '#a0aec0',
  primary: '#63b3ed',
  primaryText: '#1a202c',
  tabActiveBorder: '#63b3ed',

  green:  { bg: '#1c4532', text: '#9ae6b4', border: '#276749' },
  blue:   { bg: '#1a365d', text: '#90cdf4', border: '#2c5282' },
  yellow: { bg: '#744210', text: '#f6e05e', border: '#b7791f' },
  orange: { bg: '#7b341e', text: '#fbd38d', border: '#c05621' },
  red:    { bg: '#742a2a', text: '#feb2b2', border: '#c53030' },

  pictoBenefitFill: '#9ae6b4',
  pictoHarmFill:    '#feb2b2',
  pictoNeutralFill: '#4a5568',
};

export function getTheme(mode: 'light' | 'dark' = 'light'): Theme {
  return mode === 'dark' ? dark : light;
}

// ── Style factories (consume theme at render time) ─────────────────────────

export function makeStyles(t: Theme) {
  const root: CSSProps = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: t.text,
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '8px',
    padding: '16px',
    boxSizing: 'border-box',
    maxWidth: '720px',
  };

  const tabBar: CSSProps = {
    display: 'flex',
    borderBottom: `1px solid ${t.border}`,
    marginBottom: '16px',
    gap: '0',
  };

  const tabBase: CSSProps = {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: t.textMuted,
    transition: 'color 0.15s, border-color 0.15s',
  };

  const tabActive: CSSProps = {
    ...tabBase,
    borderBottom: `2px solid ${t.tabActiveBorder}`,
    color: t.primary,
  };

  const picoBox: CSSProps = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '12px',
    marginBottom: '12px',
  };

  const outcomeCard: CSSProps = {
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '8px',
  };

  const badge: CSSProps = {
    display: 'inline-block',
    borderRadius: '9999px',
    padding: '1px 8px',
    fontSize: '11px',
    fontWeight: '500',
  };

  const sectionTitle: CSSProps = {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: t.textMuted,
    margin: '8px 0 4px',
  };

  const mutedText: CSSProps = {
    color: t.textMuted,
    fontSize: '12px',
    fontStyle: 'italic',
  };

  const linkBtn: CSSProps = {
    background: 'none',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    color: t.primary,
    fontSize: '12px',
    textDecoration: 'none',
  };

  const strengthCard = (key: string): CSSProps => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      STRONG_FOR:          t.green,
      CONDITIONAL_FOR:     t.blue,
      CONDITIONAL_AGAINST: t.orange,
      STRONG_AGAINST:      t.red,
    };
    const palette = map[key] ?? { bg: t.surface, text: t.textMuted, border: t.border };
    return {
      background: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.border}`,
      borderRadius: '6px',
      padding: '10px 14px',
      marginBottom: '12px',
    };
  };

  const certBadgeStyle = (key: string): CSSProps => {
    const map: Record<string, { bg: string; text: string }> = {
      HIGH:     t.green,
      MODERATE: t.yellow,
      LOW:      t.orange,
      VERY_LOW: t.red,
    };
    const palette = map[key] ?? { bg: t.surface, text: t.textMuted };
    return { ...badge, background: palette.bg, color: palette.text };
  };

  const errorBox: CSSProps = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    background: t.red.bg,
    border: `1px solid ${t.red.border}`,
    color: t.red.text,
    fontSize: '13px',
  };

  const spinnerWrap: CSSProps = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '24px 0',
    color: t.textMuted,
    fontSize: '13px',
  };

  return {
    root,
    tabBar,
    tabBase,
    tabActive,
    picoBox,
    outcomeCard,
    badge,
    sectionTitle,
    mutedText,
    linkBtn,
    strengthCard,
    certBadgeStyle,
    errorBox,
    spinnerWrap,
  };
}
