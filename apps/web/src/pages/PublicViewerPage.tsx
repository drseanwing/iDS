import { ArrowLeft, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePublicGuidelineBySlug } from '../hooks/usePublicGuideline';
import type { PublicSection, PublicRecommendation } from '../hooks/usePublicGuideline';

interface PublicViewerPageProps {
  shortName: string;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// TipTap JSON → plain text renderer
// ---------------------------------------------------------------------------

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

export function renderTipTapText(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const node = json as TipTapNode;
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content
      .map((child) => renderTipTapText(child))
      .join(node.type === 'paragraph' || node.type === 'doc' ? ' ' : '');
  }
  return '';
}

// ---------------------------------------------------------------------------
// Strength badge
// ---------------------------------------------------------------------------

function strengthColor(strength: string | null | undefined) {
  switch (strength?.toUpperCase()) {
    case 'STRONG':
      return 'bg-green-100 text-green-800';
    case 'CONDITIONAL':
    case 'WEAK':
      return 'bg-yellow-100 text-yellow-800';
    case 'BEST_PRACTICE':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function StrengthBadge({ strength }: { strength: string | null | undefined }) {
  if (!strength) return null;
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
        strengthColor(strength),
      )}
    >
      {strength.replace(/_/g, ' ')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function statusColor(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'DRAFT':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading guideline">
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/4 rounded bg-muted" />
      <div className="h-32 rounded bg-muted" />
      <div className="h-32 rounded bg-muted" />
      <div className="h-32 rounded bg-muted" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation item
// ---------------------------------------------------------------------------

function RecommendationItem({ rec }: { rec: PublicRecommendation }) {
  const descriptionText = renderTipTapText(rec.description).trim();
  const displayText = descriptionText || rec.title || '';
  if (!displayText) return null;

  return (
    <div className="mt-3 rounded-md border-l-4 border-primary/60 bg-primary/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <StrengthBadge strength={rec.strength} />
        <p className="flex-1 text-sm leading-relaxed text-foreground">{displayText}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderer (recursive)
// ---------------------------------------------------------------------------

function SectionBlock({
  section,
  recommendations,
  depth,
}: {
  section: PublicSection;
  recommendations: PublicRecommendation[];
  depth: number;
}) {
  const sectionRecs = recommendations.filter((r) => r.sectionId === section.id);
  const bodyText = renderTipTapText(section.text).trim();

  const HeadingTag = depth <= 1 ? 'h2' : 'h3';
  const headingClass =
    depth <= 1
      ? 'text-xl font-bold tracking-tight text-foreground'
      : 'text-base font-semibold text-foreground';

  return (
    <section
      id={`section-${section.id}`}
      className={cn('scroll-mt-20', depth === 0 ? 'pt-8 border-t first:border-t-0 first:pt-0' : 'pt-4')}
    >
      <HeadingTag className={headingClass}>{section.title}</HeadingTag>

      {bodyText && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{bodyText}</p>
      )}

      {sectionRecs.map((rec) => (
        <RecommendationItem key={rec.id} rec={rec} />
      ))}

      {section.children && section.children.length > 0 && (
        <div className="ml-4 mt-4 space-y-2">
          {section.children.map((child) => (
            <SectionBlock
              key={child.id}
              section={child}
              recommendations={recommendations}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PublicViewerPage({ shortName, onBack }: PublicViewerPageProps) {
  const { data, isLoading, isError, error } = usePublicGuidelineBySlug(shortName);

  const is404 =
    isError &&
    (error as { response?: { status?: number } })?.response?.status === 404;

  // --- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <LoadingSkeleton />
      </div>
    );
  }

  // --- Not found -----------------------------------------------------------
  if (is404 || (isError && !data)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Eye className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Guideline not found</h1>
        <p className="mt-2 text-muted-foreground">
          The guideline <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{shortName}</code> does not
          exist or is not publicly available.
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guidelines
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { guideline, sections, recommendations, lastPublishedAt, organizationName } = data;

  const topLevelSections = sections.filter((s) => !s.parentId);

  const formattedPublishedDate = lastPublishedAt
    ? new Date(lastPublishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // --- Loaded view ---------------------------------------------------------
  return (
    <div className="flex flex-col min-h-full">
      {/* Top header bar */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to guidelines"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="truncate text-base font-semibold">{guideline.title}</h1>
            {organizationName && (
              <p className="truncate text-xs text-muted-foreground">{organizationName}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {guideline.shortName && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {guideline.shortName}
              </span>
            )}
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusColor(guideline.status),
              )}
            >
              {guideline.status}
            </span>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
        {/* Left sidebar — table of contents */}
        {topLevelSections.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contents
              </p>
              <nav aria-label="Table of contents">
                <ol className="space-y-1">
                  {topLevelSections.map((section, idx) => (
                    <li key={section.id}>
                      <a
                        href={`#section-${section.id}`}
                        className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <span className="mr-1 text-xs text-muted-foreground/60">{idx + 1}.</span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-2">
          {/* Guideline intro block */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl font-bold tracking-tight">{guideline.title}</h2>
            {organizationName && (
              <p className="mt-1 text-sm text-muted-foreground">{organizationName}</p>
            )}
            {guideline.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {guideline.description}
              </p>
            )}
          </div>

          {/* Sections */}
          {topLevelSections.length === 0 && (
            <div className="rounded-lg border p-10 text-center text-muted-foreground text-sm">
              This guideline has no published sections yet.
            </div>
          )}

          {topLevelSections.map((section) => (
            <div key={section.id} className="rounded-lg border bg-card px-6 py-5">
              <SectionBlock
                section={section}
                recommendations={recommendations}
                depth={0}
              />
            </div>
          ))}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 px-4 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <span>OpenGRADE — public viewer</span>
          {formattedPublishedDate && (
            <span>Last published: {formattedPublishedDate}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
