import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const DISMISSED_KEY = 'opengrade-install-prompt-dismissed-until';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed within the cooldown window
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!visible || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS));
  }

  return (
    <div
      role="banner"
      aria-label="Install OpenGRADE app"
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm',
        'flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg text-sm',
      )}
    >
      <Download className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1 text-foreground">
        Install OpenGRADE for the best experience.
      </span>
      <button
        onClick={handleInstall}
        className={cn(
          'min-h-[44px] rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
          'transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary focus-visible:ring-offset-2 whitespace-nowrap',
        )}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
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
