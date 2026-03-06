import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Link,
  Link2Off,
  Loader2,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useReferences, type Reference } from '../../hooks/useReferences';
import { useCreateReference } from '../../hooks/useCreateReference';
import { useUpdateReference } from '../../hooks/useUpdateReference';
import { useDeleteReference } from '../../hooks/useDeleteReference';
import { useSectionReferences } from '../../hooks/useSectionReferences';
import { useLinkSectionReference } from '../../hooks/useLinkSectionReference';
import type { Section } from '../../hooks/useSections';

const STUDY_TYPE_OPTIONS = [
  { value: 'PRIMARY_STUDY', label: 'Primary Study' },
  { value: 'SYSTEMATIC_REVIEW', label: 'Systematic Review' },
  { value: 'OTHER', label: 'Other' },
];

function studyTypeLabel(type: string | null | undefined): string {
  return STUDY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? (type ?? 'Other');
}

function studyTypeColor(type: string | null | undefined): string {
  switch (type) {
    case 'SYSTEMATIC_REVIEW':
      return 'bg-purple-100 text-purple-800';
    case 'PRIMARY_STUDY':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

interface ReferenceFormData {
  title: string;
  authors: string;
  year: string;
  pubmedId: string;
  doi: string;
  url: string;
  abstract: string;
  studyType: string;
}

function emptyForm(): ReferenceFormData {
  return {
    title: '',
    authors: '',
    year: '',
    pubmedId: '',
    doi: '',
    url: '',
    abstract: '',
    studyType: 'OTHER',
  };
}

function referenceToForm(ref: Reference): ReferenceFormData {
  return {
    title: ref.title ?? '',
    authors: ref.authors ?? '',
    year: ref.year != null ? String(ref.year) : '',
    pubmedId: ref.pubmedId ?? '',
    doi: ref.doi ?? '',
    url: ref.url ?? '',
    abstract: ref.abstract ?? '',
    studyType: ref.studyType ?? 'OTHER',
  };
}

interface ReferenceFormProps {
  guidelineId: string;
  initial?: Reference;
  onClose: () => void;
}

function ReferenceForm({ guidelineId, initial, onClose }: ReferenceFormProps) {
  const [form, setForm] = useState<ReferenceFormData>(
    initial ? referenceToForm(initial) : emptyForm(),
  );
  const { mutate: createRef, isPending: isCreating } = useCreateReference();
  const { mutate: updateRef, isPending: isUpdating } = useUpdateReference();

  const isPending = isCreating || isUpdating;

  function handleChange(field: keyof ReferenceFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      authors: form.authors.trim() || undefined,
      year: form.year ? parseInt(form.year, 10) : undefined,
      pubmedId: form.pubmedId.trim() || undefined,
      doi: form.doi.trim() || undefined,
      url: form.url.trim() || undefined,
      abstract: form.abstract.trim() || undefined,
      studyType: form.studyType || undefined,
    };
    if (initial) {
      updateRef({ id: initial.id, guidelineId, data: payload }, { onSuccess: onClose });
    } else {
      createRef({ guidelineId, ...payload }, { onSuccess: onClose });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border bg-card p-4">
      <h3 className="text-sm font-semibold">
        {initial ? 'Edit reference' : 'Add reference'}
      </h3>

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          placeholder="Reference title"
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Authors + Year */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Authors</label>
          <input
            value={form.authors}
            onChange={(e) => handleChange('authors', e.target.value)}
            placeholder="Last F, Last F, …"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Year</label>
          <input
            value={form.year}
            onChange={(e) => handleChange('year', e.target.value)}
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
            placeholder={String(new Date().getFullYear())}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Study type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Study type</label>
        <select
          value={form.studyType}
          onChange={(e) => handleChange('studyType', e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1"
        >
          {STUDY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* PubMed ID + DOI */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">PubMed ID</label>
          <input
            value={form.pubmedId}
            onChange={(e) => handleChange('pubmedId', e.target.value)}
            placeholder="e.g. 12345678"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">DOI</label>
          <input
            value={form.doi}
            onChange={(e) => handleChange('doi', e.target.value)}
            placeholder="10.xxxx/xxxxx"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
        <input
          value={form.url}
          onChange={(e) => handleChange('url', e.target.value)}
          type="url"
          placeholder="https://…"
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Abstract */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Abstract</label>
        <textarea
          value={form.abstract}
          onChange={(e) => handleChange('abstract', e.target.value)}
          rows={3}
          placeholder="Abstract text…"
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 resize-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !form.title.trim()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {initial ? 'Save changes' : 'Add reference'}
        </button>
      </div>
    </form>
  );
}

interface ReferenceCardProps {
  reference: Reference;
  guidelineId: string;
  isLinked: boolean;
  selectedSection: Section | null;
  onEdit: () => void;
  onDelete: () => void;
  onLink: () => void;
  onUnlink: () => void;
  isLinking: boolean;
}

function ReferenceCard({
  reference: ref,
  isLinked,
  selectedSection,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  isLinking,
}: ReferenceCardProps) {
  const [showAbstract, setShowAbstract] = useState(false);

  return (
    <li className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                studyTypeColor(ref.studyType),
              )}
            >
              {studyTypeLabel(ref.studyType)}
            </span>
            {ref.year && (
              <span className="text-xs text-muted-foreground">{ref.year}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium leading-snug">{ref.title}</p>
          {ref.authors && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{ref.authors}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {ref.doi && (
              <a
                href={`https://doi.org/${ref.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                aria-label={`DOI: ${ref.doi}`}
              >
                <ExternalLink className="h-3 w-3" />
                DOI
              </a>
            )}
            {ref.pubmedId && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pubmedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                aria-label={`PubMed: ${ref.pubmedId}`}
              >
                <ExternalLink className="h-3 w-3" />
                PubMed
              </a>
            )}
            {ref.url && !ref.doi && !ref.pubmedId && (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                aria-label="Link"
              >
                <ExternalLink className="h-3 w-3" />
                Link
              </a>
            )}
            {ref.abstract && (
              <button
                type="button"
                onClick={() => setShowAbstract((v) => !v)}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAbstract ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Abstract
              </button>
            )}
          </div>
          {showAbstract && ref.abstract && (
            <p className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground leading-relaxed">
              {ref.abstract}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 gap-1">
          {selectedSection && (
            <button
              type="button"
              onClick={isLinked ? onUnlink : onLink}
              disabled={isLinking}
              aria-label={
                isLinked
                  ? `Unlink from section: ${selectedSection.title}`
                  : `Link to section: ${selectedSection.title}`
              }
              title={
                isLinked
                  ? `Unlink from "${selectedSection.title}"`
                  : `Link to "${selectedSection.title}"`
              }
              className={cn(
                'rounded p-1.5 transition-colors',
                isLinked
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {isLinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isLinked ? (
                <Link2Off className="h-3.5 w-3.5" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit reference"
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete reference"
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

interface ReferenceListProps {
  guidelineId: string;
  selectedSection: Section | null;
}

export function ReferenceList({ guidelineId, selectedSection }: ReferenceListProps) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);

  const { data: references = [], isLoading, isError } = useReferences(guidelineId);
  const { data: sectionRefs = [] } = useSectionReferences(selectedSection?.id ?? null);
  const { mutate: deleteRef } = useDeleteReference();
  const { link, unlink } = useLinkSectionReference();

  const linkedReferenceIds = useMemo(
    () => new Set(sectionRefs.map((sr) => sr.referenceId)),
    [sectionRefs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return references;
    return references.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.authors ?? '').toLowerCase().includes(q) ||
        (r.doi ?? '').toLowerCase().includes(q) ||
        (r.pubmedId ?? '').toLowerCase().includes(q),
    );
  }, [references, search]);

  function handleDelete(ref: Reference) {
    if (!window.confirm(`Delete "${ref.title}"? This cannot be undone.`)) return;
    deleteRef({ id: ref.id, guidelineId });
  }

  function handleLink(ref: Reference) {
    if (!selectedSection) return;
    setPendingLinkId(ref.id);
    link.mutate(
      { sectionId: selectedSection.id, referenceId: ref.id },
      { onSettled: () => setPendingLinkId(null) },
    );
  }

  function handleUnlink(ref: Reference) {
    if (!selectedSection) return;
    setPendingLinkId(ref.id);
    unlink.mutate(
      { sectionId: selectedSection.id, referenceId: ref.id },
      { onSettled: () => setPendingLinkId(null) },
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-destructive">Failed to load references.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search references…"
            aria-label="Search references"
            className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm((v) => !v);
            setEditingId(null);
          }}
          aria-label="Add reference"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {selectedSection && (
        <div className="flex items-center gap-1.5 border-b bg-accent/30 px-4 py-1.5 text-xs text-muted-foreground">
          <Link className="h-3 w-3" />
          <span>
            Showing link state for section:{' '}
            <span className="font-medium text-foreground">{selectedSection.title}</span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Add form */}
        {showAddForm && (
          <ReferenceForm
            guidelineId={guidelineId}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && references.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 opacity-25" />
            <p className="text-sm text-muted-foreground">No references yet.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Add the first reference
            </button>
          </div>
        )}

        {!isLoading && references.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No references match your search.
          </p>
        )}

        {!isLoading && filtered.length > 0 && (
          <ul className="space-y-2" aria-label="References">
            {filtered.map((ref) =>
              editingId === ref.id ? (
                <li key={ref.id}>
                  <ReferenceForm
                    guidelineId={guidelineId}
                    initial={ref}
                    onClose={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <ReferenceCard
                  key={ref.id}
                  reference={ref}
                  guidelineId={guidelineId}
                  isLinked={linkedReferenceIds.has(ref.id)}
                  selectedSection={selectedSection}
                  onEdit={() => {
                    setEditingId(ref.id);
                    setShowAddForm(false);
                  }}
                  onDelete={() => handleDelete(ref)}
                  onLink={() => handleLink(ref)}
                  onUnlink={() => handleUnlink(ref)}
                  isLinking={pendingLinkId === ref.id}
                />
              ),
            )}
          </ul>
        )}
      </div>

      {!isLoading && references.length > 0 && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {filtered.length} of {references.length} reference{references.length !== 1 ? 's' : ''}
          {selectedSection &&
            linkedReferenceIds.size > 0 &&
            ` · ${linkedReferenceIds.size} linked to this section`}
        </div>
      )}
    </div>
  );
}
