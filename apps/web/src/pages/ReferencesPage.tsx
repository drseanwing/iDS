import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api-client';
import type { Reference } from '../hooks/useReferences';

interface ReferenceWithLinks extends Reference {
  guideline?: { id: string; title: string; shortName?: string | null };
  sectionPlacements?: Array<{ sectionId: string; section: { title: string } }>;
  outcomeLinks?: Array<{ outcomeId: string; outcome: { title: string } }>;
}

function useAllReferences(search: string) {
  return useQuery({
    queryKey: ['references', 'all', search],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 200 };
      if (search.trim()) params.search = search.trim();
      const { data } = await apiClient.get('/references', { params });
      return (data?.data ?? data ?? []) as ReferenceWithLinks[];
    },
  });
}

const STUDY_TYPE_OPTIONS: Record<string, { label: string; color: string }> = {
  SYSTEMATIC_REVIEW: { label: 'Systematic Review', color: 'bg-purple-100 text-purple-800' },
  PRIMARY_STUDY: { label: 'Primary Study', color: 'bg-blue-100 text-blue-800' },
  OTHER: { label: 'Other', color: 'bg-muted text-muted-foreground' },
};

function studyInfo(type: string | null | undefined) {
  return STUDY_TYPE_OPTIONS[type ?? ''] ?? STUDY_TYPE_OPTIONS.OTHER;
}

function PlacesUsedBadges({ ref }: { ref: ReferenceWithLinks }) {
  const sections = ref.sectionPlacements ?? [];
  const outcomes = ref.outcomeLinks ?? [];
  const total = sections.length + outcomes.length;
  if (total === 0) return <span className="text-xs text-muted-foreground italic">Not linked</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {sections.map((sp) => (
        <span
          key={sp.sectionId}
          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
        >
          Section: {sp.section.title}
        </span>
      ))}
      {outcomes.map((ol) => (
        <span
          key={ol.outcomeId}
          className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
        >
          Outcome: {ol.outcome.title}
        </span>
      ))}
    </div>
  );
}

function ReferenceRow({ reference }: { reference: ReferenceWithLinks }) {
  const [expanded, setExpanded] = useState(false);
  const info = studyInfo(reference.studyType);

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', info.color)}>
              {info.label}
            </span>
            {reference.year && (
              <span className="text-xs text-muted-foreground">{reference.year}</span>
            )}
            {reference.guideline && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {reference.guideline.shortName || reference.guideline.title}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium leading-snug">{reference.title}</p>
          {reference.authors && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{reference.authors}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {reference.doi && (
              <a
                href={`https://doi.org/${reference.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> DOI
              </a>
            )}
            {reference.pubmedId && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pubmedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> PubMed
              </a>
            )}
            {reference.url && !reference.doi && !reference.pubmedId && (
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Link
              </a>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Details
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {reference.abstract && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Abstract</p>
              <p className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground leading-relaxed">
                {reference.abstract}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Places used</p>
            <PlacesUsedBadges ref={reference} />
          </div>
        </div>
      )}
    </li>
  );
}

export function ReferencesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Simple debounce for API search
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    debounceRef[1](setTimeout(() => setDebouncedSearch(value), 300));
  }

  const { data: references = [], isLoading, isError } = useAllReferences(debouncedSearch);

  // Group by guideline for display
  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; shortName?: string | null; refs: ReferenceWithLinks[] }>();
    for (const ref of references) {
      const gId = ref.guideline?.id ?? 'unknown';
      if (!map.has(gId)) {
        map.set(gId, {
          title: ref.guideline?.title ?? 'Unknown guideline',
          shortName: ref.guideline?.shortName,
          refs: [],
        });
      }
      map.get(gId)!.refs.push(ref);
    }
    return Array.from(map.entries());
  }, [references]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">References</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
          {references.length} total
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search references by title, author, DOI, or PubMed ID…"
          aria-label="Search references"
          className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load references.</p>
        </div>
      )}

      {!isLoading && !isError && references.length === 0 && (
        <div className="rounded-lg border p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-25" />
          <p className="text-muted-foreground">
            {debouncedSearch
              ? 'No references match your search.'
              : 'No references found. Add references from within a guideline workspace.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([guidelineId, group]) => (
            <div key={guidelineId}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                {group.title}
                {group.shortName && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {group.shortName}
                  </span>
                )}
                <span className="text-xs font-normal">({group.refs.length})</span>
              </h2>
              <ul className="space-y-2">
                {group.refs.map((ref) => (
                  <ReferenceRow key={ref.id} reference={ref} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
