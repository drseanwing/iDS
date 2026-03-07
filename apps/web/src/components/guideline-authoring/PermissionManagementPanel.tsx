import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  usePermissions,
  useAddPermission,
  useRemovePermission,
  type Permission,
} from '../../hooks/usePermissions';

interface PermissionManagementPanelProps {
  guidelineId: string;
}

const roleBadge: Record<Permission['role'], string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  AUTHOR: 'bg-blue-100 text-blue-800',
  REVIEWER: 'bg-yellow-100 text-yellow-800',
  VIEWER: 'bg-gray-100 text-gray-700',
};

const ROLES: Permission['role'][] = ['ADMIN', 'AUTHOR', 'REVIEWER', 'VIEWER'];

export function PermissionManagementPanel({ guidelineId }: PermissionManagementPanelProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<Permission['role']>('VIEWER');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data: permissions, isLoading } = usePermissions(guidelineId);
  const addPermission = useAddPermission();
  const removePermission = useRemovePermission();

  const list = permissions ?? [];

  const handleAdd = () => {
    if (!userId.trim()) return;
    addPermission.mutate(
      { guidelineId, userId: userId.trim(), role },
      {
        onSuccess: () => {
          setUserId('');
          setRole('VIEWER');
        },
      },
    );
  };

  const handleRemove = (memberId: string) => {
    if (confirmRemove !== memberId) {
      setConfirmRemove(memberId);
      return;
    }
    removePermission.mutate(
      { guidelineId, userId: memberId },
      { onSuccess: () => setConfirmRemove(null) },
    );
  };

  return (
    <div className="overflow-y-auto p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team Members</h2>
      </div>

      {/* Add member form */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Add Member</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="flex-1 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Permission['role'])}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!userId.trim() || addPermission.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addPermission.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Enter the UUID of the user to add. In a real app this would be an email/user search.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && list.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-gray-500">No team members.</p>
        </div>
      )}

      {/* Member list */}
      {!isLoading && list.length > 0 && (
        <div className="space-y-2">
          {list.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.user.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
              </div>

              {/* Role badge */}
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[member.role]}`}
              >
                {member.role}
              </span>

              {/* Remove */}
              {confirmRemove === member.userId ? (
                <span className="flex items-center gap-2 text-xs shrink-0">
                  <span className="text-gray-600">Remove?</span>
                  <button
                    onClick={() => handleRemove(member.userId)}
                    disabled={removePermission.isPending}
                    className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => handleRemove(member.userId)}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
