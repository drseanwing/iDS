import { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useActivity, type ActivityEntry } from '../../hooks/useActivity';

interface ActivityLogPanelProps {
  guidelineId: string;
}

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Guideline', label: 'Guideline' },
  { value: 'Section', label: 'Section' },
  { value: 'Recommendation', label: 'Recommendation' },
  { value: 'Reference', label: 'Reference' },
  { value: 'Pico', label: 'Pico' },
  { value: 'Outcome', label: 'Outcome' },
];

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

const ACTION_BADGE_CLASSES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

interface ActivityRowProps {
  entry: ActivityEntry;
}

function ActivityRow({ entry }: ActivityRowProps) {
  const badgeClass =
    ACTION_BADGE_CLASSES[entry.actionType] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {entry.user.displayName}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            {entry.actionType}
          </span>
          <span className="text-sm text-gray-600">
            {entry.entityType}
            {entry.entityTitle ? (
              <span className="ml-1 font-medium text-gray-800">
                &ldquo;{entry.entityTitle}&rdquo;
              </span>
            ) : null}
          </span>
        </div>
        {entry.comment && (
          <p className="text-xs text-gray-500 truncate">{entry.comment}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
        {getRelativeTime(entry.timestamp)}
      </span>
    </div>
  );
}

export function ActivityLogPanel({ guidelineId }: ActivityLogPanelProps) {
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [allEntries, setAllEntries] = useState<ActivityEntry[]>([]);

  const filters = useMemo(
    () => ({
      entityType: entityTypeFilter || undefined,
      actionType: actionTypeFilter || undefined,
    }),
    [entityTypeFilter, actionTypeFilter],
  );

  const { data, isLoading, isFetching } = useActivity(guidelineId, filters, page);

  // Append new page results to accumulated list
  const currentPageEntries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const meta = data?.meta;

  // Merge: on filter change we reset page to 1 and clear accumulated list
  const displayedEntries = useMemo(() => {
    if (page === 1) return currentPageEntries;
    // Deduplicate by id in case of re-renders
    const existingIds = new Set(allEntries.map((e) => e.id));
    const newOnes = currentPageEntries.filter((e) => !existingIds.has(e.id));
    return [...allEntries, ...newOnes];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageEntries]);

  // Sync allEntries when displayedEntries updates
  useEffect(() => {
    setAllEntries(displayedEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedEntries]);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
    setAllEntries([]);
  };

  const filteredEntries = titleFilter
    ? displayedEntries.filter((e) =>
        e.entityTitle?.toLowerCase().includes(titleFilter.toLowerCase()),
      )
    : displayedEntries;

  const hasMore = meta ? page < meta.totalPages : false;

  return (
    <div className="overflow-y-auto p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Log</h2>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={entityTypeFilter}
          onChange={(e) => handleFilterChange(setEntityTypeFilter)(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={actionTypeFilter}
          onChange={(e) => handleFilterChange(setActionTypeFilter)(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ACTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by title..."
          value={titleFilter}
          onChange={(e) => setTitleFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Loading (initial) */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredEntries.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-gray-500">No activity found.</p>
        </div>
      )}

      {/* Activity list */}
      {!isLoading && filteredEntries.length > 0 && (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Load more */}
      {!isLoading && hasMore && !titleFilter && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
