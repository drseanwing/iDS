import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Listens for the custom 'sw-updated' event dispatched by the service worker
 * registration and shows a toast prompting the user to reload.
 *
 * The VitePWA plugin with registerType='autoUpdate' fires the
 * 'sw-updated' event on the window when a new service worker is waiting.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // vite-plugin-pwa dispatches this event when autoUpdate detects a new SW
    function handleSwUpdated() {
      setShowPrompt(true);
    }

    window.addEventListener('sw-updated', handleSwUpdated);
    return () => window.removeEventListener('sw-updated', handleSwUpdated);
  }, []);

  if (!showPrompt) return null;

  function handleUpdate() {
    window.location.reload();
  }

  function handleDismiss() {
    setShowPrompt(false);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg',
        'max-w-sm w-full text-sm',
      )}
    >
      <RefreshCw className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1 text-foreground">A new version of OpenGRADE is available.</span>
      <button
        onClick={handleUpdate}
        className={cn(
          'min-h-[44px] rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
          'transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
      >
        Update now
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        className={cn(
          'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md p-1',
          'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
