import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ArrowLeftRight } from 'lucide-react';
import { useVersionCompare } from '../../hooks/useVersionCompare';
import type { Version } from '../../hooks/useVersions';

interface VersionCompareDialogProps {
  versions: Version[];
  onClose: () => void;
}

/** Flatten an object to { "path.to.key": value } map */
function flatten(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj == null) return result;
  if (typeof obj !== 'object') {
    result[prefix] = String(obj);
    return result;
  }
  if (Array.isArray(obj)) {
    result[prefix] = `[${obj.length} items]`;
    return result;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, path));
    } else if (Array.isArray(v)) {
      result[path] = `[${v.length} items]`;
    } else {
      result[path] = v == null ? '(empty)' : String(v);
    }
  }
  return result;
}

interface DiffLine {
  path: string;
  v1Value: string;
  v2Value: string;
  type: 'added' | 'removed' | 'changed' | 'same';
}

function computeDiff(snapshot1: any, snapshot2: any): DiffLine[] {
  const flat1 = flatten(snapshot1);
  const flat2 = flatten(snapshot2);
  const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);
  const lines: DiffLine[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const v1 = flat1[key];
    const v2 = flat2[key];
    if (v1 === undefined) {
      lines.push({ path: key, v1Value: '', v2Value: v2, type: 'added' });
    } else if (v2 === undefined) {
      lines.push({ path: key, v1Value: v1, v2Value: '', type: 'removed' });
    } else if (v1 !== v2) {
      lines.push({ path: key, v1Value: v1, v2Value: v2, type: 'changed' });
    }
  }

  return lines;
}

const TYPE_COLORS: Record<string, string> = {
  added: 'bg-green-50 text-green-900',
  removed: 'bg-red-50 text-red-900',
  changed: 'bg-yellow-50 text-yellow-900',
};

const TYPE_LABELS: Record<string, string> = {
  added: '+',
  removed: '-',
  changed: '~',
};

export function VersionCompareDialog({ versions, onClose }: VersionCompareDialogProps) {
  const [v1Id, setV1Id] = useState<string>(versions.length >= 2 ? versions[1].id : '');
  const [v2Id, setV2Id] = useState<string>(versions.length >= 1 ? versions[0].id : '');

  const { data, isLoading, isError } = useVersionCompare(
    v1Id || null,
    v2Id || null,
  );

  const diffLines = useMemo(() => {
    if (!data) return [];
    return computeDiff(data.v1.snapshotBundle, data.v2.snapshotBundle);
  }, [data]);

  const changesOnly = diffLines.filter((l) => l.type !== 'same');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Compare Versions</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Version selectors */}
        <div className="flex items-center gap-4 border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">From:</label>
            <select
              value={v1Id}
              onChange={(e) => setV1Id(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.versionType})
                </option>
              ))}
            </select>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">To:</label>
            <select
              value={v2Id}
              onChange={(e) => setV2Id(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.versionType})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!v1Id || !v2Id || v1Id === v2Id ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Select two different versions to compare
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-500">
              Failed to load version comparison
            </p>
          ) : changesOnly.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No differences found between these versions
            </p>
          ) : (
            <div className="space-y-0.5">
              <p className="mb-3 text-xs text-gray-500">
                {changesOnly.length} difference{changesOnly.length !== 1 ? 's' : ''} found
              </p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Path</th>
                      <th className="px-3 py-2">v{data?.v1.versionNumber}</th>
                      <th className="px-3 py-2">v{data?.v2.versionNumber}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changesOnly.map((line, i) => (
                      <tr
                        key={i}
                        className={`${TYPE_COLORS[line.type]} border-t border-gray-100`}
                      >
                        <td className="px-3 py-1.5 text-center font-mono text-xs font-bold">
                          {TYPE_LABELS[line.type]}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs text-gray-600 break-all">
                          {line.path}
                        </td>
                        <td className="px-3 py-1.5 text-xs break-all max-w-[200px] truncate">
                          {line.v1Value || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-xs break-all max-w-[200px] truncate">
                          {line.v2Value || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
