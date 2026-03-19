import { LayoutDashboard, BookOpen, FileText, User, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../lib/i18n';
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
];

interface AppShellProps {
  activePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ activePath, onNavigate, children, fullHeight = false }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/40">
        <div className="flex h-14 items-center px-6 font-bold text-lg text-primary" aria-label="Application brand">
          OpenGRADE
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
                className="ml-auto rounded p-1 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground capitalize">{activePath}</span>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              v0.1.0-dev
            </span>
          </div>
        </header>

        {/* Content */}
        <main className={cn('flex-1 overflow-hidden', fullHeight ? '' : 'overflow-y-auto p-6')}>
          {children}
        </main>
      </div>
    </div>
  );
}
