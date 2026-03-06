import { cn } from '../lib/utils';
import { useGuidelines } from '../hooks/useGuidelines';

interface Guideline {
  id: string;
  title: string;
  shortName?: string;
  status: string;
  description?: string;
  updatedAt: string;
}

interface GuidelinesPageProps {
  onOpenGuideline?: (id: string) => void;
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border p-6">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function GuidelinesPage({ onOpenGuideline }: GuidelinesPageProps) {
  const { data, isLoading, isError, error } = useGuidelines();

  const guidelines: Guideline[] = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Guidelines</h1>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          New Guideline
        </button>
      </div>

      {isLoading && <LoadingSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load guidelines: {(error as Error).message}
          </p>
        </div>
      )}

      {!isLoading && !isError && guidelines.length === 0 && (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">No guidelines found. Create your first guideline to get started.</p>
        </div>
      )}

      {!isLoading && !isError && guidelines.length > 0 && (
        <div className="space-y-4">
          {guidelines.map((g) => (
            <button
              key={g.id}
              onClick={() => onOpenGuideline?.(g.id)}
              aria-label={`Open guideline: ${g.title}`}
              className="w-full rounded-lg border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{g.title}</h3>
                <div className="flex gap-2">
                  {g.shortName && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {g.shortName}
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusColor(g.status),
                    )}
                  >
                    {g.status}
                  </span>
                </div>
              </div>
              {g.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {g.description}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Updated {new Date(g.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
