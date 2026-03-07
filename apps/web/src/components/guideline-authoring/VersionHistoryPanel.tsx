import { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { useVersions } from '../../hooks/useVersions';
import { PublishDialog } from './PublishDialog';
import { apiClient } from '../../lib/api-client';

interface VersionHistoryPanelProps {
  guidelineId: string;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function VersionHistoryPanel({ guidelineId }: VersionHistoryPanelProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { data, isLoading } = useVersions(guidelineId);

  const versions = data?.versions ?? [];
  const latestVersion = versions.length > 0 ? versions[0].versionNumber : null;

  const handleExportJson = async () => {
    const response = await apiClient.get(`/guidelines/${guidelineId}/export`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `guideline-export.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-y-auto p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Version History</h2>
        <button
          onClick={() => setShowPublishDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Publish New Version
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && versions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No versions published yet. Publish your first version to create an immutable snapshot.
          </p>
        </div>
      )}

      {/* Version list */}
      {!isLoading && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold">v{version.versionNumber}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    version.versionType === 'MAJOR'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {version.versionType}
                </span>
                {version.isPublic && (
                  <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                    Public
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Published {dateFormatter.format(new Date(version.publishedAt))} by{' '}
                {version.publisherName}
              </div>

              {version.comment && (
                <p className="text-sm text-gray-600 truncate">{version.comment}</p>
              )}

              <div className="pt-1">
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish dialog */}
      {showPublishDialog && (
        <PublishDialog
          guidelineId={guidelineId}
          latestVersion={latestVersion}
          onClose={() => setShowPublishDialog(false)}
        />
      )}
    </div>
  );
}
