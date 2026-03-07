import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
  FlaskConical,
  Tag,
  X,
  BarChart2,
  GitBranch,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePicos, type Pico, type Outcome, type PicoCode } from '../../hooks/usePicos';
import { useCreatePico } from '../../hooks/useCreatePico';
import { useUpdatePico } from '../../hooks/useUpdatePico';
import { useDeletePico } from '../../hooks/useDeletePico';
import { useCreateOutcome } from '../../hooks/useCreateOutcome';
import { useUpdateOutcome } from '../../hooks/useUpdateOutcome';
import { useDeleteOutcome } from '../../hooks/useDeleteOutcome';
import { useCreatePicoCode } from '../../hooks/useCreatePicoCode';
import { useDeletePicoCode } from '../../hooks/useDeletePicoCode';
import { GradeAssessmentPanel } from './GradeAssessmentPanel';
import { ShadowOutcomePanel } from './ShadowOutcomePanel';

// ── helpers ────────────────────────────────────────────────────────────────

const OUTCOME_TYPE_OPTIONS = [
  { value: 'DICHOTOMOUS', label: 'Dichotomous' },
  { value: 'CONTINUOUS', label: 'Continuous' },
  { value: 'NARRATIVE', label: 'Narrative' },
  { value: 'QUALITATIVE_CERQUAL', label: 'Qualitative (CERQual)' },
];

const OUTCOME_STATE_OPTIONS = [
  { value: 'UNDER_DEVELOPMENT', label: 'Under development' },
  { value: 'FOR_REVIEW', label: 'For review' },
  { value: 'UPDATED', label: 'Updated' },
  { value: 'FINISHED', label: 'Finished' },
];

const CODE_SYSTEM_OPTIONS = [
  { value: 'SNOMED_CT', label: 'SNOMED CT' },
  { value: 'ICD10', label: 'ICD-10' },
  { value: 'ATC', label: 'ATC' },
  { value: 'RXNORM', label: 'RxNorm' },
];

const PICO_ELEMENT_OPTIONS = [
  { value: 'POPULATION', label: 'Population (P)' },
  { value: 'INTERVENTION', label: 'Intervention (I)' },
  { value: 'COMPARATOR', label: 'Comparator (C)' },
  { value: 'OUTCOME', label: 'Outcome (O)' },
];

