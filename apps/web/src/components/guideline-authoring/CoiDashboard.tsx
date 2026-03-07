import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCoi, useCreateCoi, useUpdateCoi, useDeleteCoi, CoiRecord } from '../../hooks/useCoi';

interface CoiDashboardProps {
  guidelineId: string;
}

type ConflictType = 'NONE' | 'FINANCIAL' | 'INTELLECTUAL' | 'PERSONAL' | 'OTHER';

const CONFLICT_TYPES: ConflictType[] = ['NONE', 'FINANCIAL', 'INTELLECTUAL', 'PERSONAL', 'OTHER'];

const CONFLICT_TYPE_BADGE: Record<ConflictType, string> = {
  NONE: 'bg-gray-100 text-gray-600',
  FINANCIAL: 'bg-red-100 text-red-700',
  INTELLECTUAL: 'bg-orange-100 text-orange-700',
  PERSONAL: 'bg-yellow-100 text-yellow-700',
  OTHER: 'bg-blue-100 text-blue-700',
};

interface CoiFormState {
  userId: string;
  disclosureText: string;
  conflictType: ConflictType;
  isExcludedFromVoting: boolean;
}

const DEFAULT_FORM: CoiFormState = {
  userId: '',
  disclosureText: '',
  conflictType: 'NONE',
  isExcludedFromVoting: false,
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
        <label className="block text-xs font-medium text-gray-700 mb-1">Conflict Type</label>
        <select
          value={form.conflictType}
          onChange={(e) => set('conflictType', e.target.value as ConflictType)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONFLICT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Disclosure Text</label>
        <textarea
          value={form.disclosureText}
          onChange={(e) => set('disclosureText', e.target.value)}
          rows={3}
          placeholder="Describe the conflict of interest..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="excluded-from-voting"
          type="checkbox"
          checked={form.isExcludedFromVoting}
          onChange={(e) => set('isExcludedFromVoting', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="excluded-from-voting" className="text-sm text-gray-700">
          Excluded from voting
        </label>
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

interface CoiRowProps {
  record: CoiRecord;
  guidelineId: string;
}

function CoiRow({ record, guidelineId }: CoiRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const updateCoi = useUpdateCoi();
  const deleteCoi = useDeleteCoi();

  const conflictType = (record.conflictType ?? 'NONE') as ConflictType;
  const badgeClass = CONFLICT_TYPE_BADGE[conflictType] ?? CONFLICT_TYPE_BADGE.NONE;

  const handleDelete = () => {
    if (!window.confirm('Delete this COI declaration?')) return;
    deleteCoi.mutate({ id: record.id, guidelineId });
  };

  const handleUpdate = (form: CoiFormState) => {
    updateCoi.mutate(
      {
        id: record.id,
        guidelineId,
        disclosureText: form.disclosureText || undefined,
        conflictType: form.conflictType,
        isExcludedFromVoting: form.isExcludedFromVoting,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const editInitial: CoiFormState = {
    userId: record.userId,
    disclosureText: record.disclosureText ?? '',
    conflictType: conflictType,
    isExcludedFromVoting: record.isExcludedFromVoting,
  };

  const displayName = record.user?.displayName ?? record.userId;
  const email = record.user?.email;

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
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                {conflictType}
              </span>

              {record.isExcludedFromVoting ? (
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
                onClick={handleDelete}
                disabled={deleteCoi.isPending}
                title="Delete declaration"
                className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Disclosure text */}
          {record.disclosureText && (
            <div>
              <p className={`text-sm text-gray-700 ${!expanded ? 'line-clamp-2' : ''}`}>
                {record.disclosureText}
              </p>
              {record.disclosureText.length > 120 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                >
                  {expanded ? (
                    <><ChevronUp className="h-3 w-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Show more</>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
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
        disclosureText: form.disclosureText || undefined,
        conflictType: form.conflictType,
        isExcludedFromVoting: form.isExcludedFromVoting,
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
