import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import {
  useDeletedGuidelines,
  useDeletedSections,
  useRestoreGuideline,
  useRestoreSection,
} from '../../hooks/useDeletedContent';

interface RecoverPanelProps {
  guidelineId: string;
}

function DeletedSectionsList({ guidelineId }: { guidelineId: string }) {
  const { data: sections, isLoading } = useDeletedSections(guidelineId);
  const restoreSection = useRestoreSection();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading deleted sections...
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-1">No deleted sections</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {sections.map((section) => (
        <li
          key={section.id}
          className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div>
            <span className="text-sm font-medium text-gray-700">{section.title}</span>
            <span className="ml-2 text-xs text-gray-400">
              deleted {new Date(section.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={() => restoreSection.mutate({ id: section.id, guidelineId })}
            disabled={restoreSection.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white disabled:opacity-50"
          >
            {restoreSection.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}

export function RecoverPanel({ guidelineId }: RecoverPanelProps) {
  const { data: deletedGuidelines, isLoading: guidelinesLoading } = useDeletedGuidelines();
  const restoreGuideline = useRestoreGuideline();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recover Deleted Content
        </h3>
      </div>

      {/* Deleted sections for this guideline */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Deleted Sections</h4>
        <DeletedSectionsList guidelineId={guidelineId} />
      </div>

      {/* Deleted guidelines (org-wide) */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Deleted Guidelines</h4>
        {guidelinesLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        )}
        {!guidelinesLoading && (!deletedGuidelines || deletedGuidelines.length === 0) && (
          <p className="text-sm text-gray-400 py-1">No deleted guidelines</p>
        )}
        {!guidelinesLoading && deletedGuidelines && deletedGuidelines.length > 0 && (
          <ul className="space-y-1.5">
            {deletedGuidelines.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-gray-700">{g.title}</span>
                  {g.shortName && (
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                      {g.shortName}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-gray-400">
                    deleted {new Date(g.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => restoreGuideline.mutate(g.id)}
                  disabled={restoreGuideline.isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white disabled:opacity-50"
                >
                  {restoreGuideline.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