function outcomeTypeLabel(type: string): string {
  return OUTCOME_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function outcomeTypeBadgeColor(type: string): string {
  switch (type) {
    case 'DICHOTOMOUS':
      return 'bg-blue-100 text-blue-800';
    case 'CONTINUOUS':
      return 'bg-purple-100 text-purple-800';
    case 'NARRATIVE':
      return 'bg-amber-100 text-amber-800';
    case 'QUALITATIVE_CERQUAL':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function outcomeStateLabel(state: string): string {
  return OUTCOME_STATE_OPTIONS.find((o) => o.value === state)?.label ?? state;
}

function outcomeStateBadgeColor(state: string): string {
  switch (state) {
    case 'UNDER_DEVELOPMENT':
      return 'bg-muted text-muted-foreground';
    case 'FOR_REVIEW':
      return 'bg-yellow-100 text-yellow-800';
    case 'UPDATED':
      return 'bg-green-100 text-green-800';
    case 'FINISHED':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-muted text-muted-foreground';
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

function certaintySymbols(level: string | null | undefined): string {
  switch (level) {
    case 'HIGH': return '⊕⊕⊕⊕';
    case 'MODERATE': return '⊕⊕⊕◯';
    case 'LOW': return '⊕⊕◯◯';
    case 'VERY_LOW': return '⊕◯◯◯';
    default: return '';
  }
}

function codeSystemLabel(system: string): string {
  return CODE_SYSTEM_OPTIONS.find((o) => o.value === system)?.label ?? system;
}

function elementLabel(element: string): string {
  return PICO_ELEMENT_OPTIONS.find((o) => o.value === element)?.label ?? element;
}

// ── OutcomeRow ─────────────────────────────────────────────────────────────

interface OutcomeRowProps {
  outcome: Outcome;
  guidelineId: string;
}

function OutcomeRow({ outcome, guidelineId }: OutcomeRowProps) {
  const [editing, setEditing] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [showShadows, setShowShadows] = useState(false);
  const [title, setTitle] = useState(outcome.title);
  const [outcomeType, setOutcomeType] = useState(outcome.outcomeType);
  const [state, setState] = useState(outcome.state);
  const [importance, setImportance] = useState<string>(
    outcome.importance != null ? String(outcome.importance) : '',
  );

  const { mutate: updateOutcome, isPending: updating } = useUpdateOutcome();
  const { mutate: deleteOutcome, isPending: deleting } = useDeleteOutcome();

  function handleSave() {
    updateOutcome({
      id: outcome.id,
      guidelineId,
      data: {
        title,
        outcomeType,
        state,
        importance: importance !== '' ? Number(importance) : undefined,
      },
    });
    setEditing(false);
  }

  function handleCancel() {
    setTitle(outcome.title);
    setOutcomeType(outcome.outcomeType);
    setState(outcome.state);
    setImportance(outcome.importance != null ? String(outcome.importance) : '');
    setEditing(false);
  }

  return (
    <li className="rounded border bg-card text-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        {editing ? (
          <div className="flex flex-1 flex-col gap-2">
            <input
              aria-label="Outcome title"
              className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                aria-label="Outcome type"
                className="rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={outcomeType}
                onChange={(e) => setOutcomeType(e.target.value)}
              >
                {OUTCOME_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                aria-label="Outcome state"
                className="rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {OUTCOME_STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                aria-label="Importance (1–9)"
                type="number"
                min={1}
                max={9}
                placeholder="Importance (1–9)"
                className="w-28 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updating}
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="rounded border px-3 py-1 text-xs hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate font-medium">{outcome.title}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0',
                outcomeTypeBadgeColor(outcome.outcomeType),
              )}
            >
              {outcomeTypeLabel(outcome.outcomeType)}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs flex-shrink-0',
                outcomeStateBadgeColor(outcome.state),
              )}
            >
              {outcomeStateLabel(outcome.state)}
            </span>
            {outcome.importance != null && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground flex-shrink-0">
                Imp: {outcome.importance}
              </span>
            )}
            {outcome.certaintyOverall && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-mono font-medium flex-shrink-0',
                  certaintyBadgeColor(outcome.certaintyOverall),
                )}
                title={`Certainty: ${outcome.certaintyOverall.toLowerCase().replace('_', ' ')}`}
              >
                {certaintySymbols(outcome.certaintyOverall)}
              </span>
            )}
            {/* GRADE evidence toggle */}
            <button
              onClick={() => setShowGrade((v) => !v)}
              aria-label={showGrade ? 'Collapse GRADE assessment' : 'Expand GRADE assessment'}
              aria-expanded={showGrade}
              className={cn(
                'rounded p-1 transition-colors',
                showGrade
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="GRADE evidence & assessment"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </button>
            {/* Shadow outcomes toggle */}
            <button
              onClick={() => setShowShadows((v) => !v)}
              aria-label={showShadows ? 'Collapse evidence updates' : 'Expand evidence updates'}
              aria-expanded={showShadows}
              className={cn(
                'rounded p-1 transition-colors',
                showShadows
                  ? 'text-green-600 bg-green-50'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="Evidence updates (shadows)"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Edit outcome ${outcome.title}`}
              className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              onClick={() => deleteOutcome({ id: outcome.id, guidelineId })}
              disabled={deleting}
              aria-label={`Delete outcome ${outcome.title}`}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>
      {/* GRADE assessment panel (collapsible) */}
      {showGrade && !editing && (
        <div className="px-3 pb-3">
          <GradeAssessmentPanel outcome={outcome} guidelineId={guidelineId} />
        </div>
      )}
      {/* Shadow outcomes panel (collapsible) */}
      {showShadows && !editing && (
        <div className="px-3 pb-3">
          <ShadowOutcomePanel outcomeId={outcome.id} outcomeTitle={outcome.title} />
        </div>
      )}
    </li>
  );
}

// ── AddOutcomeForm ─────────────────────────────────────────────────────────

interface AddOutcomeFormProps {
  picoId: string;
  guidelineId: string;
  nextOrdering: number;
  onDone: () => void;
}

function AddOutcomeForm({ picoId, guidelineId, nextOrdering, onDone }: AddOutcomeFormProps) {
  const [title, setTitle] = useState('');
  const [outcomeType, setOutcomeType] = useState('DICHOTOMOUS');
  const { mutate: createOutcome, isPending } = useCreateOutcome();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createOutcome(
      { picoId, guidelineId, title: title.trim(), outcomeType, ordering: nextOrdering },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded border bg-muted/30 p-3">
      <input
        aria-label="New outcome title"
        placeholder="Outcome title…"
        className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <select
          aria-label="Outcome type"
          className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={outcomeType}
          onChange={(e) => setOutcomeType(e.target.value)}
        >
          {OUTCOME_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add outcome'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border px-3 py-1.5 text-xs hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── PicoCodeRow ────────────────────────────────────────────────────────────

interface PicoCodeRowProps {
  picoCode: PicoCode;
  picoId: string;
  guidelineId: string;
}

function PicoCodeRow({ picoCode, picoId, guidelineId }: PicoCodeRowProps) {
  const { mutate: deleteCode, isPending } = useDeletePicoCode();

  return (
    <li className="flex items-center gap-2 rounded border bg-card px-3 py-1.5 text-sm">
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground flex-shrink-0">
        {codeSystemLabel(picoCode.codeSystem)}
      </span>
      <span className="font-mono text-xs flex-shrink-0 text-muted-foreground">{picoCode.code}</span>
      <span className="flex-1 truncate">{picoCode.display}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground flex-shrink-0">
        {elementLabel(picoCode.element)}
      </span>
      <button
        onClick={() => deleteCode({ picoId, codeId: picoCode.id, guidelineId })}
        disabled={isPending}
        aria-label={`Remove code ${picoCode.display}`}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </button>
    </li>
  );
}

// ── AddCodeForm ────────────────────────────────────────────────────────────

interface AddCodeFormProps {
  picoId: string;
  guidelineId: string;
  onDone: () => void;
}

function AddCodeForm({ picoId, guidelineId, onDone }: AddCodeFormProps) {
  const [codeSystem, setCodeSystem] = useState('SNOMED_CT');
  const [code, setCode] = useState('');
  const [display, setDisplay] = useState('');
  const [element, setElement] = useState('POPULATION');
  const { mutate: createCode, isPending } = useCreatePicoCode();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !display.trim()) return;
    createCode(
      { picoId, guidelineId, codeSystem, code: code.trim(), display: display.trim(), element },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded border bg-muted/30 p-3">
      <div className="flex gap-2">
        <select
          aria-label="Code system"
          className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={codeSystem}
          onChange={(e) => setCodeSystem(e.target.value)}
        >
          {CODE_SYSTEM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          aria-label="PICO element"
          className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={element}
          onChange={(e) => setElement(e.target.value)}
        >
          {PICO_ELEMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          aria-label="Code value"
          placeholder="Code…"
          className="w-32 rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          aria-label="Display label"
          placeholder="Display label…"
          className="flex-1 rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !code.trim() || !display.trim()}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add code'}
        </button>
        <button type="button" onClick={onDone} className="rounded border px-3 py-1.5 text-xs hover:bg-accent">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── PicoCard ───────────────────────────────────────────────────────────────

type PicoTab = 'outcomes' | 'codes';

interface PicoCardProps {
  pico: Pico;
  guidelineId: string;
}

function PicoCard({ pico, guidelineId }: PicoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<PicoTab>('outcomes');
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [addingCode, setAddingCode] = useState(false);

  const [population, setPopulation] = useState(pico.population);
  const [intervention, setIntervention] = useState(pico.intervention);
  const [comparator, setComparator] = useState(pico.comparator);
  const [narrativeSummary, setNarrativeSummary] = useState(
    typeof pico.narrativeSummary === 'string'
      ? pico.narrativeSummary
      : (pico.narrativeSummary as Record<string, unknown> | null)?.text as string ?? '',
  );

  const { mutate: updatePico, isPending: savingPico } = useUpdatePico();
  const { mutate: deletePico, isPending: deletingPico } = useDeletePico();

  function handleFieldBlur(field: 'population' | 'intervention' | 'comparator', value: string) {
    if (value === pico[field]) return;
    updatePico({ id: pico.id, guidelineId, data: { [field]: value } });
  }

  function handleNarrativeBlur() {
    const current = typeof pico.narrativeSummary === 'string'
      ? pico.narrativeSummary
      : (pico.narrativeSummary as Record<string, unknown> | null)?.text as string ?? '';
    if (narrativeSummary === current) return;
    updatePico({ id: pico.id, guidelineId, data: { narrativeSummary: { text: narrativeSummary } } });
  }

  const nextOrdering = pico.outcomes.length > 0
    ? Math.max(...pico.outcomes.map((o) => o.ordering ?? 0)) + 1
    : 0;

  const picoLabel = `${pico.population || '—'} / ${pico.intervention || '—'} / ${pico.comparator || '—'}`;

  return (
    <li className="rounded-md border bg-card">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse PICO' : 'Expand PICO'}
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-primary transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">{picoLabel}</span>
        </button>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground flex-shrink-0">
          {pico.outcomes.length} outcome{pico.outcomes.length !== 1 ? 's' : ''}
        </span>
        {savingPico && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
        <button
          onClick={() => deletePico({ id: pico.id, guidelineId })}
          disabled={deletingPico}
          aria-label="Delete PICO"
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          {deletingPico ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t">
          {/* P / I / C fields */}
          <div className="grid grid-cols-3 gap-3 px-3 pt-3 pb-2">
            {(
              [
                { key: 'population' as const, label: 'Population (P)', value: population, set: setPopulation },
                { key: 'intervention' as const, label: 'Intervention (I)', value: intervention, set: setIntervention },
                { key: 'comparator' as const, label: 'Comparator (C)', value: comparator, set: setComparator },
              ] as const
            ).map(({ key, label, value, set }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onBlur={(e) => handleFieldBlur(key, e.target.value)}
                  aria-label={label}
                />
              </div>
            ))}
          </div>

          {/* Narrative summary */}
          <div className="px-3 pb-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Narrative Summary
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={narrativeSummary}
              onChange={(e) => setNarrativeSummary(e.target.value)}
              onBlur={handleNarrativeBlur}
              placeholder="Provide a plain-language summary of this PICO question…"
              aria-label="Narrative summary"
            />
          </div>

          {/* Sub-tabs: Outcomes / Codes */}
          <div className="flex border-b px-3">
            {(['outcomes', 'codes'] as PicoTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'codes' ? 'PICO Codes' : 'Outcomes'}
              </button>
            ))}
          </div>

          {/* Outcomes tab */}
          {activeTab === 'outcomes' && (
            <div className="px-3 py-3">
              {pico.outcomes.length === 0 && !addingOutcome ? (
                <p className="text-sm text-muted-foreground">No outcomes yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pico.outcomes.map((outcome) => (
                    <OutcomeRow
                      key={outcome.id}
                      outcome={outcome}
                      guidelineId={guidelineId}
                    />
                  ))}
                </ul>
              )}
              {addingOutcome ? (
                <AddOutcomeForm
                  picoId={pico.id}
                  guidelineId={guidelineId}
                  nextOrdering={nextOrdering}
                  onDone={() => setAddingOutcome(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingOutcome(true)}
                  className="mt-2 flex items-center gap-1 rounded border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add outcome
                </button>
              )}
            </div>
          )}

          {/* Codes tab */}
          {activeTab === 'codes' && (
            <div className="px-3 py-3">
              {pico.codes.length === 0 && !addingCode ? (
                <p className="text-sm text-muted-foreground">No PICO codes added yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pico.codes.map((picoCode) => (
                    <PicoCodeRow
                      key={picoCode.id}
                      picoCode={picoCode}
                      picoId={pico.id}
                      guidelineId={guidelineId}
                    />
                  ))}
                </ul>
              )}
              {addingCode ? (
                <AddCodeForm
                  picoId={pico.id}
                  guidelineId={guidelineId}
                  onDone={() => setAddingCode(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingCode(true)}
                  className="mt-2 flex items-center gap-1 rounded border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Add code
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── AddPicoForm ────────────────────────────────────────────────────────────

interface AddPicoFormProps {
  guidelineId: string;
  onDone: () => void;
}

function AddPicoForm({ guidelineId, onDone }: AddPicoFormProps) {
  const [population, setPopulation] = useState('');
  const [intervention, setIntervention] = useState('');
  const [comparator, setComparator] = useState('');
  const { mutate: createPico, isPending } = useCreatePico();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!population.trim() || !intervention.trim() || !comparator.trim()) return;
    createPico(
      {
        guidelineId,
        population: population.trim(),
        intervention: intervention.trim(),
        comparator: comparator.trim(),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border bg-card p-4 space-y-3"
    >
      <h3 className="text-sm font-medium">New PICO question</h3>
      {(
        [
          { label: 'Population (P)', value: population, set: setPopulation },
          { label: 'Intervention (I)', value: intervention, set: setIntervention },
          { label: 'Comparator (C)', value: comparator, set: setComparator },
        ] as const
      ).map(({ label, value, set }) => (
        <div key={label}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
          <textarea
            rows={2}
            className="w-full resize-none rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}…`}
            aria-label={label}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !population.trim() || !intervention.trim() || !comparator.trim()}
          className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create PICO'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border px-4 py-1.5 text-sm hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── PicoBuilderPanel ───────────────────────────────────────────────────────

interface PicoBuilderPanelProps {
  guidelineId: string;
}

export function PicoBuilderPanel({ guidelineId }: PicoBuilderPanelProps) {
  const [addingPico, setAddingPico] = useState(false);
  const { data: picos = [], isLoading, isError } = usePicos(guidelineId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">Failed to load evidence profiles.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Panel header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Evidence Profiles (PICOs)</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {picos.length}
          </span>
        </div>
        <button
          onClick={() => setAddingPico(true)}
          disabled={addingPico}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New PICO
        </button>
      </div>

      <div className="flex-1 space-y-4 px-6 py-4">
        {addingPico && (
          <AddPicoForm guidelineId={guidelineId} onDone={() => setAddingPico(false)} />
        )}

        {picos.length === 0 && !addingPico ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FlaskConical className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No PICO evidence profiles yet.</p>
            <p className="mt-1 text-xs">
              Add a PICO to define population, intervention, comparator, and outcomes.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {picos.map((pico) => (
              <PicoCard key={pico.id} pico={pico} guidelineId={guidelineId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
