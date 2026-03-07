import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGuideline } from '../hooks/useGuideline';
import { useSections } from '../hooks/useSections';
import { useReorderSections } from '../hooks/useReorderSections';
import { useCreateSection } from '../hooks/useCreateSection';
import { useDeleteSection } from '../hooks/useDeleteSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { SectionTree } from '../components/guideline-authoring/SectionTree';
import { SectionDetailPanel } from '../components/guideline-authoring/SectionDetailPanel';
import { ReferenceList } from '../components/guideline-authoring/ReferenceList';
import { PicoBuilderPanel } from '../components/guideline-authoring/PicoBuilderPanel';
import { GuidelineSettingsPanel } from '../components/guideline-authoring/GuidelineSettingsPanel';
import { VersionHistoryPanel } from '../components/guideline-authoring/VersionHistoryPanel';
import { ActivityLogPanel } from '../components/guideline-authoring/ActivityLogPanel';
import { TaskBoard } from '../components/guideline-authoring/TaskBoard';
import type { Section } from '../hooks/useSections';

type WorkspaceTab = 'recommendations' | 'evidence' | 'references' | 'settings' | 'versions' | 'activity' | 'tasks';

interface GuidelineWorkspacePageProps {
  guidelineId: string;
  onBack: () => void;
}

function statusColor(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-muted text-muted-foreground';
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

/** Flatten the section tree to find a section by ID. */
function findSection(sections: Section[], id: string): Section | null {
  for (const s of sections) {
    if (s.id === id) return s;
    if (s.children.length > 0) {
      const found = findSection(s.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function GuidelineWorkspacePage({ guidelineId, onBack }: GuidelineWorkspacePageProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('recommendations');

  const {
    data: guideline,
    isLoading: guidelineLoading,
    isError: guidelineError,
  } = useGuideline(guidelineId);

  const {
    data: sections = [],
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useSections(guidelineId);

  const { mutate: reorderSections } = useReorderSections();
  const { mutate: createSection } = useCreateSection();
  const { mutate: deleteSection } = useDeleteSection();

  const {
    data: recommendations = [],
  } = useRecommendations(guidelineId);

  const selectedSection = useMemo(
    () => (selectedSectionId ? findSection(sections, selectedSectionId) : null),
    [sections, selectedSectionId],
  );

  /**
   * Handle reorder events from SectionTree.
   * parentId=null means root level; otherwise it's a parent section ID.
   * orderedIds is the new ordering of sibling IDs.
   */
  const handleReorder = useCallback(
    (parentId: string | null, orderedIds: string[]) => {
      const reorderedItems = orderedIds.map((id, index) => ({ id, ordering: index }));
      reorderSections({ guidelineId, sections: reorderedItems });
    },
    [guidelineId, reorderSections],
  );

  const handleAddSection = useCallback(
    (title: string, parentId?: string) => {
      createSection({ guidelineId, title, parentId });
    },
    [guidelineId, createSection],
  );

  const handleDeleteSection = useCallback(
    (id: string) => {
      deleteSection({ id, guidelineId });
      // Deselect if the deleted section was selected
      if (selectedSectionId === id) {
        setSelectedSectionId(null);
      }
    },
    [guidelineId, deleteSection, selectedSectionId],
  );

  const tabs: { id: WorkspaceTab; label: string }[] = [
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'references', label: 'References' },
    { id: 'settings', label: 'Settings' },
    { id: 'versions' as const, label: 'Versions' },
    { id: 'tasks' as const, label: 'Tasks' },
    { id: 'activity' as const, label: 'Activity' },
  ];

  if (guidelineError || sectionsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <p className="text-sm text-destructive">Failed to load guideline workspace.</p>
          <button
            onClick={onBack}
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Back to guidelines"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {guidelineLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <h1 className="text-base font-semibold truncate">{guideline?.title}</h1>
            {guideline?.shortName && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground flex-shrink-0">
                {guideline.shortName}
              </span>
            )}
            {guideline?.status && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0',
                  statusColor(guideline.status),
                )}
              >
                {guideline.status}
              </span>
            )}
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main workspace: section tree + content panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Section tree sidebar */}
        <aside className="w-64 flex-shrink-0 border-r bg-muted/20 overflow-hidden flex flex-col">
          {sectionsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SectionTree
              sections={sections}
              selectedId={selectedSectionId}
              showNumbers={guideline?.showSectionNumbers ?? true}
              onSelect={setSelectedSectionId}
              onAddSection={handleAddSection}
              onDeleteSection={handleDeleteSection}
              onReorder={handleReorder}
            />
          )}
        </aside>

        {/* Detail panel */}
        <main aria-label="Section detail panel" className="flex-1 overflow-hidden bg-background">
          {activeTab === 'recommendations' && (
            <SectionDetailPanel
              section={selectedSection}
              recommendations={recommendations}
              etdMode={guideline?.etdMode}
              onSelectSection={setSelectedSectionId}
            />
          )}
          {activeTab === 'evidence' && (
            <PicoBuilderPanel guidelineId={guidelineId} />
          )}
          {activeTab === 'references' && (
            <ReferenceList
              guidelineId={guidelineId}
              selectedSection={selectedSection}
            />
          )}
          {activeTab === 'settings' && guideline && (
            <GuidelineSettingsPanel guideline={guideline} />
          )}
          {activeTab === 'versions' && guideline && (
            <VersionHistoryPanel guidelineId={guideline.id} />
          )}
          {activeTab === 'tasks' && (
            <TaskBoard guidelineId={guidelineId} />
          )}
          {activeTab === 'activity' && (
            <ActivityLogPanel guidelineId={guidelineId} />
          )}
        </main>
      </div>
    </div>
  );
}
