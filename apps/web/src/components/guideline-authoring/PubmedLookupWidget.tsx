import { useState } from 'react';
import { Loader2, Search, X, Plus } from 'lucide-react';
import { usePubmedLookup, type PubmedResult } from '../../hooks/usePubmedLookup';

interface AddReferencePayload {
  title: string;
  authors: string;
  year: number;
  abstract: string;
  doi?: string;
  pubmedId: string;
  studyType: string;
}

interface PubmedLookupWidgetProps {
  onAddReference: (ref: AddReferencePayload) => void;
}

const ABSTRACT_PREVIEW_LENGTH = 200;

function CitationCard({
  result,
  onAdd,
}: {
  result: PubmedResult;
  onAdd: () => void;
}) {
  const abstract = result.abstract ?? '';
  const preview =
    abstract.length > ABSTRACT_PREVIEW_LENGTH
      ? abstract.slice(0, ABSTRACT_PREVIEW_LENGTH) + '…'
      : abstract;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 leading-snug">{result.title}</p>
      <p className="text-xs text-gray-600">{result.authors}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {result.year && <span>{result.year}</span>}
        <span>{result.studyType}</span>
        {result.doi && (
          <a
            href={`https://doi.org/${result.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {result.doi}
          </a>
        )}
      </div>
      {preview && (
        <p className="text-xs text-gray-500 leading-relaxed">{preview}</p>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add to references
      </button>
    </div>
  );
}

export function PubmedLookupWidget({ onAddReference }: PubmedLookupWidgetProps) {
  const [inputValue, setInputValue] = useState('');
  const [activePmid, setActivePmid] = useState<string | null>(null);

  const { data, isLoading, isError, error } = usePubmedLookup(activePmid);

  const handleLookup = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setActivePmid(trimmed);
  };

  const handleClear = () => {
    setInputValue('');
    setActivePmid(null);
  };

  const handleAdd = () => {
    if (!data) return;
    onAddReference({
      title: data.title,
      authors: data.authors,
      year: data.year ?? 0,
      abstract: data.abstract ?? '',
      doi: data.doi ?? undefined,
      pubmedId: data.pubmedId,
      studyType: data.studyType,
    });
  };

  const errorMessage = isError
    ? activePmid && (error as Error)?.message?.includes('404')
      ? 'PMID not found'
      : ((error as Error)?.message ?? 'Network error')
    : null;

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          placeholder="Enter PMID…"
          aria-label="PMID"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={isLoading || !inputValue.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Lookup
        </button>
        {(activePmid || inputValue) && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking up PMID…
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Citation card */}
      {!isLoading && !isError && data && (
        <CitationCard result={data} onAdd={handleAdd} />
      )}
    </div>
  );
}
