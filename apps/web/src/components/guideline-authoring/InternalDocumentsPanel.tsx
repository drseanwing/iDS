import { useRef, useState } from 'react';
import { Loader2, Download, Trash2, FileText, Upload } from 'lucide-react';
import {
  useInternalDocuments,
  useUploadDocument,
  useDeleteDocument,
  downloadDocument,
  type InternalDocument,
} from '../../hooks/useInternalDocuments';

interface InternalDocumentsPanelProps {
  guidelineId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DocumentRowProps {
  doc: InternalDocument;
  guidelineId: string;
}

function DocumentRow({ doc, guidelineId }: DocumentRowProps) {
  const deleteDocument = useDeleteDocument();

  const handleDownload = () => {
    void downloadDocument(guidelineId, doc.id);
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete document "${doc.title}"?`)) return;
    deleteDocument.mutate({ id: doc.id, guidelineId });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <FileText className="h-5 w-5 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{doc.title}</p>
        <p className="text-xs text-gray-400">{formatDate(doc.uploadedAt)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleDownload}
          title="Download document"
          aria-label={`download ${doc.title}`}
          className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteDocument.isPending}
          title="Delete document"
          aria-label={`delete ${doc.title}`}
          className="rounded p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function UploadSection({ guidelineId }: { guidelineId: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useUploadDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadDocument.mutate(
      { guidelineId, file: selectedFile, title: selectedFile.name },
      {
        onSuccess: () => {
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="flex-1 text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium file:text-gray-700 file:cursor-pointer hover:file:bg-gray-50"
        aria-label="file input"
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || uploadDocument.isPending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {uploadDocument.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        Upload
      </button>
    </div>
  );
}

export function InternalDocumentsPanel({ guidelineId }: InternalDocumentsPanelProps) {
  const { data: documents, isLoading, isError } = useInternalDocuments(guidelineId);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold">Internal Documents</h2>
      </div>

      {/* Upload section */}
      <UploadSection guidelineId={guidelineId} />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load documents. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && documents && documents.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No internal documents</p>
          <p className="text-xs text-gray-400">Upload confidential documents for this guideline</p>
        </div>
      )}

      {/* Documents list */}
      {!isLoading && !isError && documents && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} guidelineId={guidelineId} />
          ))}
        </div>
      )}
    </div>
  );
}
