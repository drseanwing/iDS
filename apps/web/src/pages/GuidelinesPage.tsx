import { useState } from 'react';
import { cn } from '../lib/utils';
import { useGuidelines } from '../hooks/useGuidelines';
import { useCreateGuideline } from '../hooks/useCreateGuideline';

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
  const { mutate: createGuideline, isPending: isCreating } = useCreateGuideline();

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newShortName, setNewShortName] = useState('');

  const guidelines: Guideline[] = data?.data ?? data ?? [];

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    createGuideline(
      { title, shortName: newShortName.trim() || undefined },
      {
        onSuccess: () => {
          setShowForm(false);
          setNewTitle('');
          setNewShortName('');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Guidelines</h1>
        <button
          onClick={() => { setShowForm(true); setNewTitle(''); setNewShortName(''); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          New Guideline
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-lg border bg-card p-5 space-y-4"
          aria-label="New guideline form"
        >
          <h2 className="text-sm font-semibold">New guideline</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Guideline title"
              required
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Short name
            </label>
            <input
              value={newShortName}
              onChange={(e) => setNewShortName(e.target.value)}
              placeholder="e.g. GL-2025"
              maxLength={100}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newTitle.trim() || isCreating}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isCreating ? 'Creating…' : 'Create guideline'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
