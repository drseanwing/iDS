import { useState } from 'react';
import { LayoutDashboard, BookOpen, FileText, Settings, User, LogOut, Menu, X, WifiOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../lib/i18n';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { LanguageSelector } from './LanguageSelector';

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'guidelines', labelKey: 'nav.guidelines', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'references', labelKey: 'nav.references', icon: <FileText className="h-5 w-5" /> },
  { id: 'settings', labelKey: 'nav.settings', icon: <Settings className="h-5 w-5" /> },
];

interface AppShellProps {
  activePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  fullHeight?: boolean;
}

function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-label="You are currently offline"
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
    >
      <WifiOff className="h-3 w-3" aria-hidden="true" />
      <span>Offline</span>
    </div>
  );
}

export function AppShell({ activePath, onNavigate, children, fullHeight = false }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on md+, slide-in drawer on mobile */}
      <aside
        className={cn(
          'flex w-64 flex-col border-r bg-muted/40',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between px-6">
          <span className="font-bold text-lg text-primary" aria-label="Application brand">
            OpenGRADE
          </span>
          {/* Close button for mobile drawer */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
                activePath === item.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.icon}
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
        <div className="border-t px-3 py-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{user?.name || user?.email || 'User'}</span>
            {user && (
              <button
                onClick={logout}
                title="Log out"
                className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center rounded p-1 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger menu — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm text-muted-foreground capitalize">{activePath}</span>
          </div>
          <div className="flex items-center gap-3">
            <OfflineIndicator />
            <LanguageSelector />
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              v0.1.0-dev
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          className={cn(
            'flex-1 overflow-hidden',
            fullHeight ? '' : 'overflow-y-auto p-4 md:p-6',
            // On mobile, leave room for the bottom tab bar
            'pb-safe-bottom md:pb-0',
          )}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-background md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-label={t(item.labelKey)}
            aria-current={activePath === item.id ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-xs font-medium transition-colors',
              activePath === item.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon}
            <span className="text-[10px] leading-tight">{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
