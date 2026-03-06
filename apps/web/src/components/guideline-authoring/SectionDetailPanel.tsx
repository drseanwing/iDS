import { BookOpen, Tag, AlignLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Section } from '../../hooks/useSections';
import type { Recommendation } from '../../hooks/useRecommendations';
import { RichTextEditor } from '../editor/RichTextEditor';
import { RecommendationEditorCard } from './RecommendationEditorCard';
import { useUpdateSection } from '../../hooks/useUpdateSection';
import { useCreateRecommendation } from '../../hooks/useCreateRecommendation';
import { useDeleteRecommendation } from '../../hooks/useDeleteRecommendation';

interface SectionDetailPanelProps {
  section: Section | null;
  recommendations: Recommendation[];
  etdMode?: string;
  onSelectSection?: (id: string) => void;
}

export function SectionDetailPanel({ section, recommendations, etdMode, onSelectSection }: SectionDetailPanelProps) {
  const { mutate: updateSection } = useUpdateSection();
  const { mutate: createRecommendation, isPending: isCreating } = useCreateRecommendation();
  const { mutate: deleteRecommendation } = useDeleteRecommendation();

  const [addingRec, setAddingRec] = useState(false);
  const [newRecTitle, setNewRecTitle] = useState('');

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

  function handleSaveText(json: unknown) {
    updateSection({ id: section!.id, guidelineId: section!.guidelineId, data: { text: json } });
  }

  function handleAddRecSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newRecTitle.trim();
    if (!title) return;
    createRecommendation(
      { guidelineId: section!.guidelineId, title, sectionId: section!.id },
      {
        onSuccess: () => {
          setAddingRec(false);
          setNewRecTitle('');
        },
      },
    );
  }

  function handleDeleteRec(id: string) {
    deleteRecommendation({ id, guidelineId: section!.guidelineId });
  }

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
        {/* Section text — TipTap rich text editor */}
        <section aria-label="Section text">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlignLeft className="h-4 w-4" />
            Content
          </h3>
          <RichTextEditor
            content={section.text}
            onBlurSave={handleSaveText}
            placeholder="Add section content…"
          />
        </section>

        {/* Linked recommendations */}
        <section aria-label="Linked recommendations">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recommendations ({sectionRecs.length})
            </h3>
            <button
              type="button"
              onClick={() => { setAddingRec(true); setNewRecTitle(''); }}
              aria-label="Add recommendation"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {addingRec && (
            <form onSubmit={handleAddRecSubmit} className="mb-3 space-y-2" aria-label="New recommendation form">
              <input
                autoFocus
                value={newRecTitle}
                onChange={(e) => setNewRecTitle(e.target.value)}
                placeholder="Recommendation title…"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
                onKeyDown={(e) => { if (e.key === 'Escape') { setAddingRec(false); setNewRecTitle(''); } }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newRecTitle.trim() || isCreating}
                  className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isCreating ? 'Adding…' : 'Add recommendation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingRec(false); setNewRecTitle(''); }}
                  className="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sectionRecs.length === 0 && !addingRec ? (
            <p className="text-sm text-muted-foreground">
              No recommendations linked to this section.
            </p>
          ) : (
            <ul className="space-y-2">
              {sectionRecs.map((rec) => (
                <RecommendationEditorCard
                  key={rec.id}
                  recommendation={rec}
                  etdMode={etdMode}
                  onDelete={() => handleDeleteRec(rec.id)}
                />
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
