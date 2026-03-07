import { useState } from 'react';
import { Loader2, Plus, Trash2, Milestone as MilestoneIcon, CheckCircle2 } from 'lucide-react';
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useToggleChecklistItem,
  Milestone,
} from '../../hooks/useMilestones';

interface MilestonesPanelProps {
  guidelineId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDateClass(milestone: Milestone): string {
  if (milestone.isCompleted) return 'text-green-600';
  if (!milestone.targetDate) return 'text-gray-500';
  const now = new Date();
  const target = new Date(milestone.targetDate);
  if (target < now) return 'text-red-600';
  return 'text-gray-500';
}

function CreateMilestoneForm({
  guidelineId,
  onClose,
}: {
  guidelineId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const createMilestone = useCreateMilestone();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMilestone.mutate(
      {
        guidelineId,
        title: title.trim(),
        targetDate: targetDate || undefined,
        responsiblePerson: responsiblePerson.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Milestone title..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
          <input
            type="text"
            value={responsiblePerson}
            onChange={(e) => setResponsiblePerson(e.target.value)}
            placeholder="Name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMilestone.isPending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createMilestone.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function MilestoneCard({
  milestone,
  guidelineId,
}: {
  milestone: Milestone;
  guidelineId: string;
}) {
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const toggleItem = useToggleChecklistItem();

  const handleToggleCompleted = () => {
    updateMilestone.mutate({
      id: milestone.id,
      guidelineId,
      isCompleted: !milestone.isCompleted,
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete milestone "${milestone.title}"?`)) return;
    deleteMilestone.mutate({ id: milestone.id, guidelineId });
  };

  const handleToggleItem = (itemId: string) => {
    toggleItem.mutate({ itemId, guidelineId });
  };

  const items = milestone.items ?? [];

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200 last:hidden" />

      {/* Timeline dot */}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        {milestone.isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={milestone.isCompleted}
                onChange={handleToggleCompleted}
                disabled={updateMilestone.isPending}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span
                className={`text-sm font-semibold ${
                  milestone.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {milestone.title}
              </span>
            </label>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteMilestone.isPending}
            title="Delete milestone"
            className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {milestone.targetDate && (
            <span className={`font-medium ${getDateClass(milestone)}`}>
              {formatDate(milestone.targetDate)}
            </span>
          )}
          {milestone.responsiblePerson && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              {milestone.responsiblePerson}
            </span>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={() => handleToggleItem(item.id)}
                  disabled={toggleItem.isPending}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={item.isChecked ? 'line-through text-gray-400' : ''}>
                  {item.title}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;
  const completed = milestones.filter((m) => m.isCompleted).length;
  const percent = Math.round((completed / milestones.length) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
        {completed}/{milestones.length} ({percent}%)
      </span>
    </div>
  );
}

export function MilestonesPanel({ guidelineId }: MilestonesPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: milestones, isLoading } = useMilestones(guidelineId);

  const allMilestones = milestones ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MilestoneIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Milestones</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Milestone
        </button>
      </div>

      <ProgressBar milestones={allMilestones} />

      {showCreateForm && (
        <CreateMilestoneForm guidelineId={guidelineId} onClose={() => setShowCreateForm(false)} />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && allMilestones.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <MilestoneIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No milestones yet</p>
          <p className="text-xs text-gray-400">Add milestones to track guideline progress</p>
        </div>
      )}

      {!isLoading && allMilestones.length > 0 && (
        <div className="space-y-0">
          {allMilestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} guidelineId={guidelineId} />
          ))}
        </div>
      )}
    </div>
  );
}
