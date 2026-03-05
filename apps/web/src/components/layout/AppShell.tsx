import { LayoutDashboard, BookOpen, FileText, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'guidelines', label: 'Guidelines', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'references', label: 'References', icon: <FileText className="h-5 w-5" /> },
];

interface AppShellProps {
  activePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ activePath, onNavigate, children, fullHeight = false }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-muted/40">
        <div className="flex h-14 items-center px-6 font-bold text-lg text-primary">
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
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t px-3 py-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
            <User className="h-5 w-5" />
            <span>User</span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground capitalize">{activePath}</span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            v0.1.0-dev
          </span>
        </header>

        {/* Content */}
        <main className={cn('flex-1 overflow-hidden', fullHeight ? '' : 'overflow-y-auto p-6')}>
          {children}
        </main>
      </div>
    </div>
  );
}
