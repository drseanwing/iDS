import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Loader2, ExternalLink, BookOpen, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api-client';
import { useI18n } from '../lib/i18n';

interface ReferencePlacement {
  sectionId: string;
  referenceId: string;
  section: { id: string; title: string };
}

interface ReferenceOutcomeLink {
  outcomeId: string;
  referenceId: string;
  outcome: { id: string; title: string };
}

interface ReferenceWithDetails {
  id: string;
  guidelineId: string;
  title: string;
  authors?: string | null;
  year?: number | null;
  abstract?: string | null;
  pubmedId?: string | null;
  doi?: string | null;
  url?: string | null;
  studyType: string;
  createdAt: string;
  guideline?: { id: string; title: string; shortName?: string | null };
  sectionPlacements: ReferencePlacement[];
  outcomeLinks: ReferenceOutcomeLink[];
}

function useAllReferences(search: string, page: number) {
  return useQuery({
    queryKey: ['all-references', search, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 50 };
      if (search) params.search = search;
      const { data } = await apiClient.get('/references', { params });
      return data as { data: ReferenceWithDetails[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    },
  });
}

function studyTypeLabel(type: string): string {
  switch (type) {
    case 'PRIMARY_STUDY': return 'Primary Study';
    case 'SYSTEMATIC_REVIEW': return 'Systematic Review';
    default: return 'Other';
  }
}

function studyTypeBadgeColor(type: string): string {
  switch (type) {
    case 'PRIMARY_STUDY': return 'bg-blue-100 text-blue-800';
    case 'SYSTEMATIC_REVIEW': return 'bg-purple-100 text-purple-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

function PlacesUsed({ placements, outcomeLinks }: { placements: ReferencePlacement[]; outcomeLinks: ReferenceOutcomeLink[] }) {
  const totalUses = placements.length + outcomeLinks.length;
  if (totalUses === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {placements.map((p) => (
        <span
          key={`s-${p.sectionId}`}
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
          title={`Linked to section: ${p.section.title}`}
        >
          <MapPin className="h-3 w-3" />
          {p.section.title}
        </span>
      ))}
      {outcomeLinks.map((o) => (
        <span
          key={`o-${o.outcomeId}`}
          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
          title={`Linked to outcome: ${o.outcome.title}`}
        >
          <BookOpen className="h-3 w-3" />
          {o.outcome.title}
        </span>
      ))}
    </div>
  );
}

export function ReferencesPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error } = useAllReferences(debouncedSearch, page);
  const references = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    setDebounceTimer(timer);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('references.title')}</h1>
        <span className="text-sm text-muted-foreground">
          {total} reference{total !== 1 ? 's' : ''} across all guidelines
        </span>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title, authors, DOI, or PubMed ID..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load references: {(error as Error).message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && references.length === 0 && (
        <div className="rounded-lg border p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {debouncedSearch ? 'No references match your search.' : 'No references found. Add references through guideline workspaces.'}
          </p>
        </div>
      )}

      {/* Reference list */}
      {!isLoading && !isError && references.length > 0 && (
        <div className="space-y-3">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium leading-snug">{ref.title}</h3>
                  {ref.authors && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {ref.authors}
                      {ref.year ? ` (${ref.year})` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      studyTypeBadgeColor(ref.studyType),
                    )}
                  >
                    {studyTypeLabel(ref.studyType)}
                  </span>
                </div>
              </div>

              {/* Metadata row */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {ref.guideline && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {ref.guideline.shortName || ref.guideline.title}
                  </span>
                )}
                {ref.doi && (
                  <a
                    href={`https://doi.org/${ref.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    DOI: {ref.doi}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {ref.pubmedId && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pubmedId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    PMID: {ref.pubmedId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Places used */}
              <PlacesUsed
                placements={ref.sectionPlacements}
                outcomeLinks={ref.outcomeLinks}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
