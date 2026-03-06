import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RichTextEditor } from '../editor/RichTextEditor';
import { EtdPanel } from './EtdPanel';
import type { EtdMode } from './EtdPanel';
import { useUpdateRecommendation } from '../../hooks/useUpdateRecommendation';
import type { Recommendation } from '../../hooks/useRecommendations';

function strengthLabel(strength: string | null | undefined): string {
  switch (strength) {
    case 'STRONG_FOR':
      return 'Strong For';
    case 'CONDITIONAL_FOR':
      return 'Conditional For';
    case 'CONDITIONAL_AGAINST':
      return 'Conditional Against';
    case 'STRONG_AGAINST':
      return 'Strong Against';
    default:
      return strength ?? 'Not Set';
  }
}

function strengthColor(strength: string | null | undefined): string {
  switch (strength) {
    case 'STRONG_FOR':
      return 'bg-green-100 text-green-800';
    case 'CONDITIONAL_FOR':
      return 'bg-blue-100 text-blue-800';
    case 'CONDITIONAL_AGAINST':
      return 'bg-orange-100 text-orange-800';
    case 'STRONG_AGAINST':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function typeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'GRADE':
      return 'GRADE';
    case 'PRACTICE_STATEMENT':
      return 'Practice Statement';
    case 'STATUTORY':
      return 'Statutory';
    case 'INFO_BOX':
      return 'Info Box';
    case 'CONSENSUS':
      return 'Consensus';
    case 'NO_LABEL':
      return 'No Label';
    default:
      return type ?? '—';
  }
}

interface RecommendationEditorCardProps {
  recommendation: Recommendation;
  etdMode?: string;
}

/**
 * Expandable recommendation card showing TipTap editors for each narrative field:
 * - description (recommendation text)
 * - remark (critical info shown at top)
 * - rationale
 * - practicalInfo
 * Also includes a "Key Info / EtD" tab for the Evidence to Decision framework.
 */
export function RecommendationEditorCard({ recommendation: rec, etdMode }: RecommendationEditorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'narrative' | 'etd'>('narrative');
  const { mutate: updateRec, isPending } = useUpdateRecommendation();

  function handleSaveField(field: 'description' | 'remark' | 'rationale' | 'practicalInfo') {
    return (json: unknown) => {
      updateRec({
        id: rec.id,
        guidelineId: rec.guidelineId,
        data: { [field]: json },
      });
    };
  }

  return (
    <li className="rounded-md border bg-card">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors rounded-md"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">
            {rec.title ?? 'Untitled recommendation'}
          </span>
          {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-shrink-0 gap-1.5">
          {rec.recommendationType && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {typeLabel(rec.recommendationType)}
            </span>
          )}
          {rec.strength && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                strengthColor(rec.strength),
              )}
            >
              {strengthLabel(rec.strength)}
            </span>
          )}
        </div>
      </button>

      {/* Expanded narrative editors */}
      {expanded && (
        <div className="border-t">
          {/* Sub-tabs */}
          <div className="flex border-b bg-muted/20">
            <button
              type="button"
              onClick={() => setActiveTab('narrative')}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                activeTab === 'narrative'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Narrative
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('etd')}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                activeTab === 'etd'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Key Info / EtD
            </button>
          </div>

          {activeTab === 'narrative' && (
            <div className="space-y-4 px-3 pb-4 pt-3">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommendation text
                </p>
                <RichTextEditor
                  content={rec.description}
                  onBlurSave={handleSaveField('description')}
                  placeholder="Enter recommendation text…"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Remark
                </p>
                <RichTextEditor
                  content={rec.remark}
                  onBlurSave={handleSaveField('remark')}
                  placeholder="Add a remark…"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rationale
                </p>
                <RichTextEditor
                  content={rec.rationale}
                  onBlurSave={handleSaveField('rationale')}
                  placeholder="Add rationale…"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Practical information
                </p>
                <RichTextEditor
                  content={rec.practicalInfo}
                  onBlurSave={handleSaveField('practicalInfo')}
                  placeholder="Add practical information…"
                />
              </div>
            </div>
          )}

          {activeTab === 'etd' && (
            <div className="px-3 pb-4 pt-3">
              <EtdPanel
                recommendationId={rec.id}
                etdMode={(etdMode as EtdMode) ?? 'SEVEN_FACTOR'}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
