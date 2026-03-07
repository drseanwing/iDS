import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { usePublishVersion } from '../../hooks/usePublishVersion';

interface PublishDialogProps {
  guidelineId: string;
  latestVersion: string | null;
  onClose: () => void;
}

function computeNextVersion(latest: string | null, type: 'MAJOR' | 'MINOR'): string {
  if (!latest) return type === 'MAJOR' ? 'v1.0' : 'v0.1';
  const nums = latest.replace('v', '').split('.').map(Number);
  if (type === 'MAJOR') return `v${nums[0] + 1}.0`;
  return `v${nums[0]}.${nums[1] + 1}`;
}

export function PublishDialog({ guidelineId, latestVersion, onClose }: PublishDialogProps) {
  const [versionType, setVersionType] = useState<'MAJOR' | 'MINOR'>('MAJOR');
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const { mutate: publish, isPending, error } = usePublishVersion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const nextVersion = computeNextVersion(latestVersion, versionType);

  const handlePublish = () => {
    publish(
      {
        guidelineId,
        versionType,
        comment: comment.trim() || undefined,
        isPublic,
      },
      { onSuccess: () => onClose() },
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Publish New Version</h2>

        {/* Version type */}
        <fieldset className="space-y-2 mb-4">
          <legend className="text-sm font-medium mb-1">Version Type</legend>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="versionType"
              value="MAJOR"
              checked={versionType === 'MAJOR'}
              onChange={() => setVersionType('MAJOR')}
              className="rounded-full border-gray-300"
            />
            <span className="text-sm">Major</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="versionType"
              value="MINOR"
              checked={versionType === 'MINOR'}
              onChange={() => setVersionType('MINOR')}
              className="rounded-full border-gray-300"
            />
            <span className="text-sm">Minor</span>
          </label>
        </fieldset>

        {/* Version preview */}
        <div className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-sm">
          Next version: <span className="font-semibold">{nextVersion}</span>
        </div>

        {/* Comment */}
        <label className="block mb-4">
          <span className="text-sm font-medium">Comment (optional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </label>

        {/* Public checkbox */}
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Make this version publicly accessible</span>
        </label>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {(error as Error).message || 'Failed to publish version.'}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
