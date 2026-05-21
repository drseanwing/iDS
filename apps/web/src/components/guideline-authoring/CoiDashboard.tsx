import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCoi, useCreateCoi, useUpdateCoi, useDeleteCoi, CoiRecord, CoiInterventionConflict } from '../../hooks/useCoi';
import { ConfirmDialog } from './ConfirmDialog';

interface CoiDashboardProps {
  guidelineId: string;
}

const CONFLICT_LEVEL_BADGE: Record<string, string> = {
  NONE: 'bg-gray-100 text-gray-600',
  LOW: 'bg-yellow-100 text-yellow-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-red-100 text-red-700',
};

interface CoiFormState {
  userId: string;
  publicSummary: string;
  internalSummary: string;
}

const DEFAULT_FORM: CoiFormState = {
  userId: '',
  publicSummary: '',
  internalSummary: '',
};

interface CoiFormProps {
  initial?: CoiFormState;
  onSubmit: (form: CoiFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  showUserId?: boolean;
}

function CoiForm({ initial = DEFAULT_FORM, onSubmit, onCancel, isPending, submitLabel, showUserId = true }: CoiFormProps) {
  const [form, setForm] = useState<CoiFormState>(initial);

  const set = <K extends keyof CoiFormState>(key: K, value: CoiFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {showUserId && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">User ID</label>
          <input
            type="text"
            value={form.userId}
            onChange={(e) => set('userId', e.target.value)}
            placeholder="User ID"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Public Summary</label>
        <textarea
          value={form.publicSummary}
          onChange={(e) => set('publicSummary', e.target.value)}
          rows={3}
          placeholder="Public-facing disclosure summary..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Internal Summary</label>
        <textarea
          value={form.internalSummary}
          onChange={(e) => set('internalSummary', e.target.value)}
          rows={3}
          placeholder="Internal-only disclosure details..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InterventionConflictList({ conflicts }: { conflicts: CoiInterventionConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Intervention Conflicts</p>
      <div className="divide-y divide-gray-100 rounded-md border border-gray-100">
        {conflicts.map((ic) => (
          <div key={ic.id} className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-gray-700 truncate mr-2">{ic.interventionLabel}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONFLICT_LEVEL_BADGE[ic.conflictLevel] ?? CONFLICT_LEVEL_BADGE.NONE}`}>
                {ic.conflictLevel}
              </span>
              {ic.excludeFromVoting && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Excluded
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CoiRowProps {
  record: CoiRecord;
  guidelineId: string;
}

function CoiRow({ record, guidelineId }: CoiRowProps) {
  const [expandedPublic, setExpandedPublic] = useState(false);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateCoi = useUpdateCoi();
  const deleteCoi = useDeleteCoi();

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    deleteCoi.mutate({ id: record.id, guidelineId });
  };

  const handleUpdate = (form: CoiFormState) => {
    updateCoi.mutate(
      {
        id: record.id,
        guidelineId,
        publicSummary: form.publicSummary || undefined,
        internalSummary: form.internalSummary || undefined,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const editInitial: CoiFormState = {
    userId: record.userId,
    publicSummary: record.publicSummary ?? '',
    internalSummary: record.internalSummary ?? '',
  };

  const displayName = record.user?.displayName ?? record.userId;
  const email = record.user?.email;
  const conflicts = record.interventionConflicts ?? [];
  const hasHighConflict = conflicts.some((ic) => ic.conflictLevel === 'HIGH' || ic.conflictLevel === 'MEDIUM');
  const isAnyExcluded = conflicts.some((ic) => ic.excludeFromVoting);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {editing ? (
        <CoiForm
          initial={editInitial}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isPending={updateCoi.isPending}
          submitLabel="Save"
          showUserId={false}
        />
      ) : (
        <>
          {/* Row header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              {email && <p className="text-xs text-gray-500">{email}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {hasHighConflict && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Conflict
                </span>
              )}
              {isAnyExcluded ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Excluded
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Eligible
                </span>
              )}

              <button
                onClick={() => setEditing(true)}
                title="Edit declaration"
                className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setConfirmOpen(true)}
                disabled={deleteCoi.isPending}
                title="Delete declaration"
                aria-label="Delete COI declaration"
                className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Public summary */}
          {record.publicSummary && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Public Summary</p>
              <p className={`text-sm text-gray-700 ${!expandedPublic ? 'line-clamp-2' : ''}`}>
                {record.publicSummary}
              </p>
              {record.publicSummary.length > 120 && (
                <button
                  onClick={() => setExpandedPublic((v) => !v)}
                  className="mt-1 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                >
                  {expandedPublic ? (
                    <><ChevronUp className="h-3 w-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Show more</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Internal summary */}
          {record.internalSummary && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Internal Summary</p>
              <p className={`text-sm text-gray-700 ${!expandedInternal ? 'line-clamp-2' : ''}`}>
                {record.internalSummary}
              </p>
              {record.internalSummary.length > 120 && (
                <button
                  onClick={() => setExpandedInternal((v) => !v)}
                  className="mt-1 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                >
                  {expandedInternal ? (
                    <><ChevronUp className="h-3 w-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Show more</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Intervention conflicts */}
          <InterventionConflictList conflicts={conflicts} />
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete COI declaration"
        description="Delete this COI declaration? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export function CoiDashboard({ guidelineId }: CoiDashboardProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: records, isLoading } = useCoi(guidelineId);
  const createCoi = useCreateCoi();

  const allRecords = records ?? [];

  const handleCreate = (form: CoiFormState) => {
    createCoi.mutate(
      {
        guidelineId,
        userId: form.userId,
        publicSummary: form.publicSummary || undefined,
        internalSummary: form.internalSummary || undefined,
      },
      { onSuccess: () => setShowCreateForm(false) },
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Conflict of Interest Declarations</h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Declaration
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Declaration</h3>
          <CoiForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isPending={createCoi.isPending}
            submitLabel="Create"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allRecords.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No COI declarations recorded</p>
        </div>
      )}

      {/* Record list */}
      {!isLoading && allRecords.length > 0 && (
        <div className="space-y-3">
          {allRecords.map((record) => (
            <CoiRow key={record.id} record={record} guidelineId={guidelineId} />
          ))}
        </div>
      )}
    </div>
  );
}
