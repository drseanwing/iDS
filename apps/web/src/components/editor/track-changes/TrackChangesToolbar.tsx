import React from 'react';
import { cn } from '../../../lib/utils';

interface TrackChangesToolbarProps {
  isEnabled: boolean;
  onToggle: () => void;
  onAcceptChange: () => void;
  onRejectChange: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  changeCount: number;
  canManageChanges: boolean;
}

export function TrackChangesToolbar({
  isEnabled,
  onToggle,
  onAcceptChange,
  onRejectChange,
  onAcceptAll,
  onRejectAll,
  changeCount,
  canManageChanges,
}: TrackChangesToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'rounded px-2 py-1 font-medium transition-colors',
          isEnabled
            ? 'bg-primary text-primary-foreground'
            : 'bg-background border border-input hover:bg-muted',
        )}
        title={isEnabled ? 'Disable track changes' : 'Enable track changes'}
      >
        Track Changes {isEnabled ? 'ON' : 'OFF'}
      </button>

      {changeCount > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </span>
      )}

      {canManageChanges && changeCount > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={onAcceptChange}
            className="rounded px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            title="Accept selected change"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onRejectChange}
            className="rounded px-2 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            title="Reject selected change"
          >
            Reject
          </button>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors font-medium"
            title="Accept all changes"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded px-2 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors font-medium"
            title="Reject all changes"
          >
            Reject All
          </button>
        </>
      )}
    </div>
  );
}
