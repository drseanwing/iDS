import type { UserPresence } from '../../hooks/usePresence';

interface PresenceIndicatorProps {
  users: UserPresence[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceIndicator({ users }: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1" aria-label="Active collaborators">
      {users.map((user) => (
        <div key={user.userId} className="group relative">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-background cursor-default select-none"
            style={{ backgroundColor: user.color }}
            aria-label={user.userName}
          >
            {getInitials(user.userName)}
          </div>

          {/* Tooltip */}
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 z-50">
            <p className="font-medium">{user.userName}</p>
            {user.sectionId && (
              <p className="text-muted-foreground">Viewing section</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
