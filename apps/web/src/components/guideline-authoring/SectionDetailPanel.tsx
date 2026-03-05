import { BookOpen, Tag, AlignLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Section } from '../../hooks/useSections';
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

interface SectionDetailPanelProps {
  section: Section | null;
  recommendations: Recommendation[];
  onSelectSection?: (id: string) => void;
}

export function SectionDetailPanel({ section, recommendations, onSelectSection }: SectionDetailPanelProps) {
  if (!section) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Select a section to view its details</p>
        </div>
      </div>
    );
  }

  const sectionRecs = recommendations.filter((r) => r.sectionId === section.id);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">{section.title}</h2>
        {section.excludeFromNumbering && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            <Tag className="h-3 w-3" />
            Excluded from numbering
          </span>
        )}
      </div>

      <div className="flex-1 space-y-6 px-6 py-4">
        {/* Section text */}
        {section.text ? (
          <section aria-label="Section text">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlignLeft className="h-4 w-4" />
              Content
            </h3>
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="italic">[Rich text content — TipTap editor integration pending]</p>
            </div>
          </section>
        ) : (
          <section aria-label="Section text">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlignLeft className="h-4 w-4" />
              Content
            </h3>
            <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No content yet. Click to add section text.
            </div>
          </section>
        )}

        {/* Linked recommendations */}
        <section aria-label="Linked recommendations">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Recommendations ({sectionRecs.length})
          </h3>
          {sectionRecs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recommendations linked to this section.
            </p>
          ) : (
            <ul className="space-y-2">
              {sectionRecs.map((rec) => (
                <li key={rec.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {rec.title && (
                        <p className="truncate text-sm font-medium">{rec.title}</p>
                      )}
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Child sections */}
        {section.children.length > 0 && (
          <section aria-label="Child sections">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Sub-sections ({section.children.length})
            </h3>
            <ul className="space-y-1">
              {section.children.map((child) => (
                <li key={child.id}>
                  <button
                    onClick={() => onSelectSection?.(child.id)}
                    className="w-full rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Navigate to sub-section: ${child.title}`}
                  >
                    {child.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
