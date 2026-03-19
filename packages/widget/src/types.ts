// ── Public widget configuration ───────────────────────────────────────────

export interface WidgetConfig {
  /** Base URL of the OpenGRADE API, e.g. "https://api.example.com" */
  apiUrl: string;
  /** UUID of the recommendation to display */
  recommendationId: string;
  /** Visual theme. Defaults to "light". */
  theme?: 'light' | 'dark';
  /** BCP-47 language tag for UI labels. Currently informational. */
  language?: string;
  /**
   * Which layers to expose. Defaults to all three.
   * Useful to restrict to a single layer for embedding contexts.
   */
  layers?: Array<'overview' | 'benefits-harms' | 'full-evidence'>;
}

// ── API response types (mirrors apps/web/src/hooks/useDecisionAid.ts) ─────

export interface Outcome {
  id: string;
  title: string;
  outcomeType: string;
  importance: number | null;
  ordering: number;
  certaintyOverall: string | null;
  effectMeasure: string | null;
  relativeEffect: number | null;
  relativeEffectLower: number | null;
  relativeEffectUpper: number | null;
  baselineRisk: number | null;
  absoluteEffectIntervention: number | null;
  absoluteEffectComparison: number | null;
  interventionParticipants: number | null;
  comparisonParticipants: number | null;
  numberOfStudies: number | null;
  plainLanguageSummary: string | null;
}

export interface PracticalIssue {
  id: string;
  category: string;
  title: string;
  description: unknown | null;
}

export interface DecisionAidPico {
  id: string;
  population: string;
  intervention: string;
  comparator: string;
  narrativeSummary: unknown | null;
  outcomes: Outcome[];
  practicalIssues: PracticalIssue[];
}

export interface DecisionAidData {
  recommendation: {
    id: string;
    title: string | null;
    description: unknown;
    strength: string | null;
    recommendationType: string | null;
    remark: unknown | null;
    rationale: unknown | null;
    practicalInfo: unknown | null;
    certaintyOfEvidence: string | null;
  };
  picos: DecisionAidPico[];
}
